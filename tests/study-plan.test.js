// @vitest-environment jsdom
/**
 * 学习计划三件套测试（批 D D-2，P0-7）
 *
 * 覆盖（batch-d-tasks D-2 测试要点 ①–⑦）：
 *  - ① 周预算：合计 32 → budgetValid true；改 31 → false（且 save 仍写入，不阻断）
 *  - ② 顺延：昨天未完成任务出现在今日清单；勾选后移出清单但仍在 tasks（不清零）
 *  - ③ 不惩罚：连续多天未完成 → 无新惩罚字段、任务不丢失
 *  - ④ 倒计时：daysUntil('2026-11-30')（今天 2026-10-09）=== 52；已过日期 → 负值
 *  - ⑤ 存储 round-trip：save → 新 store load 一致；损坏 JSON → 回落默认不抛
 *  - ⑥ 备份完整性：studyDb.exportAllData() 结果含 localStorage['study_plan_v1']
 *  - ⑦ 组件级：mount PlanView 三区块渲染；预算合计 ≠32 时出提示（不阻断）
 *
 * 环境：jsdom（localStorage）+ fake-indexeddb（studyDb.exportAllData）。
 * 日期控制用 vi.setSystemTime（store 的 today 在创建时取当天）。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  useStudyPlanStore,
  WEEKLY_BUDGET_HOURS,
  DAILY_BUDGET_HOURS,
  MILESTONES,
  daysUntil
} from '@/stores/studyPlan'
import { useStudyDbStore } from '@/stores/studyDb'
import PlanView from '@/views/PlanView.vue'

/** 把系统时间钉在 2026-10-09（本地） */
function freezeTo(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('D-2 studyPlan store（①③④）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('① 预算：默认合计 32 → valid；改 31 → invalid；save 仍写入（不阻断）', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    expect(store.budgetTotal).toBe(WEEKLY_BUDGET_HOURS)
    expect(store.budgetValid).toBe(true)

    store.setBudget('math', 9) // 10 → 9，合计 31
    expect(store.budgetTotal).toBe(31)
    expect(store.budgetValid).toBe(false)
    // 校验失败不阻断：save 已写入（用户可继续使用）
    expect(localStorage.getItem('study_plan_v1')).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem('study_plan_v1'))
    expect(saved.budget.math).toBe(9)

    // 负数 / 非数 → 归 0（不产生 NaN 污染合计）
    store.setBudget('other', -5)
    expect(store.budget.other).toBe(0)
  })

  it('③ 不惩罚 / 不清零：连续多天未完成，任务不丢失、无惩罚字段', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    store.addTask({ subject: 'math', title: '三天的旧任务', dueDate: '2026-10-01' })
    store.addTask({ subject: 'chinese', title: '两天前的任务', dueDate: '2026-10-07' })
    expect(store.tasks).toHaveLength(2)
    // 无 streak / penalty / missedDays 等羞辱式字段
    for (const t of store.tasks) {
      expect('streak' in t).toBe(false)
      expect('penalty' in t).toBe(false)
      expect('missedDays' in t).toBe(false)
    }
    // 两条都顺延进今日清单
    expect(store.todayList.map((t) => t.title)).toEqual(['三天的旧任务', '两天前的任务'])
  })

  it('④ 倒计时：daysUntil 相对今天；已过日期为负', () => {
    freezeTo('2026-10-09T10:00:00')
    expect(daysUntil('2026-11-30')).toBe(52)
    expect(daysUntil('2026-10-09')).toBe(0)
    expect(daysUntil('2026-10-01')).toBe(-8)
    // 非法日期 → null（不抛）
    expect(daysUntil('not-a-date')).toBe(null)

    const store = useStudyPlanStore()
    const op = store.countdowns.find((c) => c.id === 'op')
    expect(op.days).toBe(52)
    // 里程碑默认值来自 MILESTONES（单一来源）
    expect(store.milestones.map((m) => m.id)).toEqual(MILESTONES.map((m) => m.id))
  })
})

