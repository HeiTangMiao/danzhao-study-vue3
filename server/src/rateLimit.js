/**
 * 认证端点限流（register / login / refresh）
 *
 * 本文件**刻意不 import fastify**：判定逻辑与存储都是「纯函数 + 注入依赖」，
 * 便于脱离 HTTP 单测 —— QA 可以传一个假 store 进来直接断言阈值与封禁行为。
 *
 * 两个维度，职责不重叠：
 *   - IP 维度（固定窗口）：三个端点都管，挡「同一来源短时间狂刷」。
 *   - 账号维度（连续失败 + 封禁）：只管 login，挡「针对某个账号的口令爆破」。
 *
 * ⚠️ 为什么落在 PostgreSQL 而不是进程内存：
 *    `scripts/deploy-backend.sh` 每次上线都跑 `systemctl restart danzhao-api`，
 *    内存计数器会被**一次发布清零** —— 靠内存做「锁定 N 分钟」等于没锁。
 *    PG 的一次 upsert 在 loopback 上是亚毫秒级，相比 login 已有的 Argon2 校验可忽略。
 *
 * ⚠️ 为什么超限返回 429 而不是 401：
 *    前端对 401 走的是「用户名或密码错误」分支，用户会信以为真继续重试，
 *    越试越被限流，形成「以为自己记错密码」的死循环。
 *
 * ⚠️ 为什么任何异常都 fail-open（放行）而不是 fail-closed：
 *    限流是**防御**不是业务。本项目有过「一个 SQL 报错拖垮 /api/sync」的事故
 *    （2026-10-17，根因与对策见 `db.js` 的 REQUIRED_CONSTRAINTS 注释）：
 *    把「限流系统自己的故障」放大成「全站登录 500」是本末倒置。
 *    故：DB 抖了 / SQL 报错 / IP 取不到 / 配置缺失 → 一律放行，只记 error 日志。
 */

/**
 * 默认阈值
 *
 * - `ip.register` 10 次/小时：注册是低频动作，正常用户一小时注册不了 10 个号。
 *   ⚠️ 校园网 / 公司 NAT 出口是同一个公网 IP，**集中注册（开学、班上统一开户）会
 *     互相挤占同一个桶** → 那种场景把 RATE_REGISTER_PER_IP 调到 30 甚至更高。
 * - `ip.login` 15 次/5 分钟：留给「手抖输错 / 切换账号」的余量，同时让脚本化的
 *   口令爆破在 5 分钟内只能试 15 次。
 * - `ip.refresh` 60 次/5 分钟：refresh 是**客户端自动调用**的（access 15 分钟过期），
 *   阈值必须明显高于 login，否则正常用户刷新令牌会被自己绊倒。
 * - `account` 连续失败 8 次 → 封禁 15 分钟，登录成功即清零。
 */
export const DEFAULT_RULES = {
  ip: {
    register: { limit: 10, windowSec: 3600 },
    login: { limit: 15, windowSec: 300 },
    refresh: { limit: 60, windowSec: 300 }
  },
  /** 账号维度：`blockSec` 同时充当「失败计数窗口」——含义见 `recordFailure()` 的注释 */
  account: { failMax: 8, blockSec: 15 * 60 }
}

/**
 * IP 维度不需要「封禁」语义（超限只需等窗口翻页），故给一个永远达不到的阈值。
 * 取 1e9 而不是 Number.MAX_SAFE_INTEGER：count 列是 int4，超过 int4 上界会让
 * `g.count + 1 >= $7` 在服务端报 "integer out of range"，把一个护栏变成 500。
 */
const NO_BLOCK = 1_000_000_000

const IP_SCOPES = Object.keys(DEFAULT_RULES.ip)

/** store.kind 取值：IP 桶与账号桶分列，避免 IP 与账号字符串撞 key */
export const KIND_IP = 'ip'
export const KIND_ACCOUNT = 'account'

const DEFAULT_LOG = {
  error: (...args) => console.error(...args)
}

