// @vitest-environment jsdom
/**
 * review-session —— 批 C C-1-2 单测（复习会话 store + ReviewView + GradeButtons）
 * 覆盖 batch-c-tasks.md §2 C-1-2 测试要点 ①–⑩：
 *  - ① 截断到 REVIEW_SESSION_LIMIT、未到期不入队、phase=session
 *  - ② 空队列 → phase=cleared、不抛错
 *  - ③ flip 纯内存（DB 无副作用）
 *  - ④ grade(AGAIN) 的 SM-2 落库 + reviewed 仍 false（缺陷回归）
 *  - ⑤ EASY/GOOD 产生不同 easeFactor（四档真实驱动，端到端）
 *  - ⑥ 评到末张 → phase=done
 *  - ⑦ 组件级：翻面前答案不进 DOM，翻面后出现；点「忘了」进度+1 且落库
 *  - ⑧ 组件级：空队列渲染「今日已清零」、不渲染空态文案
 *  - ⑨ GradeButtons 四档、≥2 种预览、pick 事件带正确 grade
 *  - ⑩ 卡面归因（reason/kp/wrongCount）露出
 *
 * 隔离策略（fake-indexeddb 跨用例残留 + 入库经多个宏任务）：唯一题干标记 + 轮询等待 + beforeEach 排空清库。
 * jsdom 陷阱（本项目已固化）：不要用 fileURLToPath(new URL(...))（jsdom 全局 URL 非 Node 的）。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useReviewStore } from '@/stores/review'
import { useStudyDbStore } from '@/stores/studyDb'
import { GRADES, REVIEW_SESSION_LIMIT } from '@/composables/useSpacedReview'
import ReviewView from '@/views/ReviewView.vue'
import GradeButtons from '@/components/GradeButtons.vue'

// KaTeX 引擎走动态 import（523KB），组件级测试无需真实公式渲染 —— mock 掉避免拖慢/报错。
// 公式组件同时以 passthrough stub 替换（详见 mountReview）——文本断言不依赖引擎。
vi.mock('@/composables/useKatex', () => ({
  warmKatex: () => Promise.resolve(null),
  isKatexReady: () => false,
  renderMath: (t) => String(t ?? ''),
  renderPlainFallback: (t) => String(t ?? ''),
  engineVersion: { value: 0 },
  typesetMath: () => Promise.resolve()
}))

const MJ_STUB = { props: ['text', 'block'], template: '<span class="mj-stub">{{ text }}</span>' }

/** 本地日期串（与 getDateStr 同口径） */
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayStr() { return ymd(new Date()) }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d) }

/** 轮询等待：谓词成立即返回其值，超时返回最后一次结果 */
async function waitUntil(check, timeout = 5000) {
  const t0 = Date.now()
  for (;;) {
    const v = await check()
    if (v) return v
    if (Date.now() - t0 > timeout) return v
    await new Promise((r) => setTimeout(r, 20))
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let seq = 0
/** 造一条 error_book 行（直接 addError，不走 recordError 去重） */
async function seedRow(db, fields = {}) {
  seq += 1
  const today = todayStr()
  return db.addError({
    subject: 'math', unitNum: '01', question: `题干_${seq}`, correctAnswer: `答案_${seq}`,
    userAnswer: '', explanation: '', reason: '', kp: '',
    createdAt: Date.now() + seq, createdAtDate: today,
    reviewed: false, reviewCount: 0, easeFactor: 2.5, interval: 0, repetitions: 0,
    nextReviewDate: today, lastReviewedAt: null, wrongCount: 1,
    fileKey: `math_01_rs_${seq}`,
    ...fields
  })
}
async function seedDue(db, n, fields = {}) {
  for (let i = 0; i < n; i++) await seedRow(db, fields)
}

/** 造一个可挂载 ReviewView 的 router */
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/practice', name: 'practice', component: { template: '<div/>' } },
      { path: '/review', name: 'review', component: ReviewView },
      { path: '/error-book', name: 'error-book', component: { template: '<div/>' } },
      { path: '/study/:subject/:unitNum/:fileIndex?', name: 'unit', component: { template: '<div/>' } }
    ]
  })
}

