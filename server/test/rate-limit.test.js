/**
 * 认证端点限流测试（IP 固定窗口 + 账号连续失败封禁）
 *
 * ⚠️ 本文件刻意**不碰数据库**：server/test 下已有 api.test.js 独占 PGlite 文件库
 *    （server/data/），而 `node --test` 默认**并发**跑各个测试文件 —— 再开一个进程
 *    同时打开同一个数据目录会产生难复现的随机失败。故这里一律用**注入式假 store**
 *    （`createRateLimiter({ store })`，rateLimit.js 不 import fastify 正是为此）；
 *    需要真库的 HTTP 集成用例放在 api.test.js（同文件内串行，不会多开一个进程）。
 *
 * ⚠️ 需要走到业务路由的用例，payload 一律**故意缺字段**（login/refresh 缺参会
 *    在 auth.js 里执行任何 SQL 之前就 400 返回），这样请求完全不触达数据库。
 *    代价是「放行」表现为 400 而不是 200；「200 才算放行」的真库版本在
 *    api.test.js 里补上（那里可以真的写库）。
 *
 * 运行：node --test server/test/rate-limit.test.js
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import {
  DEFAULT_RULES,
  KIND_IP,
  createRateLimiter,
  normalizeAccount,
  parseRateLimitConfig,
  tooManyRequestsBody
} from '../src/rateLimit.js'

/** fail-open 用例会打 error 日志，静音掉以免污染测试输出 */
const SILENT_LOG = { error() {} }

/**
 * 内存假 store：四条分支语义对齐 rateLimit.js 的 HIT_SQL（改 SQL 时这里要同步改）。
 * 之所以自己实现一份而不是复用真库，理由见文件头注释；代价是它只验证「限流器逻辑」，
 * 验证不了 SQL 本身 —— 后者由 api.test.js 用真库覆盖。
 */
function createFakeStore() {
  const buckets = new Map()
  const stats = { hits: [], peeks: 0, resets: 0, prunes: 0, throwOn: null }

  const idOf = (kind, key, scope) => `${kind}\x00${key}\x00${scope}`
  const guard = (op) => {
    if (stats.throwOn === op) {
      stats.throwOn = null
      throw new Error(`[fake-store] 注入故障：${op}`)
    }
  }

  return {
    stats,
    /** 让下一次指定操作抛错，用于验证 fail-open */
    throwOn(op) {
      stats.throwOn = op
    },
    async hit({ kind, key, scope, windowSec, blockAfter, blockSec, nowMs = Date.now() } = {}) {
      guard('hit')
      stats.hits.push({ kind, key, scope })
      const id = idOf(kind, key, scope)
      const fresh = {
        count: 1,
        windowStartMs: nowMs,
        blockedUntilMs: 1 >= blockAfter ? nowMs + blockSec * 1000 : null
      }
      const cur = buckets.get(id)
      if (!cur) {
        buckets.set(id, fresh)
        return { ...fresh }
      }
      const windowExpired = cur.windowStartMs <= nowMs - windowSec * 1000
      const blockExpired = cur.blockedUntilMs !== null && cur.blockedUntilMs <= nowMs
      if (windowExpired || blockExpired) {
        // ① 窗口翻页 / ② 封禁到期：都重置为 1。不重置的话，封禁到期后用户再输错
        //    一次就立刻被锁第二个 15 分钟，等于永久锁死。
        Object.assign(cur, fresh)
      } else if (cur.blockedUntilMs !== null) {
        // ③ 封禁中：只自增，到期时间不后延（否则攻击者拿别人账号乱试能越锁越久）
        cur.count += 1
      } else {
        cur.count += 1
        if (cur.count >= blockAfter) cur.blockedUntilMs = nowMs + blockSec * 1000
      }
      return { ...cur }
    },
    async peek({ kind, key, scope } = {}) {
      guard('peek')
      stats.peeks += 1
      const cur = buckets.get(idOf(kind, key, scope))
      return cur ? { windowStartMs: cur.windowStartMs, blockedUntilMs: cur.blockedUntilMs } : null
    },
    async reset({ kind, key, scope } = {}) {
      guard('reset')
      stats.resets += 1
      buckets.delete(idOf(kind, key, scope))
    },
    async prune({ beforeMs } = {}) {
      guard('prune')
      stats.prunes += 1
      let removed = 0
      for (const [id, b] of buckets) {
        if (b.windowStartMs < beforeMs && (b.blockedUntilMs === null || b.blockedUntilMs < beforeMs)) {
          buckets.delete(id)
          removed += 1
        }
      }
      return removed
    }
  }
}

