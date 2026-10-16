/**
 * 数据库访问层 —— 统一 pg（生产）与 PGlite（本地开发）两套驱动
 * 选择规则：配置了 DATABASE_URL 用 node-postgres；否则用嵌入式 PGlite，
 * 数据落盘在 server/data/，与生产共用同一份 schema.sql 与 SQL 方言。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')

const DATABASE_URL = process.env.DATABASE_URL || ''
let driver = null

/**
 * 必须存在的约束清单（schema.sql 的权威定义，此处只做**存在性自愈**）
 *
 * ⚠️ 为什么需要它（2026-10-17 线上事故）：`schema.sql` 用的是
 *    `CREATE TABLE IF NOT EXISTS` —— 它**修不了「表已存在但约束丢了」的库**。
 *    服务器重建时数据从 PGlite 迁入 PostgreSQL，迁移建出的表没有主键/唯一/外键；
 *    此后每次启动 `applySchema(SCHEMA)` 都因「表已存在」而跳过创建，约束永远补不上。
 *    后果有两个，都真实发生过：
 *      ① `INSERT ... ON CONFLICT` 找不到匹配约束 → `POST /api/sync` 全部 500
 *         （用户侧表现为「同步失败」）；
 *      ② `users_id_seq` 没随恢复数据推进 → 新注册用户拿到**已存在的 id**
 *         （无主键时静默成功）→ 令牌 sub 撞号 → **跨用户读写他人数据**。
 *    故启动时逐条核对，缺谁补谁；补不上（如有重复数据）**响亮抛错**，
 *    绝不静默跳过 —— 静默跳过正是这次事故的形态。
 */
const REQUIRED_CONSTRAINTS = [
  { name: 'users_pkey', ddl: 'ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id)' },
  { name: 'users_username_key', ddl: 'ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)' },
  { name: 'users_email_key', ddl: 'ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)' },
  {
    name: 'devices_pkey',
    ddl: 'ALTER TABLE devices ADD CONSTRAINT devices_pkey PRIMARY KEY (id)'
  },
  {
    name: 'devices_user_id_device_id_key',
    ddl: 'ALTER TABLE devices ADD CONSTRAINT devices_user_id_device_id_key UNIQUE (user_id, device_id)'
  },
  {
    name: 'devices_user_id_fkey',
    ddl: 'ALTER TABLE devices ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
  },
  {
    name: 'sync_items_pkey',
    ddl: 'ALTER TABLE sync_items ADD CONSTRAINT sync_items_pkey PRIMARY KEY (user_id, entity, item_key)'
  },
  {
    name: 'sync_items_user_id_fkey',
    ddl: 'ALTER TABLE sync_items ADD CONSTRAINT sync_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
  },
  {
    name: 'refresh_sessions_pkey',
    ddl: 'ALTER TABLE refresh_sessions ADD CONSTRAINT refresh_sessions_pkey PRIMARY KEY (jti)'
  },
  {
    name: 'refresh_sessions_user_id_fkey',
    ddl: 'ALTER TABLE refresh_sessions ADD CONSTRAINT refresh_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
  }
]

/** 序列必须不落后于表内 max(id)：恢复数据时若没推进序列，新行会撞已存在的 id */
const REQUIRED_SEQUENCES = [{ table: 'users', seq: 'users_id_seq' }]

/**
 * 约束 / 序列自愈：缺什么补什么，返回补上的清单（空 = 一切完好）
 *
 * 纯 SQL + 存在性查询，pg 与 PGlite 通用（两者同方言）。
 * 抛错的两种情形都是有意的：约束加不上（多半是有重复数据，需人工裁决）/
 * 序列查不动 —— 都不能静默放过。
 *
 * @param {{query: (sql: string, params?: unknown[]) => Promise<object[]>}} db 已初始化的驱动
 * @returns {Promise<string[]>} 本次修补的约束名 / 序列名
 */
export async function repairSchema(db) {
  const repaired = []

  for (const c of REQUIRED_CONSTRAINTS) {
    const existing = await db.query('SELECT 1 FROM pg_constraint WHERE conname = $1', [c.name])
    if (existing.length > 0) continue
    await db.query(c.ddl)
    repaired.push(c.name)
  }

  for (const s of REQUIRED_SEQUENCES) {
    const [seqRow] = await db.query(`SELECT last_value FROM ${s.seq}`)
    const [maxRow] = await db.query(`SELECT COALESCE(MAX(id), 0) AS max FROM ${s.table}`)
    const last = Number(seqRow?.last_value ?? 0)
    const max = Number(maxRow?.max ?? 0)
    if (last < max) {
      await db.query(`SELECT setval('${s.seq}', $1, true)`, [max])
      repaired.push(`${s.seq}→${max}`)
    }
  }

  return repaired
}

/** 初始化连接并应用表结构（幂等） */
export async function initDB() {
  if (driver) return

  if (DATABASE_URL) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: DATABASE_URL })
    driver = {
      query: async (sql, params) => (await pool.query(sql, params || [])).rows,
      applySchema: async (sql) => { await pool.query(sql) },
      _close: () => pool.end()
    }
  } else {
    const { PGlite } = await import('@electric-sql/pglite')
    const db = new PGlite(join(__dirname, '..', 'data'))
    driver = {
      query: async (sql, params) => (await db.query(sql, params || [])).rows,
      // exec 支持一次执行多语句（schema 含多条 CREATE）
      applySchema: async (sql) => { await db.exec(sql) },
      _close: () => db.close()
    }
  }

  await driver.applySchema(SCHEMA)
  // 约束自愈必须在 applySchema 之后：IF NOT EXISTS 只负责「建表」，补不了丢掉的约束
  const repaired = await repairSchema(driver)
  if (repaired.length > 0) {
    console.warn(`[db] 约束自愈：补上 ${repaired.join('、')}（若反复出现，说明建库/迁移链路有问题）`)
  }
}

/** 执行查询，返回行数组 */
export async function query(sql, params = []) {
  if (!driver) await initDB()
  return driver.query(sql, params)
}

/** 关闭连接（测试收尾用） */
export async function closeDB() {
  if (driver?._close) await driver._close()
  driver = null
}
