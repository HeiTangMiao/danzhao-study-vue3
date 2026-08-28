/**
 * 服务入口 —— Fastify 装配：CORS / JWT / 认证装饰器 / 业务路由
 * 启动前初始化数据库（自动建表）。
 */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { initDB, closeDB } from './db.js'
import { authRoutes } from './auth.js'
import { syncRoutes } from './sync.js'
import { adminRoutes } from './admin.js'

const PORT = Number(process.env.PORT || 3000)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true }) // 开发期放开，生产收紧为域名
await app.register(jwt, { secret: JWT_SECRET })

// 认证装饰器：校验 access 令牌（@fastify/jwt 自动挂到 req.user）
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

app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }))

await app.register(authRoutes)
await app.register(syncRoutes)
await app.register(adminRoutes)

await initDB()

// 优雅退出：关闭 DB 连接
const shutdown = async () => {
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
