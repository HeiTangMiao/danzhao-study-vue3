// @vitest-environment jsdom
/**
 * ReciteTaskCard 入口接入测试（T05）
 *
 * 这一组用例守的不是「卡长什么样」，而是三条**结构性**约束：
 *
 * 1. **两个入口读数同源**（P0-6 验收）：学习 Tab 与复习 Tab 渲染出的重默篇数必须都等于
 *    `viewModel.dueCount`。任何一方自己再算一遍，就会出现「两个入口数字不一致」——
 *    那是本功能最容易被发现、也最难解释的缺陷。故这里用**同一份 store 状态**分别渲染
 *    两个 variant，断言它们显示同一个数。
 * 2. **无任务不留占位卡**：`hasTask === false`（home）与 `dueCount === 0`（review）时
 *    组件根节点必须是空的，而不是渲染一个「今日无任务」的空壳。
 * 3. **用 `dueCount` 不用 `dueTotal`**：`dueCount` 是今日**可作**（已被 `DAILY_DUE_LIMIT`
 *    截断），`dueTotal` 是全部到期。用错了会显示「重默 8 篇」但点进去只有 5 篇。
 *
 * ★ 为什么不接真 store：真 store 的 `dueCount` 被 `DAILY_DUE_LIMIT = 5` 截断，
 *   造不出「dueTotal 5 / dueCount 2」这种组合。本文件把 store 换成一个可控的反应式替身
 *   —— 替身只提供 `viewModel` / `today` / `init`，与组件真正消费的三个出口一一对应，
 *   所以「读的是 viewModel」这条仍被真实校验（组件若去读 `rows` 会拿不到而报错）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { addDays, getDateStr } from '@/composables/useReciteSchedule'

/** store 替身：状态与被调用记录都放进 hoisted 盒子里，factory 与用例共享同一个引用 */
const box = vi.hoisted(() => ({ state: null, store: null, todayRef: null, initCalls: 0 }))

vi.mock('@/stores/recite', async () => {
  const { reactive, computed, ref } = await import('vue')
  const state = reactive({
    phase: 'idle',
    learned: 0,
    totalLesson: 67,
    ratio: 0,
    progressPct: 0,
    streak: 0,
    fresh: null,
    freshCount: 0,
    due: [],
    dueCount: 0,
    dueTotal: 0,
    dueRemaining: 0,
    suppressedNew: false,
    hasTask: false,
    challenge: null
  })
  const todayRef = ref(getDateStr())
  const viewModel = computed(() => ({ ...state }))
  // ⚠️ Pinia 的 setup store 会把 ref 自动解包再暴露给组件；这里是手写的普通对象，
  //    必须用 getter 显式解包，否则组件读到的 `store.viewModel` 是 Ref 而不是值。
  const store = {
    get viewModel() {
      return viewModel.value
    },
    get today() {
      return todayRef.value
    },
    init: async () => {
      box.initCalls += 1
    },
    reload: async () => {},
    beginAnswering: () => {},
    endAnswering: () => {}
  }
  box.state = state
  box.store = store
  box.todayRef = todayRef
  return { useReciteStore: () => store, RECITE_PHASE: {}, RECITE_HOME_PATH: '/recite' }
})

/** 顶层不 mock studyDb：HomeView 会用到，给它一个 no-op 桩避免真开 IndexedDB */
vi.mock('@/stores/studyDb', () => ({
  useStudyDbStore: () => ({
    init: async () => {},
    getRecentPages: async () => [],
    clearContentCache: async () => {},
    saveContentCache: async () => {},
    getContentCache: async () => null
  })
}))

const { default: ReciteTaskCard } = await import('@/components/ReciteTaskCard.vue')
const { default: HomeView } = await import('@/views/HomeView.vue')

const ROUTES = [
  { path: '/', name: 'home', component: { template: '<div />' } },
  { path: '/review', name: 'review', component: { template: '<div />' } },
  { path: '/recite', name: 'recite', component: { template: '<div />' } },
  { path: '/practice', name: 'practice', component: { template: '<div />' } },
  { path: '/exam', name: 'exam', component: { template: '<div />' } },
  // HomeView 的「继续学习」用命名路由跳转，缺了它 `router-link` 会抛 "No match for"
  { path: '/unit/:subject/:unitNum/:fileIndex', name: 'unit', component: { template: '<div />' } },
  { path: '/:pathMatch(.*)*', name: 'fallback', component: { template: '<div />' } }
]

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes: ROUTES })
}

