/**
 * 同步路由 —— 单一 POST /api/sync 完成 推送 + 拉取
 * 协议：
 *  请求 { deviceId, since, changes: [{ entity, key, payload, updatedAt, deleted }] }
 *  返回 { serverTime, cursor, changes: [...] }
 * 冲突裁决：LWW（比较 updated_at，后写者胜）；删除用墓碑（deleted=true）不物理删。
 * 客户端按 (entity, key) 对应业务记录，payload 为原样业务对象。
 */
import { query } from './db.js'
import { toDate, shouldAccept } from './sync-core.js'

const PULL_LIMIT = 5000
const MIN_DATE = '1970-01-01T00:00:00.000Z'

export async function syncRoutes(app) {
  app.post('/api/sync', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = req.user.sub
    const { deviceId, since, changes } = req.body || {}

    if (!deviceId || typeof deviceId !== 'string') {
      return reply.code(400).send({ error: '缺少 deviceId' })
    }
    if (!Array.isArray(changes)) {
      return reply.code(400).send({ error: 'changes 必须为数组' })
    }

    const serverTime = new Date().toISOString()

    // 1) 登记设备与本次同步时间
    await query(
      `INSERT INTO devices (user_id, device_id, last_sync_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at`,
      [userId, deviceId, serverTime]
    )

    // 2) 推送：逐条 LWW，服务端版本更旧才覆盖
    for (const ch of changes) {
      if (!ch || typeof ch !== 'object') continue
      const { entity, key } = ch
      if (typeof entity !== 'string' || entity.length === 0) continue
      if (typeof key !== 'string' || key.length === 0) continue

      const updatedAt = toDate(ch.updatedAt)
      const existing = await query(
        'SELECT updated_at FROM sync_items WHERE user_id=$1 AND entity=$2 AND item_key=$3',
        [userId, entity, key]
      )
      if (existing.length > 0 && !shouldAccept(existing[0].updated_at, updatedAt)) {
        continue // 服务端已更新或相同，丢弃本推送
      }

      await query(
        `INSERT INTO sync_items (user_id, entity, item_key, payload, updated_at, deleted)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, entity, item_key)
         DO UPDATE SET payload = EXCLUDED.payload,
                       updated_at = EXCLUDED.updated_at,
                       deleted = EXCLUDED.deleted`,
        [userId, entity, key, ch.payload == null ? null : JSON.stringify(ch.payload), updatedAt.toISOString(), !!ch.deleted]
      )
    }

    // 3) 拉取：返回 since 之后的服务端全部变更（含本机刚推上去的，幂等可重复应用）
    const sinceDate = since ? toDate(since) : new Date(MIN_DATE)
    const rows = await query(
      `SELECT entity, item_key, payload, updated_at, deleted
       FROM sync_items
       WHERE user_id = $1 AND updated_at > $2
       ORDER BY updated_at ASC
       LIMIT $3`,
      [userId, sinceDate.toISOString(), PULL_LIMIT]
    )

    const pulled = rows.map((r) => ({
      entity: r.entity,
      key: r.item_key,
      payload: r.payload,
      updatedAt: new Date(r.updated_at).toISOString(),
      deleted: !!r.deleted
    }))

    // 4) 游标：拉取到的最新时间；无变更则用服务器时间
    const cursor = pulled.length ? pulled[pulled.length - 1].updatedAt : serverTime

    return { serverTime, cursor, changes: pulled }
  })
}