/** 放行（fail-open 与「未超限」共用，调用方只看 `allowed`） */
const ALLOW = Object.freeze({ allowed: true, retryAfter: 0 })

/**
 * 账号 key 归一化：去首尾空白 + 转小写。
 *
 * ⚠️ 用账号字符串而不是 user_id 做 key，是因为**账号不存在时也必须计数** ——
 *    否则「账号存在且失败 8 次 → 429」/「账号不存在 → 一直 401」的响应差异，
 *    会让攻击者用「是否被限流」来探测哪些账号真实存在（账号枚举）。
 * 小写归一是为了挡 `Alice` / `alice` / `ALICE` 轮换绕过计数。
 *
 * @param {unknown} value 原始账号输入
 * @returns {string} 归一化后的 key；非字符串/数字或空串返回 ''
 */
export function normalizeAccount(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).trim().toLowerCase()
}

/**
 * 读一个正整数配置；非法（空 / 非数字 / ≤0）一律回退默认值。
 *
 * 静默回退而不是抛错，是刻意的：限流配置的容错要跟限流本身一致（fail-open），
 * 一次手误填错环境变量不该让整个后端起不来。
 *
 * @param {unknown} raw 原始值
 * @param {number} fallback 默认值
 * @returns {number} 正整数
 */
function readPositiveInt(raw, fallback) {
  const rawStr = String(raw ?? '').trim()
  if (rawStr === '') return fallback
  const n = Number(rawStr)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(Math.floor(n), NO_BLOCK)
}

/**
 * 从环境变量解析限流配置；任何一项缺失或非法都用默认值兜底。
 *
 * @param {Record<string, string|undefined>} [env=process.env] 环境变量来源
 * @returns {{ip: Record<string, {limit: number, windowSec: number}>, account: {failMax: number, blockSec: number}}}
 */
export function parseRateLimitConfig(env = process.env) {
  const ip = {}
  for (const scope of IP_SCOPES) {
    const base = DEFAULT_RULES.ip[scope]
    const prefix = `RATE_${scope.toUpperCase()}_PER_IP`
    ip[scope] = {
      limit: readPositiveInt(env?.[prefix], base.limit),
      windowSec: readPositiveInt(env?.[`${prefix}_WINDOW_SEC`], base.windowSec)
    }
  }
  const account = {
    failMax: readPositiveInt(env?.RATE_LOGIN_FAIL_MAX, DEFAULT_RULES.account.failMax),
    // 配置项单位是「分钟」（运维口径），内部一律换算成秒，避免两处各算各的
    blockSec: readPositiveInt(env?.RATE_LOGIN_BLOCK_MIN, Math.round(DEFAULT_RULES.account.blockSec / 60)) * 60
  }
  return { ip, account }
}

/**
 * 计数：一次往返 + RETURNING，靠数据库的 upsert 冲突锁保证并发原子
 * （两个请求同时到达不会各自读到 count=1 然后都放行）。
 *
 * 时间一律在 JS 里算成 ISO 字符串传参，**不用 SQL 的 `now() - interval`**：
 * PG 与 PGlite 对 interval/时区字面量的解析存在细微差异，把时间算在 JS 侧
 * 可以让两条驱动跑出完全一致的结果，也让单测能注入 `nowMs` 直接验证窗口翻页。
 *
 * 分支语义（顺序即优先级，改前先读）：
 *   ① 窗口过期（window_start ≤ now-windowSec）→ 重置为 1，封禁清空；
 *   ② 封禁已过期（blocked_until ≤ now）→ 同样重置为 1：
 *      否则「8 次失败封 15 分钟」到期后 count 仍是 8，用户再输错一次就立刻被封
 *      第二个 15 分钟，等于永久锁死；
 *   ③ 封禁中 → **封禁时间保持不变**（只自增计数）：
 *      若每次尝试都往后延，攻击者拿别人的账号一直乱试，就能把该账号越锁越久
 *      （把「防御」变成「拒绝服务」）；
 *   ④ 正常累加，达到 failMax 才落封禁。
 */
