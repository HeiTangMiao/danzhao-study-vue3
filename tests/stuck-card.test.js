// @vitest-environment jsdom
/**
 * stuck-card —— 批 C C-2-1 + C-2-2 单测（卡点存储 / 录入 / 混合队列 / 卡面形态 / 错题本区分）
 * C-2-1：①recordStuck 字段 ②去重自增 ③不同模块同名操作独立 ④混合队列 kind 过滤
 *         ⑤复习页 kindFilter 接线 ⑥录入校验 ⑦零迁移（engine ENTITIES 未变 / DB 仍 v7）
 * C-2-2：①卡面默写（翻面前路径不进 DOM）②翻面后出现 ③复习页 kind 分支 ④卡点四档评分
 *         ⑤错题本卡点角标 ⑥「查看原题」守卫 ⑦错题本 kind 筛选
 *
 * jsdom 陷阱（本项目已固化）：读源码用 join(process.cwd(), ...)，不要用 fileURLToPath(new URL(...))。
 */
import 'fake-indexeddb/auto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useStudyDbStore } from '@/stores/studyDb'
import { useReviewStore } from '@/stores/review'
import { pickDue, CARD_KINDS } from '@/composables/useSpacedReview'
import StuckCard from '@/components/StuckCard.vue'
import StuckCardComposer from '@/components/StuckCardComposer.vue'
import ReviewView from '@/views/ReviewView.vue'
import ErrorBookView from '@/views/ErrorBookView.vue'

// KaTeX 引擎走动态 import（523KB），组件级测试无需真实公式渲染 —— mock 掉避免拖慢
vi.mock('@/composables/useKatex', () => ({
  warmKatex: () => Promise.resolve(null),
  isKatexReady: () => false,
  renderMath: (t) => String(t ?? ''),
  renderPlainFallback: (t) => String(t ?? ''),
  engineVersion: { value: 0 },
  typesetMath: () => Promise.resolve()
}))

const MJ_STUB = { props: ['text', 'block'], template: '<span class="mj-stub">{{ text }}</span>' }

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayStr() { return ymd(new Date()) }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d) }

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
async function seedError(db, over = {}) {
  seq += 1
  const today = todayStr()
  return db.addError({
    subject: 'math', unitNum: '01', question: `e_${seq}`, correctAnswer: `ea_${seq}`,
    userAnswer: '', explanation: '', reason: '', kp: '',
    createdAt: Date.now() + seq, createdAtDate: today,
    reviewed: false, reviewCount: 0, easeFactor: 2.5, interval: 0, repetitions: 0,
    nextReviewDate: today, lastReviewedAt: null, wrongCount: 1,
    fileKey: `math_01_e_${seq}`,
    ...over
  })
}

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

