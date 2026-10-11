// @vitest-environment jsdom
/**
 * 批 F0 · F0c3 浏览态单选判分 —— **独立复核**（QA）
 *
 * 攻击点（与 tests/quiz-block-judge.test.js 不同视角）：
 *  A. isChoice **越界防守的完整边界矩阵**：末位合法 / 首位合法 / 单选项 / 越界 / 负 / 非整数 /
 *     undefined / options 空数组 / options 缺省 —— 逐项核对「可判分 vs 回落查看答案」
 *  B. `.option-selected` 彻底消失：源码无该选择器 + 运行时点选（对/错）后 DOM 中**从不**出现
 *  C. H3 运行时硬证：挂载真实 studyDb（fake-indexeddb），点选判分后**零落库**
 *     （error_book 空、今日答题数不变）—— 比静态「源码不含 studyDb」更强
 *  D. 反馈文案与高亮互斥性：点对时全页无 option-wrong；点错时恰一项 option-wrong
 *  E. 多题独立状态：点第 1 题不影响第 2 题
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'
import QuizBlock from '@/components/blocks/QuizBlock.vue'
import { useStudyDbStore } from '@/stores/studyDb'

const STUBS = { MathJaxRender: true, AppIcon: true }
const mountQuiz = (items) =>
  mount(QuizBlock, { props: { block: { type: 'quiz', title: 'T', items } }, global: { stubs: STUBS } })

const NATIVE = {
  type: 'single', difficulty: 'basic', question: 'q', options: ['A项', 'B项', 'C项', 'D项'],
  correctIndex: 2, answer: '**C**。'
}

beforeEach(() => setActivePinia(createPinia()))

// ───────────────────── A. 越界防守矩阵 ─────────────────────
describe('F0c3 独立复核 · A) isChoice 边界矩阵（可判分 vs 回落）', () => {
  const judgeable = [
    ['correctIndex=0', { ...NATIVE, correctIndex: 0 }],
    ['correctIndex=末位(3)', { ...NATIVE, correctIndex: 3 }],
    ['单选项 correctIndex=0', { ...NATIVE, options: ['唯一'], correctIndex: 0 }]
  ]
  for (const [label, item] of judgeable) {
    it(`可判分：${label} → 渲染选项，点选即判`, async () => {
      const w = mountQuiz([item])
      expect(w.find('.option-list').exists()).toBe(true)
      const btns = w.findAll('.option-btn')
      await btns[item.correctIndex].trigger('click')
      expect(btns[item.correctIndex].classes()).toContain('option-correct')
      expect(w.find('.judge-feedback').text()).toBe('回答正确')
      w.unmount()
    })
  }

  const fallback = [
    ['越界 (5)', { ...NATIVE, correctIndex: 5 }],
    ['负数 (-1)', { ...NATIVE, correctIndex: -1 }],
    ['非整数 (1.5)', { ...NATIVE, correctIndex: 1.5 }],
    ['字符串 "2"', { ...NATIVE, correctIndex: '2' }],
    ['undefined', { ...NATIVE, correctIndex: undefined }],
    ['options 空数组', { ...NATIVE, options: [], correctIndex: 0 }],
    ['options 缺省', { ...NATIVE, options: undefined, correctIndex: 0 }]
  ]
  for (const [label, item] of fallback) {
    it(`回落「查看答案」：${label} → 无选项、不出现“全判错”`, () => {
      const w = mountQuiz([item])
      expect(w.find('.option-list').exists()).toBe(false)
      expect(w.findAll('.option-wrong').length).toBe(0) // 绝不「所有选项恒红」
      expect(w.find('.answer-toggle').exists()).toBe(true)
      w.unmount()
    })
  }
})

// ───────────────────── B. .option-selected 消失 ─────────────────────
describe('F0c3 独立复核 · B) .option-selected 无产出路径', () => {
  it('源码不再声明 .option-selected 选择器', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'components', 'blocks', 'QuizBlock.vue'), 'utf-8')
    expect(src).not.toContain('option-selected')
  })

  it('运行时点对 / 点错后，DOM 中都不出现 option-selected', async () => {
    for (const pick of [2, 0]) {
      const w = mountQuiz([NATIVE])
      await w.findAll('.option-btn')[pick].trigger('click')
      const html = w.html()
      expect(html).not.toContain('option-selected')
      w.unmount()
    }
  })
})

// ───────────────────── C. H3 运行时硬证 ─────────────────────
describe('F0c3 独立复核 · C) H3：点选判分零落库（真实 studyDb）', () => {
  it('点选后 error_book 为空、今日答题数不变', async () => {
    const db = useStudyDbStore()
    await db.init()
    await db.clearAllErrors()
    const before = await db.getDailyStat(new Date().toISOString().slice(0, 10))

    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[0].trigger('click') // 点错
    await w.findAll('.option-btn')[2].trigger('click') // 锁定后无效
    await new Promise((r) => setTimeout(r, 20))

    expect((await db.getAllErrors()).length).toBe(0) // 未入错题本
    const after = await db.getDailyStat(new Date().toISOString().slice(0, 10))
    expect(after.questionsAnswered).toBe(before.questionsAnswered) // 未计答题数
    w.unmount()
  })
})

// ───────────────────── D. 高亮互斥 ─────────────────────
describe('F0c3 独立复核 · D) 高亮互斥（正确项恒绿 / 错选唯一红）', () => {
  it('点对：有 option-correct、无 option-wrong', async () => {
    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[2].trigger('click')
    expect(w.findAll('.option-correct').length).toBe(1)
    expect(w.findAll('.option-wrong').length).toBe(0)
    w.unmount()
  })

  it('点错：恰 1 项 option-wrong + 正确项 1 项 option-correct', async () => {
    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[1].trigger('click')
    expect(w.findAll('.option-wrong').length).toBe(1)
    // MathJaxRender 已 stub → 按钮文本仅剩字母标记
    expect(w.findAll('.option-wrong')[0].find('.option-letter').text()).toBe('B')
    expect(w.findAll('.option-correct').length).toBe(1)
    expect(w.findAll('.option-correct')[0].find('.option-letter').text()).toBe('C')
    w.unmount()
  })
})

// ───────────────────── E. 多题独立 ─────────────────────
describe('F0c3 独立复核 · E) 多题状态互相独立', () => {
  it('点第 1 题不影响第 2 题的判定状态', async () => {
    const w = mountQuiz([NATIVE, { ...NATIVE, question: 'q2' }])
    const lists = w.findAll('.option-list')
    await lists[0].findAll('.option-btn')[0].trigger('click')
    expect(lists[0].findAll('.option-wrong').length).toBe(1)
    expect(lists[1].findAll('.option-wrong').length).toBe(0)
    expect(lists[1].findAll('.judge-feedback').length).toBe(0)
    w.unmount()
  })

  it('判断题派生仍在（type=judge + 加粗结论）', async () => {
    const w = mountQuiz([{ type: 'judge', difficulty: 'basic', question: '判断：1+1=2', answer: '**正确。**解析' }])
    const btns = w.findAll('.option-btn')
    expect(btns.length).toBe(2)
    await btns[0].trigger('click')
    expect(btns[0].classes()).toContain('option-correct')
    expect(w.find('.judge-feedback').text()).toBe('回答正确')
    w.unmount()
  })
})