async function mountCard(variant) {
  const wrapper = mount(ReciteTaskCard, {
    props: { variant },
    global: { plugins: [makeRouter()] }
  })
  await flushPromises()
  return wrapper
}

/** 把替身状态重置成「什么都没有」 */
function resetState(patch = {}) {
  Object.assign(box.state, {
    streak: 0,
    fresh: null,
    freshCount: 0,
    due: [],
    dueCount: 0,
    dueTotal: 0,
    hasTask: false,
    ...patch
  })
}

const TODAY = getDateStr()
const YESTERDAY = addDays(TODAY, -1)

/** 造一条到期行（形状与 `recite_progress` 一致的最小集） */
function dueRow(overrides = {}) {
  return {
    key: 'chinese|x|0',
    stage: 0,
    nextDate: YESTERDAY,
    ...overrides
  }
}

/**
 * 到期篇的正文（两段、注音内联 —— 与真实产物同形态）。
 *
 * 为什么给**两段**：`charCount` 的契约是「全部段落拼接后的字数」。只数第一段的实现会
 * 让下面的 `${DUE_CHAR_COUNT} 字` 断言落空 —— 一个 "字数是假的" 的 bug 不该从这条用例底下溜过去。
 */
const DUE_PARAGRAPHS = [
  '关关雎鸠（guān guān jū jiū），在河之洲（zài hé zhī zhōu）。',
  '窈窕淑女（yǎo tiǎo shū nǚ），君子好逑（jūn zǐ hǎo qiú）。'
]

/** 卡片应当显示的字数（契约值 = 全部段落拼接后的字符数） */
const DUE_CHAR_COUNT = DUE_PARAGRAPHS.join('').length

function duePiece(title, overrides = {}) {
  return {
    key: 'chinese|x|0',
    title,
    fileTitle: '默写专项 · 测试文件',
    paragraphs: DUE_PARAGRAPHS,
    ...overrides
  }
}

beforeEach(() => {
  box.initCalls = 0
  if (box.todayRef) box.todayRef.value = TODAY
  setActivePinia(createPinia())
  resetState()
})

describe('ReciteTaskCard · 两个入口读数同源（P0-6 验收）', () => {
  it('同一份 store 状态下，home 与 review 显示同一个重默篇数', async () => {
    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow() }],
      dueCount: 1,
      dueTotal: 1,
      hasTask: true
    })
    const home = await mountCard('home')
    const review = await mountCard('review')

    const homeText = home.text()
    const reviewText = review.text()
    // 两处都必须出现「1」，且都不允许出现别的数字（防止各算一遍算出 2）
    expect(homeText).toContain('待重默 1 篇')
    expect(reviewText).toContain('重默 1 篇')
    home.unmount()
    review.unmount()
  })

  it('must 用 dueCount 而非 dueTotal：dueTotal=5 / dueCount=2 时两处都显示 2，且不出现 5', async () => {
    resetState({
      due: [
        { piece: duePiece('关雎'), row: dueRow() },
        { piece: duePiece('蒹葭', { key: 'chinese|x|1' }), row: dueRow({ key: 'chinese|x|1' }) }
      ],
      dueCount: 2,
      dueTotal: 5, // 全部到期 5 篇，今天只排得下 2 篇
      dueRemaining: 3,
      hasTask: true
    })
    const home = await mountCard('home')
    const review = await mountCard('review')

    expect(home.text()).toContain('待重默 2 篇')
    expect(review.text()).toContain('重默 2 篇')
    // 关键负断言：页面上不许出现被截断掉的 5
    expect(home.text()).not.toContain('5')
    expect(review.text()).not.toContain('5')
    home.unmount()
    review.unmount()
  })
})