// ===================== C-2-1 存储 / 录入 / 混合队列 =====================
describe('stuck-card —— 存储与队列（C-2-1）', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await sleep(120)
    await db.clearAllErrors()
  })

  it('① recordStuck：kind/source/module 正确 + SM-2 初始字段', async () => {
    const r = await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const e = (await db.getAllErrors()).find((x) => x.id === r.id)
    expect(e.kind).toBe(CARD_KINDS.STUCK)
    expect(e.source).toBe('stuck')
    expect(e.module).toBe('PS 图层面板')
    expect(e.subject).toBe('computer')
    expect(e.question).toBe('自由变换')
    expect(e.correctAnswer).toBe('Ctrl+T')
    expect(e.fileKey).toBe('stuck:PS 图层面板')
    expect(e.easeFactor).toBe(2.5)
    expect(e.reviewed).toBe(false)
    expect(e.nextReviewDate).toBe(todayStr())
  })

  it('② 同模块同操作名二次录入 → duplicated、行数不变、wrongCount 自增', async () => {
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const before = (await db.getAllErrors()).length
    const r2 = await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const rows = await db.getAllErrors()
    expect(r2.duplicated).toBe(true)
    expect(rows.length).toBe(before)
    expect(rows[0].wrongCount).toBe(2)
  })

  it('③ 不同模块同名操作 → 两条独立行（fileKey 不同）', async () => {
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    await db.recordStuck('PR 时间线', '自由变换', 'Ctrl+T')
    const rows = (await db.getAllErrors()).filter((e) => e.question === '自由变换')
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((e) => e.fileKey)).size).toBe(2)
  })

  it('④ 混合队列：pickDue 全部 5；kind=stuck 只 2；kind=error 只 3', async () => {
    await seedError(db); await seedError(db); await seedError(db)
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    await db.recordStuck('PR 时间线', '导出序列', 'Ctrl+M')
    const list = await db.getAllErrors()

    expect(pickDue(list)).toHaveLength(5)
    const stuck = pickDue(list, { kind: CARD_KINDS.STUCK })
    expect(stuck).toHaveLength(2)
    expect(stuck.every((e) => e.kind === CARD_KINDS.STUCK)).toBe(true)
    const errs = pickDue(list, { kind: CARD_KINDS.ERROR })
    expect(errs).toHaveLength(3)
    expect(errs.every((e) => e.kind !== CARD_KINDS.STUCK)).toBe(true)
  })

  it('⑤ 复习页 kindFilter 接线：startSession({kind:stuck}) 队列全卡点；kind=null 混合', async () => {
    await seedError(db); await seedError(db); await seedError(db)
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    await db.recordStuck('PR 时间线', '导出序列', 'Ctrl+M')

    const store = useReviewStore()
    await store.startSession({ kind: CARD_KINDS.STUCK })
    expect(store.queue).toHaveLength(2)
    expect(store.queue.every((e) => e.kind === CARD_KINDS.STUCK)).toBe(true)

    await store.startSession({ kind: null })
    expect(store.queue).toHaveLength(5)
  })

  it('⑥ 录入校验：操作名空串 → 不落库、给提示、无异常', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const before = (await db.getAllErrors()).length
    const w = mount(StuckCardComposer, { props: { open: true }, global: { plugins: [pinia] } })
    await w.find('.sc-input').setValue('PS 图层面板') // 模块
    const inputs = w.findAll('.sc-input')
    await inputs[1].setValue('') // 操作名故意留空
    await inputs[2].setValue('Ctrl+T') // 路径
    await w.find('.sc-btn--save').trigger('click')
    await sleep(60)
    expect(w.text()).toContain('都不能为空')
    expect((await db.getAllErrors()).length).toBe(before)
    w.unmount()
  })

  it('⑦ 零迁移：recordStuck 可读回；engine.js 无新实体；DB 仍 v7', async () => {
    const r = await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    expect((await db.getAllErrors()).some((e) => e.id === r.id)).toBe(true)
    const engineSrc = fs.readFileSync(path.join(process.cwd(), 'src/sync/engine.js'), 'utf8')
    expect(engineSrc).not.toContain('stuck')
    const dbSrc = fs.readFileSync(path.join(process.cwd(), 'src/stores/studyDb.js'), 'utf8')
    expect(dbSrc).toContain('const DB_VERSION = 7')
  })
})