/** 装配一个**开启限流**的 app；trustProxy 同时决定 Fastify 的 req.ip 与 IP 维度开关 */
async function buildApp({ trustProxy = '127.0.0.1', config = DEFAULT_RULES } = {}) {
  const store = createFakeStore()
  const app = await createApp({
    jwtSecret: 'rate-limit-test',
    trustProxy,
    rateLimit: { store, config, trustProxy }
  })
  return { app, store }
}

/**
 * 一次 login 探测。
 * payload 传 `{}` → auth.js 在**执行任何 SQL 之前**就 400 返回，因此不触达数据库；
 * 于是「未被限流」的表现是 400 而非 200（200 版本在 api.test.js）。
 */
function loginProbe(app, { remoteAddress = '203.0.113.9', headers } = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/auth/login',
    remoteAddress,
    headers: headers || {},
    payload: {}
  })
}

/** 造一个可注入时钟的限流器（单测用；HTTP 层拿不到时钟注入，只能靠真时间） */
function buildLimiter(store, clockRef) {
  return createRateLimiter({
    store,
    config: DEFAULT_RULES,
    now: () => clockRef.ms,
    log: SILENT_LOG
  })
}

describe('纯函数：归一化 / 配置解析 / 429 响应体', () => {
  test('normalizeAccount：大小写与首尾空白统一；非字符串归为空串', () => {
    assert.equal(normalizeAccount('Alice'), 'alice')
    assert.equal(normalizeAccount(' alice '), 'alice')
    assert.equal(normalizeAccount('ALICE'), 'alice')
    assert.equal(normalizeAccount(12345), '12345')
    assert.equal(normalizeAccount(null), '')
    assert.equal(normalizeAccount({}), '')
  })

  test('parseRateLimitConfig：env 全空 → 取默认阈值', () => {
    assert.deepEqual(parseRateLimitConfig({}), DEFAULT_RULES)
  })

  test('parseRateLimitConfig：合法覆盖生效；非法值静默回退默认（限流配置也要 fail-open）', () => {
    const c = parseRateLimitConfig({
      RATE_LOGIN_PER_IP: '30',
      RATE_LOGIN_PER_IP_WINDOW_SEC: '60',
      RATE_LOGIN_BLOCK_MIN: '30', // 运维口径是分钟，内部换算成秒
      RATE_REGISTER_PER_IP: 'abc',
      RATE_LOGIN_FAIL_MAX: '-5'
    })
    assert.equal(c.ip.login.limit, 30)
    assert.equal(c.ip.login.windowSec, 60)
    assert.equal(c.account.blockSec, 30 * 60)
    assert.equal(c.ip.register.limit, DEFAULT_RULES.ip.register.limit)
    assert.equal(c.account.failMax, DEFAULT_RULES.account.failMax)
  })

  test('tooManyRequestsBody：秒数必须出现在文案里（Retry-After 客户端未必展示）', () => {
    const body = tooManyRequestsBody(120)
    assert.equal(body.retryAfter, 120)
    assert.match(body.error, /120/)
  })
})

describe('默认关闭（保护 api.test.js 的护栏）', () => {
  test('createApp 不传 rateLimit → 限流器与钩子都不存在，12 次 register 无一被限', async () => {
    const store = createFakeStore()
    const app = await createApp({ jwtSecret: 'rate-limit-test' })
    try {
      // 直接断言「没装」比断言「没触发」更硬：默认一旦被改成开启，这里立刻变红，
      // 而 api.test.js 的连续 register 也会连带失败。
      assert.equal(app.rateLimiter, undefined)
      for (let i = 1; i <= 12; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/register',
          remoteAddress: '203.0.113.9',
          payload: { username: 'x', password: 'short' } // 长度不合法 → 400，不触达数据库
        })
        assert.notEqual(res.statusCode, 429, `第 ${i} 次 register 不应被限流`)
        assert.equal(res.statusCode, 400)
      }
      assert.equal(store.stats.hits.length, 0)
    } finally {
      await app.close()
    }
  })
})

