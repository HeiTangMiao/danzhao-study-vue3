/**
 * fill 规整判分测试（批 B B-2）
 * 覆盖（batch-b-tasks B-2 测试要点 ①–⑦）：
 *  - ① isFillItem 形态判据（纯函数部分详见 answer-norm.test.js，这里锚定落点判据）
 *  - ②③ submitFill 判对 / 未命中路径 + 幂等 + assess 后 userAnswer 取真实输入
 *  - ④ resultStats H3 二分扩展（fill 判对进 auto、未命中回落自评）
 *  - ⑤ normalizeBankItem 的 nz → normalizable 展开
 *  - ⑥ 构建产物断言：index.json 含 normTotal 且 ≤ 总题数；math.normalizable ≥ 数值型样例数
 *  - ⑦ ExamBlock 集成：fill 判对行 correct:true / assess:null / typed 有值
 *
 * store 层用 fake-indexeddb 跑真实 studyDb（与 practice-store.test.js 同款）；
 * ExamBlock 层为 jsdom 组件集成（真实交互 → 真实落库 → 断言 question_attempt 行）。
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { usePracticeStore } from '@/stores/practice'
import { useStudyDbStore } from '@/stores/studyDb'
import { normalizeBankItem } from '@/content/practiceBank'
import { isFillItem } from '@/content/answerNorm'
import ExamBlock from '@/components/blocks/ExamBlock.vue'

/** 合成题库条目（字段与 practiceBankClient 的运行时条目一致） */
function makeQ(i, { gradable = true, correctIndex = 0, answer, type } = {}) {
  const fill = gradable === false && (type === 'fill' || type === 'fill-implicit')
  return {
    key: `01/1/0/${i}`,
    subject: 'math',
    unitNum: '01',
    unitTitle: '测试单元',
    fileIndex: 0,
    fileKey: `math_01_p${i}`,
    fileTitle: '测试页',
    blockTitle: '快速检测',
    // fill 形态：显式 type:fill 或题干含 ______（覆盖省略 type 的存量）
    question: fill ? `测试题干 ${i}（答案为______）` : `测试题干 ${i}`,
    options: gradable ? ['A', 'B', 'C', 'D'] : null,
    correctIndex: gradable ? correctIndex : undefined,
    answer: answer || `答案与解析 ${i}`,
    difficulty: 'basic',
    itemType: type === 'fill-implicit' ? '' : type || (gradable ? 'single' : 'solution'),
    gradable,
    source: 'quiz'
  }
}

describe('practice store：submitFill 判分链路（B-2）', () => {
  let store
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    store = usePracticeStore()
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  /** 3 题：1 选择 + 2 fill（answer 为复合文本，判对走 LaTeX RHS 抽取路径） */
  function startSession() {
    store.startSession({
      mode: 'unit',
      title: '数学 · 测试',
      subject: 'math',
      unitNums: ['01'],
      questions: [
        makeQ(0),
        makeQ(1, { gradable: false, type: 'fill', answer: '\\(a = 3\\)（因为 \\(2^3 = 8\\)）。' }),
        makeQ(2, { gradable: false, type: 'fill-implicit', answer: '转折。"出淤泥而不染"中…' })
      ],
      compose: null
    })
  }

  /** 通过第一题（D2 强制自评门控：未自评 next() 是 no-op），走到第一道 fill 题 */
  async function passFirst() {
    store.pickOption(0)
    await store.assess('known')
    store.next()
  }

  it('① fill 题判据：type:fill 与题干含 ______ 命中（覆盖省略 type 的存量）', () => {
    expect(isFillItem({ type: 'fill', question: 'x' })).toBe(true)
    expect(isFillItem({ question: '函数 f(x)=______ 的值' })).toBe(true)
  })

  it('② 判对路径：typed/autoMatched=true、revealed=true、assess 仍 null；重复提交幂等', async () => {
    startSession()
    await passFirst() // 走到第 2 题（fill）
    expect(store.currentRecord.picked).toBe(null)

    store.submitFill('3')
    const rec = store.currentRecord
    expect(rec.typed).toBe('3')
    expect(rec.autoMatched).toBe(true)
    expect(rec.revealed).toBe(true)
    expect(rec.assess).toBe(null) // assess 仍是单题完成唯一标志（D2 不动）
    expect(store.canNext).toBe(false)

    // 重复提交 no-op（幂等，防重复提交）
    store.submitFill('999')
    expect(store.currentRecord.typed).toBe('3')
    expect(store.currentRecord.autoMatched).toBe(true)
  })

  it('③ 未命中：autoMatched=false 不抛错；assess(\'unknown\') 落库且 userAnswer === typed', async () => {
    startSession()
    await passFirst()
    store.submitFill('随便答的')
    expect(store.currentRecord.autoMatched).toBe(false)
    expect(store.currentRecord.revealed).toBe(true)

    await store.assess('unknown')
    const errors = await db.getAllErrors()
    expect(errors).toHaveLength(1)
    expect(errors[0].userAnswer).toBe('随便答的') // 真实输入进错题本（替代「自评：我还不会」）
  })

  it('④ resultStats H3 二分：1 选择判对 + 1 fill 判对 + 1 fill 回落自评 → autoCount=2, selfCount=1', async () => {
    startSession()
    // 题 1：选择判对
    store.pickOption(0)
    await store.assess('known')
    store.next()
    // 题 2：fill 判对
    store.submitFill('3')
    await store.assess('known')
    store.next()
    // 题 3：fill 未命中 → 回落自评 unknown
    store.submitFill('答错了的')
    await store.assess('unknown')

    const stats = store.resultStats
    expect(stats.autoCount).toBe(2)
    expect(stats.autoCorrect).toBe(2) // 选择判对 + fill 判对都计 autoCorrect
    expect(stats.selfCount).toBe(1)
    expect(stats.selfKnown).toBe(0)
  })
})

