/**
 * 认证 / 同步集成测试（node:test + fastify.inject + PGlite）
 * 运行：npm test（db.js 在无 DATABASE_URL 时用嵌入式 PGlite，数据落 server/data/，已被 .gitignore 忽略）
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { initDB, closeDB, query } from '../src/db.js'
import { createDbStore, DEFAULT_RULES } from '../src/rateLimit.js'

let app

before(async () => {
  await initDB()
  // 每轮清空（CASCADE 顺带清 devices / sync_items / refresh_sessions）
  await query('TRUNCATE users RESTART IDENTITY CASCADE')
  // auth_guard 无外键 → CASCADE 带不到，必须单独清。
  // （本文件用 createApp({jwtSecret}) 不传 rateLimit → 限流默认关闭、表不会被写；
  //   显式清是为了「每轮干净」不依赖这条隐含前提 —— 将来谁开了限流也不会互相污染。）
  await query('TRUNCATE auth_guard')
  app = await createApp({ jwtSecret: 'test-secret' })
})

after(async () => {
  await app.close()
  await closeDB()
})

/** 注册一个用户并返回完整响应体（user + 令牌） */
async function register(username = 'alice') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { username, password: 'secret123', email: `${username}@t.co` }
  })
  assert.equal(res.statusCode, 200)
  return res.json()
}

test('登录成功后 access 可访问 /auth/me', async () => {
  const { accessToken } = await register('meuser')
  const res = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: { authorization: `Bearer ${accessToken}` }
  })
  assert.equal(res.statusCode, 200)
  assert.equal(res.json().user.username, 'meuser')
})

test('refresh 轮换：旧 refresh 换新后立即失效', async () => {
  const { refreshToken: r1 } = await register('rotate')
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    payload: { refreshToken: r1 }
  })
  assert.equal(res.statusCode, 200)
  const body = res.json()
  assert.ok(body.accessToken)
  assert.ok(body.refreshToken)
  // r1 已被轮换 → 再次使用必须 401
  const again = await app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    payload: { refreshToken: r1 }
  })
  assert.equal(again.statusCode, 401)
})

test('logout 撤销会话：撤销后旧 refresh 不可再用', async () => {
  const { refreshToken } = await register('logout_user')
  const out = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    payload: { refreshToken }
  })
  assert.equal(out.statusCode, 200)
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    payload: { refreshToken }
  })
  assert.equal(res.statusCode, 401)
})

test('删号即撤销：用户删除后其 refresh token 立即失效', async () => {
  const { refreshToken, user } = await register('deleted_user')
  await query('DELETE FROM users WHERE id = $1', [user.id])
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    payload: { refreshToken }
  })
  assert.equal(res.statusCode, 401)
})

test('keyset 游标：同毫秒时间戳越过首拉最后一条的行不丢', async () => {
  const { accessToken } = await register('cursor_user')
  const head = async (since) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/sync',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { deviceId: 'd1', since, changes: [] }
    })
    assert.equal(res.statusCode, 200)
    return res.json()
  }

  // 三行：A 时间更早；B、C 共享同一毫秒时间戳，C 是首拉的最后一条
  const t0 = '2026-03-01T00:00:00.000Z'
  const t1 = '2026-03-02T00:00:00.000Z'
  const insert = async (key, updatedAt) => {
    await query(
      `INSERT INTO sync_items (user_id, entity, item_key, payload, updated_at)
       VALUES ((SELECT id FROM users WHERE username='cursor_user'), $1, $2, $3, $4)`,
      ['note', key, JSON.stringify({ key, t: updatedAt }), updatedAt]
    )
  }
  await insert('a', t0)
  await insert('b', t1)
  await insert('c', t1)

  const first = await head(null)
  const keys1 = first.changes.map((c) => c.key).sort()
  assert.deepEqual(keys1, ['a', 'b', 'c'])
  assert.equal(first.cursor.ts, t1)
  assert.equal(first.cursor.key, 'c')

  // 再补一行与 C 同毫秒、但 item_key 更大 —— 旧版 `> ts` 会永久漏掉这一行
  await insert('d', t1)
  const second = await head(first.cursor)
  const keys2 = second.changes.map((c) => c.key)
  assert.deepEqual(keys2, ['d'])
})

