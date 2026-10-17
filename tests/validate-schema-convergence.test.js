// @vitest-environment jsdom
/**
 * 批 F · Fc4（F-3.3）schema 口径差异 5 处收敛 —— 逐项守卫
 *
 * 背景：schema / content.d.ts 与手写 validator（CI 唯一强制层）之间存在 5 处口径差，
 *      本次收敛每项的口径差（详见 docs/archive/2026-10/batches/batch-f-tasks.md §F-3.3）。
 *      validator 是唯一的运行时强制层 —— 这些规则不钉死，内容侧写错只会静默降级渲染。
 *
 * 覆盖（与任务卡 5 项一一对应）：
 *  item1 formula：`lines`-only 块在「兼容期」仍通过（schema 仍要求 formulas，但 validator 兼容）
 *  item2 table：缺 headers → 报错；行宽与表头不一致 → 报错；合规表通过
 *  item3 solve：quiz 带 solve → 报错；exam 带 solve → 通过（按块派生，去并集）
 *  item4 columns：cols:4 → 报错；cols 与实际列数不一致 → 报错；缺 items → 报错；合规通过
 *  item5 diagram：schema/content.d.ts 已补 boundingbox/height/fixed（可选），带这些字段的块仍通过
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import schemaJson from '../schema/content-schema.json'
import { createBlockValidator } from '@/utils/validateBlock'

const validateBlock = createBlockValidator(schemaJson)
const has = (errs, needle) => errs.some((e) => e.includes(needle))

describe('item1 · formula：lines-only 兼容分支仍保留（迁移双轨期不误红）', () => {
  it('仅给 lines（无 formulas）→ 通过（validator 兼容期保留 lines 别名）', () => {
    expect(validateBlock({
      type: 'formula',
      lines: ['a = b', 'c = d']
    })).toEqual([])
  })

  it('仅给 formulas → 通过', () => {
    expect(validateBlock({
      type: 'formula',
      formulas: ['a = b']
    })).toEqual([])
  })

  it('lines 末尾孤立反斜杠仍被拦（兼容分支不放过语义校验）', () => {
    expect(has(validateBlock({ type: 'formula', lines: ['a = b\\'] }), '孤立反斜杠')).toBe(true)
  })
})

describe('item2 · table：headers 必填 + 每行宽度 == headers 长度', () => {
  it('缺 headers → 报「表格区块缺少 headers」', () => {
    expect(validateBlock({ type: 'table', rows: [['a', 'b']] }))
      .toContain('表格区块缺少 headers')
  })

  it('某行宽度与表头不一致 → 报错并给出行号与长度', () => {
    const errs = validateBlock({
      type: 'table',
      headers: ['分类', '类型', '特征'],
      rows: [['按增减性', '递增', 'x'], ['递减', 'y']]
    })
    expect(has(errs, '表格第1行宽度与表头不一致（2≠3）')).toBe(true)
  })

  it('合规表（每行宽度 == 表头）→ 无错', () => {
    expect(validateBlock({
      type: 'table',
      headers: ['分类', '类型', '特征'],
      rows: [['按增减性', '递增数列', 'x'], ['', '递减数列', 'y']]
    })).toEqual([])
  })
})

describe('item3 · solve：按块派生题型白名单（去并集）', () => {
  const item = (type) => ({ type, question: 'q', answer: 'a' })

  it('quiz 带 solve → 报「未知题型: solve」（quiz 不支持解答题）', () => {
    const errs = validateBlock({ type: 'quiz', items: [item('solve')] })
    expect(has(errs, '题目[0] 未知题型: solve')).toBe(true)
  })

  it('quiz 带 single → 通过（仍属 quiz 白名单）', () => {
    expect(validateBlock({ type: 'quiz', items: [item('single')] })).toEqual([])
  })

  it('exam 带 solve → 通过（exam 白名单含解答题）', () => {
    expect(validateBlock({ type: 'exam', items: [item('solve')] })).toEqual([])
  })

  it('exam 带未知题型 → 报错（前缀「模拟卷题目」）', () => {
    const errs = validateBlock({ type: 'exam', items: [item('__nope__')] })
    expect(has(errs, '模拟卷题目[0] 未知题型: __nope__')).toBe(true)
  })
})

describe('item4 · columns：cols ∈{2,3} 且 cols === items.length', () => {
  const col = () => [{ type: 'knowledge', paragraphs: ['x'] }]

  it('cols:4 → 报「分栏 cols 只支持 2/3: 4」', () => {
    expect(validateBlock({ type: 'columns', cols: 4, items: [col(), col()] }))
      .toContain('分栏 cols 只支持 2/3: 4')
  })

  it('cols:2 但给了 3 列 → 报「分栏列数 3 与 cols 2 不一致」', () => {
    expect(validateBlock({ type: 'columns', cols: 2, items: [col(), col(), col()] }))
      .toContain('分栏列数 3 与 cols 2 不一致')
  })

  it('缺 items → 报「分栏区块缺少 items」', () => {
    expect(validateBlock({ type: 'columns', cols: 2 })).toContain('分栏区块缺少 items')
  })

  it('cols:2 + 2 列 → 无错', () => {
    expect(validateBlock({ type: 'columns', cols: 2, items: [col(), col()] })).toEqual([])
  })

  it('未写 cols 时不报列数不符（cols 可选，向后兼容存量）', () => {
    // 兼容：cols 缺省时仅递归校验，不因「列数 != cols」误红（仍递归子区块）
    expect(validateBlock({ type: 'columns', items: [col()] })).toEqual([])
  })
})

describe('item5 · diagram：schema 与 content.d.ts 补齐几何字段', () => {
  const diagramBranch = schemaJson.definitions.block.allOf.find(
    (b) => b.if?.properties?.type?.const === 'diagram'
  )

  it('schema diagram 分支含 boardId/caption/boundingbox/height/fixed', () => {
    const props = Object.keys(diagramBranch?.then?.properties || {})
    expect(props).toEqual(expect.arrayContaining(['boardId', 'caption', 'boundingbox', 'height', 'fixed']))
  })

  it('schema 里 boundingbox/height/fixed 均非 required（可选，存量 19 处无字段不受影响）', () => {
    expect(diagramBranch?.then?.required).toEqual(['boardId'])
  })

  it('content.d.ts 的 DiagramBlock 声明了 boundingbox?/height?/fixed?', () => {
    const dts = readFileSync(join(process.cwd(), 'src', 'types', 'content.d.ts'), 'utf-8')
    for (const f of ['boundingbox?', 'height?', 'fixed?']) expect(dts).toContain(f)
  })

  it('带几何字段的 diagram 块通过校验（渲染层已读这些字段）', () => {
    expect(validateBlock({
      type: 'diagram',
      boardId: 'trig-func',
      caption: '正弦与余弦',
      boundingbox: [-6.5, 2, 6.5, -2],
      height: 280
    })).toEqual([])
  })

  it('content.d.ts 题型已按块拆分（QuizQuestionType 不含 solve / ExamQuestionType 含）', () => {
    const dts = readFileSync(join(process.cwd(), 'src', 'types', 'content.d.ts'), 'utf-8')
    expect(dts).toMatch(/export type QuizQuestionType = 'single' \| 'judge' \| 'fill'/)
    expect(dts).toMatch(/export type ExamQuestionType = 'single' \| 'judge' \| 'fill' \| 'solve'/)
  })
})
