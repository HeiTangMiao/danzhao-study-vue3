// @vitest-environment jsdom
/**
 * examdate_sync 核心契约测试（T02）
 *
 * 覆盖 PRD §7 与 design §3.7 的 7 处「静默失效」清单：
 *  - 3 行拆分（3 个独立 item_key）/ 同步行形状 / 0-1-3 行三档
 *  - ★ load() 的 MILESTONES.map 必须透传 updatedAt（最高风险的静默失效点，变异抽验 1）
 *  - setMilestoneDate() 单调不减 updatedAt（shouldAccept 是严格 >）
 *  - ★ applySyncedMilestoneRows() 按 id 逐项覆盖（P0-3 / 变异抽验 3）
 *  - 清空用 date:'' 正常行、不用墓碑；旧存档（含 examDate 旧字段）tolerant
 *  - 账号隔离 / G2 游标清理（变异抽验 4）
 *  - P1-3 导出备份还原三条 date + updatedAt
 *  - nextMilestone 三态（≥ 今天的最小日期 / 当天 0 天 / 全已过与全未设置走空态）
 *  - G1：挂载时未登录 → 登录后立即触发同步（变异抽验 5）
 *
 * 说明：本文件为 G1 的 App.vue 挂载测试把 App 的启动期依赖做文件级 mock，
 * 并把 `@/sync/engine` 的 runSync 换成 spy —— 引擎自身的真实行为由
 * `tests/sync-engine.test.js` 独立覆盖（那里不 mock 引擎）。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

const mocks = vi.hoisted(() => ({
  runSync: vi.fn(),
  sync: vi.fn()
}))

vi.mock('@/sync/engine', () => ({
  MILESTONE_ENTITY: 'exam_milestone',
  useSyncEngine: () => ({ runSync: mocks.runSync })
}))
vi.mock('@/sync/api', () => ({ api: { sync: mocks.sync } }))
vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: () => {} })
}))
vi.mock('@/stores/progress', () => ({ useProgressStore: () => ({ init: () => {} }) }))
vi.mock('@/utils/contentClient', () => ({ startBackgroundRefresh: () => {} }))
vi.mock('@/stores/recite', () => ({
  useReciteStore: () => ({
    restoreSession: async () => ({ status: 'none' }),
    init: async () => {}
  }),
  RECITE_HOME_PATH: '/recite'
}))
vi.mock('@/utils/storageQuota', () => ({ ensureStoragePersistence: async () => ({}) }))
vi.mock('@/components/AppTabBar.vue', () => ({
  default: { name: 'AppTabBar', render: () => null }
}))

import {
  useStudyPlanStore,
  MILESTONES,
  MILESTONE_ENTITY,
  LEGACY_MIGRATED_AT,
  LEGACY_DEFAULT_DATES,
  daysUntil
} from '@/stores/studyPlan'
import { MILESTONE_ENTITY as ENGINE_ENTITY } from '@/sync/engine'
import { useStudyDbStore } from '@/stores/studyDb'
import { useAuthStore } from '@/stores/auth'
import App from '@/App.vue'

const STORAGE_KEY = 'study_plan_v1'
const T0 = '2026-10-09T02:00:00.000Z'
const T1 = '2026-10-09T02:00:00.100Z'
const T2 = '2026-10-09T02:00:00.200Z'

/** 把系统时间钉在 2026-10-09（本地） */
function freezeTo(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

/** 造一条远端里程碑行 */
function remoteRow(key, date, updatedAt, extra) {
  const row = {
    entity: 'exam_milestone',
    key,
    payload: { id: key, label: '远端脏标签', date, updatedAt },
    updatedAt,
    deleted: false
  }
  if (extra && typeof extra === 'object') Object.assign(row, extra)
  return row
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  mocks.sync.mockResolvedValue({ cursor: 'c', changes: [] })
  // G1 断言观测点是「登录后立即 api.sync 被调用」：让 mock 引擎的 runSync
  // 委托到被 mock 的 api.sync，doSync() 一经触发即可在网络出口被观测到。
  mocks.runSync.mockImplementation(async () => {
    await mocks.sync({ deviceId: 'device-b', since: null, changes: [] })
    return { ok: true, pushed: 0, pulled: 0 }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('数据契约 · MILESTONES / 同步行形状', () => {
  it('① MILESTONES 固定三条、每项带 updatedAt:\'\'；两处实体名常量相等', () => {
    expect(MILESTONES.map((m) => m.id)).toEqual(['op', 'theory', 'academic'])
    expect(MILESTONES.map((m) => m.label)).toEqual(['技能操作考', '理论考', '语数考试'])
    expect(MILESTONES.every((m) => m.updatedAt === '')).toBe(true)
    expect(MILESTONE_ENTITY).toBe('exam_milestone')
    expect(ENGINE_ENTITY).toBe(MILESTONE_ENTITY)
  })

  it('② 全新 store 的 getMilestoneSyncRows() 返回 0 行（保 sync-engine ⑤ pushed:1）', () => {
    const store = useStudyPlanStore()
    expect(store.milestones.every((m) => m.updatedAt === '')).toBe(true)
    expect(store.getMilestoneSyncRows()).toEqual([])
  })

  it('③ 0 / 1（含清空行）/ 3 行三档：只推 updatedAt !== \'\' 的行', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    expect(store.getMilestoneSyncRows()).toHaveLength(0)

    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('op', '') // 清空 = 正常行，仍必须推
    let rows = store.getMilestoneSyncRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].payload.date).toBe('')
    expect(rows[0].deleted).toBe(false)

    store.setMilestoneDate('theory', '2027-01-15')
    store.setMilestoneDate('academic', '2027-06-20')
    rows = store.getMilestoneSyncRows()
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.key)).toEqual(['op', 'theory', 'academic'])
  })

  it('④ 三条 = 3 个独立 item_key，payload 原样、key 非空、deleted 恒 false', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('theory', '2027-01-15')
    store.setMilestoneDate('academic', '2027-06-20')
    const rows = store.getMilestoneSyncRows()
    expect(new Set(rows.map((r) => r.key)).size).toBe(3)
    for (const r of rows) {
      expect(r.entity).toBe('exam_milestone')
      expect(typeof r.key).toBe('string')
      expect(r.key.length).toBeGreaterThan(0)
      expect(r.payload).toMatchObject({ id: r.key, date: expect.any(String) })
      expect(r.payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(r.updatedAt).toBe(r.payload.updatedAt)
      expect(r.deleted).toBe(false)
    }
  })

  it('⑤ 用户改里程碑只影响命中一条，budget / tasks 原样', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setBudget('math', 12)
    store.addTask({ title: '复习文言文' })
    const budgetBefore = JSON.stringify(store.budget)
    const tasksBefore = JSON.stringify(store.tasks)

    store.setMilestoneDate('op', '2026-12-01')
    expect(store.milestones.map((m) => m.date)).toEqual(['2026-12-01', '', ''])
    expect(JSON.stringify(store.budget)).toBe(budgetBefore)
    expect(JSON.stringify(store.tasks)).toBe(tasksBefore)
    expect(store.syncStatus).toBe('pending')
  })
})

