// @vitest-environment node
/**
 * 批 F0 · F0c4 solution 校验绊线 —— **独立复核**（QA）
 *
 * 攻击点：
 *  A. 命中：quiz / exam 条目带 solution → 报「solution 只在例题块渲染（请改用 answer）」
 *  B. 不误伤：example 块（含 type:'single' 的例题条目）带 solution → 无该错
 *  C. 无假阳性：quiz/exam 不带 solution → 无该错
 *  D. 边界矩阵：solution 为 '' / null / 0 / false —— `!== undefined` 判据下是否命中
 *  E. **嵌套盲区攻击**：solution 埋在 layout.children / group.items / columns 内层 quiz 里
 *     → 递归是否仍能命中（校验器对容器的下钻）
 *  F. 多条目下标正确（prefix 指向出错的那一条）
 *  G. 布线核对：scripts/validate-content.mjs 确实用同一份 createBlockValidator
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import schemaJson from '../schema/content-schema.json'
import { createBlockValidator } from '@/utils/validateBlock'

const validateBlock = createBlockValidator(schemaJson)
const MSG = 'solution 只在例题块渲染（请改用 answer）'
const hit = (block) => validateBlock(block).some((e) => e.includes(MSG))

const baseItem = (extra = {}) => ({
  type: 'single', difficulty: 'basic', question: '1+1=?', options: ['1', '2'], correctIndex: 1, answer: '**B**。2', ...extra
})

describe('F0c4 独立复核 · A) quiz/exam 命中', () => {
  it('quiz 条目带 solution → 命中', () => {
    expect(hit({ type: 'quiz', items: [baseItem({ solution: '解析' })] })).toBe(true)
  })
  it('exam 条目带 solution → 命中（前缀「模拟卷题目」）', () => {
    const errs = validateBlock({ type: 'exam', items: [baseItem({ solution: '漏渲染' })] })
    expect(errs.some((e) => e.includes('模拟卷题目[0]') && e.includes(MSG))).toBe(true)
  })
})

describe('F0c4 独立复核 · B/C) 不误伤 / 无假阳性', () => {
  it('example 带 solution → 无该错', () => {
    expect(hit({ type: 'example', items: [{ difficulty: 'basic', question: 'q', answer: '2', solution: '解' }] })).toBe(false)
  })
  it('example 含 type:single + solution → 无该错', () => {
    expect(hit({ type: 'example', items: [baseItem({ solution: '解' })] })).toBe(false)
  })
  it('quiz 不带 solution → 无该错，且完全无错', () => {
    const errs = validateBlock({ type: 'quiz', items: [baseItem()] })
    expect(errs).toEqual([])
  })
})

describe('F0c4 独立复核 · D) 边界矩阵（solution 的存在性判据）', () => {
  const cases = [
    ['非空字符串', '解析', true],
    ['空字符串', '', true], // !== undefined → 命中
    ['null', null, true],   // null !== undefined → 命中
    ['数字 0', 0, true],
    ['布尔 false', false, true]
  ]
  for (const [label, val, want] of cases) {
    it(`solution=${label} → ${want ? '命中' : '不命中'}`, () => {
      expect(hit({ type: 'quiz', items: [baseItem({ solution: val })] })).toBe(want)
    })
  }
})

describe('F0c4 独立复核 · E) 嵌套盲区攻击：内层 quiz 也须被拦', () => {
  it('layout.children 内层 quiz 带 solution → 命中（含「子区块」前缀）', () => {
    const errs = validateBlock({
      type: 'layout', as: 'stack', children: [{ type: 'quiz', items: [baseItem({ solution: 'x' })] }]
    })
    expect(errs.some((e) => e.includes('子区块[0]') && e.includes(MSG))).toBe(true)
  })

  it('group.items 内层 quiz 带 solution → 命中（含「区块」前缀）', () => {
    const errs = validateBlock({ type: 'group', items: [{ type: 'quiz', items: [baseItem({ solution: 'x' })] }] })
    expect(errs.some((e) => e.includes('区块[0]') && e.includes(MSG))).toBe(true)
  })

  it('columns 内层 quiz 带 solution → 命中（含「第1列」前缀）', () => {
    const errs = validateBlock({ type: 'columns', items: [[{ type: 'quiz', items: [baseItem({ solution: 'x' })] }]] })
    expect(errs.some((e) => e.includes('第1列') && e.includes(MSG))).toBe(true)
  })
})

describe('F0c4 独立复核 · F) 多条目下标正确', () => {
  it('仅第 2 条带 solution → 只有「题目[1]」出错', () => {
    const errs = validateBlock({ type: 'quiz', items: [baseItem(), baseItem({ solution: 'x' })] })
    const solErrs = errs.filter((e) => e.includes(MSG))
    expect(solErrs.length).toBe(1)
    expect(solErrs[0]).toContain('题目[1]')
  })
})

describe('F0c4 独立复核 · G) 布线：校验脚本复用同一份校验器', () => {
  it('validate-content.mjs import createBlockValidator 并调用', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'validate-content.mjs'), 'utf-8')
    expect(src).toContain('createBlockValidator')
    expect(src).toContain('validateBlock')
  })
})
