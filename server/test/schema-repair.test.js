/**
 * 约束 / 序列自愈回归测试（node:test + PGlite）
 *
 * 复现 2026-10-17 线上事故的**完整失效链**：
 *   迁移建出的表没有主键/唯一/外键 → `INSERT ... ON CONFLICT` 报 42P10 → /api/sync 全 500；
 *   同时 users_id_seq 没推进 → 新用户拿到已存在的 id（无主键时静默成功）→ 令牌 sub 撞号。
 *
 * 故本测试不 mock 驱动：用真 PGlite 造一张「表在、约束丢、序列停在 1」的破库，
 * 再跑 repairSchema，断言约束补齐、序列归位、后续插入不再撞号。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repairSchema } from '../src/db.js'

/** 造一个内存 PGlite 驱动（query 返回行数组，与 db.js 内部驱动同形状） */
async function makeDb() {
  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite('memory://')
  return {
    raw: db,
    query: async (sql, params) => (await db.query(sql, params || [])).rows,
    exec: async (sql) => db.exec(sql)
  }
}

/** 迁移链路造出的「破库」：表结构与字段都对，但一条约束都没有，序列停在 1 */
const BROKEN_SCHEMA = `
CREATE TABLE users (id SERIAL, username TEXT NOT NULL, email TEXT, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE devices (id SERIAL, user_id INTEGER NOT NULL, device_id TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE sync_items (user_id INTEGER NOT NULL, entity TEXT NOT NULL, item_key TEXT NOT NULL,
  payload JSONB, updated_at TIMESTAMPTZ NOT NULL, deleted BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE refresh_sessions (jti TEXT NOT NULL, user_id INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
`

test('自愈前：破库确实复现了事故形态（ON CONFLICT 报 42P10、插入撞 id）', async () => {
  const db = await makeDb()
  await db.exec(BROKEN_SCHEMA)
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [1, 'srv_test', 'x'])
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [2, 'ji', 'x'])

  // ① ON CONFLICT 找不到匹配约束（= 线上 /api/sync 500 的根因）
  await assert.rejects(
    () => db.query(
      `INSERT INTO devices (user_id, device_id, last_sync_at) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, device_id) DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at`,
      [1, 'dev-1', new Date().toISOString()]
    ),
    /ON CONFLICT/
  )

  // ② 序列停在 1：不带 id 插入会静默撞上 srv_test（= 跨用户数据泄漏的根因）
  await db.query('INSERT INTO users (username, password_hash) VALUES ($1,$2)', ['newbie', 'x'])
  const [{ count }] = await db.query('SELECT count(*) AS count FROM users WHERE id = 1')
  assert.equal(Number(count), 2, '无主键时新用户确实落到了已存在的 id=1 上')

  await db.raw.close()
})

test('repairSchema：补齐全部约束 + 序列归位，且幂等（二次运行返回空）', async () => {
  const db = await makeDb()
  await db.exec(BROKEN_SCHEMA)
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [1, 'srv_test', 'x'])
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [2, 'ji', 'x'])
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [3, 'caicai', 'x'])

  const repaired = await repairSchema(db)
  // 10 条约束 + 1 项序列归位
  assert.equal(repaired.length, 11, `应补齐 10 条约束 + 序列归位，实际 ${repaired.length}：${repaired.join('、')}`)
  assert.equal(repaired.filter((n) => !n.includes('_seq')).length, 10, '约束应为 10 条')
  assert.ok(repaired.includes('users_pkey'))
  assert.ok(repaired.includes('sync_items_pkey'))
  assert.ok(repaired.includes('users_id_seq→3'), '序列应归位到 max(id)=3')

  // 幂等：再跑一遍不该补任何东西（否则每次启动都改库，日志会刷屏）
  assert.deepEqual(await repairSchema(db), [])

  // 修好后 ON CONFLICT 能用（事故① 关闭）
  await db.query(
    `INSERT INTO devices (user_id, device_id, last_sync_at) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, device_id) DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at`,
    [1, 'dev-1', new Date().toISOString()]
  )
  await db.query(
    `INSERT INTO devices (user_id, device_id, last_sync_at) VALUES ($1,$2,$3)
     ON CONFLICT (user_id, device_id) DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at`,
    [1, 'dev-1', new Date().toISOString()]
  )
  const [{ c: devCount }] = await db.query('SELECT count(*) AS c FROM devices')
  assert.equal(Number(devCount), 1, 'ON CONFLICT 应更新而非插入第二行')

  // 修好后新用户拿到全新 id（事故② 关闭）
  await db.query('INSERT INTO users (username, password_hash) VALUES ($1,$2)', ['newbie', 'x'])
  const newbie = await db.query('SELECT id FROM users WHERE username = $1', ['newbie'])
  assert.equal(Number(newbie[0].id), 4, '新用户必须拿到未占用的 id')

  // 外键级联也回来了（探针用户能被干净删掉）
  await db.query('INSERT INTO sync_items (user_id, entity, item_key, updated_at) VALUES ($1,$2,$3,$4)',
    [4, 'probe', 'k1', new Date().toISOString()])
  await db.query('DELETE FROM users WHERE username = $1', ['newbie'])
  const [{ c: left }] = await db.query('SELECT count(*) AS c FROM sync_items WHERE entity = $1', ['probe'])
  assert.equal(Number(left), 0, '删用户应级联清掉其 sync_items')

  await db.raw.close()
})

test('repairSchema：补不上时响亮抛错，不静默跳过', async () => {
  const db = await makeDb()
  await db.exec(BROKEN_SCHEMA)
  // 造重复数据 → 主键加不上 → 必须抛（静默跳过正是这次事故的形态）
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [1, 'a', 'x'])
  await db.query('INSERT INTO users (id, username, password_hash) VALUES ($1,$2,$3)', [1, 'b', 'x'])

  // 报错文案两种驱动不同（PG: duplicate key value / PGlite: could not create unique index），都算「响亮失败」
  await assert.rejects(() => repairSchema(db), /could not create unique index|duplicate key|unique constraint|primary key/i)
  await db.raw.close()
})