describe('review-session —— store 层', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await sleep(120)
    await db.clearAllErrors()
  })

  it('① startSession：截断到 25、未到期不入队、phase=session', async () => {
    await seedDue(db, 30)
    await seedDue(db, 5, { nextReviewDate: '2099-01-01' })
    const store = useReviewStore()
    await store.startSession()
    expect(store.queue).toHaveLength(REVIEW_SESSION_LIMIT)
    expect(store.queue.every((e) => e.nextReviewDate !== '2099-01-01')).toBe(true)
    expect(store.phase).toBe('session')
    expect(store.progress.total).toBe(REVIEW_SESSION_LIMIT)
  })

  it('② 空队列 → phase=cleared、queue 空、不抛错', async () => {
    const store = useReviewStore()
    await expect(store.startSession()).resolves.toBeDefined()
    expect(store.phase).toBe('cleared')
    expect(store.queue).toHaveLength(0)
  })

  it('③ flip 纯内存：DB 该行 nextReviewDate 不变', async () => {
    await seedDue(db, 1)
    const store = useReviewStore()
    await store.startSession()
    const before = (await db.getAllErrors())[0].nextReviewDate
    store.flip()
    expect(store.flipped).toBe(true)
    const after = (await db.getAllErrors())[0].nextReviewDate
    expect(after).toBe(before)
  })

  it('④ grade(AGAIN)：SM-2 重置落到 DB、reviewed 仍 false、进度推进', async () => {
    await seedDue(db, 3)
    const store = useReviewStore()
    await store.startSession()
    const id = store.current.id
    await store.grade(GRADES.AGAIN)
    const back = (await db.getAllErrors()).find((e) => e.id === id)
    expect(back.repetitions).toBe(0)
    expect(back.interval).toBe(1)
    expect(back.reviewCount).toBe(1)
    expect(back.nextReviewDate).toBe(tomorrowStr())
    expect(back.lastReviewedAt).toBeTruthy()
    expect(back.reviewed).toBe(false) // 缺陷回归：点「忘了」不得被标已掌握
    expect(store.progress.again).toBe(1)
    expect(store.index).toBe(1)
  })

  it('⑤ EASY 与 GOOD 在同一初始行上产生不同 easeFactor（四档真实驱动）', async () => {
    // 说明：经典 SM-2 中成功档的间隔倍数与档位无关 —— 初始行 GOOD/EASY 的 interval 同为 1、
    // nextReviewDate 同为明天；两者的真实差异体现在 easeFactor（GOOD 2.5 / EASY 2.6），
    // 并从下一次复习起拉开间隔。故此处锚定 easeFactor 差异（并附 interval 的差异见 AGAIN 用例）。
    await seedDue(db, 1)
    let store = useReviewStore()
    await store.startSession()
    const goodId = store.current.id
    await store.grade(GRADES.GOOD)
    const goodEase = (await db.getAllErrors()).find((e) => e.id === goodId).easeFactor

    await db.clearAllErrors()
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await seedDue(db, 1)
    store = useReviewStore()
    await store.startSession()
    const easyId = store.current.id
    await store.grade(GRADES.EASY)
    const easyEase = (await db.getAllErrors()).find((e) => e.id === easyId).easeFactor

    expect(easyEase).toBeGreaterThan(goodEase)
  })

  it('⑥ 评到末张 → phase=done、progress.total=queue.length', async () => {
    await seedDue(db, 2)
    const store = useReviewStore()
    await store.startSession()
    await store.grade(GRADES.GOOD)
    expect(store.phase).toBe('session')
    await store.grade(GRADES.GOOD)
    expect(store.phase).toBe('done')
    expect(store.progress.total).toBe(2)
    expect(store.progress.done).toBe(2)
  })
})

