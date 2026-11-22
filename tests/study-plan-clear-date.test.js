// @vitest-environment jsdom
/**
 * 里程碑日期「可清空」契约 + `load()` 无条件重置语义回归（A 组功能代码遗留 ② / QA 复核 P0）
 *
 * 覆盖：
 *  ① 设置 → 清空 → reload 仍为「未设置」，且存档不残留旧推定默认值
 *  ② 空值契约：'' / null / undefined 都清回未设置
 *  ③ 清空只作用于目标里程碑，不误伤其它两条
 *  ④ 非法值仍被拒（保持原值、不写盘）
 *  ⑤ 与旧存档迁移互不干扰：迁移后清空 → 连续 reload 不复活旧默认值
 *  ⑥ 半残存档自愈：只含 budget、缺 milestones/tasks → load() 后其余回到默认
 *  ⑦ 完整存档往返（同账号）：先重置再套用不误伤正常存档
 *
 * 与 tests/study-plan.test.js 互补：本文件只测本轮新增的「清空」与「先重置再套用」契约，
 * 既有测试的断言一律不动、不放宽。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  useStudyPlanStore,
  LEGACY_DEFAULT_DATES,
  MILESTONES,
  daysUntil
} from '@/stores/studyPlan'

const STORAGE_KEY = 'study_plan_v1'

/** 把系统时间钉在 2026-10-09（与 tests/study-plan.test.js 同口径） */
function freezeTo(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

/** 读存档里某里程碑当前写入的 date */
function savedDate(id) {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const parsed = JSON.parse(raw)
  const hit = (parsed.milestones || []).find((m) => m && m.id === id)
  return hit ? hit.date : null
}

describe('setMilestoneDate · 清空契约', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('① 设置 → 清空 → reload 仍为未设置，存档不含旧默认值', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2026-12-01')
    expect(store.countdowns.find((m) => m.id === 'op').days).toBe(53)

    store.setMilestoneDate('op', '')
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('')
    expect(daysUntil('')).toBe(null)
    expect(store.countdowns.find((m) => m.id === 'op').days).toBe(null)
    expect(savedDate('op')).toBe('')

    // reload（新 Pinia → 新 store）后仍是未设置
    setActivePinia(createPinia())
    const reloaded = useStudyPlanStore()
    reloaded.load()
    expect(reloaded.milestones.find((m) => m.id === 'op').date).toBe('')
    expect(reloaded.countdowns.find((m) => m.id === 'op').days).toBe(null)

    // 清空写回的是 ''，不是 LEGACY_DEFAULT_DATES 里的旧推定默认值
    const raw = localStorage.getItem(STORAGE_KEY)
    for (const legacy of LEGACY_DEFAULT_DATES) expect(raw).not.toContain(legacy)
  })

  it('② 空值契约：null / undefined 与空串同义（都清回未设置）', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    for (const empty of ['', null, undefined]) {
      store.setMilestoneDate('theory', '2027-01-15')
      expect(store.milestones.find((m) => m.id === 'theory').date).toBe('2027-01-15')
      store.setMilestoneDate('theory', empty)
      expect(store.milestones.find((m) => m.id === 'theory').date).toBe('')
      expect(savedDate('theory')).toBe('')
    }
  })

  it('③ 清空只作用于目标里程碑，不误伤其它两条', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('theory', '2027-01-15')
    store.setMilestoneDate('academic', '2027-06-20')
    store.setMilestoneDate('theory', '')

    expect(store.milestones.map((m) => m.date)).toEqual(['2026-12-01', '', '2027-06-20'])
    expect(savedDate('op')).toBe('2026-12-01')
    expect(savedDate('academic')).toBe('2027-06-20')
  })

  it('④ 非法值仍被拒：保持原值且不写盘', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('academic', '2027-06-20')
    const before = localStorage.getItem(STORAGE_KEY)
    const invalid = [
      '2026-1-1', '2026/12/01', '2026-12-01T00:00:00', 'not-a-date',
      'abcdefghij', ' ', 123, 0, false, {}, []
    ]
    for (const bad of invalid) {
      store.setMilestoneDate('academic', bad)
      expect(store.milestones.find((m) => m.id === 'academic').date).toBe('2027-06-20')
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })

  it('⑤ 旧默认值迁移后清空 → 连续 reload 不复活；MILESTONES 默认值仍全为空', () => {
    freezeTo('2026-10-09T10:00:00')
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

    // 学员自填后清空
    store.setMilestoneDate('op', '2026-12-01')
    store.setMilestoneDate('op', null)
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('')

    // 连续两次 reload 都不复活旧默认值
    for (let i = 0; i < 2; i++) {
      setActivePinia(createPinia())
      const next = useStudyPlanStore()
      next.load()
      expect(next.milestones.map((m) => m.date)).toEqual(['', '', ''])
    }
    expect(MILESTONES.every((m) => m.date === '')).toBe(true)
  })

  it('⑧ 清空后同步行仍推 date:\'\' 正常行（不用墓碑、带新 updatedAt）', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    const atBefore = store.milestones.find((m) => m.id === 'op').updatedAt
    store.setMilestoneDate('op', '')

    const rows = store.getMilestoneSyncRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].entity).toBe('exam_milestone')
    expect(rows[0].key).toBe('op')
    expect(rows[0].payload.date).toBe('')
    expect(rows[0].deleted).toBe(false)
    expect(Date.parse(rows[0].updatedAt)).toBeGreaterThan(Date.parse(atBefore))
  })
})

