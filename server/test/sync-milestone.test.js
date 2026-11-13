/**
 * examdate_sync 服务端零改动实证（T04）—— 真实 PGlite + 真实 /api/sync 路由源码 + 双客户端 E2E
 *
 * 目标（design §1.3 / §1.5 / 主理人裁决 8）：
 *  - `exam_milestone` 作为新 entity 无需白名单、无需改 schema / sync.js / db.js / sync-core.js；
 *  - 三条里程碑 = 3 个独立 `item_key`（主键 `(user_id, entity, item_key)`）→
 *    A 改 `op` 与 B 改 `theory` 落在两行，**天然互不覆盖**（P0-3）；
 *  - LWW 逐行独立裁决；清空行 `payload.date === ''` 正常生效；账号维度天然隔离。
 *
 * ⚠️ 为什么用内存 PGlite + 注入 query，而不是 `createApp() + initDB()`：
 *    `db.js` 的 `initDB()` 打开落盘目录 `server/data/`，`node --test` 默认**按文件并发起进程**，
 *    两个进程同时打开同一目录会互相删掉对方的 `global/pg_internal.init` →
 *    `api.test.js` 既有 12 例随机失败（已实测）。`server/test/schema-repair.test.js`
 *    同款做法用 `memory://` 规避。故此处：
 *      · `schema.sql` 真实文件 → 内存 PGlite 建表（主键 / JSONB / 索引全在）；
 *      · `sync.js` **真实源码逐字执行**，只把 `query` 一行依赖换成内存库的查询函数；
 *      · 自建 Fastify + @fastify/jwt + 真实 `app.inject()` 走 HTTP `/api/sync`；
 *      · 两个独立 deviceId（同一账号的两台设备）与两个独立账号分别推 / 拉。
 *    `server/src/**` 仍然是零改动；本文件只做「协议天然支持」的实证。
 */
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { PGlite } from '@electric-sql/pglite'

const SYNC_SRC_URL = new URL('../src/sync.js', import.meta.url)
const CORE_URL = new URL('../src/sync-core.js', import.meta.url).href
const SCHEMA = readFileSync(new URL('../src/schema.sql', import.meta.url), 'utf-8')

const T0 = '2026-10-09T02:00:00.000Z'
const T1 = '2026-10-09T02:00:00.100Z'
const T2 = '2026-10-09T02:00:00.200Z'
const T3 = '2026-10-09T02:00:00.300Z'

let pg
let app
let tokenA
let tokenB
let userIdA
let userIdB

/** 内存 PGlite 的查询适配（形状与 db.js 的 query 一致：返回行数组） */
async function memQuery(sql, params = []) {
  const res = await pg.query(sql, params || [])
  return res.rows
}

before(async () => {
  pg = new PGlite('memory://')
  await pg.exec(SCHEMA)

  // 逐字使用真实 sync.js 源码，仅替换其 query 依赖（见文件头说明）
  const src = readFileSync(SYNC_SRC_URL, 'utf-8')
  const original =
    "import { query } from './db.js'\n" +
    "import { toDate, shouldAccept, parseSince } from './sync-core.js'"
  assert.ok(src.includes(original), 'sync.js 的 import 形态已变化，需同步更新本测试的注入方式')
  const injected = src.replace(
    original,
    `import { toDate, shouldAccept, parseSince } from '${CORE_URL}'\n` +
      'const query = globalThis.__EXAM_SYNC_QUERY__'
  )
  globalThis.__EXAM_SYNC_QUERY__ = memQuery
  const mod = await import('data:text/javascript;base64,' + Buffer.from(injected).toString('base64'))

  app = Fastify()
  await app.register(jwt, { secret: 'milestone-e2e-secret' })
  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch {
      return reply.code(401).send({ error: '未登录或令牌已过期' })
    }
    if (req.user.type !== 'access') {
      return reply.code(401).send({ error: '令牌类型错误' })
    }
  })
  await app.register(mod.syncRoutes)

  const [a] = await memQuery(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
    ['milestone_e2e_a', 'x']
  )
  const [b] = await memQuery(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
    ['milestone_e2e_b', 'x']
  )
  userIdA = String(a.id)
  userIdB = String(b.id)
  tokenA = app.jwt.sign({ sub: userIdA, type: 'access' })
  tokenB = app.jwt.sign({ sub: userIdB, type: 'access' })
})