describe('★ 静默失效 #2 · load() 必须透传 updatedAt（变异抽验 1）', () => {
  it('⑥ round-trip：setMilestoneDate → 新 Pinia → load() → updatedAt 原样保留且仍可推送', () => {
    freezeTo(T0)
    const first = useStudyPlanStore()
    first.setMilestoneDate('op', '2026-12-01')
    const savedAt = first.milestones.find((m) => m.id === 'op').updatedAt
    expect(savedAt).toBeTruthy()

    // 读盘断言含 updatedAt（静默失效 #4：save() 整包不得过滤该字段）
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toContain('updatedAt')
    expect(JSON.parse(raw).milestones[0].updatedAt).toBe(savedAt)

    setActivePinia(createPinia())
    const reloaded = useStudyPlanStore()
    reloaded.load()
    expect(reloaded.milestones.find((m) => m.id === 'op').date).toBe('2026-12-01')
    // ★ 若 load() 的 MILESTONES.map 漏带 updatedAt，此处必红（跨设备静默失效且零报错）
    expect(reloaded.milestones.find((m) => m.id === 'op').updatedAt).toBe(savedAt)
    const rows = reloaded.getMilestoneSyncRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].updatedAt).toBe(savedAt)
  })

  it('⑦ 旧存档：手填过日期但无 updatedAt → 补 LEGACY_MIGRATED_AT 并可作为新增推送', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      milestones: [
        { id: 'op', date: '2026-12-01' },
        { id: 'theory', date: '' },
        { id: 'academic', date: '' }
      ]
    }))
    const store = useStudyPlanStore()
    store.load()
    expect(store.milestones[0].date).toBe('2026-12-01')
    expect(store.milestones[0].updatedAt).toBe(LEGACY_MIGRATED_AT)
    expect(store.milestones[1].updatedAt).toBe('')
    expect(store.getMilestoneSyncRows()).toHaveLength(1)
    expect(store.getMilestoneSyncRows()[0].updatedAt).toBe(LEGACY_MIGRATED_AT)
  })

  it('⑧ 旧存档三条旧推定字面量 → 迁移为 \'\'、updatedAt 仍为 \'\'、不推送', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      milestones: [
        { id: 'op', date: LEGACY_DEFAULT_DATES[0] },
        { id: 'theory', date: LEGACY_DEFAULT_DATES[1] },
        { id: 'academic', date: LEGACY_DEFAULT_DATES[2] }
      ]
    }))
    const store = useStudyPlanStore()
    store.load()
    expect(store.milestones.map((m) => m.date)).toEqual(['', '', ''])
    expect(store.milestones.map((m) => m.updatedAt)).toEqual(['', '', ''])
    expect(store.getMilestoneSyncRows()).toEqual([])
  })

  it('⑨ 旧存档带额外字段（id/label 漂移、examDate 残留）→ 只采信白名单、不报错', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      milestones: [
        { id: 'op', label: '被改坏的标签', date: '2026-12-01', updatedAt: T1, examDate: '1999-01-01' },
        { id: 'unknown', label: '凭空第四条', date: '2027-01-01', updatedAt: T2 }
      ]
    }))
    const store = useStudyPlanStore()
    expect(() => store.load()).not.toThrow()
    expect(store.milestones).toHaveLength(3)
    expect(store.milestones[0].label).toBe('技能操作考')
    expect(store.milestones[0].date).toBe('2026-12-01')
    expect(store.milestones[0].updatedAt).toBe(T1)
    expect(store.milestones[1].date).toBe('')
    expect(store.getMilestoneSyncRows()).toHaveLength(1)
    expect(store.getMilestoneSyncRows()[0].key).toBe('op')
  })
})

