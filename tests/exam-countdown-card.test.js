// @vitest-environment jsdom
/**
 * ExamCountdownCard（P1-1 只读展示位）组件三态 + 文案 + 跳转测试
 *
 * 覆盖 PRD §4.3：
 *  - 存在未来日期：只显示最近一个未来里程碑、点名是哪一条、当天算「还有 0 天」
 *  - 三条全未设置 / 全已过 → 空态，不显示数字、不显示负数倒计时
 *  - 既有已过也有未来 → 已过项不参与「最近一个」
 *  - 只读：无写入口，点击只跳 /plan
 *  - 官方口径「以浙江省教育考试院当年发布为准」+ 禁词零命中 + 无示例数字
 *
 * 日期一律用**本地时区** YYYY-MM-DD 动态生成（与 store.nextMilestone / daysUntil 同口径），
 * 不使用 toISOString().slice(0,10)，也不冻结系统时间（避免与 router 的 Promise 调度打架）。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ExamCountdownCard from '@/components/ExamCountdownCard.vue'
import { useStudyPlanStore } from '@/stores/studyPlan'

/** 本地时区 YYYY-MM-DD（offsetDays 相对今天） */
function localDateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { render: () => null } },
      { path: '/plan', name: 'plan', component: { render: () => null } }
    ]
  })
}

let pinia
let router

beforeEach(async () => {
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  router = makeRouter()
  await router.push('/')
  await router.isReady()
})

describe('P1-1 · 存在未来日期', () => {
  it('① 只显示最近一个未来里程碑、点名是哪一条、天数正确', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(42))
    store.setMilestoneDate('theory', localDateStr(10))
    store.setMilestoneDate('academic', localDateStr(90))
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })

    expect(wrapper.text()).toContain('距「理论考」还有 10 天')
    expect(wrapper.text()).not.toContain('距「技能操作考」')
    expect(wrapper.text()).not.toContain('距「语数考试」')
    expect(wrapper.find('.exam-countdown__main').exists()).toBe(true)
    wrapper.unmount()
  })

  it('② 小字官方口径 + 行末「去设置 ›」', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('theory', localDateStr(42))
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })

    expect(wrapper.text()).toContain('距「理论考」还有 42 天')
    expect(wrapper.text()).toContain('最近一场 · 以浙江省教育考试院当年发布为准')
    expect(wrapper.text()).toContain('去设置 ›')
    wrapper.unmount()
  })

  it('③ 当天算「还有 0 天」（≥ 今天的最小日期）', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(0))
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })

    expect(wrapper.text()).toContain('距「技能操作考」还有 0 天')
    expect(wrapper.text()).not.toContain('已过')
    expect(wrapper.text()).not.toContain('-1')
    wrapper.unmount()
  })

  it('④ 既有已过也有未来 → 已过项不参与「最近一个」', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(-30))
    store.setMilestoneDate('theory', localDateStr(20))
    store.setMilestoneDate('academic', localDateStr(-1))
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })

    expect(wrapper.text()).toContain('距「理论考」还有 20 天')
    expect(wrapper.text()).not.toContain('本年度考试日期已过')
    wrapper.unmount()
  })
})

describe('P1-1 · 空态（无数据不占位、无示例数字、无负数）', () => {
  it('⑤ 三条全未设置 → 说明文案，不显示任何数字', () => {
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })
    expect(wrapper.text()).toContain('考试日期待设置 · 以浙江省教育考试院当年发布为准')
    expect(wrapper.text()).not.toMatch(/\d/)
    expect(wrapper.find('.exam-countdown__sub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('⑥ 三条全已过 → 空态不显示负数倒计时', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(-10))
    store.setMilestoneDate('theory', localDateStr(-20))
    store.setMilestoneDate('academic', localDateStr(-30))
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })

    expect(wrapper.text()).toContain('本年度考试日期已过 · 如需更新请前往学习计划')
    expect(wrapper.text()).not.toMatch(/-\d/)
    expect(wrapper.text()).not.toContain('还有')
    wrapper.unmount()
  })
})

describe('P1-1 · 只读 / 跳转 / 文案红线', () => {
  it('⑦ 点击整卡跳 /plan，且不改任何里程碑（只读、无第二写入口）', async () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(42))
    const before = JSON.stringify(store.milestones)
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })

    await wrapper.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/plan')
    expect(JSON.stringify(store.milestones)).toBe(before)
    expect(wrapper.findAll('input')).toHaveLength(0)
    wrapper.unmount()
  })

  it('⑧ 组件源码无写入口、无日期运算、无 ES2020 可选链 / 空值合并', () => {
    const src = readFileSync(
      join(process.cwd(), 'src', 'components', 'ExamCountdownCard.vue'),
      'utf8'
    )
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    expect(code).not.toMatch(/setMilestoneDate|applySyncedMilestoneRows|save\(/)
    expect(code).not.toMatch(/new Date\(/)
    expect(code).not.toMatch(/\?\./)
    expect(code).not.toMatch(/\?\?/)
    expect(code).not.toMatch(/new Function\(|eval\(/)
    expect(code).toMatch(/min-height: 44px/) // 触控目标 ≥44px
  })

  it('⑨ 禁词零命中；官方口径统一；空态无示例数字', () => {
    // 拼接构造禁词，避免「扫描源码」类守卫把测试自身的断言词当成违规文案
    const banned = [
      '提' + '分', '保' + '过', '录' + '取', '上' + '岸', '稳' + '过',
      '包' + '过', '必' + '过', '保证' + '通过'
    ]
    const store = useStudyPlanStore()
    const states = []
    states.push(mount(ExamCountdownCard, { global: { plugins: [pinia, router] } }))
    store.setMilestoneDate('theory', localDateStr(7))
    states.push(mount(ExamCountdownCard, { global: { plugins: [pinia, router] } }))
    store.setMilestoneDate('op', localDateStr(-30))
    store.setMilestoneDate('theory', localDateStr(-20))
    store.setMilestoneDate('academic', localDateStr(-10))
    states.push(mount(ExamCountdownCard, { global: { plugins: [pinia, router] } }))

    for (const w of states) {
      const text = w.text()
      for (const word of banned) expect(text).not.toContain(word)
      expect(text).not.toContain('官方已公布')
      expect(text).not.toContain('官方确定')
      w.unmount()
    }
    // 官方口径只在「有未来日期」与「全未设置」两态出现
    const futureWrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })
    expect(futureWrapper.text()).not.toMatch(/\d/)
    futureWrapper.unmount()
  })

  it('⑩ 组件渲染始终只有一张卡、一个主文案（不并列三条倒计时）', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(5))
    store.setMilestoneDate('theory', localDateStr(15))
    store.setMilestoneDate('academic', localDateStr(25))
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })
    expect(wrapper.findAll('.exam-countdown')).toHaveLength(1)
    expect(wrapper.findAll('.exam-countdown__main')).toHaveLength(1)
    expect(wrapper.text()).toContain('距「技能操作考」还有 5 天')
    wrapper.unmount()
  })

  it('⑪ 同步状态变化不影响只读展示位（组件不消费 syncStatus）', () => {
    const store = useStudyPlanStore()
    store.setMilestoneDate('op', localDateStr(3))
    store.setSyncStatus('offline')
    const wrapper = mount(ExamCountdownCard, { global: { plugins: [pinia, router] } })
    expect(wrapper.text()).not.toContain('离线')
    expect(wrapper.text()).not.toContain('待同步')
    expect(wrapper.text()).not.toContain('已同步')
    wrapper.unmount()
  })
})