describe('IP 维度（固定窗口）', () => {
  test('同 IP 第 16 次 login → 429 + Retry-After；换一个 IP 立刻放行', async () => {
    const { app, store } = await buildApp()
    try {
      const ip = '203.0.113.9'
      for (let i = 1; i <= DEFAULT_RULES.ip.login.limit; i++) {
        const res = await loginProbe(app, { remoteAddress: ip })
        assert.equal(res.statusCode, 400, `第 ${i} 次 login 应放行到业务`)
      }
      const blocked = await loginProbe(app, { remoteAddress: ip })
      assert.equal(blocked.statusCode, 429)
      const retryAfter = Number(blocked.headers['retry-after'])
      assert.ok(retryAfter >= 1 && retryAfter <= DEFAULT_RULES.ip.login.windowSec)
      assert.equal(blocked.json().retryAfter, retryAfter)
      assert.match(blocked.json().error, /秒后再试/)

      // 换 IP 必须立刻恢复：证明是「按 IP 分桶」而不是全站共用一个桶
      const other = await loginProbe(app, { remoteAddress: '198.51.100.7' })
      assert.notEqual(other.statusCode, 429)
      assert.equal(other.statusCode, 400)

      const ipKeys = store.stats.hits.filter((h) => h.kind === KIND_IP).map((h) => h.key)
      assert.equal(ipKeys.filter((k) => k === ip).length, 16)
      assert.equal(ipKeys.filter((k) => k === '198.51.100.7').length, 1)
    } finally {
      await app.close()
    }
  })

  test('白名单外的路径不被 IP 限流（logout 被限流是纯粹的负面体验）', async () => {
    const { app, store } = await buildApp()
    try {
      for (let i = 0; i < 20; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/auth/logout',
          remoteAddress: '203.0.113.9',
          payload: {}
        })
        assert.equal(res.statusCode, 200)
      }
      assert.equal(store.stats.hits.length, 0)
    } finally {
      await app.close()
    }
  })

  test('未配 trustProxy → IP 维度整体跳过（req.ip 恒为 127.0.0.1，共桶会把全站锁死）', async () => {
    const { app, store } = await buildApp({ trustProxy: false })
    try {
      for (let i = 0; i < 20; i++) {
        const res = await loginProbe(app, { remoteAddress: `203.0.113.${i}` })
        assert.notEqual(res.statusCode, 429)
      }
      assert.equal(store.stats.hits.filter((h) => h.kind === KIND_IP).length, 0)
    } finally {
      await app.close()
    }
  })
})

