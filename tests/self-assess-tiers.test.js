// @vitest-environment jsdom
/**
 * 批 E · E-1 自评三档化 + 校准率 测试（P1-9）
 *
 * 覆盖（batch-e-tasks §E-1 测试要点）：
 *  - ① 三档自评落点：mount PracticeSession，按钮为行为化文案；点「看答案后能理解」→ assess==='seen'；
 *       点「不看答案也能做对」→ 不入错题本
 *  - ② 中间态入本：assess('seen')/('unknown') → error_book 行 selfTier 分别落 'seen'/'unknown'
 *  - ③ 权重减半（聚合层）：4×seen == 2×unknown；同 kp 2×seen 权重是 2×unknown 的一半；
 *       再减一张 seen 后排序翻转（锚住 weightedPick 的 Math.max(1,·) 地板 → 减半只在聚合层生效）
 *  - ④ H3 回归：resultStats 二分不变，selfKnown 只计 known；不得出现合并百分比
 *  - ⑤ 校准率口径：seen.rate=100 / unknown.rate=0 / 无 reviewCount → null
 *  - ⑥ seen 计入错题动作：redoErrors / reviewTargetRoute 把 seen 题当错题列出
 *  - ⑦ dup 升档：seen→unknown 升为 'unknown'；unknown→seen 不降级
 *
 * 数据层用 fake-indexeddb 跑真实 studyDb（与 practice-store.test.js 同款），不 mock。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePracticeStore, SELF_TIERS } from '@/stores/practice'
import { useStudyDbStore } from '@/stores/studyDb'
import { weakWeightsFromErrors } from '@/utils/composePaper'
import { selfCalibrationOf } from '@/utils/practiceMetrics'
import PracticeSession from '@/views/practice/PracticeSession.vue'

// PracticeSession 依赖 vue-router 的路由守卫与 useRouter；KaTeX 预热无关本用例
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  onBeforeRouteLeave: () => {}
}))
vi.mock('@/composables/useKatex', () => ({ warmKatex: () => {} }))

/** 合成题库条目（字段与 practiceBankClient 的运行时条目一致） */
function makeQ(i, { gradable = false, correctIndex = 0, fileKey } = {}) {
  return {
    key: `e1/${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: '测试单元',
    fileIndex: 0,
    fileKey: fileKey || `math_01_e1_${i}`,
    fileTitle: '测试页',
    blockTitle: '快速检测',
    question: `测试题干 ${i}`,
    options: gradable ? ['A', 'B', 'C', 'D'] : null,
    correctIndex: gradable ? correctIndex : undefined,
    answer: `答案与解析 ${i}`,
    difficulty: 'basic',
    gradable,
    source: 'quiz'
  }
}

function mountSession(stubs = {}) {
  return mount(PracticeSession, {
    global: { stubs: { AppIcon: true, MathJaxRender: true, ReasonChips: true, ...stubs } }
  })
}

/**
 * 等异步落库完成：组件的点击处理是 async 且 trigger() 不会 await 它，
 * 而 rec.assess 是**同步**置位的 —— 只 flushPromises 会在 fake-indexeddb 事务提交前就读库。
 */
async function settle() {
  await flushPromises()
  await new Promise((r) => setTimeout(r, 30))
  await flushPromises()
}

describe('E-1 自评三档 —— store 落点与 H3', () => {
  let store
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  function start(questions) {
    store.startSession({ mode: 'unit', title: 'T', subject: 'math', unitNums: ['01'], questions, compose: null })
  }

  it('② 中间态入本：seen/unknown 各落 selfTier；known 不入本', async () => {
    start([makeQ(0), makeQ(1), makeQ(2)])
    // seen
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN)
    expect(store.currentRecord.assess).toBe('seen')
    store.next()
    // unknown
    store.revealAnswer()
    await store.assess(SELF_TIERS.UNKNOWN)
    store.next()
    // known → 不入本
    store.revealAnswer()
    await store.assess(SELF_TIERS.KNOWN)
    store.next()

    const errs = await db.getAllErrors()
    expect(errs).toHaveLength(2) // 只有 seen + unknown 两条
    expect(errs.find((e) => e.fileKey === 'math_01_e1_0').selfTier).toBe('seen')
    expect(errs.find((e) => e.fileKey === 'math_01_e1_1').selfTier).toBe('unknown')
    expect(errs.some((e) => e.fileKey === 'math_01_e1_2')).toBe(false) // known 不入本
  })

  it('④ H3：二分不变，selfKnown 只计 known，无合并百分比', async () => {
    start([makeQ(0), makeQ(1), makeQ(2)])
    store.revealAnswer()
    await store.assess(SELF_TIERS.KNOWN)
    store.next()
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN)
    store.next()
    store.revealAnswer()
    await store.assess(SELF_TIERS.UNKNOWN)
    store.next()

    const st = store.resultStats
    expect(st.answered).toBe(3)
    expect(st.autoCount).toBe(0) // 全自评
    expect(st.selfCount).toBe(3)
    expect(st.selfKnown).toBe(1) // 只计 known（seen 不计「会」）
    expect(st.selfSeen).toBe(1)
    // 二分闭合
    expect(st.autoCount + st.selfCount).toBe(st.answered)
    // 不得把三档合并成一个百分比
    for (const bad of ['accuracy', 'rate', 'percent', 'score']) {
      expect(Object.keys(st)).not.toContain(bad)
    }
  })

  it('⑦ 重复入本「只升不降」：seen→unknown 升档，unknown→seen 不降级', async () => {
    start([makeQ(0, { fileKey: 'math_01_dup' })])
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN)
    let row = (await db.getAllErrors()).find((e) => e.fileKey === 'math_01_dup')
    expect(row.selfTier).toBe('seen')

    start([makeQ(0, { fileKey: 'math_01_dup' })]) // 同 subject+question+fileKey → 去重分支
    store.revealAnswer()
    await store.assess(SELF_TIERS.UNKNOWN)
    row = (await db.getAllErrors()).find((e) => e.fileKey === 'math_01_dup')
    expect(row.selfTier).toBe('unknown') // 升档
    expect(row.wrongCount).toBe(2)

    start([makeQ(0, { fileKey: 'math_01_dup' })])
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN)
    row = (await db.getAllErrors()).find((e) => e.fileKey === 'math_01_dup')
    expect(row.selfTier).toBe('unknown') // 不降级
    expect(row.wrongCount).toBe(3)
  })

  it('⑥ seen 计入「重做错题」与「回看知识点」', async () => {
    start([makeQ(0, { fileKey: 'math_01_seen' }), makeQ(1, { fileKey: 'math_01_p1' })])
    store.revealAnswer()
    await store.assess(SELF_TIERS.SEEN) // q0 seen → 算错题
    store.next()
    store.revealAnswer()
    await store.assess(SELF_TIERS.KNOWN) // q1 会 → 不算错题
    store.next()
    expect(store.phase).toBe('result')

    // 回看知识点：指向第一道「错题」（seen 的 q0）
    expect(store.reviewTargetRoute).toBe('/study/math/01/0')

    // 重做错题：只收 seen 的 q0
    store.redoErrors()
    expect(store.phase).toBe('session')
    expect(store.session.questions.map((q) => q.key)).toEqual(['e1/0'])
  })
})

describe('E-1 ③ 权重减半（聚合层）', () => {
  const seen = (n) => Array.from({ length: n }, () => ({ subject: 'math', unitNum: '01', selfTier: 'seen' }))
  const unknown = (n) => Array.from({ length: n }, () => ({ subject: 'math', unitNum: '02', selfTier: 'unknown' }))

  it('4×seen 与 2×unknown 权重相等（均 2.0）', () => {
    const w = weakWeightsFromErrors([...seen(4), ...unknown(2)], 5, 'unit')
    expect(w['math|01']).toBe(2) // 4 × 0.5
    expect(w['math|02']).toBe(2) // 2 × 1
    expect(w['math|01']).toBe(w['math|02'])
  })

  it('同 kp：2×seen 的权重是 2×unknown 的一半（单卡减半在聚合层生效）', () => {
    const a = weakWeightsFromErrors(
      [{ subject: 'math', fileKey: 'k1', selfTier: 'seen' }, { subject: 'math', fileKey: 'k1', selfTier: 'seen' }],
      5,
      'kp'
    )
    const b = weakWeightsFromErrors(
      [{ subject: 'math', fileKey: 'k2', selfTier: 'unknown' }, { subject: 'math', fileKey: 'k2', selfTier: 'unknown' }],
      5,
      'kp'
    )
    expect(a['math|k1']).toBe(1) // 2 × 0.5
    expect(b['math|k2']).toBe(2) // 2 × 1
    expect(b['math|k2']).toBe(a['math|k1'] * 2)
  })

  it('减半改变 Top5 排序：去掉一张 seen 后 unknown 反超', () => {
    const equal = weakWeightsFromErrors([...seen(4), ...unknown(2)], 5, 'unit')
    expect(equal['math|01']).toBe(equal['math|02']) // 先相等
    const flipped = weakWeightsFromErrors([...seen(3), ...unknown(2)], 5, 'unit')
    expect(flipped['math|02']).toBeGreaterThan(flipped['math|01']) // 1.5 < 2 → 反超
  })

  it('无档位的旧错题权重为 1（向后兼容，不被减半）', () => {
    const w = weakWeightsFromErrors([{ subject: 'math', unitNum: '03' }], 5, 'unit')
    expect(w['math|03']).toBe(1)
  })
})

describe('E-1 ⑤ 校准率口径', () => {
  const TIERS = [SELF_TIERS.SEEN, SELF_TIERS.UNKNOWN]

  it('seen 100% / unknown 0%；无 reviewCount 的行不参与', () => {
    const rows = selfCalibrationOf(
      [
        { selfTier: 'seen', reviewCount: 2, repetitions: 2 },
        { selfTier: 'unknown', reviewCount: 2, repetitions: 0 },
        { selfTier: 'unknown', repetitions: 3 } // 缺 reviewCount → 不参与
      ],
      TIERS
    )
    const seenR = rows.find((r) => r.tier === 'seen')
    const unknownR = rows.find((r) => r.tier === 'unknown')
    expect(seenR.rate).toBe(100)
    expect(unknownR.rate).toBe(0)
    expect(unknownR.reviewed).toBe(1) // 只有 1 行有 reviewCount
    expect(unknownR.n).toBe(2) // 该档总行数仍为 2
  })

  it('该档没有可复测行 → rate=null（不参与相对比较）', () => {
    const rows = selfCalibrationOf([{ selfTier: 'seen' }], TIERS)
    expect(rows.find((r) => r.tier === 'seen').rate).toBe(null)
    expect(rows.find((r) => r.tier === 'unknown').rate).toBe(null)
  })

  it('无 selfTier 的行被忽略', () => {
    const rows = selfCalibrationOf([{ reviewCount: 9, repetitions: 9 }], TIERS)
    expect(rows.every((r) => r.n === 0)).toBe(true)
  })
})

describe('E-1 ① 三档自评落点（mount PracticeSession）', () => {
  let store
  let db
  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
    store.startSession({
      mode: 'unit',
      title: 'T',
      subject: 'math',
      unitNums: ['01'],
      questions: [makeQ(0)],
      compose: null
    })
  })

  it('按钮为行为化文案；点「看答案后能理解」→ assess 落 seen 并入本', async () => {
    const wrapper = mountSession()
    // 未揭晓：只有「看答案」
    expect(wrapper.find('.ps-btn--primary').exists()).toBe(true)
    await wrapper.find('.ps-btn--primary').trigger('click')
    await nextTick()

    const buttons = wrapper.findAll('.ps-assess-row .ps-btn')
    expect(buttons.map((b) => b.text())).toEqual(['不看答案也能做对', '看答案后能理解', '看答案也不懂'])
    expect(wrapper.text()).toContain('不看答案，你能独立')
    expect(wrapper.text()).not.toContain('我会了') // 旧文案已移除

    await buttons[1].trigger('click') // 看答案后能理解 → seen
    await settle()
    expect(store.currentRecord.assess).toBe('seen')
    const errs = await db.getAllErrors()
    expect(errs).toHaveLength(1)
    expect(errs[0].selfTier).toBe('seen')
    wrapper.unmount()
  })

  it('点「不看答案也能做对」→ assess 落 known 且不入错题本', async () => {
    const wrapper = mountSession()
    await wrapper.find('.ps-btn--primary').trigger('click')
    await nextTick()
    await wrapper.findAll('.ps-assess-row .ps-btn')[0].trigger('click')
    await settle()
    expect(store.currentRecord.assess).toBe('known')
    expect((await db.getAllErrors()).length).toBe(0)
    wrapper.unmount()
  })
})
