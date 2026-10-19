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
import { createRateLimiter, tooManyRequestsBody } from './rateLimit.js'

/**
 * IP 维度白名单：路径 → 端点名（端点名即限流阈值表的 key）
 *
 * 刻意用**精确路径 Map** 而不是前缀匹配或正则：
 *   认证端点就这三个，写死比"聪明"更不容易误伤；前缀 `/api/auth/` 会把 logout / me
 *   也卷进来，而 logout 被限流是纯粹的负面体验（用户登不出去）。
 */
const IP_GUARDED_PATHS = new Map([
  ['/api/auth/register', 'register'],
  ['/api/auth/login', 'login'],
  ['/api/auth/refresh', 'refresh']
])

/**
 * 装配并返回 Fastify 实例（未监听、未初始化 DB）
 * @param {object} opts
 * @param {boolean} [opts.logger=false] 是否开启日志
 * @param {string} [opts.jwtSecret] JWT 签名密钥
 * @param {string[]|null} [opts.allowedOrigins] CORS 白名单。
 *   - `null`（默认，未显式传入）→ 放行任意来源，仅限本地开发与测试便利；
 *   - `[]`（显式配置为空）→ **拒绝一切跨域**；
 *   - 非空数组 → 严格按白名单放行。
 *   ⚠️ 之所以区分 null 与 []：index.js 的 ALLOWED_ORIGINS 由环境变量 split+filter(Boolean) 得到，
 *      若线上把 ALLOWED_ORIGIN 配成空串，结果正是 `[]`。若沿用「空表即放行」，
 *      一次配置失误就会让服务静默对所有来源开放——故空表必须意味着拒绝。
 * @param {string|string[]|boolean} [opts.trustProxy=false] 可信代理（原样交给 Fastify）。
 *   必须配置为 nginx 的回源地址（同机反代即 `'127.0.0.1'`）：
 *   - 不配 → `request.ip` 恒为 127.0.0.1，全站公网用户共用一个桶，第一个撞线的人锁死所有人；
 *   - 配 `true` → 等于信任 X-Forwarded-For 最左值，攻击者伪造头即可任意换桶，限流形同虚设。
 * @param {{store: object, config?: object, trustProxy?: string|string[]|boolean}|null} [opts.rateLimit=null]
 *   限流配置。**`null` = 不启用**（默认值，刻意如此）。
 *   ⚠️ 默认关闭是为了测试：`node --test` 用 `app.inject()`，请求没有真实来源 IP，
 *      `request.ip` 为空；若默认开启，`api.test.js` 里连续 register 会撞上 10 次/小时
 *      而被无辜变红。生产由 `index.js` **显式**传入。
 */
export async function createApp({
  logger = false,
  jwtSecret = 'dev-secret-change-me',
  allowedOrigins = null,
  trustProxy = false,
  rateLimit = null
} = {}) {
  const app = Fastify({ logger, trustProxy })

  await app.register(cors, {
    origin: (origin, cb) => {
      // 无 Origin（同源 / 服务端到服务端请求）→ 一律放行
      if (!origin) return cb(null, true)
      // 未显式配置白名单 → 放行任意（本地 / 测试便利）
      if (allowedOrigins === null || allowedOrigins === undefined) return cb(null, true)
      // 已显式配置（含空数组）→ 严格按白名单；空数组 = 拒绝一切跨域
      return cb(null, allowedOrigins.includes(origin))
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

  // 限流：**只在显式启用时**才注册 onRequest 钩子（默认关闭，理由见 createApp 的 @param）
  if (rateLimit) {
    const limiter = createRateLimiter({
      store: rateLimit.store,
      config: rateLimit.config,
      // 未配 trustProxy 时 IP 维度整体跳过（fail-open），账号维度仍然全程生效
      ipEnabled: Boolean(rateLimit.trustProxy),
      log: app.log
    })
    // 挂到实例上供 auth.js 的 login preHandler 复用（账号维度需要解析后的 body）
    app.decorate('rateLimiter', limiter)

    // IP 维度走全局 onRequest：比在每个路由里加 preHandler 更不容易漏，
    // 且限流判定应该在认证/校验之前 —— 被限流的请求不值得再跑一次 Argon2。
    app.addHook('onRequest', async (req, reply) => {
      if (req.method !== 'POST') return
      // onRequest 阶段还没做路由匹配，只能自己从 URL 取路径并去掉 query
      const path = String(req.url || '').split('?')[0]
      const scope = IP_GUARDED_PATHS.get(path)
      if (!scope) return

      const verdict = await limiter.checkIp(scope, req.ip)
      if (verdict.allowed) return
      return reply
        .code(429)
        .header('Retry-After', String(verdict.retryAfter))
        .send(tooManyRequestsBody(verdict.retryAfter))
    })
  }

  await app.register(authRoutes)
  await app.register(syncRoutes)
  await app.register(adminRoutes)

  return app
}
