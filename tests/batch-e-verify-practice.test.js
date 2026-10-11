// @vitest-environment jsdom
/**
 * 批 E · E-1 自评三档 —— **独立复核**（QA）
 *
 * 攻击点（与 tests/self-assess-tiers.test.js 不同视角）：
 *  A. H3 二分**在混合会话下**不被污染：同一会话同时含「自动判（选择命中/错选/填空自动命中）」
 *     与「三档自评」，逐项核对 autoCount/autoCorrect/selfCount/selfKnown/selfSeen，且**不得**
 *     出现任何合并百分比字段。含边界：自动判的题即便被自评成 seen，仍归「自动判」。
 *  B. 权重减半只作用在**聚合层**：证明 Top5 的**入选集合**会因减半改变（novel：6 组争 5 位），
 *     并证明 `weightedPick` 的 `Math.max(1,·)` 地板使**单卡** 0.5 权重对抽取**零影响**。
 *  C. seen 的三条路径：redoErrors / 归因回写 / 去重升档。
 *  D. recordError 去重分支「清零两个掌握字段 + reps/interval 归零 + 保留 easeFactor」语义未被 E-1 改动。
 *  E. 校准率面板：相对口径、无绝对得分承诺。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePracticeStore, SELF_TIERS } from '@/stores/practice'
import { useStudyDbStore } from '@/stores/studyDb'
import { weakWeightsFromErrors, composePaper } from '@/utils/composePaper'
import { selfCalibrationOf } from '@/utils/practiceMetrics'
import DashboardView from '@/views/DashboardView.vue'

function makeQ(i, opts = {}) {
  const gradable = opts.gradable !== false
  return {
    key: `v1/${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: 'U',
    fileIndex: 0,
    fileKey: `math_01_v_${i}`,
    fileTitle: 'P',
    blockTitle: 'B',
    type: opts.type,
    question: opts.question || `题干 ${i}`,
    options: gradable ? ['A', 'B', 'C', 'D'] : null,
    correctIndex: gradable ? (opts.correctIndex ?? 0) : undefined,
    answer: opts.answer || `答案 ${i}`,
    difficulty: 'basic',
    gradable,
    source: 'quiz',
    ...opts.extra
  }
}

describe('E-1 独立复核 · A) H3 二分在混合会话下不被污染', () => {
  let store
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('自动判（选择命中/错选/填空自动命中）与三档自评分开统计，无合并百分比', async () => {
    const questions = [
      makeQ(0, { correctIndex: 0 }), // 点 A（正确）→ 自动判对
      makeQ(1, { correctIndex: 2 }), // 点 B（错）→ 自动判错
      makeQ(2, { type: 'fill', question: '填空 ___ = ?', answer: '42' }), // 填空自动命中
      makeQ(3, { gradable: false }), // 自评 known
      makeQ(4, { gradable: false }), // 自评 seen
      makeQ(5, { gradable: false }), // 自评 unknown
      makeQ(6, { correctIndex: 1 }) // 自动判对，但被自评成 seen → 仍归自动判（边界）
    ]
    store.startSession({ mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'], questions, compose: null })

    // q0 正确点选
    store.pickOption(0)
    await store.assess(SELF_TIERS.KNOWN)
    store.next()
    // q1 错选
    store.pickOption(1)
    await store.assess(SELF_TIERS.UNKNOWN)
    store.next()
    // q2 填空自动命中
    store.submitFill('42')
    expect(store.currentRecord.autoMatched).toBe(true)
    await store.assess(SELF_TIERS.KNOWN)
    store.next()
    // q3/q4/q5 纯自评
    store.revealAnswer()
    await store.assess(SELF_TIERS.KNOWN)
    store.next()
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN)
    store.next()
    store.revealAnswer()
    await store.assess(SELF_TIERS.UNKNOWN)
    store.next()
    // q6 自动判对但自评 seen
    store.pickOption(1)
    await store.assess(SELF_TIERS.SEEN)
    store.next()

    const st = store.resultStats
    expect(st.total).toBe(7)
    expect(st.autoCount).toBe(4) // q0 q1 q2 q6
    expect(st.autoCorrect).toBe(3) // q0 q2 q6 判对；q1 错选不计
    expect(st.selfCount).toBe(3) // q3 q4 q5
    expect(st.selfKnown).toBe(1) // 仅 q3；q0/q2/q6 的 known 属自动判侧
    expect(st.selfSeen).toBe(1) // q4；q6 的 seen 属自动判侧
    expect(st.autoCount + st.selfCount).toBe(st.answered) // 二分闭合
    // 不得把三档或两行合并成单一百分比
    for (const bad of ['accuracy', 'rate', 'percent', 'score', 'ratio', 'correctRate']) {
      expect(Object.keys(st)).not.toContain(bad)
    }
  })
})

describe('E-1 独立复核 · B) 减半只在聚合层；单卡被 floor 抹平', () => {
  const seenUnit = (u, n) => Array.from({ length: n }, () => ({ subject: 'math', unitNum: u, selfTier: 'seen' }))
  const unkUnit = (u, n) => Array.from({ length: n }, () => ({ subject: 'math', unitNum: u, selfTier: 'unknown' }))

  it('6 组争 Top5：减半后 3×seen(1.5) 组被挤出，4×unknown(2.0) 组稳居', () => {
    const errors = [
      ...unkUnit('01', 2), ...unkUnit('02', 2), ...unkUnit('03', 2), ...unkUnit('04', 2),
      ...seenUnit('05', 3), ...seenUnit('06', 3)
    ]
    const w = weakWeightsFromErrors(errors, 5, 'unit')
    expect(Object.keys(w)).toHaveLength(5)
    // 四个 2.0 的 unknown 组全在
    for (const u of ['01', '02', '03', '04']) expect(w[`math|${u}`]).toBe(2)
    // 两个 1.5 的 seen 组只能进一个
    const seenIn = ['05', '06'].filter((u) => `math|${u}` in w)
    expect(seenIn).toHaveLength(1)
    expect(w[`math|${seenIn[0]}`]).toBe(1.5) // 3 × 0.5
  })

  it('单卡 0.5 权重被 weightedPick 的 Math.max(1,·) 地板抹平：抽取结果与不带权重**完全一致**', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      ...makeQ(i), key: `k${i}`, subject: 'math', unitNum: '01', difficulty: 'basic'
    }))
    const withHalf = composePaper(items, { count: 5, seed: 12345, unitWeights: { 'math|01': 0.5 } })
    const without = composePaper(items, { count: 5, seed: 12345, unitWeights: {} })
    expect(withHalf.questions.map((q) => q.key)).toEqual(without.questions.map((q) => q.key))
  })
})

describe('E-1 独立复核 · C) seen 三路径', () => {
  let store
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('redoErrors：收 seen + 答错，不收 known 与答对', async () => {
    const questions = [
      makeQ(0, { gradable: false }), // seen → 错题
      makeQ(1, { gradable: false }), // known → 非错题
      makeQ(2, { correctIndex: 0 }), // 答对 → 非错题
      makeQ(3, { correctIndex: 3 }) // 答错 → 错题
    ]
    store.startSession({ mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'], questions, compose: null })
    store.revealAnswer(); await store.assess(SELF_TIERS.SEEN); store.next()
    store.revealAnswer(); await store.assess(SELF_TIERS.KNOWN); store.next()
    store.pickOption(0); await store.assess(SELF_TIERS.KNOWN); store.next()
    store.pickOption(1); await store.assess(SELF_TIERS.UNKNOWN); store.next()
    expect(store.phase).toBe('result')
    store.redoErrors()
    expect(store.session.questions.map((q) => q.key).sort()).toEqual(['v1/0', 'v1/3'])
  })

  it('归因回写：assess(seen) 后 pendingAttribution 置位，setAttribution 写到对应错题行', async () => {
    store.startSession({
      mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'],
      questions: [makeQ(0, { gradable: false })], compose: null
    })
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN)
    expect(store.pendingAttribution).toEqual({ index: 0 })
    await store.setAttribution({ reason: '概念不清', kp: '集合' })
    expect(store.pendingAttribution).toBe(null)
    const row = (await db.getAllErrors()).find((e) => e.fileKey === 'math_01_v_0')
    expect(row.reason).toBe('概念不清')
    expect(row.kp).toBe('集合')
  })

  it('去重升档：seen→unknown 升；unknown→seen 不降', async () => {
    const args = ['math', '01', 'Q', 'A', 'u', 'e']
    const r1 = await db.recordError(...args, { fileKey: 'fk', selfTier: 'seen' })
    expect(r1.duplicated).toBeUndefined()
    await db.recordError(...args, { fileKey: 'fk', selfTier: 'unknown' })
    let row = (await db.getAllErrors()).find((e) => e.fileKey === 'fk')
    expect(row.selfTier).toBe('unknown')
    await db.recordError(...args, { fileKey: 'fk', selfTier: 'seen' })
    row = (await db.getAllErrors()).find((e) => e.fileKey === 'fk')
    expect(row.selfTier).toBe('unknown') // 不降级
    expect(row.wrongCount).toBe(3)
  })
})

describe('E-1 独立复核 · D) 去重分支语义未被改动（SM-2 字段）', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('重复入本：清两个掌握字段 + reps/interval 归零 + 保留 easeFactor', async () => {
    await db.addError({
      subject: 'math', unitNum: '01', question: 'Q', correctAnswer: 'A',
      fileKey: 'fk2', userAnswer: 'u', explanation: 'e',
      reviewed: true, legacyMastered: true, reviewCount: 4,
      easeFactor: 1.9, interval: 15, repetitions: 3,
      nextReviewDate: '2000-01-01', lastReviewedAt: 123456, wrongCount: 1, selfTier: 'seen'
    })
    const r = await db.recordError('math', '01', 'Q', 'A', 'u2', 'e2', { fileKey: 'fk2', selfTier: 'unknown' })
    expect(r.duplicated).toBe(true)
    const row = (await db.getAllErrors()).find((e) => e.fileKey === 'fk2')
    expect(row.wrongCount).toBe(2)
    expect(row.legacyMastered).toBe(false)
    expect(row.reviewed).toBe(false)
    expect(row.repetitions).toBe(0)
    expect(row.interval).toBe(0)
    expect(row.easeFactor).toBe(1.9) // 刻意保留（累积难度记忆）
    expect(row.lastReviewedAt).toBe(123456) // 历史事实不动
    expect(row.selfTier).toBe('unknown')
  })
})

describe('E-1 独立复核 · E) 校准率相对口径、无绝对得分承诺', () => {
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  it('selfCalibrationOf：相对排序；无 reviewCount → null', () => {
    const rows = selfCalibrationOf([
      { selfTier: 'seen', reviewCount: 4, repetitions: 3 }, // 该档 1 行、已复测、召回 → 100%
      { selfTier: 'unknown', reviewCount: 4, repetitions: 0 } // 该档 1 行、已复测、未召回 → 0%
    ], [SELF_TIERS.SEEN, SELF_TIERS.UNKNOWN])
    expect(rows.find((r) => r.tier === 'seen').rate).toBe(100)
    expect(rows.find((r) => r.tier === 'unknown').rate).toBe(0)
    expect(rows.find((r) => r.tier === 'seen').rate).toBeGreaterThan(rows.find((r) => r.tier === 'unknown').rate)
  })

  it('DashboardView 校准面板文案：相对比较 + 显式否定承诺，无绝对得分表述', async () => {
    await db.addError({
      subject: 'math', unitNum: '01', question: 'q-seen', fileKey: 'cs1',
      selfTier: 'seen', reviewCount: 2, repetitions: 2
    })
    await db.addError({
      subject: 'math', unitNum: '01', question: 'q-unknown', fileKey: 'cs2',
      selfTier: 'unknown', reviewCount: 2, repetitions: 0
    })
    const wrapper = mount(DashboardView, { global: { stubs: { RouterLink: true, AppIcon: true } } })
    // DashboardView 的 load() 串了两次真实 IndexedDB 读（progress.refresh + getLearningOverview），
    // 需排空真实宏任务，否则断言时仍停在「加载中…」
    await flushPromises()
    for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 0))
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('自评校准率')
    expect(text).toContain('相对比较')
    expect(text).toContain('不代表') // 显式否定「得分预测」
    expect(text).not.toContain('预计能得')
    expect(text).not.toContain('预测分数')
    expect(text).not.toContain('你预计')
    wrapper.unmount()
  })
})