describe('ReciteTaskCard · 无任务时不留占位空卡', () => {
  it('home：hasTask=false 时根节点为空', async () => {
    resetState({ hasTask: false })
    const wrapper = await mountCard('home')
    expect(wrapper.find('.rtc-home').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('review：dueCount=0 时根节点为空', async () => {
    resetState({ dueCount: 0, hasTask: true, fresh: duePiece('新篇'), freshCount: 1 })
    const wrapper = await mountCard('review')
    expect(wrapper.find('.rtc-review').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('review：hasTask 仍为 true 但只要 dueCount=0 就不渲染（复习页只关心重默）', async () => {
    // 上一例已覆盖，这里显式钉住「不是看 hasTask」这一点
    resetState({ dueCount: 0, dueTotal: 0, hasTask: true, freshCount: 1 })
    const wrapper = await mountCard('review')
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })
})

describe('ReciteTaskCard · 内容与角标', () => {
  it('到期条目：显示篇名、出处、第 N 次重默、字数', async () => {
    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow({ stage: 1 }) }],
      dueCount: 1,
      dueTotal: 1,
      hasTask: true
    })
    const wrapper = await mountCard('home')
    const text = wrapper.text()
    expect(text).toContain('关雎')
    expect(text).toContain('默写专项 · 测试文件')
    expect(text).toContain('第 2 次重默') // stage 1 → 第 2 次
    // 篇幅 label 已从「N 空」改为「N 字」（2026-10-30 起不再挖空，所以没有"空"可报）
    expect(text).toContain(`${DUE_CHAR_COUNT} 字`)
    // 负断言：卡片不许退回 cloze 时代的「N 空」口径 —— 「空位」概念已随方案一并作废，
    // 这里一旦命中 '空'，说明有人把挖空/判分的产物字段接回了这张卡。
    expect(text).not.toContain('空')
    wrapper.unmount()
  })

  it('逾期角标：nextDate 为昨天 → 「逾期 1 天」；今天到期 → 不显示角标', async () => {
    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow({ nextDate: YESTERDAY }) }],
      dueCount: 1,
      hasTask: true
    })
    const overdue = await mountCard('home')
    expect(overdue.text()).toContain('逾期 1 天')
    overdue.unmount()

    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow({ nextDate: TODAY }) }],
      dueCount: 1,
      hasTask: true
    })
    const onTime = await mountCard('home')
    expect(onTime.text()).not.toContain('逾期')
    onTime.unmount()
  })

  it('新篇条目：无 due 时显示新篇与「新篇」角标', async () => {
    resetState({ fresh: duePiece('蒹葭'), freshCount: 1, hasTask: true })
    const wrapper = await mountCard('home')
    expect(wrapper.text()).toContain('蒹葭')
    expect(wrapper.text()).toContain('新篇')
    expect(wrapper.text()).toContain('今日新篇 1 篇')
    wrapper.unmount()
  })

  it('streak>0 时显示连续天数；streak=0 时不显示', async () => {
    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow() }],
      dueCount: 1,
      hasTask: true,
      streak: 7
    })
    const withStreak = await mountCard('home')
    expect(withStreak.text()).toContain('连续 7 天')
    withStreak.unmount()

    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow() }],
      dueCount: 1,
      hasTask: true,
      streak: 0
    })
    const noStreak = await mountCard('home')
    expect(noStreak.text()).not.toContain('连续')
    noStreak.unmount()
  })

  it('onMounted 必须调一次 store.init()（直接落 `/` 时靠它把产物拉起来）', async () => {
    resetState({ dueCount: 0, hasTask: false })
    const wrapper = await mountCard('home')
    expect(box.initCalls).toBe(1)
    wrapper.unmount()
  })
})

describe('ReciteTaskCard · 与 HomeView 的接入位置', () => {
  it('卡片在「今日待复习」之后、搜索区之前（真实 DOM 顺序）', async () => {
    resetState({
      due: [{ piece: duePiece('关雎'), row: dueRow() }],
      dueCount: 1,
      dueTotal: 1,
      hasTask: true
    })
    const wrapper = mount(HomeView, { global: { plugins: [createPinia(), makeRouter()] } })
    await flushPromises()

    const html = wrapper.html()
    const iDue = html.indexOf('today-task')
    const iRecite = html.indexOf('rtc-home')
    const iSearch = html.indexOf('home-search')

    expect(iDue).toBeGreaterThan(-1)
    expect(iRecite).toBeGreaterThan(-1)
    expect(iSearch).toBeGreaterThan(-1)
    // 今日待复习 → 每日背诵 → 搜索区（「先复习」纪律在最上，日课在「接着上次」之前）
    expect(iRecite).toBeGreaterThan(iDue)
    expect(iRecite).toBeLessThan(iSearch)
    wrapper.unmount()
  })
})

describe('ReciteTaskCard · 结构性约束（防退化）', () => {
  it('组件源码不得出现日期运算（`new Date(` / `addDays(` / `+ 1 天`）', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const raw = readFileSync(
      join(process.cwd(), 'src', 'components', 'ReciteTaskCard.vue'),
      'utf8'
    )
    // 先剥掉注释：组件头注释里写着「禁止 new Date()」，不剥会把说明文字当成违规代码
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
    // 只允许 overdueDays(row, today) 这一个日期出口（设计 §7.5）
    expect(src).not.toMatch(/new Date\(/)
    expect(src).not.toMatch(/\baddDays\(/)
    expect(src).toMatch(/overdueDays\(/)
  })
})