// ─────────────────────────────────────────────────────────────────────────────
// 认证限流的 HTTP 级集成用例
//
// ⚠️ 为什么放在本文件而不是新建 rate-limit.test.js 里：这些用例必须用**真库**
//    （store 走 createDbStore(query)），而 PGlite 的数据目录 server/data/ 不能被两个
//    进程同时打开 —— `node --test` 默认并发跑文件，新建文件会随机失败。本文件已经
//    独占该库，且同文件内串行，故追加在这里。
//
// ⚠️ rate-limit.test.js 用的是注入式假 store，只能证明**限流器逻辑**对；这里用真库
//    才能证明 HIT_SQL 在真 PostgreSQL 上那四条分支也对 —— 生产走的正是这条路径。
//    另外这里的「放行」是真正的 200（假 store 那边只能断言「不是 429」）。
// ─────────────────────────────────────────────────────────────────────────────

/** 开启限流的 app：trustProxy 必填，否则 IP 维度会被整体跳过（fail-open） */
let guardedApp
let guardedStore

/** 每个用例前清空限流桶，避免用例之间互相污染 */
async function resetGuards() {
  await query('TRUNCATE auth_guard')
}

before(async () => {
  guardedStore = createDbStore(query)
  guardedApp = await createApp({
    jwtSecret: 'test-secret',
    trustProxy: '127.0.0.1',
    rateLimit: {
      store: guardedStore,
      config: DEFAULT_RULES,
      trustProxy: '127.0.0.1'
    }
  })
})

after(async () => {
  await guardedApp?.close()
})

test('限流默认关闭：连续注册 12 个账号全部 200（阈值 10/小时，第 11 次若被限会 429）', async () => {
  // 用文件顶部那个**未传 rateLimit** 的 app：一旦有人把默认值改成开启，
  // 「注册第 11 个」就会 429，本文件的既有用例也会连带变红。
  for (let i = 1; i <= 12; i++) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { username: `guard${i}`, password: 'secret123', email: `guard${i}@t.co` }
    })
    assert.equal(res.statusCode, 200, `第 ${i} 次注册应成功`)
  }
})

test('IP 维度：同 IP 第 11 次 register → 429 + Retry-After；换 IP 立刻恢复 200', async () => {
  await resetGuards()
  const ip = '203.0.113.20'
  const register = (remoteAddress, n) =>
    guardedApp.inject({
      method: 'POST',
      url: '/api/auth/register',
      remoteAddress,
      payload: { username: `ipu${n}`, password: 'secret123', email: `ipu${n}@t.co` }
    })

  for (let i = 1; i <= DEFAULT_RULES.ip.register.limit; i++) {
    assert.equal((await register(ip, i)).statusCode, 200, `第 ${i} 次注册应放行`)
  }
  const blocked = await register(ip, 11)
  assert.equal(blocked.statusCode, 429)
  const retryAfter = Number(blocked.headers['retry-after'])
  assert.ok(retryAfter >= 1 && retryAfter <= DEFAULT_RULES.ip.register.windowSec)
  assert.equal(blocked.json().retryAfter, retryAfter)

  // 换 IP 立刻放行 → 证明是按 IP 分桶，而不是全站共用一个桶
  assert.equal((await register('198.51.100.20', 12)).statusCode, 200)
})

test('账号维度：连续错 8 次后第 9 次 429；换 IP 仍是 429（挡得住换 IP 撞库）', async () => {
  await resetGuards()
  const reg = await guardedApp.inject({
    method: 'POST',
    url: '/api/auth/register',
    remoteAddress: '198.51.100.30',
    payload: { username: 'victim', password: 'secret123', email: 'victim@t.co' }
  })
  assert.equal(reg.statusCode, 200)

  const wrongLogin = (remoteAddress) =>
    guardedApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress,
      payload: { username: 'victim', password: 'wrong-pass' }
    })

  // 前 8 次仍是 401（第 8 次落封禁但该次请求本身放行：若这次密码是对的还能登录）
  for (let i = 1; i <= DEFAULT_RULES.account.failMax; i++) {
    assert.equal((await wrongLogin('203.0.113.31')).statusCode, 401, `第 ${i} 次失败应仍是 401`)
  }
  assert.equal((await wrongLogin('203.0.113.31')).statusCode, 429, '第 9 次应被封禁挡住')
  // 换一个全新 IP：账号维度的 key 不含 IP，所以撞库照样被挡
  assert.equal((await wrongLogin('198.51.100.99')).statusCode, 429, '换 IP 也绕不过账号封禁')
})

