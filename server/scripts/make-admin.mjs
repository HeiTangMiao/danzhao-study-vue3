/**
 * 将用户标记为管理员（role=admin）
 * 用法：node --env-file=.env scripts/make-admin.mjs <username>
 * 说明：走统一 db.js，本地 PGlite 与服务器 PostgreSQL 通用。
 */
import { initDB, query, closeDB } from '../src/db.js'

const username = process.argv[2]
if (!username) {
  console.error('用法: node --env-file=.env scripts/make-admin.mjs <username>')
  process.exit(1)
}

await initDB()
const rows = await query('UPDATE users SET role = $2 WHERE username = $1 RETURNING id, username, role', [username, 'admin'])
if (!rows.length) {
  console.error('用户不存在:', username)
  process.exit(1)
}
console.log('已标记为管理员:', rows[0])
await closeDB()
