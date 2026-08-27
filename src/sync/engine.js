/**
 * syncEngine —— 客户端同步引擎
 * 职责：
 *  - 采集本地 8 个仓库的全部变更（增量按 updatedAt 与服务端 LWW 裁决）
 *  - 推送本机变更 + 拉取远端变更并合并（墓碑删除）
 *  - 维护同步元信息（deviceId / since 游标），持久化到 localStorage
 *
 * 核心原则：IndexedDB 始终是本地唯一数据源，网络仅是同步通道（离线可用）。
 */
import { useAuthStore } from '@/stores/auth'
import { useStudyDbStore } from '@/stores/studyDb'
import { api } from './api'

const META_KEY = 'sync_meta_v1'

// 业务实体 → IndexedDB 仓库与主键字段
const ENTITIES = [
  { entity: 'study_log', store: 'study_log', keyPath: 'id' },
  { entity: 'daily_stats', store: 'daily_stats', keyPath: 'date' },
  { entity: 'achievements', store: 'achievements', keyPath: 'id' },
  { entity: 'page_progress', store: 'page_progress', keyPath: 'key' },
  { entity: 'error_book', store: 'error_book', keyPath: 'id' },
  { entity: 'notes', store: 'notes', keyPath: 'pageKey' },
  { entity: 'bookmarks', store: 'bookmarks', keyPath: 'pageKey' },
  { entity: 'user_progress', store: 'user_progress', keyPath: 'id' }
]

/** 读取 / 初始化同步元信息 */
function loadMeta() {
  let meta = null
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) meta = JSON.parse(raw)
  } catch { /* 忽略损坏数据 */ }
  if (!meta || !meta.deviceId) {
    meta = {
      deviceId: `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      since: null
    }
  }
  return meta
}

function saveMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch { /* 存储不可用时忽略 */ }
}

export function useSyncEngine() {
  const auth = useAuthStore()
  const db = useStudyDbStore()

  /** 采集本地全部仓库记录 → 变更列表 */
  async function collectChanges() {
    const changes = []
    for (const { entity, store, keyPath } of ENTITIES) {
      let rows = []
      switch (store) {
        case 'study_log': rows = await db.getAllStudyLogs(); break
        case 'daily_stats': rows = await db.getAllDailyStats(); break
        case 'achievements': rows = await db.getAllAchievements(); break
        case 'page_progress': rows = await db.getAllPageProgress(); break
        case 'error_book': rows = await db.getAllErrors(); break
        case 'notes': rows = await db.getAllNotes(); break
        case 'bookmarks': rows = await db.getAllBookmarks(); break
        case 'user_progress': rows = [(await db.getProgress())]; break
        default: break
      }
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue
        const key = String(row[keyPath])
        changes.push({
          entity,
          key,
          payload: row,
          updatedAt: row.updatedAt || row.createdAt || row.date || new Date().toISOString(),
          deleted: false
        })
      }
    }
    return changes
  }

  /** 应用远端变更（墓碑删除 / 按服务器时间戳落库） */
  async function applyChanges(changes) {
    for (const ch of changes) {
      const conf = ENTITIES.find((e) => e.entity === ch.entity)
      if (!conf) continue
      if (ch.deleted) {
        await db.removeSynced(conf.store, ch.key)
        continue
      }
      const record = { ...(ch.payload || {}) }
      record[conf.keyPath] = ch.key
      record.updatedAt = ch.updatedAt
      await db.applySynced(conf.store, record)
    }
  }

  /**
   * 执行一次完整同步（推送 + 拉取 + 合并 + 推进游标）
   * @returns {{ ok: boolean, reason?: string, pushed?: number, pulled?: number }}
   */
  async function runSync() {
    if (!auth.isLoggedIn) return { ok: false, reason: '未登录' }
    const meta = loadMeta()
    try {
      const changes = await collectChanges()
      const res = await api.sync({
        deviceId: meta.deviceId,
        since: meta.since,
        changes
      })
      await applyChanges(res.changes)
      meta.since = res.cursor
      saveMeta(meta)
      return { ok: true, pushed: changes.length, pulled: res.changes.length }
    } catch (e) {
      console.warn('[Sync] 同步失败:', e)
      return { ok: false, reason: e.message || '同步失败' }
    }
  }

  return { runSync }
}