test('账号维度：封禁到期后恢复；登录成功即清零', async () => {
  await resetGuards()
  const reg = await guardedApp.inject({
    method: 'POST',
    url: '/api/auth/register',
    remoteAddress: '198.51.100.40',
    payload: { username: 'victim2', password: 'secret123', email: 'victim2@t.co' }
  })
  assert.equal(reg.statusCode, 200)

  const login = (remoteAddress, password) =>
    guardedApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress,
      payload: { username: 'victim2', password }
    })

  for (let i = 1; i <= DEFAULT_RULES.account.failMax; i++) {
    assert.equal((await login('203.0.113.41', 'wrong-pass')).statusCode, 401)
  }
  assert.equal((await login('203.0.113.41', 'wrong-pass')).statusCode, 429)

  // 把 blocked_until 往前拨 = 等价于干等 15 分钟（sleep 会让这条用例慢到没人愿意跑）
  await query(`UPDATE auth_guard SET blocked_until = now() - interval '1 minute' WHERE key = $1`, ['victim2'])
  assert.equal((await login('203.0.113.42', 'wrong-pass')).statusCode, 401, '封禁到期应恢复')
  // 关键：此时计数必须已重置为 1，而不是接着 9 往上加（否则再错一次又被封 15 分钟）
  const rows = await query('SELECT count, blocked_until FROM auth_guard WHERE kind = $1 AND key = $2', ['account', 'victim2'])
  assert.equal(Number(rows[0].count), 1)
  assert.equal(rows[0].blocked_until, null)

  const ok = await login('203.0.113.43', 'secret123')
  assert.equal(ok.statusCode, 200, '封禁解除后正确密码应能登录')
  const after = await query('SELECT count FROM auth_guard WHERE kind = $1 AND key = $2', ['account', 'victim2'])
  assert.equal(after.length, 0, '登录成功必须把失败计数清零')
})

test('prune 返回真实删除行数：PRUNE_SQL 必须带 RETURNING，且不能清掉仍在封禁中的行', async () => {
  // 这条专门守 PRUNE_SQL 的 RETURNING：pg / PGlite 的 DELETE 不回行数，
  // 少了 RETURNING 调用方永远拿到 0 → index.js 的清理日志就成了摆设。
  await resetGuards()
  await query(
    `INSERT INTO auth_guard (kind, key, scope, window_start, count)
     VALUES ('ip', '203.0.113.200', 'register', now() - interval '2 hours', 3)`
  )
  // 窗口同样已过期、但封禁还没到期 → 必须留下（否则一次清理就让被封账号提前出狱）
  await query(
    `INSERT INTO auth_guard (kind, key, scope, window_start, count, blocked_until)
     VALUES ('account', 'keepme', '', now() - interval '2 hours', 8, now() + interval '10 minutes')`
  )

  assert.equal(await guardedStore.prune({ beforeMs: Date.now() }), 1)

  const left = await query("SELECT key FROM auth_guard WHERE kind = 'account' AND key = 'keepme'")
  assert.equal(left.length, 1, '封禁中的行必须保留')
})

test('账号维度不泄露账号存在性：不存在的账号连错 9 次同样 429', async () => {
  await resetGuards()
  const probe = () =>
    guardedApp.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress: '203.0.113.50',
      payload: { username: 'no-such-user', password: 'whatever-pass' }
    })
  // 若「账号不存在」不计数，429/401 的响应差异就成了一个免费的账号枚举探针
  for (let i = 1; i <= DEFAULT_RULES.account.failMax; i++) {
    assert.equal((await probe()).statusCode, 401, `第 ${i} 次应仍是 401`)
  }
  const blocked = await probe()
  assert.equal(blocked.statusCode, 429, '不存在的账号也要被限流')
  assert.ok(blocked.json().retryAfter > 0)
})