describe('静默失效 #3 · updatedAt 单调不减（shouldAccept 是严格 >）', () => {
  it('⑩ 同一毫秒连续两次修改：第二次必须严格更晚（+1ms）', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    const a = store.milestones.find((m) => m.id === 'op').updatedAt
    store.setMilestoneDate('op', '2026-12-02')
    const b = store.milestones.find((m) => m.id === 'op').updatedAt
    expect(Date.parse(b)).toBeGreaterThan(Date.parse(a))
    expect(Date.parse(b) - Date.parse(a)).toBe(1)
  })

  it('⑪ 非法值 → 拒绝、时间戳与存档都不变、状态不变', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('academic', '2027-06-20')
    const beforeAt = store.milestones.find((m) => m.id === 'academic').updatedAt
    const beforeRaw = localStorage.getItem(STORAGE_KEY)
    store.setSyncStatus('synced')

    for (const bad of ['2026-1-1', '2026/12/01', 'not-a-date', 123, false, {}, []]) {
      store.setMilestoneDate('academic', bad)
    }
    expect(store.milestones.find((m) => m.id === 'academic').date).toBe('2027-06-20')
    expect(store.milestones.find((m) => m.id === 'academic').updatedAt).toBe(beforeAt)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw)
    expect(store.syncStatus).toBe('synced')
  })
})

