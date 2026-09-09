/**
 * 认证路由 —— 注册 / 登录 / 刷新 / 登出 / 当前用户
 * 密码使用 Argon2id 哈希；令牌用 JWT（access 15min + refresh 30d，轮换制）。
 * refresh token 带 jti 并落 refresh_sessions 表：支持轮换使旧 token 失效、登出/删号即时撤销。
 */
import { randomUUID } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'
import { query } from './db.js'

const ACCESS_TTL = '15m'
const REFRESH_TTL = '30d'
const ACCESS_TTL_SEC = 15 * 60
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** 签发一对令牌并登记 refresh 会话（jti → 用户） */
async function issueTokens(app, userId) {
  const jti = randomUUID()
  const accessToken = app.jwt.sign({ sub: userId, type: 'access' }, { expiresIn: ACCESS_TTL })
  const refreshToken = app.jwt.sign({ sub: userId, type: 'refresh', jti }, { expiresIn: REFRESH_TTL })
  await query('INSERT INTO refresh_sessions (jti, user_id, expires_at) VALUES ($1, $2, $3)', [
    jti,
    userId,
    new Date(Date.now() + REFRESH_TTL_MS).toISOString()
  ])
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
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role',
      [name, email || null, passwordHash]
    )
    const user = rows[0]
    const tokens = await issueTokens(app, user.id)
    return { user, ...tokens }
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

    const tokens = await issueTokens(app, user.id)
    return {
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      ...tokens
    }
  })

  // 刷新 access 令牌（校验会话 + 轮换：旧 refresh 立即失效）
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
    if (!payload.jti) return reply.code(401).send({ error: '会话标识缺失' })

    // 会话仍存活（未登出/未轮换）
    const sess = await query('SELECT 1 AS ok FROM refresh_sessions WHERE jti = $1', [payload.jti])
    if (sess.length === 0) return reply.code(401).send({ error: '会话已失效，请重新登录' })

    // 用户仍存在（已删除/级联清会话 → 撤销即时生效）
    const users = await query('SELECT id FROM users WHERE id = $1', [payload.sub])
    if (users.length === 0) return reply.code(401).send({ error: '账号不存在' })

    // 轮换：删旧会话再签新令牌，被窃取的旧 refresh 无法再使用
    await query('DELETE FROM refresh_sessions WHERE jti = $1', [payload.jti])
    return issueTokens(app, payload.sub)
  })

  // 退出登录：撤销指定 refresh 会话（幂等）。客户端传当前 refresh token 即可；已失效/登出也返回成功。
  app.post('/api/auth/logout', async (req) => {
    const { refreshToken } = req.body || {}
    if (!refreshToken || typeof refreshToken !== 'string') return { ok: true }
    let payload = null
    try {
      payload = app.jwt.verify(refreshToken)
    } catch {
      // 无效/过期令牌：无可撤销内容
    }
    if (payload && payload.type === 'refresh' && payload.jti) {
      await query('DELETE FROM refresh_sessions WHERE jti = $1', [payload.jti])
    }
    return { ok: true }
  })

  // 当前用户信息（联调用）
  app.get('/api/auth/me', { preHandler: app.authenticate }, async (req) => {
    const rows = await query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [req.user.sub])
    const u = rows[0]
    if (!u) return { user: null }
    return { user: { id: u.id, username: u.username, email: u.email, role: u.role, createdAt: new Date(u.created_at).toISOString() } }
  })
}
