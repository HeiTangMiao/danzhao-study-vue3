/**
 * 服务入口 —— 读取环境变量并监听端口。
 * 应用装配（CORS / JWT / 认证装饰器 / 业务路由）见 ./app.js（可注入测试）。
 */
import { createApp } from './app.js'
import { initDB, closeDB, query } from './db.js'

const PORT = Number(process.env.PORT || 3000)
const NODE_ENV = process.env.NODE_ENV || 'development'

// 过期 refresh 会话清理周期：避免 refresh_sessions 长期累积（默认每 1 小时）
const SESSION_CLEANUP_MS = Number(process.env.SESSION_CLEANUP_MS) || 60 * 60 * 1000

// 生产安全护栏：未配置强随机 JWT_SECRET 直接拒绝启动，避免回退到公开默认值被伪造令牌
if (NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error(
    '[auth] NODE_ENV=production 但未设置 JWT_SECRET，拒绝启动。请先在 server/.env 配置强随机密钥。'
  )
  process.exit(1)
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

// 允许的跨域来源（逗号分隔），完全由环境变量 ALLOWED_ORIGIN 驱动。
// 未设置时只回退到「本地开发地址」，代码中不含任何硬编码域名 ——
// 线上域名请在 server/.env 里配置（生产同源经 nginx 反代通常无需 CORS）。
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = await createApp({ logger: true, jwtSecret: JWT_SECRET, allowedOrigins: ALLOWED_ORIGINS })

// 启动前初始化数据库（自动建表，幂等）
await initDB()

// 定期清理过期的 refresh 会话（杜绝 refresh_sessions 无界累积）
const cleanupTimer = setInterval(async () => {
  try {
    const r = await query('DELETE FROM refresh_sessions WHERE expires_at < now() RETURNING jti')
    if (r && r.length > 0) app.log.info(`[auth] 清理过期 refresh 会话：${r.length} 条`)
  } catch (e) {
    app.log.error('[auth] 清理过期 refresh 会话失败:', e)
  }
}, SESSION_CLEANUP_MS)
cleanupTimer.unref()

// 优雅退出：关闭 DB 连接
const shutdown = async () => {
  clearInterval(cleanupTimer)
  await closeDB()
  await app.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