describe('★ P0-3 · applySyncedMilestoneRows 按 id 逐项覆盖（变异抽验 3）', () => {
  it('⑫ 顺序①：A 本地改 op + B 远端改 theory → 两条都保留、academic 原值不动', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('academic', '2027-06-20') // 第三条原值
    store.setMilestoneDate('op', '2026-12-01') // A 的改动
    store.applySyncedMilestoneRows([remoteRow('theory', '2027-01-15', T2)]) // B 的改动

    expect(store.milestones.map((m) => m.date)).toEqual(['2026-12-01', '2027-01-15', '2027-06-20'])
    expect(store.milestones.find((m) => m.id === 'theory').updatedAt).toBe(T2)
    expect(store.milestones.find((m) => m.id === 'academic').date).toBe('2027-06-20')
  })

  it('⑬ 顺序②：B 远端先到 + A 本地后改 → 两条都保留、academic 原值不动', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('academic', '2027-06-20')
    store.applySyncedMilestoneRows([remoteRow('theory', '2027-01-15', T1)])
    store.setMilestoneDate('op', '2026-12-01')

    expect(store.milestones.map((m) => m.date)).toEqual(['2026-12-01', '2027-01-15', '2027-06-20'])
  })

  it('⑭ 只有 1 行远端时绝不整包替换：另两条必须原样保留', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('theory', '2027-01-15')
    store.setMilestoneDate('academic', '2027-06-20')
    const before = store.milestones.map((m) => ({ ...m }))

    store.applySyncedMilestoneRows([remoteRow('op', '2026-12-05', T2)])

    // ★ 若改成 milestones.value = rows.map(...) 整包替换，下面三条必红（P0-3）
    expect(store.milestones).toHaveLength(3)
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2026-12-05')
    expect(store.milestones.find((m) => m.id === 'theory')).toEqual(before[1])
    expect(store.milestones.find((m) => m.id === 'academic')).toEqual(before[2])
    expect(store.milestones.find((m) => m.id === 'op').label).toBe('技能操作考')
  })

  it('⑮ 防御：非法 key / 非法 date 跳过；deleted:true 按清空处理；不采信远端 id/label', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('theory', '2027-01-15')
    store.setMilestoneDate('academic', '2027-06-20')

    store.applySyncedMilestoneRows([
      remoteRow('no_such_id', '2027-01-01', T2),
      remoteRow('theory', '2027/01/15', T2),
      remoteRow('theory', 12345, T2),
      remoteRow('academic', '', T2, { deleted: true })
    ])

    expect(store.milestones.map((m) => m.date)).toEqual(['2026-12-01', '2027-01-15', ''])
    expect(store.milestones.map((m) => m.label)).toEqual(['技能操作考', '理论考', '语数考试'])
    expect(store.milestones.find((m) => m.id === 'theory').updatedAt).not.toBe(T2)
    expect(store.milestones.find((m) => m.id === 'academic').updatedAt).toBe(T2)
    expect(store.getMilestoneSyncRows()).toHaveLength(3)
    expect(store.getMilestoneSyncRows().find((r) => r.key === 'academic').payload.date).toBe('')
  })

  it('⑯ 空行数组 / 全非法行 → 不写盘、内存不动', () => {
    freezeTo(T0)
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    const beforeRaw = localStorage.getItem(STORAGE_KEY)
    store.applySyncedMilestoneRows([])
    store.applySyncedMilestoneRows([null, {}, remoteRow('op', 'BAD', T2)])
    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw)
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2026-12-01')
  })
})

