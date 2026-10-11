// @vitest-environment jsdom
/**
 * 浏览态单选题判分对齐测试（批 F0 · F0-1）
 *
 * 背景：判断题派生（judgeDerive 命中）在 QuizBlock 内**点选即判对错**，而原生单选题只「标记所选」，
 *      反馈不一致、62.4% 可判分题缺自测闭环。本任务让原生单选与判断题派生**同款**：点选即判
 *      （正确项恒绿、错选红）+ 揭示答案。契约不变：不落库、不计正确率、不发 XP（QuizBlock 不 import studyDb）。
 *
 * 覆盖（§2 F0-1 测试要点 ①–⑤ + 越界防守 P-F06）：
 *  - ① 原生单选判分：点对 → 该项 option-correct；点错 → 该项 option-wrong、正确项仍 option-correct
 *  - ② 反馈文案：点对 → judge-ok「回答正确」；点错 → judge-no「回答错误」
 *  - ③ 锁定重选：点选后所有选项按钮 disabled，再次点击不改变判定
 *  - ④ 判断题派生不回归：类型判据条目仍绿/红（与 judge-derive 同源）
 *  - ⑤ H3 不破：QuizBlock 不引用 studyDb / recordError / recordAnswered
 *  - 越界防守：correctIndex 越界 → 回落「查看答案」（不判分、不「所有选项恒红」）
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import QuizBlock from '@/components/blocks/QuizBlock.vue'

// MathJaxRender 走 KaTeX（重）、AppIcon 走图标集 —— 本测试只关心判分，双 stub 掉
const STUBS = { MathJaxRender: true, AppIcon: true }

function mountQuiz(items) {
  return mount(QuizBlock, {
    props: { block: { type: 'quiz', title: '快速检测', items } },
    global: { stubs: STUBS }
  })
}

/** 原生单选题：4 选项，正确项索引 2（第 3 项） */
const NATIVE = {
  type: 'single',
  difficulty: 'basic',
  question: '1 + 1 = ?',
  options: ['1', '2', '3', '4'],
  correctIndex: 2,
  answer: '**C**。答案是 3'
}

/** 判断题派生：type=judge + 加粗「正确。」→ 选项 ['正确','错误']，correctIndex 0 */
const JUDGE = {
  type: 'judge',
  difficulty: 'basic',
  question: '判断：1 + 1 = 2',
  answer: '**正确。**解析'
}

describe('① 原生单选判分', () => {
  it('点正确项 → 该项 option-correct、无 option-wrong', async () => {
    const w = mountQuiz([NATIVE])
    const btns = w.findAll('.option-btn')
    await btns[2].trigger('click')
    expect(btns[2].classes()).toContain('option-correct')
    expect(w.findAll('.option-btn').some((b) => b.classes().includes('option-wrong'))).toBe(false)
    w.unmount()
  })

  it('点错项 → 该项 option-wrong、正确项恒 option-correct', async () => {
    const w = mountQuiz([NATIVE])
    const btns = w.findAll('.option-btn')
    await btns[0].trigger('click')
    expect(btns[0].classes()).toContain('option-wrong')
    expect(btns[2].classes()).toContain('option-correct')
    w.unmount()
  })
})

describe('② 反馈文案（与判断题派生同款）', () => {
  it('点对 → judge-ok「回答正确」', async () => {
    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[2].trigger('click')
    const fb = w.find('.judge-feedback')
    expect(fb.exists()).toBe(true)
    expect(fb.classes()).toContain('judge-ok')
    expect(fb.text()).toBe('回答正确')
    w.unmount()
  })

  it('点错 → judge-no「回答错误」', async () => {
    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[1].trigger('click')
    const fb = w.find('.judge-feedback')
    expect(fb.classes()).toContain('judge-no')
    expect(fb.text()).toBe('回答错误')
    w.unmount()
  })
})

describe('③ 锁定重选（P-F01：判分后 disabled）', () => {
  it('点选后所有选项按钮均 disabled', async () => {
    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[0].trigger('click')
    for (const b of w.findAll('.option-btn')) {
      expect(b.attributes('disabled')).toBeDefined()
    }
    w.unmount()
  })

  it('再次点击其他项不改变判定（原错选仍红、正确项仍绿）', async () => {
    const w = mountQuiz([NATIVE])
    await w.findAll('.option-btn')[0].trigger('click') // 选错
    await w.findAll('.option-btn')[3].trigger('click') // 试图改选
    const btns = w.findAll('.option-btn')
    expect(btns[0].classes()).toContain('option-wrong')   // 仍锁定在原错选
    expect(btns[2].classes()).toContain('option-correct')
    expect(btns[3].classes()).not.toContain('option-wrong')
    w.unmount()
  })
})

describe('④ 判断题派生不回归', () => {
  it('派生条目点「正确」→ option-correct + 回答正确', async () => {
    const w = mountQuiz([JUDGE])
    await w.findAll('.option-btn')[0].trigger('click')
    expect(w.findAll('.option-btn')[0].classes()).toContain('option-correct')
    expect(w.find('.judge-feedback').text()).toBe('回答正确')
    w.unmount()
  })

  it('派生条目点「错误」→ 错选红 + 回答错误', async () => {
    const w = mountQuiz([JUDGE])
    await w.findAll('.option-btn')[1].trigger('click')
    expect(w.findAll('.option-btn')[1].classes()).toContain('option-wrong')
    expect(w.findAll('.option-btn')[0].classes()).toContain('option-correct')
    expect(w.find('.judge-feedback').text()).toBe('回答错误')
    w.unmount()
  })
})

describe('⑤ H3 不破：浏览态判分不落库', () => {
  it('QuizBlock 源码不引用 studyDb / recordError / recordAnswered', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'components', 'blocks', 'QuizBlock.vue'), 'utf-8')
    expect(src).not.toMatch(/studyDb/)
    expect(src).not.toMatch(/recordError|recordAnswered/)
  })

  it('点选判分全程不抛错（无落库副作用路径）', async () => {
    const w = mountQuiz([NATIVE, JUDGE])
    const lists = w.findAll('.option-list')
    await lists[0].findAll('.option-btn')[2].trigger('click')
    await lists[1].findAll('.option-btn')[0].trigger('click')
    expect(w.findAll('.judge-feedback').length).toBe(2)
    w.unmount()
  })
})

describe('越界防守（P-F06）：correctIndex 非法 → 回落「查看答案」', () => {
  it('correctIndex 越界：不渲染选项、回落查看答案', () => {
    const w = mountQuiz([{ ...NATIVE, correctIndex: 5 }])
    expect(w.find('.option-list').exists()).toBe(false)
    expect(w.find('.answer-toggle').exists()).toBe(true)
    w.unmount()
  })

  it('correctIndex 为负：同样回落「查看答案」', () => {
    const w = mountQuiz([{ ...NATIVE, correctIndex: -1 }])
    expect(w.find('.option-list').exists()).toBe(false)
    w.unmount()
  })

  it('correctIndex 非整数（字符串）：安全降级为不可判分', () => {
    const w = mountQuiz([{ ...NATIVE, correctIndex: '2' }])
    expect(w.find('.option-list').exists()).toBe(false)
    w.unmount()
  })
})
