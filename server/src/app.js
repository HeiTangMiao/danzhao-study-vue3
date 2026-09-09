/**
 * Fastify 应用装配（工厂）
 * 与入口解耦：index.js 负责读环境 + 监听；测试可用 app.inject() 做 HTTP 级断言。
 * 注意：本文件不调用 initDB() —— 调用方（入口或测试）需在 listen / inject 前先 initDB()。
 */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './auth.js'
import { syncRoutes } from './sync.js'
import { adminRoutes } from './admin.js'

/**
 * 装配并返回 Fastify 实例（未监听、未初始化 DB）
 * @param {object} opts
 * @param {boolean} [opts.logger=false] 是否开启日志
 * @param {string} [opts.jwtSecret] JWT 签名密钥
 * @param {string[]} [opts.allowedOrigins] CORS 白名单；留空则放行任意来源（仅限本地/测试）
 */
export async function createApp({ logger = false, jwtSecret = 'dev-secret-change-me', allowedOrigins = [] } = {}) {
  const app = Fastify({ logger })

  await app.register(cors, {
    origin: (origin, cb) => {
      // 无 Origin（同源/服务端请求）或来源命中白名单（或未配置白名单）→ 放行
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true)
      }
      return cb(null, false)
    }
  })
  await app.register(jwt, { secret: jwtSecret })

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

  return app
}