describe('load() · 先无条件重置再套用（半残存档自愈 / 正常存档无回归）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('⑥ 半残存档（只含 budget、缺 milestones/tasks）→ load() 后其余回到默认', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    // 先把内存污染成「上一账号」的状态
    store.setBudget('math', 99)
    store.setBudget('chinese', 88)
    store.setMilestoneDate('op', '2026-12-01')
    store.addTask({ title: 'A 的私密待办' })

    // B 侧只有一个半残存档（缺 milestones / tasks 字段）
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budget: { math: 1 } }))

    store.load()
    expect(store.budget.math).toBe(1) // parsed 里有的照套
    expect(store.budget.chinese).toBe(8) // parsed 里没有的回默认（不能残留 88）
    expect(store.milestones.map((m) => m.date)).toEqual(['', '', ''])
    expect(store.tasks).toEqual([])
  })

  it('⑦ 完整存档往返（同账号）：先重置再套用不误伤正常存档', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setBudget('math', 12)
    store.setMilestoneDate('theory', '2027-01-15')
    store.addTask({ subject: 'chinese', title: '复习文言文', dueDate: '2026-10-09' })
    expect(localStorage.getItem(STORAGE_KEY)).toContain('2027-01-15')

    // 模拟整页刷新重建 Pinia → 新 store → load()
    setActivePinia(createPinia())
    const fresh = useStudyPlanStore()
    fresh.load()
    expect(fresh.budget.math).toBe(12)
    expect(fresh.milestones.find((m) => m.id === 'theory').date).toBe('2027-01-15')
    expect(fresh.milestones.find((m) => m.id === 'op').date).toBe('')
    expect(fresh.tasks.map((t) => t.title)).toContain('复习文言文')
  })
})

describe('里程碑日期严格日历校验（拒绝语义非法的年月日）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('⑨ 形状合法但语义非法的日期被拒：保持原值 / 时间戳不变 / 存档字节不变', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    const beforeRaw = localStorage.getItem(STORAGE_KEY)
    const beforeAt = store.milestones.find((m) => m.id === 'op').updatedAt

    // 13 月 / 2 月 30 日 / 非闰年 2 月 29 日 / 0 月 / 4 月 31 日
    for (const bad of ['2026-13-45', '2026-02-30', '2026-02-29', '2026-00-10', '2026-04-31']) {
      store.setMilestoneDate('op', bad)
      expect(store.milestones.find((m) => m.id === 'op').date).toBe('2026-12-01')
      expect(store.milestones.find((m) => m.id === 'op').updatedAt).toBe(beforeAt)
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw)
  })

  it('⑩ 闰年 2028-02-29 合法；正常值不受影响；清空仍可用', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2028-02-29')
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2028-02-29')
    store.setMilestoneDate('theory', '2027-01-15') // 常规合法值不受影响
    expect(store.milestones.find((m) => m.id === 'theory').date).toBe('2027-01-15')
    store.setMilestoneDate('op', '')
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('')
    expect(savedDate('op')).toBe('')
  })

  it('⑪ 远端同步行同样拒绝语义非法日期（与 setMilestoneDate 同源）', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01')
    const beforeRaw = localStorage.getItem(STORAGE_KEY)
    const row = (date) => ({
      key: 'op',
      updatedAt: '2026-10-10T00:00:00.000Z',
      payload: { id: 'op', label: '技能操作考', date, updatedAt: '2026-10-10T00:00:00.000Z' }
    })

    store.applySyncedMilestoneRows([row('2026-13-45'), row('2026-02-30'), row('2026-02-29')])
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2026-12-01')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw)

    // 控制组：合法日期（含闰年日）仍可覆盖，证明拒绝来自校验而非整段失效
    store.applySyncedMilestoneRows([row('2028-02-29')])
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2028-02-29')
  })

  it('⑫ 不存在的 id：不写盘（存档字节严格相等），也不新建里程碑', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', '2026-12-01') // 先造出非空存档，令「字节不变」可观测
    const beforeRaw = localStorage.getItem(STORAGE_KEY)
    expect(beforeRaw).toBeTruthy()

    store.setMilestoneDate('__not_exist__', '2026-12-01')

    expect(localStorage.getItem(STORAGE_KEY)).toBe(beforeRaw)
    expect(store.milestones.some((m) => m.id === '__not_exist__')).toBe(false)
  })
})