describe('D-2 顺延与存储（②⑤⑥）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('② 顺延：昨天未完成 → 进今日清单；勾选后移出清单但仍留在 tasks', () => {
    freezeTo('2026-10-09T10:00:00')
    const store = useStudyPlanStore()
    const task = store.addTask({ subject: 'math', title: '昨天的任务', dueDate: '2026-10-08' })
    expect(store.todayList.map((t) => t.id)).toContain(task.id)
    expect(store.overdue(task)).toBe(true) // 顺延角标判据

    store.toggleTask(task.id)
    expect(store.todayList).toHaveLength(0) // 移出今日清单
    expect(store.tasks).toHaveLength(1) // 仍在数据里（不清零）
    expect(store.tasks[0].done).toBe(true)
    expect(store.tasks[0].doneAt).toBeTruthy()

    // 取消勾选 → 回到今日清单
    store.toggleTask(task.id)
    expect(store.todayList).toHaveLength(1)
  })

  it('⑤ 存储 round-trip：save → 新 store load 一致', () => {
    freezeTo('2026-10-09T10:00:00')
    let store = useStudyPlanStore()
    store.setBudget('math', 12)
    store.addTask({ subject: 'computer', title: '复习 PS 图层', dueDate: '2026-10-09' })
    store.setMilestoneDate('op', '2026-12-01')
    store.save()

    // 新 pinia → 新 store → load
    setActivePinia(createPinia())
    store = useStudyPlanStore()
    store.load()
    expect(store.budget.math).toBe(12)
    expect(store.tasks.some((t) => t.title === '复习 PS 图层')).toBe(true)
    expect(store.milestones.find((m) => m.id === 'op').date).toBe('2026-12-01')
  })

  it('⑤ 损坏 JSON：load 不抛、回落默认', () => {
    freezeTo('2026-10-09T10:00:00')
    localStorage.setItem('study_plan_v1', '{ this is not json')
    setActivePinia(createPinia())
    const store = useStudyPlanStore()
    expect(() => store.load()).not.toThrow()
    expect(store.budgetTotal).toBe(WEEKLY_BUDGET_HOURS)
    expect(store.tasks).toEqual([])
  })

  it('⑥ 备份完整性：exportAllData 含 study_plan_v1', async () => {
    const store = useStudyPlanStore()
    store.setBudget('math', 11)
    store.save()

    const db = useStudyDbStore()
    const dump = await db.exportAllData()
    expect(dump.localStorage).toBeTruthy()
    expect(dump.localStorage['study_plan_v1']).toBeTruthy()
    const parsed = JSON.parse(dump.localStorage['study_plan_v1'])
    expect(parsed.budget.math).toBe(11)
  })
})

describe('D-2 PlanView 组件（⑦）', () => {
  let pinia
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    localStorage.clear()
  })

  it('⑦ 三区块渲染；预算合计 ≠32 出提示（不阻断）', async () => {
    const wrapper = mount(PlanView, { global: { plugins: [pinia] } })
    await nextTick()
    // 三件套：里程碑倒计时 / 周预算 / 今日清单
    expect(wrapper.find('.plan-milestones').exists()).toBe(true)
    expect(wrapper.find('.plan-budget').exists()).toBe(true)
    expect(wrapper.find('.plan-block').exists()).toBe(true)
    // 默认 32h：无不符提示
    expect(wrapper.find('.plan-budget__note').exists()).toBe(false)

    const store = useStudyPlanStore()
    store.setBudget('math', 9) // 合计 31
    await nextTick()
    expect(wrapper.find('.plan-budget__note').exists()).toBe(true)
    expect(wrapper.text()).toContain('与目标 32')
    // 提示非阻断：页面正常渲染、无禁用态遮罩
    expect(wrapper.find('.plan-budget').exists()).toBe(true)
    wrapper.unmount()
  })

  it('⑦ 分科耗时标「等待 P1-12」；每日预算目标常量可导出', async () => {
    const wrapper = mount(PlanView, { global: { plugins: [pinia] } })
    await nextTick()
    expect(wrapper.text()).toContain('分科耗时待 P1-12')
    expect(DAILY_BUDGET_HOURS).toBeCloseTo(WEEKLY_BUDGET_HOURS / 7, 5)
    wrapper.unmount()
  })
})
