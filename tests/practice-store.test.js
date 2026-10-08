/**
 * practice store 会话状态流转测试（P6）
 * 覆盖：
 *  - 强制自评门控：未自评时 canNext=false、next() no-op（验收 5.7-5）
 *  - 二分判分口径：自动判（picked）与自评分开统计，不合并（验收 5.7-7）
 *  - 落库链路：recordAnswered 逐题计数（验收 5.7-6 退出也不丢）+
 *    recordError 带 fileKey 入错题本（去重键 fileKey 粒度）、重复提交 duplicated 不重复入库
 *    （验收 5.7-3）→ SM-2 初始字段 nextReviewDate 为当天（验收 5.7-3/4 的数据前提）
 *  - 退出保留未完成会话 / 续做 / 放弃
 *  - 结算页「重做错题」只收错题
 *
 * 数据层用 fake-indexeddb 跑真实 studyDb（与 studyDb.test.js 同款），不 mock。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePracticeStore } from '@/stores/practice'
import { useStudyDbStore } from '@/stores/studyDb'

/** 与 studyDb 内部一致的本日日期串（本地时区） */
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 合成题库条目（字段与 practiceBankClient 的运行时条目一致） */
function makeQ(i, { gradable = true, correctIndex = 0, fileKey } = {}) {
  return {
    key: `01/1/0/${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: '测试单元',
    fileIndex: 0,
    fileKey: fileKey || `math_01_p${i}`,
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

describe('practice store 会话状态机', () => {
  let store
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    // fake-indexeddb 是模块级全局，数据会跨用例残留（真实 IndexedDB 在用户设备上同样跨会话）；
    // 会话流转断言需要干净错题本，这里物理清空（测试环境无同步语义，物理删安全）
    await db.clearAllErrors()
  })

  async function startThree() {
    store.startSession({
      mode: 'unit',
      title: '数学 · 测试',
      subject: 'math',
      unitNums: ['01'],
      questions: [makeQ(0), makeQ(1, { gradable: false }), makeQ(2, { gradable: false })],
      compose: null
    })
  }

  it('未自评时 canNext=false 且 next() 无响应（强制自评，验收 5.7-5）', async () => {
    await startThree()
    expect(store.phase).toBe('session')
    expect(store.canNext).toBe(false)

    // 结构化题点选：机器判定 + 立即揭示，但仍未自评
    store.pickOption(1)
    expect(store.currentRecord.picked).toBe(1)
    expect(store.currentRecord.revealed).toBe(true)
    expect(store.canNext).toBe(false)

    store.next() // 必须是 no-op
    expect(store.session.index).toBe(0)

    // 未看答案不允许自评
    await startThree()
    await store.assess('known')
    expect(store.currentRecord.assess).toBe(null)
  })

  it('「我还不会」→ recordError 带 fileKey 入错题本；「我会了」不入（验收 5.7-3）', async () => {
    await startThree()
    const before = (await db.getAllErrors()).length

    store.pickOption(1) // 答错（正确项是 0）
    await store.assess('unknown')
    const errors = await db.getAllErrors()
    expect(errors).toHaveLength(before + 1)
    const rec = errors[errors.length - 1]
    expect(rec.fileKey).toBe('math_01_p0') // fileKey 必须落库（去重键粒度）
    expect(rec.subject).toBe('math')
    expect(rec.unitNum).toBe('01')
    expect(rec.userAnswer).toBe('选项 B')
    expect(rec.explanation).toContain('答案与解析 0')
    // SM-2 初始字段（验收 5.7-3/4：复习 Tab 今日待复习立即 +1 的前提）
    expect(rec.reviewed).toBe(false)
    expect(rec.easeFactor).toBe(2.5)
    expect(rec.nextReviewDate).toBe(todayStr())
    expect(store.session.newErrorIds).toHaveLength(1)

    // 「我会了」→ 只记答题数
    store.next()
    store.revealAnswer()
    await store.assess('known')
    expect((await db.getAllErrors()).length).toBe(before + 1)
  })

  it('recordAnswered 逐题计数：自评一题，今日答题 +1（验收 5.7-6 数据面）', async () => {
    await startThree()
    const today = todayStr()
    const before = (await db.getDailyStat(today)).questionsAnswered || 0

    store.pickOption(0) // 答对
    await store.assess('known')
    const after = (await db.getDailyStat(today)).questionsAnswered || 0
    expect(after - before).toBe(1)
  })

  it('重复提交同一题返回 duplicated 且不重复入库（验收 5.7-3）', async () => {
    await startThree()
    store.pickOption(1)
    await store.assess('unknown')
    const first = store.session.newErrorIds.length

    // 新会话含同一题（同 subject+question+fileKey）
    store.startSession({
      mode: 'unit',
      title: '重做',
      subject: 'math',
      unitNums: ['01'],
      questions: [makeQ(0)],
      compose: null
    })
    store.pickOption(1)
    await store.assess('unknown')
    // 重复入库被去重：newErrorIds 不增长（结算页「本次新入错题」不虚报）
    expect(store.session.newErrorIds).toHaveLength(0)
    expect(first).toBe(1)
  })

  it('完整走完 3 题 → 结算统计二分显示，不合并（验收 5.7-7）', async () => {
    await startThree()
    store.pickOption(0) // 自动判，答对
    await store.assess('known')
    store.next()
    store.revealAnswer()
    await store.assess('unknown') // 自评，不会
    store.next()
    store.revealAnswer()
    await store.assess('known') // 自评，会
    store.next() // 最后一题 → 结算
    expect(store.phase).toBe('result')
    const st = store.resultStats
    expect(st.total).toBe(3)
    expect(st.autoCount).toBe(1) // 自动判 1 题
    expect(st.autoCorrect).toBe(1) // 正确 1
    expect(st.selfCount).toBe(2) // 自评 2 题
    expect(st.selfKnown).toBe(1) // 会 1
    expect(st.newErrors).toBe(1)
    expect(st.durationSec).toBeGreaterThanOrEqual(0)
    // 自动判 + 自评 = 已作答总数（口径闭合）
    expect(st.autoCount + st.selfCount).toBe(st.answered)
  })

  it('中途退出：会话保留可续做；放弃则清空', async () => {
    await startThree()
    store.pickOption(0)
    await store.assess('known')
    store.quitSession()
    expect(store.phase).toBe('home')
    expect(store.session).toBeTruthy() // 未完成会话保留
    expect(store.answeredCount).toBe(1)

    store.resumeSession()
    expect(store.phase).toBe('session')
    expect(store.session.index).toBe(0) // 停在原地

    store.discardSession()
    expect(store.phase).toBe('home')
    expect(store.session).toBe(null)
  })

  it('重做错题：只收本次自评不会 / 答错的题，作答状态重置', async () => {
    await startThree()
    store.pickOption(1) // q0 答错
    await store.assess('unknown')
    store.next()
    store.revealAnswer()
    await store.assess('known') // q1 会
    store.next()
    store.revealAnswer()
    await store.assess('unknown') // q2 不会
    store.next()
    expect(store.phase).toBe('result')

    store.redoErrors()
    expect(store.phase).toBe('session')
    expect(store.session.questions).toHaveLength(2)
    expect(store.session.questions.map((q) => q.key)).toEqual(['01/1/0/0', '01/1/0/2'])
    expect(store.session.records.every((r) => !r.assess && r.picked === null)).toBe(true)
  })
})
