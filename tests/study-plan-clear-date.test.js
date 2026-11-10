// @vitest-environment jsdom
/**
 * 里程碑日期「可清空」契约回归（A 组功能代码遗留 ②）
 *
 * 覆盖：
 *  ① 设置 → 清空 → reload 仍为「未设置」，且存档不残留旧推定默认值
 *  ② 空值契约：'' / null / undefined 都清回未设置
 *  ③ 清空只作用于目标里程碑，不误伤其它两条
 *  ④ 非法值仍被拒（保持原值、不写盘）
 *  ⑤ 与旧存档迁移互不干扰：迁移后清空 → 连续 reload 不复活旧默认值
 *
 * 与 tests/study-plan.test.js（18 例）互补：本文件只测本轮新增的「清空」契约，
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
})
