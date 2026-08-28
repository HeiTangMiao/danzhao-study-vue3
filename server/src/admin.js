/**
 * 管理员路由 —— 用户管理 + 页面访问统计
 * 鉴权：JWT 校验 + 数据库 role='admin'（管理员由运维在数据库手动标记）
 */
import { query } from './db.js'

/** admin 前置守卫：校验 access 令牌 + 数据库角色 */
async function requireAdmin(req, reply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: '未登录或令牌已过期' })
  }
  if (req.user.type !== 'access') {
    return reply.code(401).send({ error: '令牌类型错误' })
  }
  const rows = await query('SELECT role FROM users WHERE id = $1', [req.user.sub])
  if (!rows.length || rows[0].role !== 'admin') {
    return reply.code(403).send({ error: '需要管理员权限' })
  }
}

export async function adminRoutes(app) {
  // ===== 用户管理 =====

  /** 用户列表：基本信息 + 最后同步时间 + 同步条目数 */
  app.get('/api/admin/users', { preHandler: requireAdmin }, async () => {
    const [users, counts] = await Promise.all([
      query(
        `SELECT u.id, u.username, u.email, u.role, u.created_at,
                (SELECT max(last_sync_at) FROM devices d WHERE d.user_id = u.id) AS last_sync_at
         FROM users u ORDER BY u.id`
      ),
      query('SELECT user_id, count(*) AS n FROM sync_items GROUP BY user_id')
    ])
    const countMap = Object.fromEntries(counts.map((c) => [c.user_id, Number(c.n)]))
    return {
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.created_at ? new Date(u.created_at).toISOString() : null,
        lastSyncAt: u.last_sync_at ? new Date(u.last_sync_at).toISOString() : null,
        itemCount: countMap[u.id] || 0
      }))
    }
  })

  /** 设置用户角色（'user' | 'admin'），不可改自己 */
  app.patch('/api/admin/users/:id/role', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number(req.params.id)
    const role = req.body?.role
    if (role !== 'user' && role !== 'admin') {
      return reply.code(400).send({ error: 'role 仅支持 user / admin' })
    }
    if (id === req.user.sub) {
      return reply.code(400).send({ error: '不能修改自己的角色' })
    }
    const rows = await query('UPDATE users SET role = $2 WHERE id = $1 RETURNING id, username, role', [id, role])
    if (!rows.length) return reply.code(404).send({ error: '用户不存在' })
    return { user: rows[0] }
  })

  /** 删除用户（级联删除其设备与同步数据） */
  app.delete('/api/admin/users/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const id = Number(req.params.id)
    if (id === req.user.sub) {
      return reply.code(400).send({ error: '不能删除自己' })
    }
    const rows = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    if (!rows.length) return reply.code(404).send({ error: '用户不存在' })
    return { deleted: rows[0].id }
  })

  // ===== 页面访问统计 =====

  /** 全局概览 */
  app.get('/api/admin/stats/overview', { preHandler: requireAdmin }, async () => {
    const r = await query(
      `SELECT
        (SELECT count(*) FROM users) AS users,
        (SELECT count(*) FROM sync_items) AS items,
        (SELECT count(*) FROM sync_items WHERE entity = 'study_log') AS logs,
        (SELECT count(*) FROM sync_items WHERE entity = 'page_progress') AS pages,
        (SELECT count(*) FROM sync_items WHERE entity = 'error_book') AS errors,
        (SELECT count(*) FROM sync_items WHERE entity = 'notes') AS notes`
    )
    const o = r[0]
    return {
      users: Number(o.users),
      items: Number(o.items),
      studyLogs: Number(o.logs),
      pageProgress: Number(o.pages),
      errorBook: Number(o.errors),
      notes: Number(o.notes)
    }
  })

  /** 页面访问统计：按学科/动作 + 近 14 日趋势 + 热门页面 TOP20 */
  app.get('/api/admin/stats/pages', { preHandler: requireAdmin }, async () => {
    const [bySubjectAction, daily, topPagesRaw, titles] = await Promise.all([
      query(
        `SELECT payload->>'subject' AS subject, payload->>'action' AS action, count(*) AS n
         FROM sync_items
         WHERE entity = 'study_log' AND payload IS NOT NULL
         GROUP BY 1, 2`
      ),
      query(
        `SELECT payload->>'date' AS date, count(*) AS n
         FROM sync_items
         WHERE entity = 'study_log' AND payload IS NOT NULL
         GROUP BY 1 ORDER BY 1 DESC LIMIT 14`
      ),
      query(
        `SELECT payload->>'subject' AS subject, payload->>'fileKey' AS file_key, count(*) AS n
         FROM sync_items
         WHERE entity = 'study_log' AND payload->>'action' = 'page_visit'
         GROUP BY 1, 2 ORDER BY n DESC LIMIT 20`
      ),
      query(
        `SELECT payload->>'key' AS key, payload->>'fileTitle' AS title,
                payload->>'unitTitle' AS unit_title, payload->>'subject' AS subject
         FROM sync_items
         WHERE entity = 'page_progress' AND payload IS NOT NULL`
      )
    ])

    // 标题映射：fileKey → { title, unitTitle, subject }
    const titleMap = {}
    for (const t of titles) {
      if (t.key && !titleMap[t.key]) titleMap[t.key] = t
    }

    const bySubject = {}
    for (const s of bySubjectAction) {
      const subj = s.subject || 'unknown'
      if (!bySubject[subj]) bySubject[subj] = { visits: 0, answers: 0, tests: 0, other: 0 }
      const n = Number(s.n)
      if (s.action === 'page_visit') bySubject[subj].visits += n
      else if (s.action === 'answer_question' || s.action === 'answer_correct') bySubject[subj].answers += n
      else if (s.action === 'test_complete') bySubject[subj].tests += n
      else bySubject[subj].other += n
    }

    const topPages = topPagesRaw.map((p) => ({
      key: p.file_key,
      subject: p.subject,
      title: titleMap[p.file_key]?.title || p.file_key,
      unitTitle: titleMap[p.file_key]?.unit_title || '',
      visits: Number(p.n)
    }))

    const dailyTrend = daily
      .map((d) => ({ date: d.date, visits: Number(d.n) }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))

    return { bySubject, topPages, dailyTrend }
  })
}
