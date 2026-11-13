/**
 * syncEngine —— 客户端同步引擎
 * 职责：
 *  - 采集本地各仓库的全部变更（增量按 updatedAt 与服务端 LWW 裁决）
 *  - 推送本机变更 + 拉取远端变更并合并（墓碑删除）
 *  - 维护同步元信息（deviceId / since 游标），持久化到 localStorage
 *
 * 核心原则：IndexedDB 始终是本地唯一数据源，网络仅是同步通道（离线可用）。
 *
 * ⚠️ 受控例外（examdate_sync）：三条考试里程碑自 v4 起随学习计划留在
 *    localStorage `study_plan_v1`，本期作为**旁路实体** `exam_milestone` 提升为账号级同步。
 *    `ENTITIES` 7 项一字不动，里程碑不伪装成 IndexedDB store、不加进该清单；
 *    `budget` / `tasks` 仍是设备本地、不进云同步。服务端协议天然支持新 entity 名
 *    （`sync_items` 主键含 `item_key`、`payload` 原样透传），故 `server/src/**` 零改动。
 */
import { useAuthStore } from '@/stores/auth'
import { useStudyDbStore } from '@/stores/studyDb'
import { useStudyPlanStore } from '@/stores/studyPlan'
import { api } from './api'

/**
 * 旁路实体名。`src/stores/studyPlan.js` 导出同值常量，两处由测试断言相等，避免漂移。
 */
export const MILESTONE_ENTITY = 'exam_milestone'

/**
 * 同步元信息的存储键。
 *
 * ⚠️ 必须带用户维度：deviceId / since 游标是**跟着账号走**的。若全局共用一个键，
 *    A 的游标会被 B 拿去拉取 → B 拉到 A 的增量（或反之漏拉）。
 *   未登录时用 anon 键，避免与任何账号的元信息互相覆盖。
 * ⚠️ 换账号时由 `studyDb.clearAllSyncedData()` 按 `sync_meta_v1:` 前缀一并清除（G2），
 *    否则切回原账号会因为游标还在而拉回空增量，三条里程碑永久丢失。
 */
function metaKey() {
  const auth = useAuthStore()
  const uid = auth.user && auth.user.id != null ? String(auth.user.id) : null
  return uid ? `sync_meta_v1:${uid}` : 'sync_meta_v1:anon'
}

// 业务实体 → IndexedDB 仓库与主键字段
// 注：user_progress 已退役（完成状态由 page_progress 推导），不再参与同步
const ENTITIES = [
  { entity: 'study_log', store: 'study_log', keyPath: 'id' },
  { entity: 'daily_stats', store: 'daily_stats', keyPath: 'date' },
  { entity: 'page_progress', store: 'page_progress', keyPath: 'key' },
  { entity: 'error_book', store: 'error_book', keyPath: 'id' },
  { entity: 'notes', store: 'notes', keyPath: 'pageKey' },
  { entity: 'bookmarks', store: 'bookmarks', keyPath: 'pageKey' },
  // 单题作答记录（P0-3）：整行 + updatedAt LWW，随同步上传（协议无字段白名单，服务端零改动）
  { entity: 'question_attempt', store: 'question_attempt', keyPath: 'id' }
]

/** 读取 / 初始化同步元信息 */
function loadMeta() {
  let meta = null
  try {
    const raw = localStorage.getItem(metaKey())
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
    localStorage.setItem(metaKey(), JSON.stringify(meta))
  } catch { /* 存储不可用时忽略 */ }
}

export function useSyncEngine() {
  const auth = useAuthStore()
  const db = useStudyDbStore()

  /** 采集本地全部仓库记录 → 变更列表（软删墓碑以 deleted:true 推送，供服务端传播删除） */
  async function collectChanges() {
    const changes = []
    for (const { entity, store, keyPath } of ENTITIES) {
      let rows = []
      switch (store) {
        case 'study_log': rows = await db.getAllStudyLogs(); break
        case 'daily_stats': rows = await db.getAllDailyStats(); break
        case 'page_progress': rows = await db.getAllPageProgress(); break
        // 错题/笔记/书签：含软删墓碑的原始读取，UI 过滤版会漏推墓碑
        case 'error_book': rows = await db.getAllErrorsRaw(); break
        case 'notes': rows = await db.getAllNotesRaw(); break
        case 'bookmarks': rows = await db.getAllBookmarksRaw(); break
        case 'question_attempt': rows = await db.getAllAttempts(); break
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
          deleted: row.deleted === true
        })
      }
    }
    // 旁路实体：三条里程碑 = 3 个独立 item_key（只推写过时间戳的行，全新 store 为 0 行）
    changes.push(...useStudyPlanStore().getMilestoneSyncRows())
    return changes
  }

  /** 应用远端变更（墓碑删除 / 按服务器时间戳落库） */
  async function applyChanges(changes) {
    const milestoneRows = []
    for (const ch of changes) {
      // 旁路实体先分流：不进 ENTITIES 查找、不走 IndexedDB 的 applySynced/removeSynced
      if (ch.entity === MILESTONE_ENTITY) {
        milestoneRows.push(ch)
        continue
      }
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
    // 批量收集 → 只 save() 一次；按 id 逐项覆盖，绝不整包替换（P0-3）
    if (milestoneRows.length > 0) {
      await useStudyPlanStore().applySyncedMilestoneRows(milestoneRows)
    }
  }

  /**
   * 执行一次完整同步（推送 + 拉取 + 合并 + 推进游标）
   * @returns {{ ok: boolean, reason?: string, pushed?: number, pulled?: number }}
   */
  async function runSync() {
    if (!auth.isLoggedIn) {
      useStudyPlanStore().setSyncStatus('local')
      return { ok: false, reason: '未登录' }
    }
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
      useStudyPlanStore().setSyncStatus('synced')
      return { ok: true, pushed: changes.length, pulled: res.changes.length }
    } catch (e) {
      console.warn('[Sync] 同步失败:', e)
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      useStudyPlanStore().setSyncStatus(offline ? 'offline' : 'pending')
      return { ok: false, reason: e.message || '同步失败' }
    }
  }

  return { runSync }
}
