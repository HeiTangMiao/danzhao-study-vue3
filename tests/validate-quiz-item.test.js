// @vitest-environment jsdom
/**
 * 题目类区块（quiz / exam）solution 绊线测试（批 F0 · F0c4 校验绊线）
 *
 * 背景：全库 `solution` 字段共 425 处，**全部位于 example 块**（ExampleBlock 已渲染）；quiz/exam
 *      题目不含该字段。若日后有人把 solution 写进 quiz/exam，渲染层只读 answer → 该段解析
 *      对学员**静默不可见**（最难自查的缺陷）。故把「solution 只在例题块渲染」从口头约定
 *      变成校验器绊线（Node 校验 + 编辑器提示两端共用同一份规则）。
 *
 * 覆盖：
 *  - quiz 题带 solution → 命中该文案；不带 → 无该错
 *  - exam 题带 solution → 命中该文案
 *  - example 题带 solution → 无错（走例题独立分支，不受影响）
 */
import { describe, it, expect } from 'vitest'
import schemaJson from '../schema/content-schema.json'
import { createBlockValidator } from '@/utils/validateBlock'

const validateBlock = createBlockValidator(schemaJson)
const MSG = 'solution 只在例题块渲染（请改用 answer）'

describe('quiz 题目：solution 绊线', () => {
  it('带 solution → 报「solution 只在例题块渲染」', () => {
    const errors = validateBlock({
      type: 'quiz',
      items: [{
        type: 'single',
        difficulty: 'basic',
        question: '1+1=?',
        options: ['1', '2'],
        correctIndex: 1,
        answer: '**B**。2',
        solution: '这段解析会被静默吞掉'
      }]
    })
    expect(errors.join('\n')).toContain(MSG)
  })

  it('不带 solution → 无该错（正常客观题通过）', () => {
    const errors = validateBlock({
      type: 'quiz',
      items: [{
        type: 'single',
        difficulty: 'basic',
        question: '1+1=?',
        options: ['1', '2'],
        correctIndex: 1,
        answer: '**B**。2'
      }]
    })
    expect(errors.join('\n')).not.toContain(MSG)
    expect(errors).toEqual([])
  })
})

describe('exam 题目：solution 绊线（同一 checkQuestionItems）', () => {
  it('带 solution → 报错（前缀为「模拟卷题目」）', () => {
    const errors = validateBlock({
      type: 'exam',
      items: [{
        type: 'single',
        difficulty: 'basic',
        question: 'x',
        options: ['a', 'b'],
        correctIndex: 0,
        answer: '**A**。a',
        solution: '漏渲染'
      }]
    })
    expect(errors.join('\n')).toContain('模拟卷题目[0] ' + MSG)
  })
})

describe('example 题目：不受该绊线影响（example 走独立分支且本就渲染 solution）', () => {
  it('带 solution 的例题无错', () => {
    const errors = validateBlock({
      type: 'example',
      items: [{
        difficulty: 'basic',
        question: '求 1+1',
        answer: '2',
        solution: '例题解析（ExampleBlock 折叠区渲染）'
      }]
    })
    expect(errors).toEqual([])
  })

  it('例题含 type:single 且带 solution 仍无错（独立分支，不误伤 4 条例题条目样式）', () => {
    const errors = validateBlock({
      type: 'example',
      items: [{
        type: 'single',
        difficulty: 'basic',
        question: '下列正确的是',
        options: ['A项', 'B项'],
        correctIndex: 0,
        answer: '**A**。',
        solution: '逐项辨析'
      }]
    })
    expect(errors.join('\n')).not.toContain(MSG)
  })
})