describe('review-session —— 组件层（ReviewView / GradeButtons）', () => {
  let db
  let pinia
  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    db = useStudyDbStore()
    await sleep(120)
    await db.clearAllErrors()
  })

  async function mountReview() {
    const router = makeRouter()
    router.push('/review')
    await router.isReady()
    const wrapper = mount(ReviewView, {
      global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } }
    })
    const store = useReviewStore()
    return { wrapper, store }
  }

  it('⑦ 翻面前答案不进 DOM；翻面后出现；点「忘了」进度+1 且落库', async () => {
    const row = await seedRow(db, { question: '题干ABC', correctAnswer: 'ANSWER_XYZ_777' })
    const { wrapper, store } = await mountReview()
    await waitUntil(() => store.phase === 'session')

    expect(wrapper.text()).not.toContain('ANSWER_XYZ_777')
    await wrapper.find('.rv-actions .rv-btn--primary').trigger('click')
    await waitUntil(() => store.flipped === true)
    expect(wrapper.text()).toContain('ANSWER_XYZ_777')

    const btns = wrapper.findAll('.grade-btn')
    expect(btns.length).toBe(4)
    await btns[0].trigger('click') // 忘了
    await waitUntil(() => store.progress.done === 1)
    const back = (await db.getAllErrors()).find((e) => e.id === row)
    expect(back.reviewCount).toBe(1)
    expect(back.reviewed).toBe(false)
    wrapper.unmount()
  }, 20000)

  it('⑧ 空队列渲染「今日已清零」、不渲染空态文案', async () => {
    const { wrapper, store } = await mountReview()
    await waitUntil(() => store.phase === 'cleared')
    expect(wrapper.text()).toContain('今日已清零')
    expect(wrapper.text()).not.toContain('还没有错题记录')
    wrapper.unmount()
  }, 20000)

  it('⑩ 卡面归因露出：reason / kp / wrongCount', async () => {
    await seedRow(db, { question: '题干R', correctAnswer: '答案R', reason: '计算失误', kp: '一元二次', wrongCount: 3 })
    const { wrapper, store } = await mountReview()
    await waitUntil(() => store.phase === 'session')
    const txt = wrapper.text()
    expect(txt).toContain('计算失误')
    expect(txt).toContain('一元二次')
    expect(txt).toContain('错 3 次')
    wrapper.unmount()
  }, 20000)

  it('⑨ GradeButtons：四档齐备、≥2 种预览、pick 带正确 grade', async () => {
    const w = mount(GradeButtons, { props: { error: { repetitions: 2, interval: 6, easeFactor: 2.5 } } })
    const btns = w.findAll('.grade-btn')
    expect(btns).toHaveLength(4)
    const previews = w.findAll('.grade-preview').map((el) => el.text())
    expect(new Set(previews).size).toBeGreaterThanOrEqual(2)
    await btns[3].trigger('click')
    expect(w.emitted('pick')[0]).toEqual([GRADES.EASY])
    // 四档标签与 GRADE_META 同源
    expect(w.findAll('.grade-label').map((el) => el.text())).toEqual(['忘了', '困难', '良好', '简单'])
  })

  it('⑪ GradeButtons uniform 判据 = repetitions===0（R2-F1：破坏行不得显示「首次复习」文案）', () => {
    // 真新卡：repetitions===0 → 收成一行统一说明、不逐档渲染徽标
    const fresh = mount(GradeButtons, { props: { error: { repetitions: 0, interval: 0, easeFactor: 2.5 } } })
    expect(fresh.find('.grade-note').exists()).toBe(true)
    expect(fresh.findAll('.grade-preview')).toHaveLength(0)
    fresh.unmount()

    // 破坏行（外部导入）：reps>0 但四档预估间隔恰好都为 1 → 旧判据（比较间隔）会误显示「首次复习」。
    // 新判据直接看 repetitions → 不显示文案、正常逐档渲染徽标。
    const broken = mount(GradeButtons, { props: { error: { repetitions: 2, interval: 1, easeFactor: 1.3 } } })
    expect(broken.find('.grade-note').exists()).toBe(false)
    expect(broken.findAll('.grade-preview')).toHaveLength(4)
    broken.unmount()
  })
})