beforeEach(async () => {
  // 每个用例干净起步（保留 users，避免影响其它用例的 JWT）
  await memQuery('DELETE FROM sync_items')
  await memQuery('DELETE FROM devices')
})

after(async () => {
  if (app) await app.close()
  if (pg) await pg.close()
  delete globalThis.__EXAM_SYNC_QUERY__
})

/** 造一条 exam_milestone 同步行（形状与 studyPlan.getMilestoneSyncRows() 一致） */
function milestoneRow(key, date, updatedAt, deleted) {
  return {
    entity: 'exam_milestone',
    key,
    payload: { id: key, label: '冗余标签', date, updatedAt },
    updatedAt,
    deleted: deleted === true
  }
}

/** 一次 /api/sync 推送 + 拉取（真实 HTTP inject） */
async function sync(token, deviceId, changes, since) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/sync',
    headers: { authorization: `Bearer ${token}` },
    payload: { deviceId, since: since === undefined ? null : since, changes }
  })
  assert.equal(res.statusCode, 200, `POST /api/sync 应 200，实际 ${res.statusCode}: ${res.body}`)
  return res.json()
}

/** PGlite 的 JSONB 可能返回对象或字符串，统一成对象 */
function payloadOf(ch) {
  return typeof ch.payload === 'string' ? JSON.parse(ch.payload) : ch.payload
}

/** 按 key 取回拉取结果里的一行 */
function byKey(changes, key) {
  return changes.find((c) => c.key === key && c.entity === 'exam_milestone')
}

test('① 新 entity 免注册：exam_milestone 直接可写，schema / sync.js 零改动', async () => {
  const r = await sync(tokenA, 'device-A', [milestoneRow('op', '2026-12-01', T1)])
  assert.equal(r.changes.length, 1)
  const row = byKey(r.changes, 'op')
  assert.ok(row, '应拉回 exam_milestone/op 行')
  assert.equal(payloadOf(row).date, '2026-12-01')
  assert.equal(row.deleted, false)

  // 落库确实是独立主键 (user_id, entity, item_key)
  const dbRows = await memQuery(
    'SELECT entity, item_key, deleted FROM sync_items WHERE user_id = $1',
    [Number(userIdA)]
  )
  assert.equal(dbRows.length, 1)
  assert.equal(dbRows[0].entity, 'exam_milestone')
  assert.equal(dbRows[0].item_key, 'op')
  assert.equal(dbRows[0].deleted, false)
})

test('② ★ P0-3 顺序①：A 推 op → B 设备推 theory → 两行独立、互不覆盖', async () => {
  await sync(tokenA, 'device-A', [milestoneRow('op', '2026-12-01', T1)])
  const r = await sync(tokenA, 'device-B', [milestoneRow('theory', '2027-01-15', T2)])

  const op = byKey(r.changes, 'op')
  const theory = byKey(r.changes, 'theory')
  assert.ok(op, 'A 对 op 的改动不能被后同步的整行覆盖')
  assert.ok(theory, 'B 对 theory 的改动必须保留')
  assert.equal(payloadOf(op).date, '2026-12-01')
  assert.equal(payloadOf(theory).date, '2027-01-15')
  assert.equal(byKey(r.changes, 'academic'), undefined, '未改动的行不应凭空出现')
  assert.equal(r.changes.length, 2)
})

test('③ ★ P0-3 顺序②：B 设备先推 theory → A 推 op → 两条改动都还在', async () => {
  await sync(tokenA, 'device-B', [milestoneRow('theory', '2027-01-15', T1)])
  const r = await sync(tokenA, 'device-A', [milestoneRow('op', '2026-12-01', T2)])

  assert.equal(payloadOf(byKey(r.changes, 'op')).date, '2026-12-01')
  assert.equal(payloadOf(byKey(r.changes, 'theory')).date, '2027-01-15')
  assert.equal(r.changes.length, 2)
})

