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
