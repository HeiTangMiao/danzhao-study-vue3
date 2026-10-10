// @vitest-environment jsdom
/**
 * review-consistency —— 批 C C-1-3 单测（四处 due 口径一致性 + 迁移 + 缺陷回归 + 入口前置）
 * 覆盖 batch-c-tasks.md §2 C-1-3 测试要点 ①–⑧：
 *  - ① 四处一致性：pickDue / loadReviewStats.dueToday / countDue（Dashboard / 首页同一式）完全相等
 *  - ② Δ 可计算：旧 ③ 判据 vs 新 countDue 的差值 = E 类（缺排期）行数
 *  - ③ 迁移正确性：migrateLegacyMastered 返回行数、幂等
 *  - ④ 迁移前后 isMastered 计数不变（用户可见数字零变化）
 *  - ⑤ 回归：ErrorBookView 源码无裸 `, 4)` 评分、只出现 gradeCard/GRADES.GOOD
 *  - ⑥ gradeCard(AGAIN) 后 isMastered === false（点「忘了」仍在待复习）
 *  - ⑦ markRelearn 后 isMastered === false（覆盖 legacyMastered 清除）
 *  - ⑧ 首页顺序：今日任务 section 在继续学习之前（先复习、后学新）
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
import { useSpacedReview, gradeCard, isMastered, countDue, pickDue, GRADES } from '@/composables/useSpacedReview'
import { getSubjectConfig } from '@/content/index'
import ErrorBookView from '@/views/ErrorBookView.vue'
import HomeView from '@/views/HomeView.vue'

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
function mkRow(over = {}) {
  seq += 1
  const today = todayStr()
  return {
    subject: 'math', unitNum: '01', question: `cq_${seq}`, correctAnswer: `ca_${seq}`,
    userAnswer: '', explanation: '', reason: '', kp: '',
    createdAt: Date.now() + seq, createdAtDate: today,
    reviewed: false, reviewCount: 0, easeFactor: 2.5, interval: 0, repetitions: 0,
    nextReviewDate: today, lastReviewedAt: null, wrongCount: 1,
    fileKey: `math_01_cq_${seq}`,
    ...over
  }
}

/**
 * §0.1.1 的 A–E 五类构造数据集。
 *  - A：reviewed===true（存量手动标注）——旧 ③ 排除 / 新 isMastered 排除
 *  - B：reviewed===false 且到期 ——两者都计入
 *  - C：reviewed===false 且未到期 ——两者都排除
 *  - D：reviewed===true 且 legacyMastered===true（模拟迁移已完成）——两者都排除
 *  - E：缺 nextReviewDate、有 lastReviewedAt、reviewed===false —— 新口径计入（+1/行），旧 ③ 排除
 */
function buildDataset() {
  return [
    mkRow({ reviewed: true, nextReviewDate: '2099-01-01' }),
    mkRow({ reviewed: false, nextReviewDate: '2000-01-01' }),
    mkRow({ reviewed: false, nextReviewDate: '2099-01-01' }),
    mkRow({ reviewed: true, legacyMastered: true, nextReviewDate: '2099-01-01' }),
    mkRow({ reviewed: false, lastReviewedAt: 1700000000000, nextReviewDate: undefined })
  ]
}

/** 旧 ③ DashboardView.vue:160 判据（改造前）：!e.reviewed && e.nextReviewDate <= ds */
function legacyDashboardDue(list, ds) {
  return list.filter((e) => !e.reviewed && e.nextReviewDate <= ds).length
}

describe('review-consistency —— 四处 due 口径一致性', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await sleep(120)
    await db.clearAllErrors()
  })

  it('① pickDue / loadReviewStats.dueToday / countDue 三路数字完全相等', async () => {
    const data = buildDataset()
    for (const r of data) await db.addError(r)

    const review = useSpacedReview()
    const stats = await review.loadReviewStats()
    const queueLen = pickDue(data).length
    const countLen = countDue(data) // Dashboard 与首页现均用 countDue，同一式

    expect(stats.dueToday).toBe(countLen)
    expect(queueLen).toBe(countLen)
    // 明细：只有 B 与 E 到期
    expect(countLen).toBe(2)
  })

  it('② Δ 可计算：旧 ③ 判据 vs 新 countDue，差值 = E 类行数', () => {
    const data = buildDataset()
    const ds = todayStr()
    const oldCount = legacyDashboardDue(data, ds)
    const newCount = countDue(data)
    // A–D 类贡献 0，只有 E 类贡献 +1/行
    expect(oldCount).toBe(1) // 仅 B
    expect(newCount).toBe(2) // B + E
    expect(newCount - oldCount).toBe(1)
  })

  it('③ 迁移正确性：返回行数、legacyMastered 固化、幂等', async () => {
    await db.addError(mkRow({ reviewed: true }))
    await db.addError(mkRow({ reviewed: true }))
    await db.addError(mkRow({ reviewed: true }))
    const first = await db.migrateLegacyMastered()
    expect(first).toBe(3)
    const all = await db.getAllErrors()
    expect(all.every((e) => e.legacyMastered === true)).toBe(true)
    const second = await db.migrateLegacyMastered()
    expect(second).toBe(0) // 幂等
  })

  it('④ 迁移前后 isMastered 计数不变（用户可见数字零变化）', async () => {
    await db.addError(mkRow({ reviewed: true }))
    await db.addError(mkRow({ reviewed: false, repetitions: 3, interval: 7 }))
    await db.addError(mkRow({ reviewed: false }))
    const before = (await db.getAllErrors()).filter(isMastered).length
    await db.migrateLegacyMastered()
    const after = (await db.getAllErrors()).filter(isMastered).length
    expect(after).toBe(before)
    expect(after).toBe(2)
  })

  it('⑥ gradeCard(AGAIN) 后 isMastered 仍为 false（点「忘了」留在待复习）', async () => {
    const r = await db.addError(mkRow({ question: 'cq6' }))
    const err = (await db.getAllErrors()).find((e) => e.id === r)
    const { next } = await gradeCard(db, err, GRADES.AGAIN)
    expect(isMastered(next)).toBe(false)
    expect(next.reviewed).toBe(false)
  })
})