test('④ 三条 = 三行：三个 item_key 各自独立，原值不被相邻行覆盖', async () => {
  const r = await sync(tokenA, 'device-A', [
    milestoneRow('op', '2026-12-01', T1),
    milestoneRow('theory', '2027-01-15', T2),
    milestoneRow('academic', '2027-06-20', T3)
  ])
  const keys = r.changes.map((c) => c.key).sort()
  assert.deepEqual(keys, ['academic', 'op', 'theory'])
  assert.equal(payloadOf(byKey(r.changes, 'academic')).date, '2027-06-20')

  const dbRows = await memQuery(
    'SELECT item_key FROM sync_items WHERE user_id = $1 ORDER BY item_key',
    [Number(userIdA)]
  )
  assert.deepEqual(dbRows.map((x) => x.item_key).sort(), ['academic', 'op', 'theory'])
})

test('⑤ LWW 逐行裁决：同一 key 更旧时间戳被丢弃、更新时间戳覆盖，另一行不受影响', async () => {
  await sync(tokenA, 'device-A', [milestoneRow('op', '2026-12-01', T2)])
  // 更旧 → 丢弃
  let r = await sync(tokenA, 'device-B', [milestoneRow('op', '1999-01-01', T0)])
  assert.equal(payloadOf(byKey(r.changes, 'op')).date, '2026-12-01')

  // 更新 → 覆盖，且同时带上另一条不同 key 的改动
  r = await sync(tokenA, 'device-B', [
    milestoneRow('op', '2026-12-05', T3),
    milestoneRow('theory', '2027-01-15', T1)
  ])
  assert.equal(payloadOf(byKey(r.changes, 'op')).date, '2026-12-05')
  assert.equal(payloadOf(byKey(r.changes, 'theory')).date, '2027-01-15')
})

test('⑥ 清空用 date:\'\' 正常行：跨设备生效，且不是墓碑（deleted=false）', async () => {
  await sync(tokenA, 'device-A', [milestoneRow('op', '2026-12-01', T1)])
  const r = await sync(tokenA, 'device-B', [milestoneRow('op', '', T2)])

  const row = byKey(r.changes, 'op')
  assert.equal(payloadOf(row).date, '')
  assert.equal(row.deleted, false)
  const dbRow = await memQuery(
    'SELECT deleted FROM sync_items WHERE user_id = $1 AND entity = $2 AND item_key = $3',
    [Number(userIdA), 'exam_milestone', 'op']
  )
  assert.equal(dbRow.length, 1, '清空仍然是正常行，不做物理删除')
  assert.equal(dbRow[0].deleted, false)
})

test('⑦ payload 原样 JSONB 透传：id / label / date / updatedAt 完整往返', async () => {
  const sent = milestoneRow('theory', '2027-01-15', T2)
  const r = await sync(tokenA, 'device-A', [sent])
  const got = payloadOf(byKey(r.changes, 'theory'))
  assert.deepEqual(got, {
    id: 'theory', label: '冗余标签', date: '2027-01-15', updatedAt: T2
  })
})

test('⑧ 账号隔离：A 的三条不会出现在 B 账号的拉取结果里', async () => {
  await sync(tokenA, 'device-A', [
    milestoneRow('op', '2026-12-01', T1),
    milestoneRow('theory', '2027-01-15', T2),
    milestoneRow('academic', '2027-06-20', T3)
  ])
  const r = await sync(tokenB, 'device-B2', [])
  assert.equal(r.changes.length, 0, 'B 账号不应看到 A 账号的任何里程碑')
  const dbRows = await memQuery(
    'SELECT item_key FROM sync_items WHERE user_id = $1',
    [Number(userIdB)]
  )
  assert.equal(dbRows.length, 0)
})

test('⑨ 双客户端增量：第二台设备 since=null 全量拉到三行，再用 cursor 增量拉为空', async () => {
  await sync(tokenA, 'device-A', [
    milestoneRow('op', '2026-12-01', T1),
    milestoneRow('theory', '2027-01-15', T2),
    milestoneRow('academic', '2027-06-20', T3)
  ])
  const first = await sync(tokenA, 'device-B', [])
  assert.equal(first.changes.length, 3)
  assert.ok(first.cursor && typeof first.cursor.ts === 'string')

  const second = await sync(tokenA, 'device-B', [], first.cursor)
  assert.equal(second.changes.length, 0, '游标之后的增量应为空')
})