// ===================== C-2-2 卡面形态 / 渲染分支 / 错题本区分 =====================
describe('stuck-card —— 卡面与区分（C-2-2）', () => {
  let db
  let pinia
  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    db = useStudyDbStore()
    await sleep(120)
    await db.clearAllErrors()
  })

  it('① 卡面默写形态：正面含操作名/模块、不含路径（含属性）', () => {
    const card = { module: 'PS 图层面板', question: '自由变换', correctAnswer: 'Ctrl+T', explanation: '' }
    const w = mount(StuckCard, { props: { card, revealed: false } })
    const html = w.html()
    expect(html).toContain('自由变换')
    expect(html).toContain('PS 图层面板')
    expect(html).not.toContain('Ctrl+T')
    expect(html).not.toContain('correctAnswer')
  })

  it('② 翻面后路径出现在 DOM', async () => {
    const card = { module: 'PS 图层面板', question: '自由变换', correctAnswer: 'Ctrl+T', explanation: '备注' }
    const w = mount(StuckCard, { props: { card, revealed: false } })
    expect(w.html()).not.toContain('Ctrl+T')
    await w.setProps({ revealed: true })
    expect(w.html()).toContain('Ctrl+T')
  })

  it('③ 复习页分支：卡点首张 → .stuck-card 且无 .error-card；错题 → 反之', async () => {
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    let router = makeRouter()
    router.push('/review'); await router.isReady()
    let w = mount(ReviewView, { global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } } })
    await waitUntil(() => w.find('.stuck-card').exists())
    expect(w.find('.stuck-card').exists()).toBe(true)
    expect(w.find('.error-card').exists()).toBe(false)
    w.unmount()

    await db.clearAllErrors()
    await seedError(db)
    setActivePinia(pinia)
    router = makeRouter()
    router.push('/review'); await router.isReady()
    w = mount(ReviewView, { global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } } })
    await waitUntil(() => w.find('.error-card').exists())
    expect(w.find('.error-card').exists()).toBe(true)
    expect(w.find('.stuck-card').exists()).toBe(false)
    w.unmount()
  }, 20000)

  it('④ 卡点四档评分：点「忘了」→ repetitions 归零、nextReviewDate=明天（SM-2 打通）', async () => {
    const r = await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const router = makeRouter()
    router.push('/review'); await router.isReady()
    const w = mount(ReviewView, { global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } } })
    await waitUntil(() => w.find('.stuck-card').exists())
    await w.find('.rv-actions .rv-btn--primary').trigger('click') // 翻面
    await waitUntil(() => w.findAll('.grade-btn').length === 4)
    await w.findAll('.grade-btn')[0].trigger('click') // 忘了
    await waitUntil(async () => {
      const e = (await db.getAllErrors()).find((x) => x.id === r.id)
      return e && e.repetitions === 0 && e.nextReviewDate === tomorrowStr() ? true : null
    })
    const e = (await db.getAllErrors()).find((x) => x.id === r.id)
    expect(e.repetitions).toBe(0)
    expect(e.nextReviewDate).toBe(tomorrowStr())
    expect(e.reviewed).toBe(false)
    w.unmount()
  }, 20000)

  it('⑤ 错题本角标：卡点行含「卡点」、错题行不含', async () => {
    await seedError(db, { question: '错题题干' })
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const router = makeRouter()
    router.push('/error-book'); await router.isReady()
    const w = mount(ErrorBookView, { global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } } })
    await waitUntil(() => w.findAll('.error-item').length >= 2)
    const stuckItem = w.findAll('.error-item').find((el) => el.text().includes('自由变换'))
    expect(stuckItem).toBeTruthy()
    expect(stuckItem.find('.stuck-tag').exists()).toBe(true)
    const errItem = w.findAll('.error-item').find((el) => el.text().includes('错题题干'))
    expect(errItem.find('.stuck-tag').exists()).toBe(false)
    w.unmount()
  }, 20000)

  it('⑥ 「查看原题」守卫：卡点行不渲染、错题行渲染', async () => {
    await seedError(db, { question: '错题题干X' })
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const router = makeRouter()
    router.push('/error-book'); await router.isReady()
    const w = mount(ErrorBookView, { global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } } })
    await waitUntil(() => w.findAll('.error-item').length >= 2)
    const stuckItem = w.findAll('.error-item').find((el) => el.text().includes('自由变换'))
    expect(stuckItem.find('.act-source').exists()).toBe(false)
    const errItem = w.findAll('.error-item').find((el) => el.text().includes('错题题干X'))
    expect(errItem.find('.act-source').exists()).toBe(true)
    w.unmount()
  }, 20000)

  it('⑦ 错题本 kind 筛选：选「卡点」只剩卡点行', async () => {
    await seedError(db, { question: '错题题干Y' })
    await db.recordStuck('PS 图层面板', '自由变换', 'Ctrl+T')
    const router = makeRouter()
    router.push('/error-book'); await router.isReady()
    const w = mount(ErrorBookView, { global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } } })
    await waitUntil(() => w.findAll('.error-item').length >= 2)
    // 「类型：」组的按钮：全部 / 错题 / 卡点
    const stuckBtn = w.findAll('.filter-btn').find((b) => b.text() === '卡点')
    expect(stuckBtn).toBeTruthy()
    await stuckBtn.trigger('click')
    await sleep(20)
    const items = w.findAll('.error-item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('自由变换')
    w.unmount()
  }, 20000)
})