describe('review-consistency —— 源码与组件级回归', () => {
  let db
  let pinia
  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    db = useStudyDbStore()
    await sleep(120)
    await db.clearAllErrors()
  })

  function makeRouter() {
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<div/>' } },
        { path: '/practice', name: 'practice', component: { template: '<div/>' } },
        { path: '/review', name: 'review', component: { template: '<div/>' } },
        { path: '/error-book', name: 'error-book', component: { template: '<div/>' } },
        { path: '/dashboard', name: 'dashboard', component: { template: '<div/>' } },
        { path: '/profile', name: 'profile', component: { template: '<div/>' } },
        // HomeView「模拟冲刺」/ 首页单元卡 / ErrorBookView「查看原题」都引用 name:'unit'
        { path: '/study/:subject/:unitNum/:fileIndex?', name: 'unit', component: { template: '<div/>' } }
      ]
    })
  }

  it('⑤ 回归：ErrorBookView 源码无裸 `, 4)`，只出现 gradeCard / GRADES.GOOD', () => {
    const p = path.join(process.cwd(), 'src/views/ErrorBookView.vue')
    const src = fs.readFileSync(p, 'utf8')
    expect(/,\s*4\)/.test(src)).toBe(false)
    expect(src).toContain('gradeCard(')
    expect(src).toContain('GRADES.GOOD')
    // 且必须补了 legacyMastered:false（「仍需复习」不失效）
    expect(src).toContain('legacyMastered: false')
  })

  it('⑦ 组件级：点「仍需复习」后 isMastered === false（覆盖 legacyMastered 清除）', async () => {
    // 迁移后的存量已掌握行：reviewed:true + legacyMastered:true
    const id = await db.addError(mkRow({ question: 'cq7', reviewed: true, legacyMastered: true }))
    const router = makeRouter()
    router.push('/error-book')
    await router.isReady()
    const wrapper = mount(ErrorBookView, {
      global: { plugins: [pinia, router], stubs: { MathJaxRender: MJ_STUB } }
    })
    await waitUntil(() => wrapper.findAll('.error-item').length > 0)

    const relearn = wrapper.findAll('.act-relearn')
    expect(relearn.length).toBe(1)
    await relearn[0].trigger('click')
    await waitUntil(async () => {
      const row = (await db.getAllErrors()).find((e) => e.id === id)
      return row && isMastered(row) === false ? true : null
    })
    const row = (await db.getAllErrors()).find((e) => e.id === id)
    expect(row.legacyMastered).toBe(false)
    expect(row.reviewed).toBe(false)
    expect(isMastered(row)).toBe(false)
    wrapper.unmount()
  }, 20000)

  it('⑧ 首页顺序：今日任务 section 在继续学习 section 之前', async () => {
    // 造一条 page_progress（真实内容页 key）让「继续学习」卡出现
    const cfg = getSubjectConfig('math')
    const unit = cfg.units[0]
    const file = unit.files[0]
    const key = `math_${unit.num}_${file.name}`
    await db.savePageProgress({
      key, subject: 'math', unitNum: unit.num, unitTitle: unit.title, fileTitle: file.title,
      visited: true, visitTime: Date.now(), questionsAnswered: 0, questionsTotal: 0, testScore: null
    })

    const router = makeRouter()
    router.push('/')
    await router.isReady()
    const wrapper = mount(HomeView, {
      global: { plugins: [pinia, router], stubs: { SearchPanel: true, MathJaxRender: MJ_STUB } }
    })
    await waitUntil(() => {
      const h = wrapper.html()
      return h.includes('continue-card') && h.includes('today-task')
    })
    const html = wrapper.html()
    expect(html.indexOf('today-task')).toBeLessThan(html.indexOf('continue-card'))
    wrapper.unmount()
  }, 20000)
})