describe('清空跨设备 / 旧字段冻结 / 导出备份（P1-3）', () => {
  it('⑰ 清空是一条 date:\'\' 正常行，跨设备逐项覆盖为空态且不复活旧推定值', () => {
    freezeTo(T0)
    const a = useStudyPlanStore()
    a.setMilestoneDate('op', '2026-12-01')
    a.setMilestoneDate('op', '')
    const rows = a.getMilestoneSyncRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].payload.date).toBe('')
    expect(rows[0].deleted).toBe(false)

    setActivePinia(createPinia())
    const b = useStudyPlanStore()
    b.setMilestoneDate('op', '2026-12-01')
    b.applySyncedMilestoneRows(rows)
    expect(b.milestones.find((m) => m.id === 'op').date).toBe('')
    b.save()
    setActivePinia(createPinia())
    const reloaded = useStudyPlanStore()
    reloaded.load()
    expect(reloaded.milestones.map((m) => m.date)).toEqual(['', '', ''])
    const raw = localStorage.getItem(STORAGE_KEY)
    for (const legacy of LEGACY_DEFAULT_DATES) expect(raw).not.toContain(legacy)
  })

  it('⑱ examDate 冻结：旧值不映射、设置里程碑后 getReciteState().examDate 恒不变', async () => {
    const db = useStudyDbStore()
    await db.saveReciteState({ examDate: '2001-02-03' })
    expect((await db.getReciteState()).examDate).toBe('2001-02-03')

    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('theory', '2027-01-15')
    store.setMilestoneDate('academic', '2027-06-20')
    store.applySyncedMilestoneRows([remoteRow('op', '2026-12-05', T2)])

    // 里程碑不是 examDate 的真相源：不映射、不读写、不产生第二真相源
    expect((await db.getReciteState()).examDate).toBe('2001-02-03')
    expect(store.milestones.some((m) => m.date === '2001-02-03')).toBe(false)
  })

  it('⑲ P1-3 导出 → 清空 → 导入 → 三条 date + updatedAt 逐条还原', async () => {
    // ⚠️ 本例涉及 fake-indexeddb 的异步事务，不能启用 fake timers（会冻住事务调度）
    const plan = useStudyPlanStore()
    plan.setMilestoneDate('op', '2026-12-01')
    plan.setMilestoneDate('theory', '2027-01-15')
    plan.setMilestoneDate('academic', '2027-06-20')
    const expected = plan.milestones.map((m) => ({ id: m.id, date: m.date, updatedAt: m.updatedAt }))

    const db = useStudyDbStore()
    // 造一条 note 让 importAllData 的事务不空（空事务会 early return 而不写 localStorage）
    await db.saveNote({ pageKey: 'p1', content: '导出探针' })
    const dump = await db.exportAllData()
    expect(dump.localStorage[STORAGE_KEY]).toBeTruthy()

    await db.clearAllSyncedData()
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null)
    await db.importAllData(dump)

    setActivePinia(createPinia())
    const restored = useStudyPlanStore()
    restored.load()
    expect(restored.milestones.map((m) => ({
      id: m.id, date: m.date, updatedAt: m.updatedAt
    }))).toEqual(expected)
    expect(restored.getMilestoneSyncRows()).toHaveLength(3)
  })
})

describe('G2 · 换账号同步前置清游标（变异抽验 4）', () => {
  it('⑳ clearAllSyncedData() 未 await 的同步点：study_plan_v1 与全部 sync_meta_v1:* 都已清', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budget: { math: 1 } }))
    localStorage.setItem('sync_meta_v1:u1', JSON.stringify({ deviceId: 'd1', since: { ts: T1, key: 'op' } }))
    localStorage.setItem('sync_meta_v1:u2', JSON.stringify({ deviceId: 'd2', since: null }))
    localStorage.setItem('math_theme', 'dark')

    const db = useStudyDbStore()
    const pending = db.clearAllSyncedData()
    // ★ 不 await、不轮询：G2 清理若被移到第一个 await 之后，这两条必红
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null)
    expect(localStorage.getItem('sync_meta_v1:u1')).toBe(null)
    expect(localStorage.getItem('sync_meta_v1:u2')).toBe(null)
    await pending
    expect(localStorage.getItem('sync_meta_v1:u1')).toBe(null)
    expect(localStorage.getItem('math_theme')).toBe('dark')
  })

  it('㉑ 游标清空后新 store 退化为全量：三条由服务端行恢复，且不残留上一账号日期', () => {
    // ⚠️ 同上：clearAllSyncedData() 走 IndexedDB 事务，不启用 fake timers
    const a = useStudyPlanStore()
    a.setMilestoneDate('op', '2026-12-01')
    a.setMilestoneDate('theory', '2027-01-15')
    a.setMilestoneDate('academic', '2027-06-20')
    localStorage.setItem('sync_meta_v1:u1', JSON.stringify({ deviceId: 'd1', since: { ts: T2, key: 'academic' } }))

    // 模拟换账号：同步前置清盘 + 清游标；此时 B 账号无数据 → 空态
    const db = useStudyDbStore()
    const pending = db.clearAllSyncedData()
    expect(localStorage.getItem('sync_meta_v1:u1')).toBe(null)

    setActivePinia(createPinia())
    const b = useStudyPlanStore()
    b.load()
    expect(b.milestones.map((m) => m.date)).toEqual(['', '', ''])

    // 切回 A：游标为 null → 全量拉回三行（三种 key 各自独立）
    b.applySyncedMilestoneRows([
      remoteRow('op', '2026-12-01', T0),
      remoteRow('theory', '2027-01-15', T1),
      remoteRow('academic', '2027-06-20', T2)
    ])
    expect(b.milestones.map((m) => m.date)).toEqual(['2026-12-01', '2027-01-15', '2027-06-20'])
    expect(b.getMilestoneSyncRows()).toHaveLength(3)
    return pending
  })
})

