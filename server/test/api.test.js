/**
 * 认证 / 同步集成测试（node:test + fastify.inject + PGlite）
 * 运行：npm test（db.js 在无 DATABASE_URL 时用嵌入式 PGlite，数据落 server/data/，已被 .gitignore 忽略）
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { initDB, closeDB, query } from '../src/db.js'

let app

before(async () => {
  await initDB()
  // 每轮清空（CASCADE 顺带清 devices / sync_items / refresh_sessions）
  await query('TRUNCATE users RESTART IDENTITY CASCADE')
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