const HIT_SQL = `
INSERT INTO auth_guard AS g (kind, key, scope, window_start, count, blocked_until)
VALUES ($1, $2, $3, $4::timestamptz, 1, $5::timestamptz)
ON CONFLICT (kind, key, scope) DO UPDATE SET
  count = CASE
    WHEN g.window_start <= $6::timestamptz THEN 1
    WHEN g.blocked_until IS NOT NULL AND g.blocked_until <= $4::timestamptz THEN 1
    ELSE g.count + 1
  END,
  window_start = CASE
    WHEN g.window_start <= $6::timestamptz THEN $4::timestamptz
    WHEN g.blocked_until IS NOT NULL AND g.blocked_until <= $4::timestamptz THEN $4::timestamptz
    ELSE g.window_start
  END,
  blocked_until = CASE
    WHEN g.window_start <= $6::timestamptz THEN $5::timestamptz
    WHEN g.blocked_until IS NOT NULL AND g.blocked_until <= $4::timestamptz THEN $5::timestamptz
    WHEN g.blocked_until IS NOT NULL THEN g.blocked_until
    WHEN g.count + 1 >= $7 THEN $8::timestamptz
    ELSE NULL
  END
RETURNING count, window_start, blocked_until
`

/** 只读当前桶（preHandler 用：判定是否被封禁，但**不能**自增，否则浏览也会被计数） */
const PEEK_SQL = `
SELECT window_start, blocked_until
FROM auth_guard
WHERE kind = $1 AND key = $2 AND scope = $3
`

const RESET_SQL = 'DELETE FROM auth_guard WHERE kind = $1 AND key = $2 AND scope = $3'

/**
 * 清理：只删「窗口已过期**且**封禁已过期」的行。
 * 保留仍在封禁中的行 —— 否则一次清理就能让被封的账号提前出狱。
 */
const PRUNE_SQL = `
DELETE FROM auth_guard
WHERE window_start < $1::timestamptz
  AND (blocked_until IS NULL OR blocked_until < $1::timestamptz)
`