describe('nextMilestone · 最近一个未来日期（本地时区字符串比较）', () => {
  it('㉒ 只取 ≥ 今天的最小日期，点名里程碑，当天算「还有 0 天」', () => {
    freezeTo('2026-10-09T10:00:00')
    const today = useStudyPlanStore().today
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('theory', '2026-11-01')
    store.setMilestoneDate('academic', '2026-09-01') // 已过，不参与
    const n = store.nextMilestone
    expect(n.id).toBe('theory')
    expect(n.label).toBe('理论考')
    expect(n.date).toBe('2026-11-01')
    expect(n.days).toBeGreaterThan(0)
    expect(daysUntil(today)).toBe(0)
  })

  it('㉓ 当天日期 → days === 0（不显示负数）', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    const today = store.today
    store.setMilestoneDate('op', today)
    expect(store.nextMilestone).not.toBeNull()
    expect(store.nextMilestone.id).toBe('op')
    expect(store.nextMilestone.days).toBe(0)
  })

  it('㉔ 全未设置 / 全已过 → null（走空态，不显示负数）', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    expect(store.nextMilestone).toBeNull()
    store.setMilestoneDate('op', '2020-01-01')
    store.setMilestoneDate('theory', '2021-01-01')
    store.setMilestoneDate('academic', '2022-01-01')
    expect(store.nextMilestone).toBeNull()
    expect(store.countdowns.every((c) => c.days < 0)).toBe(true)
  })

  it('㉕ 既有已过也有未来 → 只取最近一个未来', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2020-01-01')
    store.setMilestoneDate('theory', '2026-10-20')
    store.setMilestoneDate('academic', '2027-01-01')
    expect(store.nextMilestone.id).toBe('theory')
    expect(store.nextMilestone.date).toBe('2026-10-20')
  })
})

describe('★ G1 · 登录动作立即触发同步（变异抽验 5）', () => {
  it('㉖ 挂载时未登录 → 登录后立即 doSync（runSync 被调用）；删掉 watch 则必红', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { render: () => null } },
        { path: '/plan', name: 'plan', component: { render: () => null } },
        { path: '/login', name: 'login', component: { render: () => null } }
      ]
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    // onMounted 只在「挂载时已登录」跑 doSync，此时尚未登录
    expect(mocks.runSync).not.toHaveBeenCalled()

    // 模拟 LoginView 登录成功 → setSession（isLoggedIn false → true）
    auth.accessToken = 'token-b'
    auth.user = { id: 'u2' }
    await nextTick()
    await flushPromises()

    // ★ 若 App.vue 的 watch(isLoggedIn) 被删除，这里必红（换设备最多等 5 分钟）
    expect(mocks.runSync).toHaveBeenCalled()
    expect(mocks.sync).toHaveBeenCalled() // 登录后立即 api.sync 被调用
    wrapper.unmount()
    await flushPromises()
  })

  it('㉗ 挂载时已登录：只同步一次（不因 watch 重复发请求）', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.accessToken = 'token-a'
    auth.user = { id: 'u1' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { render: () => null } },
        { path: '/plan', name: 'plan', component: { render: () => null } },
        { path: '/login', name: 'login', component: { render: () => null } }
      ]
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(mocks.runSync).toHaveBeenCalledTimes(1)
    expect(mocks.sync).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    await flushPromises()
  })
})