describe('practiceBank：nz 紧凑键展开（B-2）', () => {
  it('⑤ nz:true → normalizable===true；缺省 false', () => {
    expect(normalizeBankItem({ k: 'x', nz: true }).normalizable).toBe(true)
    expect(normalizeBankItem({ k: 'x' }).normalizable).toBe(false)
    expect(normalizeBankItem({ k: 'x', nz: false }).normalizable).toBe(false)
  })

  it('⑥ 构建产物：index.json 含 normTotal 且 ≤ 总题数；math.normalizable ≥ 数值型样例数', () => {
    const index = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'practice-bank', 'index.json'), 'utf-8')
    )
    expect(typeof index.normTotal).toBe('number')
    expect(index.normTotal).toBeGreaterThan(0)
    expect(index.normTotal).toBeLessThanOrEqual(index.total)
    // 学科级计数存在且不超过该学科题量（相对口径，锚点不锚绝对值）
    for (const [subject, meta] of Object.entries(index.subjects)) {
      expect(typeof meta.normalizable).toBe('number')
      expect(meta.normalizable).toBeLessThanOrEqual(meta.count)
      if (subject === 'math') {
        // 数值型实测样例 ≥ 2（\(a = 3\) 类 RHS 抽取路径在 math 题库中至少两条）
        expect(meta.normalizable).toBeGreaterThanOrEqual(2)
      }
    }
  })
})

describe('ExamBlock：fill 自动计分与作答行（B-2）', () => {
  let db

  beforeEach(async () => {
    setActivePinia(createPinia())
    db = useStudyDbStore()
    await db.clearAllErrors()
  })

  function examBlockProps() {
    return {
      block: {
        type: 'exam',
        title: '测试卷',
        duration: 1,
        totalScore: 100,
        passingScore: 60,
        items: [
          {
            type: 'fill',
            question: '方程的解 a =______',
            answer: '\\(a = 3\\)（因为 \\(2^3 = 8\\)）。',
            score: 20,
            difficulty: 'basic'
          },
          {
            type: 'single',
            question: '选择：1+1=?',
            options: ['2', '3'],
            correctIndex: 0,
            answer: '选 A',
            score: 20,
            difficulty: 'basic'
          }
        ]
      },
      context: {
        subject: 'math',
        unitNum: '01',
        fileKey: 'math_01_exam',
        fileTitle: '测试卷页',
        unitTitle: '测试单元'
      }
    }
  }

  it('⑦ fill 判对 → 自动计分 correct:true；question_attempt 行 correct:true / assess:null / typed 有值', async () => {
    const wrapper = mount(ExamBlock, { props: examBlockProps() })
    await wrapper.find('.exam-start-btn').trigger('click')

    // fill：输入命中答案
    const input = wrapper.find('.fill-input')
    await input.setValue('3')
    await wrapper.find('.fill-submit').trigger('click')
    expect(wrapper.find('.fill-hint--ok').exists()).toBe(true)

    // 选择题：点选正确项
    const options = wrapper.findAll('.option-btn')
    await options[0].trigger('click')

    await wrapper.find('.exam-submit-btn').trigger('click')
    // fake-indexeddb 在 jsdom 下按宏任务落地事务：放行一轮宏任务 + 微任务
    await new Promise((r) => setTimeout(r, 200))
    await flushPromises()
    expect(wrapper.find('.exam-result').exists()).toBe(true)

    const attempts = await db.getAllAttempts()
    const fillRow = attempts.find((a) => a.itemType === 'fill')
    expect(fillRow).toBeTruthy()
    expect(fillRow.correct).toBe(true)
    expect(fillRow.assess).toBe(null)
    expect(fillRow.typed).toBe('3')
    expect(fillRow.source).toBe('exam')

    // 全对：无错题入本
    expect(await db.getAllErrors()).toHaveLength(0)
    wrapper.unmount()
  })

  it('⑦b fill 未命中 → 不自动计分，保留自评按钮；自评后按自评口径落库', async () => {
    const wrapper = mount(ExamBlock, { props: examBlockProps() })
    await wrapper.find('.exam-start-btn').trigger('click')

    await wrapper.find('.fill-input').setValue('999')
    await wrapper.find('.fill-submit').trigger('click')
    expect(wrapper.find('.fill-hint--miss').exists()).toBe(true)
    // 回落：自评按钮仍在且可点
    const selfOk = wrapper.find('.self-ok')
    expect(selfOk.exists()).toBe(true)
    await selfOk.trigger('click')

    // 选择题作答（避免触发「未答二次确认」）
    await wrapper.findAll('.option-btn')[0].trigger('click')

    await wrapper.find('.exam-submit-btn').trigger('click')
    await new Promise((r) => setTimeout(r, 200))
    await flushPromises()

    const attempts = await db.getAllAttempts()
    // fake-indexeddb 跨用例残留：按本次输入原文精确定位（typed '999' 只属本用例）
    const fillRow = attempts.find((a) => a.itemType === 'fill' && a.typed === '999')
    expect(fillRow).toBeTruthy()
    expect(fillRow.correct).toBe(null) // 自评行沿用原语义（correct 由 answer 正误决定，自评对不置 true）
    expect(fillRow.assess).toBe('known')
    wrapper.unmount()
  })
})