/** 把驱动返回的 timestamptz 统一成毫秒数（pg 给 Date，部分驱动给字符串，故一律过一遍 Date） */
function toMs(value) {
  if (value === null || value === undefined) return null
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * 基于数据库的限流存储
 *
 * @param {(sql: string, params?: unknown[]) => Promise<object[]>} queryFn 查询函数（生产传 `db.js` 的 query）
 * @returns {{hit: Function, peek: Function, reset: Function, prune: Function}}
 */
export function createDbStore(queryFn) {
  if (typeof queryFn !== 'function') {
    throw new TypeError('createDbStore(queryFn)：queryFn 必须是 (sql, params) => Promise<rows>')
  }

  return {
    /**
     * 记一次并回读最新状态
     * @param {object} entry
     * @param {'ip'|'account'} entry.kind
     * @param {string} entry.key
     * @param {string} entry.scope register|login|refresh；account 恒为 ''
     * @param {number} entry.windowSec 窗口长度（秒）
     * @param {number} entry.blockAfter 计数达到该值即封禁；IP 维度传 NO_BLOCK
     * @param {number} entry.blockSec 封禁时长（秒）
     * @param {number} [entry.nowMs] 当前时间（单测注入用）
     * @returns {Promise<{count: number, windowStartMs: number, blockedUntilMs: number|null}>}
     */
    async hit({ kind, key, scope, windowSec, blockAfter, blockSec, nowMs = Date.now() } = {}) {
      const nowIso = new Date(nowMs).toISOString()
      const cutoffIso = new Date(nowMs - windowSec * 1000).toISOString()
      const blockUntilIso = new Date(nowMs + blockSec * 1000).toISOString()
      // 插入时 count=1：只有 failMax=1 这种病态配置才该立刻封禁
      const initialBlockedIso = 1 >= blockAfter ? blockUntilIso : null

      const rows = await queryFn(HIT_SQL, [
        kind,
        key,
        scope,
        nowIso,
        initialBlockedIso,
        cutoffIso,
        blockAfter,
        blockUntilIso
      ])
      const row = rows && rows[0]
      if (!row) {
        return { count: 1, windowStartMs: nowMs, blockedUntilMs: initialBlockedIso ? nowMs + blockSec * 1000 : null }
      }
      return {
        count: Number(row.count) || 0,
        windowStartMs: toMs(row.window_start) ?? nowMs,
        blockedUntilMs: toMs(row.blocked_until)
      }
    },

    /**
     * 只读查询当前桶
     * @param {{kind: string, key: string, scope: string}} entry
     * @returns {Promise<{windowStartMs: number|null, blockedUntilMs: number|null}|null>} 无记录返回 null
     */
    async peek({ kind, key, scope } = {}) {
      const rows = await queryFn(PEEK_SQL, [kind, key, scope])
      const row = rows && rows[0]
      if (!row) return null
      return { windowStartMs: toMs(row.window_start), blockedUntilMs: toMs(row.blocked_until) }
    },

    /** 删除整个桶（登录成功清零失败计数） */
    async reset({ kind, key, scope } = {}) {
      await queryFn(RESET_SQL, [kind, key, scope])
    },

    /**
     * 清理过期行
     * @param {{beforeMs: number}} opts
     * @returns {Promise<number>} 删除行数（驱动不回行数时返回 0）
     */
    async prune({ beforeMs } = {}) {
      const rows = await queryFn(PRUNE_SQL, [new Date(beforeMs).toISOString()])
      return Array.isArray(rows) ? rows.length : 0
    }
  }
}

/**
 * 构造限流器：所有对外方法都对内部异常 fail-open（放行 + error 日志）。
 *
 * @param {object} opts
 * @param {ReturnType<typeof createDbStore>} opts.store 存储实现（可注入假实现做单测）
 * @param {ReturnType<typeof parseRateLimitConfig>} [opts.config] 阈值配置
 * @param {boolean} [opts.ipEnabled=true] 是否启用 IP 维度。
 *   未配置 `trustProxy` 时必须传 false：此时 `request.ip` 恒为 127.0.0.1，
 *   所有公网用户会共用同一个桶，第一个撞线的人会把全站登录锁死。
 * @param {() => number} [opts.now] 取当前时间（单测注入用）
 * @param {{error: Function}} [opts.log] 日志器
 */
export function createRateLimiter({
  store,
  config = DEFAULT_RULES,
  ipEnabled = true,
  now = () => Date.now(),
  log = DEFAULT_LOG
} = {}) {
  const ipRules = config?.ip || DEFAULT_RULES.ip
  const accountRule = config?.account || DEFAULT_RULES.account

  // 清理保留时长：所有窗口里最长的那个。比它更旧的行在下次 hit 时必然被「窗口过期」分支重置，
  // 删掉与留着等价；仍在封禁中的行由 PRUNE_SQL 单独保住。
  const windowSecs = IP_SCOPES.map((s) => Number(ipRules[s]?.windowSec) || 0)
  const maxWindowMs = Math.max(...windowSecs, Number(accountRule.blockSec) || 0) * 1000

  /** 统一的 fail-open 包装：限流内部任何异常都只记日志，绝不把故障升级成业务 5xx */
  async function failOpen(fn, fallback) {
    try {
      return await fn()
    } catch (err) {
      log?.error?.('[rate-limit] 限流判定异常，本次放行（fail-open）:', err)
      return fallback
    }
  }

  return {
    /**
     * IP 维度判定（固定窗口）
     * @param {'register'|'login'|'refresh'} scope
     * @param {string} ip 客户端 IP
     * @returns {Promise<{allowed: boolean, retryAfter: number}>}
     */
    async checkIp(scope, ip) {
      const rule = ipRules[scope]
      // 三个「不拦」的情形都是刻意放行：未启用 IP 维度 / 未知 scope / 拿不到 IP
      if (!rule || !ipEnabled || !ip) return ALLOW
      const nowMs = now()
      return failOpen(async () => {
        const res = await store.hit({
          kind: KIND_IP,
          key: String(ip),
          scope,
          windowSec: rule.windowSec,
          blockAfter: NO_BLOCK,
          blockSec: 0,
          nowMs
        })
        if (res.count <= rule.limit) return ALLOW
        // 固定窗口：要等到窗口起点 + 窗口长度才翻页；至少给 1 秒，避免出现 0 让客户端立刻重试
        const retryAfter = Math.max(1, Math.ceil((res.windowStartMs + rule.windowSec * 1000 - nowMs) / 1000))
        return { allowed: false, retryAfter }
      }, ALLOW)
    },

    /**
     * 账号维度判定：**只读**，不自增（preHandler 每次请求都会跑，自增会让「查看」也被计数）
     * @param {string} account 原始账号输入（内部归一化）
     * @returns {Promise<{allowed: boolean, retryAfter: number}>}
     */
    async checkAccount(account) {
      const key = normalizeAccount(account)
      if (!key) return ALLOW
      const nowMs = now()
      return failOpen(async () => {
        const row = await store.peek({ kind: KIND_ACCOUNT, key, scope: '' })
        if (!row || row.blockedUntilMs === null) return ALLOW
        const leftMs = row.blockedUntilMs - nowMs
        if (leftMs <= 0) return ALLOW
        return { allowed: false, retryAfter: Math.max(1, Math.ceil(leftMs / 1000)) }
      }, ALLOW)
    },

    /**
     * 记一次登录失败（账号不存在 / 密码错误都记），达到 failMax 即落封禁。
     *
     * ⚠️ 失败计数的窗口长度取 `blockSec`，含义是「任意 15 分钟窗口内累计 8 次失败即封 15 分钟」。
     *    若不设窗口，用户三年里零星输错 8 次就会在某天突然被锁，且永远无法自行恢复。
     * @param {string} account 原始账号输入
     * @returns {Promise<void>}
     */
    async recordFailure(account) {
      const key = normalizeAccount(account)
      if (!key) return
      await failOpen(async () => {
        await store.hit({
          kind: KIND_ACCOUNT,
          key,
          scope: '',
          windowSec: accountRule.blockSec,
          blockAfter: accountRule.failMax,
          blockSec: accountRule.blockSec,
          nowMs: now()
        })
      }, null)
    },

    /** 登录成功：清零该账号的失败计数（连封禁一起解除） */
    async clearFailures(account) {
      const key = normalizeAccount(account)
      if (!key) return
      await failOpen(async () => {
        await store.reset({ kind: KIND_ACCOUNT, key, scope: '' })
      }, null)
    },

    /**
     * 清理过期行，返回删除行数（失败返回 0）。由 index.js 的会话清理定时器顺带调用。
     * @returns {Promise<number>}
     */
    async prune() {
      return failOpen(async () => {
        if (typeof store?.prune !== 'function') return 0
        return await store.prune({ beforeMs: now() - maxWindowMs })
      }, 0)
    },

    /** 所有窗口中最长的那个（毫秒）—— 供运维核对清理保留期 */
    get maxWindowMs() {
      return maxWindowMs
    }
  }
}

/**
 * 统一的 429 响应体。
 *
 * ⚠️ 文案里必须给出可感知的秒数：Retry-After 头客户端未必展示，
 *    而「请稍后再试」这种没有量词的提示会让用户立刻重试，限流等于白限。
 *
 * @param {number} retryAfter 还需等待的秒数
 * @returns {{error: string, retryAfter: number}}
 */
export function tooManyRequestsBody(retryAfter) {
  return { error: `操作过于频繁，请 ${retryAfter} 秒后再试`, retryAfter }
}
