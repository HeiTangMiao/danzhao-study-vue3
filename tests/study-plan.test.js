// @vitest-environment jsdom
/**
 * 学习计划三件套测试（批 D D-2，P0-7）
 *
 * 覆盖（batch-d-tasks D-2 测试要点 ①–⑦）：
 *  - ① 周预算：合计 32 → budgetValid true；改 31 → false（且 save 仍写入，不阻断）
 *  - ② 顺延：昨天未完成任务出现在今日清单；勾选后移出清单但仍在 tasks（不清零）
 *  - ③ 不惩罚：连续多天未完成 → 无新惩罚字段、任务不丢失
 *  - ④ 倒计时：daysUntil 相对今天 / 已过为负 / 空串为 null；三条里程碑默认 date='' → days=null（未设置）
 *  - ④' 旧存档迁移：三个旧推定默认值（官方未发布）→ 回落 ''；用户自改的日期保留
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
  LEGACY_DEFAULT_DATES,
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

  it('④ 倒计时：daysUntil 相对今天；已过日期为负；空串为 null', () => {
    freezeTo('2026-10-09T10:00:00')
    expect(daysUntil('2026-12-01')).toBe(53)
    expect(daysUntil('2026-10-09')).toBe(0)
    expect(daysUntil('2026-10-01')).toBe(-8)
    // 非法日期 / 空串 → null（不抛）；'' = 未设置，即方案 A 的默认值
    expect(daysUntil('not-a-date')).toBe(null)
    expect(daysUntil('')).toBe(null)

    const store = useStudyPlanStore()
    // 方案 A：三条默认 date 全为空 = 未设置，不预设任何年份或月日
    expect(store.milestones.map((m) => m.date)).toEqual(['', '', ''])
    expect(store.countdowns.map((c) => c.days)).toEqual([null, null, null])
    // 里程碑默认值来自 MILESTONES（单一来源）——store 只是它的拷贝，不另写一份。
    // 覆盖来源只有两处，均有独立断言：① load() 的旧存档迁移（下方「旧存档迁移」用例）；
    // ② setMilestoneDate() 学员自填（⑤ round-trip 用例）。本条守卫的是「二者都没发生时」的默认值。
    expect(store.milestones.map((m) => m.id)).toEqual(MILESTONES.map((m) => m.id))
    expect(store.milestones.map((m) => m.date)).toEqual(MILESTONES.map((m) => m.date))
  })
})

describe('方案 A · 旧存档迁移（④′ 官方未发布的推定日期不得复活）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('迁移常量只登记三个旧推定默认值，且没有任何一条被重新用作默认值', () => {
    expect([...LEGACY_DEFAULT_DATES]).toEqual(['2026-11-30', '2027-04-15', '2027-06-07'])
    expect(MILESTONES.every((m) => !LEGACY_DEFAULT_DATES.includes(m.date))).toBe(true)
  })

  it('旧存档三条都是推定默认值 → 升级后全部显示「待设置」（date=\'\' / days=null）', () => {
    freezeTo('2026-10-09T10:00:00')
    localStorage.setItem(
      'study_plan_v1',
      JSON.stringify({
        milestones: [
          { id: 'op', date: '2026-11-30' },
          { id: 'theory', date: '2027-04-15' },
          { id: 'academic', date: '2027-06-07' }
        ]
      })
    )
    const store = useStudyPlanStore()
    store.load()
    expect(store.milestones.map((m) => m.date)).toEqual(['', '', ''])
    expect(store.countdowns.map((c) => c.days)).toEqual([null, null, null])
    // 迁移结果在下一次 save 时写回（自愈），旧字面量不再留在存档里
    store.save()
    const reread = JSON.parse(localStorage.getItem('study_plan_v1'))
    expect(reread.milestones.map((m) => m.date)).toEqual(['', '', ''])
  })

  it('混合存档：只迁移旧推定字面量，用户自己改过的日期原样保留', () => {
    freezeTo('2026-10-09T10:00:00')
    localStorage.setItem(
      'study_plan_v1',
      JSON.stringify({
        milestones: [
          { id: 'op', date: '2026-12-01' }, // 用户改过 → 保留
          { id: 'theory', date: '2027-04-15' }, // 旧推定默认值 → 迁移
          { id: 'academic', date: '2027-06-07' } // 旧推定默认值 → 迁移
        ]
      })
    )
    const store = useStudyPlanStore()
    store.load()
    expect(store.milestones.map((m) => m.date)).toEqual(['2026-12-01', '', ''])
    expect(store.countdowns.map((c) => c.days)).toEqual([53, null, null])
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

  it('⑦ 里程碑未设置时显示「待设置 · 以当年官方通知为准」，不是空白 / NaN', async () => {
    const wrapper = mount(PlanView, { global: { plugins: [pinia] } })
    await nextTick()
    const badges = wrapper.findAll('.plan-ms__days')
    expect(badges).toHaveLength(3)
    for (const badge of badges) {
      expect(badge.text()).toBe('待设置 · 以当年官方通知为准')
      expect(badge.text().trim()).not.toBe('')
      expect(badge.classes()).toContain('plan-ms__days--unset')
    }
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.text()).not.toContain('undefined')
    wrapper.unmount()
  })

  it('⑦ 分科耗时逐科展示（E-3 P1-12）取代占位；每日预算目标常量可导出', async () => {
    const wrapper = mount(PlanView, { global: { plugins: [pinia] } })
    await nextTick()
    // E-3：旧占位「分科耗时待 P1-12」已由逐科「实际 / 目标」对比取代
    expect(wrapper.text()).not.toContain('分科耗时待 P1-12')
    expect(wrapper.text()).not.toContain('待 P1-12')
    // 三学科 + 其他 = 4 行分科对比（每行含科目名与「/ 目标」）
    const rows = wrapper.findAll('.plan-subject__row')
    expect(rows).toHaveLength(4)
    expect(wrapper.text()).toContain('数学')
    expect(wrapper.text()).toContain('/ 目标')
    expect(DAILY_BUDGET_HOURS).toBeCloseTo(WEEKLY_BUDGET_HOURS / 7, 5)
    wrapper.unmount()
  })
})
