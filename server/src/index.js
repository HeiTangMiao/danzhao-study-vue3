/**
 * 服务入口 —— 读取环境变量并监听端口。
 * 应用装配（CORS / JWT / 认证装饰器 / 业务路由）见 ./app.js（可注入测试）。
 */
import { createApp } from './app.js'
import { initDB, closeDB, query } from './db.js'
import { createDbStore, parseRateLimitConfig, resolveRateLimitEnabled } from './rateLimit.js'
import { parseAiConfig, describeMissingCredential } from './ai/config.js'

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

// AI 网关配置（反向隧道）。全部走环境变量 —— 容器 CMD 是 `node src/index.js`，
// 依赖 `env_file: ./server/.env` 注入，代码里不得出现端点地址或 token。
const aiConfig = parseAiConfig(process.env, { log: console })
// 与 JWT_SECRET 同款护栏：隧道端点是**公网入口**，生产缺凭据等于免鉴权，必须拒绝启动
const aiCredentialError = describeMissingCredential(aiConfig, NODE_ENV)
if (aiCredentialError) {
  console.error(aiCredentialError)
  process.exit(1)
}

// 允许的跨域来源（逗号分隔），完全由环境变量 ALLOWED_ORIGIN 驱动。
// 未设置时只回退到「本地开发地址」，代码中不含任何硬编码域名 ——
// 线上域名请在 server/.env 里配置（生产同源经 nginx 反代通常无需 CORS）。
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/**
 * 可信代理：nginx 与后端同机回源，故只信任 127.0.0.1。
 *
 * ⚠️ 绝不能写 `true`（包括 `TRUST_PROXY=true`）：那等于信任 X-Forwarded-For 的**最左值**，
 *    攻击者随手发 `X-Forwarded-For: 9.9.9.9` 就能每次换一个新桶，限流彻底失效。
 *    写 `'127.0.0.1'` 之所以能防伪造：`@fastify/proxy-addr` 从**右往左**扫 XFF，
 *    返回第一个"不受信"的地址 —— 伪造值在左侧永远扫不到，被返回的始终是 nginx
 *    追加的真实来源 IP。
 */
const TRUST_PROXY_RAW = String(process.env.TRUST_PROXY || '').trim()
if (TRUST_PROXY_RAW === 'true' || TRUST_PROXY_RAW === '*') {
  console.error(
    '[rate-limit] TRUST_PROXY 不得设为 true 或 *（等于信任 XFF 最左值，可被伪造绕过）。' +
      '请填可信代理的 IP；nginx 与后端同机则填 127.0.0.1。'
  )
  process.exit(1)
}
const trustProxy = TRUST_PROXY_RAW.includes(',')
  ? TRUST_PROXY_RAW.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : TRUST_PROXY_RAW || false

// 生产默认开启（线上正是需要它的地方）；其他环境靠 RATE_LIMIT 显式控制，便于本地「撞 429」验收。
// createApp 不传 rateLimit = 不启用，测试因此天然不受影响。
// 解析规则见 rateLimit.js 的 resolveRateLimitEnabled()：false/no/off 必须能真正关掉，
// 无法识别的值打 warn —— 静默失败在这里是唯一的敌人。
const rateLimitEnabled = resolveRateLimitEnabled(process.env.RATE_LIMIT, NODE_ENV === 'production', console)

const app = await createApp({
  logger: true,
  jwtSecret: JWT_SECRET,
  allowedOrigins: ALLOWED_ORIGINS,
  trustProxy,
  rateLimit: rateLimitEnabled
    ? {
        store: createDbStore(query),
        config: parseRateLimitConfig(process.env),
        trustProxy
      }
    : null,
  aiConfig
})

// 启动前初始化数据库（自动建表，幂等）
await initDB()

if (rateLimitEnabled && !trustProxy) {
  // 刻意不 fail-closed：一次环境遗漏就把线上登录全部打断，代价远大于"暂时不设防"，
  // 何况账号维度（爆破防护的主体）此时仍然全程生效。
  console.warn(
    '[rate-limit] 已开启限流但未配置 TRUST_PROXY：request.ip 会恒为 127.0.0.1，' +
      '所有公网用户将共用同一个 IP 桶 —— IP 维度已跳过，账号维度照常生效。' +
      '请在 server/.env 设置 TRUST_PROXY=127.0.0.1 后重启。'
  )
}

// 定期清理过期的 refresh 会话（杜绝 refresh_sessions 无界累积）
const cleanupTimer = setInterval(async () => {
  try {
    const r = await query('DELETE FROM refresh_sessions WHERE expires_at < now() RETURNING jti')
    if (r && r.length > 0) app.log.info(`[auth] 清理过期 refresh 会话：${r.length} 条`)
  } catch (e) {
    app.log.error('[auth] 清理过期 refresh 会话失败:', e)
  }
  // 顺带清理限流桶：不新建定时器，避免多一个 unref 遗漏点；
  // 清理周期与会话清理一致即可（保留期由窗口长度决定，与周期无关）。
  try {
    const n = await app.rateLimiter?.prune()
    if (n > 0) app.log.info(`[rate-limit] 清理过期 auth_guard：${n} 条`)
  } catch (e) {
    app.log.error('[rate-limit] 清理过期 auth_guard 失败:', e)
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
