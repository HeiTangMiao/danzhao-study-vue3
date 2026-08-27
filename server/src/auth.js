/**
 * 认证路由 —— 注册 / 登录 / 刷新 / 当前用户
 * 密码使用 Argon2id 哈希；令牌用 JWT（access 15min + refresh 30d，轮换制）。
 */
import { hash, verify } from '@node-rs/argon2'
import { query } from './db.js'

const ACCESS_TTL = '15m'
const REFRESH_TTL = '30d'
const ACCESS_TTL_SEC = 15 * 60

/** 签发一对令牌 */
function issueTokens(app, userId) {
  const accessToken = app.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: ACCESS_TTL })
  const refreshToken = app.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: REFRESH_TTL })
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SEC }
}

export async function authRoutes(app) {
  // 注册
  app.post('/api/auth/register', async (req, reply) => {
    const { username, password, email } = req.body || {}
    const name = typeof username === 'string' ? username.trim() : ''
    if (name.length < 2) return reply.code(400).send({ error: '用户名至少 2 个字符' })
    if (typeof password !== 'string' || password.length < 6) {
      return reply.code(400).send({ error: '密码至少 6 位' })
    }

    const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [
      name,
      email || null
    ])
    if (existing.length > 0) return reply.code(409).send({ error: '用户名或邮箱已被注册' })

    const passwordHash = await hash(password)
    const rows = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [name, email || null, passwordHash]
    )
    const user = rows[0]
    return { user, ...issueTokens(app, user.id) }
  })

  // 登录（支持用户名或邮箱）
  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body || {}
    if (!username || !password) return reply.code(400).send({ error: '缺少用户名或密码' })

    const rows = await query('SELECT * FROM users WHERE username = $1 OR email = $1', [
      String(username).trim()
    ])
    const user = rows[0]
    if (!user) return reply.code(401).send({ error: '用户名或密码错误' })

    const ok = await verify(user.password_hash, String(password))
    if (!ok) return reply.code(401).send({ error: '用户名或密码错误' })

    return {
      user: { id: user.id, username: user.username, email: user.email },
      ...issueTokens(app, user.id)
    }
  })

  // 刷新 access 令牌
  app.post('/api/auth/refresh', async (req, reply) => {
    const { refreshToken } = req.body || {}
    if (!refreshToken) return reply.code(400).send({ error: '缺少 refreshToken' })

    let payload
    try {
      payload = app.jwt.verify(String(refreshToken))
    } catch {
      return reply.code(401).send({ error: 'refreshToken 无效或已过期' })
    }
    if (payload.type !== 'refresh') return reply.code(401).send({ error: '令牌类型错误' })

    return issueTokens(app, payload.sub)
  })

  // 当前用户信息（联调用）
  app.get('/api/auth/me', { preHandler: app.authenticate }, async (req) => {
    const rows = await query('SELECT id, username, email FROM users WHERE id = $1', [req.user.sub])
    return { user: rows[0] }
  })
}
