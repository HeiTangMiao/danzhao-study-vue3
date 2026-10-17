// @vitest-environment jsdom
/**
 * syncEngine 行为契约测试（对应 project-assessment-2026-10-17.md QA R1）
 *
 * 背景：`src/sync/engine.js` 此前**零行为测试覆盖**。2026-10-17 评估实证，该文件一度被改成：
 *   - `:91` `if (false && ch.deleted)` → 远端删除不传播，已删数据复活
 *   - `:97` `record.updatedAt = new Date().toISOString()` → LWW 失效，远端旧版本盖掉本地新版本
 * 两处改动期间**全量 1406 用例无一报警**。本文件把引擎的核心契约钉住。
 *
 * 覆盖：
 *  ① 未登录短路（不发请求）
 *  ② 远端墓碑 → removeSynced，且**不**走落库
 *  ③ ★ 落库时 updatedAt 必须用远端值（禁止本地时间覆盖，LWW 的根基）
 *  ④ 未知 entity → 静默跳过不抛错
 *  ⑤ 推送本地变更 + 推进游标
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/sync/api', () => ({ api: { sync: vi.fn() } }))

import { api } from '@/sync/api'
import { useAuthStore } from '@/stores/auth'
import { useStudyDbStore } from '@/stores/studyDb'
import { useSyncEngine } from '@/sync/engine'

describe('syncEngine 行为契约', () => {
  let auth
  let db
  let sync

  beforeEach(async () => {
    localStorage.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    auth = useAuthStore()
    db = useStudyDbStore()
    sync = useSyncEngine()
    await db.init()
    // fake-indexeddb 跨用例持久，依赖空表的断言必须先复位
    await db.clearAllSyncedData()
  })

  it('① 未登录 → 短路返回，且不发起任何请求', async () => {
    auth.accessToken = ''
    const r = await sync.runSync()
    expect(r).toEqual({ ok: false, reason: '未登录' })
    expect(api.sync).not.toHaveBeenCalled()
  })

  it('② 远端墓碑（deleted）→ 调 removeSynced，且不走落库', async () => {
    auth.accessToken = 't'
    auth.user = { id: 'u1' }
    api.sync.mockResolvedValue({
      cursor: 'c1',
      changes: [{ entity: 'notes', key: 'p1', deleted: true, updatedAt: '2026-01-01T00:00:00Z' }]
    })
    const removeSynced = vi.spyOn(db, 'removeSynced')
    const applySynced = vi.spyOn(db, 'applySynced')

    await sync.runSync()

    expect(removeSynced).toHaveBeenCalledWith('notes', 'p1')
    expect(applySynced).not.toHaveBeenCalled()
  })

  it('③ ★ 落库时 updatedAt 必须用远端值（禁止本地 new Date() 覆盖）', async () => {
    auth.accessToken = 't'
    auth.user = { id: 'u1' }
    const remoteAt = '2026-01-02T03:04:05.678Z'
    api.sync.mockResolvedValue({
      cursor: 'c1',
      changes: [{
        entity: 'notes',
        key: 'p1',
        deleted: false,
        updatedAt: remoteAt,
        payload: { pageKey: 'p1', content: '远端内容' }
      }]
    })
    const applySynced = vi.spyOn(db, 'applySynced')

    await sync.runSync()

    expect(applySynced).toHaveBeenCalledTimes(1)
    const record = applySynced.mock.calls[0][1]
    // 若被 new Date().toISOString() 覆盖，此断言必红（LWW 基准被破坏）
    expect(record.updatedAt).toBe(remoteAt)
    expect(record.pageKey).toBe('p1')
  })

  it('④ 未知 entity → 静默跳过，不抛错', async () => {
    auth.accessToken = 't'
    auth.user = { id: 'u1' }
    api.sync.mockResolvedValue({
      cursor: 'c1',
      changes: [{ entity: 'no_such_entity', key: 'k', deleted: false, updatedAt: '2026-01-01T00:00:00Z', payload: {} }]
    })

    await expect(sync.runSync()).resolves.toEqual({ ok: true, pushed: 0, pulled: 1 })
  })

  it('⑤ 推送本地变更并推进游标', async () => {
    auth.accessToken = 't'
    auth.user = { id: 'u1' }
    await db.saveNote({ pageKey: 'p1', content: '本地笔记' })
    api.sync.mockResolvedValue({ cursor: 'cur-9', changes: [] })

    const r = await sync.runSync()

    expect(r).toEqual({ ok: true, pushed: 1, pulled: 0 })
    expect(api.sync).toHaveBeenCalledTimes(1)
    const payload = api.sync.mock.calls[0][0]
    expect(payload.changes).toHaveLength(1)
    expect(payload.changes[0]).toMatchObject({ entity: 'notes', key: 'p1', deleted: false })
    expect(payload.since).toBeNull()
  })
})