describe('★ trustProxy 防伪造（伪造 XFF 不能换桶）', () => {
  /** 发一次 login，返回**限流器实际拿到的 IP**（从 store 的入参里取，比断言状态码更直接） */
  async function ipSeenByLimiter({ trustProxy, remoteAddress, xff }) {
    const { app, store } = await buildApp({ trustProxy })
    try {
      await loginProbe(app, { remoteAddress, headers: xff ? { 'x-forwarded-for': xff } : {} })
      return store.stats.hits.filter((h) => h.kind === KIND_IP).map((h) => h.key)[0]
    } finally {
      await app.close()
    }
  }

  test('同机 nginx：取 nginx 追加的右侧真实 IP，而不是最左的伪造值', async () => {
    // trustProxy='127.0.0.1' 时 @fastify/proxy-addr 从**右往左**扫，返回第一个不受信
    // 地址：socket(127.0.0.1 可信) → 203.0.113.9(不可信) → 返回它。伪造的 8.8.8.8 在
    // 左侧，永远扫不到。
    const seen = await ipSeenByLimiter({
      trustProxy: '127.0.0.1',
      remoteAddress: '127.0.0.1',
      xff: '8.8.8.8, 203.0.113.9'
    })
    assert.equal(seen, '203.0.113.9')
    assert.notEqual(seen, '8.8.8.8')
  })

  test('非同机 nginx（回源地址非环回）：同样取右侧真实 IP', async () => {
    const seen = await ipSeenByLimiter({
      trustProxy: '10.0.0.5',
      remoteAddress: '10.0.0.5',
      xff: '8.8.8.8, 203.0.113.9'
    })
    assert.equal(seen, '203.0.113.9')
    assert.notEqual(seen, '8.8.8.8')
  })

  test('★ 伪造左值轮换 15 次仍是同一个桶 → 第 16 次照常被限', async () => {
    // 这是整条限流链最关键的一条：如果 XFF 可伪造，攻击者每次换个左值就是新桶，
    // 前面所有阈值都形同虚设。故这里不只比对 IP，而是**把桶真的打满**。
    const { app, store } = await buildApp({ trustProxy: '127.0.0.1' })
    try {
      for (let i = 1; i <= DEFAULT_RULES.ip.login.limit; i++) {
        const res = await loginProbe(app, {
          remoteAddress: '127.0.0.1',
          headers: { 'x-forwarded-for': `9.9.9.${i}, 203.0.113.9` }
        })
        assert.equal(res.statusCode, 400, `第 ${i} 次（伪造左值 9.9.9.${i}）应放行到业务`)
      }
      const seen = store.stats.hits.filter((h) => h.kind === KIND_IP).map((h) => h.key)
      assert.deepEqual([...new Set(seen)], ['203.0.113.9'], '15 次伪造左值只应产生一个桶')

      const blocked = await loginProbe(app, {
        remoteAddress: '127.0.0.1',
        headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }
      })
      assert.equal(blocked.statusCode, 429, '换了伪造左值也换不到新桶')
    } finally {
      await app.close()
    }
  })

  test('反例：trustProxy=true 时伪造值被直接采纳 —— 这就是 index.js 启动期拒绝 true/* 的原因', async () => {
    const seen = await ipSeenByLimiter({
      trustProxy: true,
      remoteAddress: '127.0.0.1',
      xff: '9.9.9.9'
    })
    assert.equal(seen, '9.9.9.9')
  })
})

describe('账号维度（连续失败 → 封禁 → 成功清零）', () => {
  test('连续失败 8 次后，第 9 次起被挡（第 8 次仍放行 → 该次若密码正确仍可登录）', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    for (let i = 1; i < DEFAULT_RULES.account.failMax; i++) {
      await limiter.recordFailure('alice')
      assert.equal((await limiter.checkAccount('alice')).allowed, true, `第 ${i} 次失败后不应被挡`)
    }
    await limiter.recordFailure('alice')
    const blocked = await limiter.checkAccount('alice')
    assert.equal(blocked.allowed, false)
    assert.ok(blocked.retryAfter > 0 && blocked.retryAfter <= DEFAULT_RULES.account.blockSec)
  })

  test('封禁只看账号不看 IP —— 换 IP 撞库挡不住（HTTP 级证据见 api.test.js）', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    for (let i = 0; i < DEFAULT_RULES.account.failMax; i++) await limiter.recordFailure('alice')
    // checkAccount 的入参里根本没有 IP：账号维度的 key 是归一化账号串。
    assert.equal(store.stats.hits.at(-1).kind, 'account')
    assert.equal((await limiter.checkAccount('alice')).allowed, false)
    assert.equal(store.stats.hits.filter((h) => h.kind === KIND_IP).length, 0)
  })

  test('封禁到期后恢复；且到期后再次失败是「重置为 1」而不是继续累加', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    for (let i = 0; i < DEFAULT_RULES.account.failMax; i++) await limiter.recordFailure('alice')
    assert.equal((await limiter.checkAccount('alice')).allowed, false)

    clock.ms += (DEFAULT_RULES.account.blockSec + 1) * 1000
    assert.equal((await limiter.checkAccount('alice')).allowed, true, '封禁到期应放行')

    // 若这里沿用旧的 count=8，用户再错一次就被锁第二个 15 分钟 → 永久锁死
    await limiter.recordFailure('alice')
    assert.equal(store.stats.hits.at(-1).key, 'alice')
    assert.equal((await limiter.checkAccount('alice')).allowed, true, '到期后失败计数应重置')
  })

  test('登录成功即清零：失败计数连封禁一起解除', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    for (let i = 0; i < DEFAULT_RULES.account.failMax; i++) await limiter.recordFailure('alice')
    assert.equal((await limiter.checkAccount('alice')).allowed, false)

    await limiter.clearFailures('alice')
    assert.equal(store.stats.resets, 1)
    assert.equal((await limiter.checkAccount('alice')).allowed, true)

    // 清零后重新累计：再错 7 次仍不该被挡
    for (let i = 0; i < DEFAULT_RULES.account.failMax - 1; i++) await limiter.recordFailure('alice')
    assert.equal((await limiter.checkAccount('alice')).allowed, true)
  })

  test('归一化共享计数：Alice / " alice " / ALICE 是同一个桶', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    const forms = ['Alice', ' alice ', 'ALICE', 'alice', 'AlIcE', '  ALICE  ', 'alice', ' ALICE']
    for (const f of forms) await limiter.recordFailure(f)
    assert.deepEqual([...new Set(store.stats.hits.map((h) => h.key))], ['alice'])
    assert.equal((await limiter.checkAccount('Alice')).allowed, false)
    assert.equal((await limiter.checkAccount('ALICE')).allowed, false)
  })

  test('账号不存在也要计数：否则「是否被限流」就成了免费的账号枚举探针', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    for (let i = 0; i < DEFAULT_RULES.account.failMax; i++) await limiter.recordFailure('no-such-user')
    assert.equal((await limiter.checkAccount('no-such-user')).allowed, false)
  })
})

