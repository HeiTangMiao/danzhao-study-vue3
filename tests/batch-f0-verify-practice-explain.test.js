// @vitest-environment jsdom
/**
 * 批 F0 · F0c5 例题解析入库可达 —— **独立复核**（QA）
 *
 * 攻击点：
 *  A. 形状：normalizeBankItem `x → explanation`（缺省 ''），BANK_ITEM_KEYS.x 映射正确
 *  B. 构建（collectBank 内存构建）：带 x 者**皆例题**、x 为非空字符串
 *  C. **排除重复展示**：抽真实例题，核对 x（solution）与 a（answer）**内容确实不同**
 *  D. 错题本解析优先级：有 explanation 用解析；缺省回落 answer（不回归）
 *  E. 两渲染点两态：PracticeSession（.ps-answer-explain）、PracticeResult（.review-explain）
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { collectBank } from '../scripts/build-practice-bank.mjs'
import { normalizeBankItem, BANK_ITEM_KEYS } from '@/content/practiceBank'
import { usePracticeStore } from '@/stores/practice'
import { useStudyDbStore } from '@/stores/studyDb'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), onBeforeRouteLeave: () => {} }))
vi.mock('@/composables/useKatex', () => ({ warmKatex: () => {} }))

import PracticeSession from '@/views/practice/PracticeSession.vue'
import PracticeResult from '@/views/practice/PracticeResult.vue'

function makeQ(i, extra = {}) {
  return {
    key: `f0/${i}`, subject: 'math', unitNum: '01', unitTitle: 'U', fileIndex: 0,
    fileKey: `math_01_f0_${i}`, fileTitle: 'P', blockTitle: 'B',
    question: `题干 ${i}`, options: ['A项', 'B项'], correctIndex: 0,
    answer: `答案文本 ${i}`, difficulty: 'basic', gradable: true, source: 'quiz', ...extra
  }
}

// ───────────────────── A. 形状 ─────────────────────
describe('F0c5 独立复核 · A) 紧凑键 x → explanation', () => {
  it('有 x → explanation = x', () => {
    expect(normalizeBankItem({ k: 'x', x: '解：先化简再代入' }).explanation).toBe('解：先化简再代入')
  })
  it('无 x → explanation = ""（旧产物优雅降级）', () => {
    expect(normalizeBankItem({ k: 'x' }).explanation).toBe('')
    expect(normalizeBankItem({ k: 'x', x: undefined }).explanation).toBe('')
  })
  it('x 非字符串 → 回落 ""', () => {
    expect(normalizeBankItem({ k: 'x', x: 123 }).explanation).toBe('')
  })
  it('BANK_ITEM_KEYS.x === "explanation"', () => {
    expect(BANK_ITEM_KEYS.x).toBe('explanation')
  })
})

// ───────────────────── B/C. 构建：带 x 者皆例题 + x≠a ─────────────────────
describe('F0c5 独立复核 · B/C) collectBank 结构（内容实时构建）', () => {
  let all = []
  beforeAll(async () => {
    const { shards } = await collectBank()
    all = Object.values(shards).flat()
  }, 180000)

  it('带 x 的条目全部是例题（it==="example"），且 x 为非空字符串', () => {
    const withX = all.filter((it) => it.x !== undefined)
    expect(withX.length).toBeGreaterThan(0)
    for (const it of withX) {
      expect(it.it, `条目 ${it.k} 非例题却带 x`).toBe('example')
      expect(typeof it.x).toBe('string')
      expect(it.x.length).toBeGreaterThan(0)
    }
  }, 120000)

  it('C) 抽 3 道真实例题：x（solution）与 a（answer）内容不同（排除重复展示）', () => {
    const withX = all.filter((it) => it.x !== undefined && it.a !== undefined)
    expect(withX.length).toBeGreaterThanOrEqual(3)
    const dupCount = withX.filter((it) => it.x === it.a).length
    // 允许极少数 answer 恰等于 solution，但不应普遍重复
    expect(dupCount, `有 ${dupCount}/${withX.length} 条 x 与 a 完全相同`).toBe(0)
    for (const it of withX.slice(0, 3)) {
      expect(it.x).not.toBe(it.a)
    }
  }, 120000)
})

// ───────────────────── D. 错题本解析优先级 ─────────────────────
describe('F0c5 独立复核 · D) 错题本解析优先级', () => {
  let store
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('有 explanation → 用解析', async () => {
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(0, { explanation: '详细解析：先化简' })], compose: null
    })
    store.pickOption(1) // 答错
    await store.assess('unknown')
    const rec = (await db.getAllErrors()).find((e) => e.fileKey === 'math_01_f0_0')
    expect(rec.explanation).toBe('练习解析：详细解析：先化简')
  })

  it('无 explanation → 回落 answer（不回归）', async () => {
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(1)], compose: null
    })
    store.pickOption(1)
    await store.assess('unknown')
    const rec = (await db.getAllErrors()).find((e) => e.fileKey === 'math_01_f0_1')
    expect(rec.explanation).toBe('练习解析：答案文本 1')
  })
})

// ───────────────────── E. 渲染两态 ─────────────────────
const STUBS = { AppIcon: true, MathJaxRender: true, ReasonChips: true }

describe('F0c5 独立复核 · E) 两渲染点（挂载两态）', () => {
  let store
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('PracticeSession：有 explanation → .ps-answer-explain 存在', async () => {
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(0, { gradable: false, explanation: '解析文本' })], compose: null
    })
    store.revealAnswer()
    const w = mount(PracticeSession, { global: { stubs: STUBS } })
    await nextTick()
    expect(w.find('.ps-answer-explain').exists()).toBe(true)
    w.unmount()
  })

  it('PracticeSession：无 explanation → .ps-answer-explain 不存在', async () => {
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(1, { gradable: false })], compose: null
    })
    store.revealAnswer()
    const w = mount(PracticeSession, { global: { stubs: STUBS } })
    await nextTick()
    expect(w.find('.ps-answer').exists()).toBe(true) // 答案卡在
    expect(w.find('.ps-answer-explain').exists()).toBe(false)
    w.unmount()
  })

  it('PracticeResult：有 explanation → .review-explain 存在；无 → 不存在', async () => {
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(0, { gradable: false, explanation: '解析文本' })], compose: null
    })
    store.revealAnswer()
    await store.assess('unknown')
    store.next() // 进入 result
    const w = mount(PracticeResult, { global: { stubs: STUBS } })
    const toggle = w.findAll('button').find((b) => b.text().includes('看解析'))
    expect(toggle).toBeTruthy()
    await toggle.trigger('click')
    expect(w.find('.review-explain').exists()).toBe(true)
    w.unmount()

    await db.clearAllErrors()
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(2, { gradable: false })], compose: null
    })
    store.revealAnswer()
    await store.assess('unknown')
    store.next()
    const w2 = mount(PracticeResult, { global: { stubs: STUBS } })
    const toggle2 = w2.findAll('button').find((b) => b.text().includes('看解析'))
    await toggle2.trigger('click')
    expect(w2.find('.review-explain').exists()).toBe(false)
    w2.unmount()
  })
})