describe('fail-open（限流自身故障不得升级成业务 5xx）', () => {
  test('store.hit 抛错 → IP 维度放行，请求仍能走到业务（400 而非 500）', async () => {
    const { app, store } = await buildApp()
    try {
      store.throwOn('hit')
      const res = await loginProbe(app)
      assert.equal(res.statusCode, 400, '限流挂了也不该变成 500')
      assert.notEqual(res.statusCode, 429)
    } finally {
      await app.close()
    }
  })

  test('store.peek 抛错 → 账号维度放行', async () => {
    const store = createFakeStore()
    const limiter = buildLimiter(store, { ms: 1_700_000_000_000 })
    for (let i = 0; i < DEFAULT_RULES.account.failMax; i++) await limiter.recordFailure('alice')
    store.throwOn('peek')
    assert.equal((await limiter.checkAccount('alice')).allowed, true)
  })

  test('checkIp / recordFailure / clearFailures / prune 抛错都不外抛', async () => {
    const store = createFakeStore()
    const limiter = buildLimiter(store, { ms: 1_700_000_000_000 })
    store.throwOn('hit')
    await assert.doesNotReject(() => limiter.checkIp('login', '1.2.3.4'))
    store.throwOn('hit')
    await assert.doesNotReject(() => limiter.recordFailure('alice'))
    store.throwOn('reset')
    await assert.doesNotReject(() => limiter.clearFailures('alice'))
    store.throwOn('prune')
    assert.equal(await limiter.prune(), 0)
  })

  test('prune 清掉已过期的行，但保留仍在封禁中的行（否则一次清理就让被封账号提前出狱）', async () => {
    const store = createFakeStore()
    const clock = { ms: 1_700_000_000_000 }
    const limiter = buildLimiter(store, clock)
    await limiter.checkIp('register', '10.0.0.1') // 只过期、未封禁
    for (let i = 0; i < DEFAULT_RULES.account.failMax; i++) await limiter.recordFailure('alice') // 封禁中

    // 保留期 = 最长窗口（register 的 1 小时）。往前推 1 小时零 100 秒 → cutoff 落在
    // 「窗口已过期、但封禁还没到期」这个区间里，正是 PRUNE_SQL 两个条件的分界点。
    clock.ms += (DEFAULT_RULES.ip.register.windowSec + 100) * 1000
    assert.equal(await limiter.prune(), 1, '只应清掉 IP 那一行，封禁中的账号必须留着')

    // 封禁到期后，同一次清理就该把它带走了
    clock.ms += DEFAULT_RULES.account.blockSec * 1000
    assert.equal(await limiter.prune(), 1, '封禁到期后账号行应被清掉')
    assert.equal(await limiter.prune(), 0)
  })
})
