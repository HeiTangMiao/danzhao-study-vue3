// @vitest-environment node
/**
 * 批 F · Fc4「schema 口径差异 5 处收敛」—— **独立反例**（QA）
 *
 * 不复用工程师用例；自造反例证明新规则**真会拦**，并守住兼容期红线。
 *  1. formula：lines-only（兼容期）仍通过；formulas-only 通过；孤立反斜杠仍拦（兼容分支不漏语义）
 *  2. table：缺 headers 拦；行宽≠表头拦（首/中/末行）；合规通过
 *  3. solve：quiz 带 solve 拦 + exam 带 solve 过（双向）；schema enum 独立核对
 *  4. columns：cols∉{2,3} 拦；cols≠items.length 拦；缺 items 拦；cols 缺省兼容
 *  5. diagram：新字段可选（无几何字段的 diagram 不报错）；schema required 仅 boardId；内容间抽检
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import schemaJson from '../schema/content-schema.json'
import { createBlockValidator } from '@/utils/validateBlock'
import { CONTENT_DIR, collectFiles } from '../scripts/lib/load-content.mjs'

const v = createBlockValidator(schemaJson)
const has = (errs, needle) => errs.some((e) => e.includes(needle))

// ───────────────────── 1. formula 兼容期 ─────────────────────
describe('Fc4 反例 · item1 formula（兼容期红线）', () => {
  it('仅 lines（无 formulas）→ 通过', () => {
    expect(v({ type: 'formula', lines: ['a=b', 'c=d'] })).toEqual([])
  })
  it('仅 formulas → 通过', () => {
    expect(v({ type: 'formula', formulas: ['a=b'] })).toEqual([])
  })
  it('二者皆无 → 报「缺少 formulas」', () => {
    expect(v({ type: 'formula' })).toContain('公式区块缺少 formulas')
  })
  it('lines 末孤立反斜杠仍拦（兼容分支不得漏语义校验）', () => {
    expect(has(v({ type: 'formula', lines: ['a=b\\'] }), '孤立反斜杠')).toBe(true)
  })
  it('formulas 末孤立反斜杠仍拦', () => {
    expect(has(v({ type: 'formula', formulas: ['x\\'] }), '孤立反斜杠')).toBe(true)
  })
})

// ───────────────────── 2. table 补强 ─────────────────────
describe('Fc4 反例 · item2 table', () => {
  it('缺 headers → 报「表格区块缺少 headers」', () => {
    expect(v({ type: 'table', rows: [['a', 'b']] })).toContain('表格区块缺少 headers')
  })
  it('headers 非数组 → 报错', () => {
    expect(v({ type: 'table', headers: 'a,b', rows: [] })).toContain('表格区块缺少 headers')
  })
  it('rows 非数组 → 报「表格区块缺少 rows」', () => {
    expect(v({ type: 'table', headers: ['a'], rows: 'x' })).toContain('表格区块缺少 rows')
  })
  it('首行/末行宽度不符 → 分别报出行号', () => {
    const e1 = v({ type: 'table', headers: ['a', 'b', 'c'], rows: [['1', '2'], ['1', '2', '3']] })
    expect(has(e1, '表格第0行宽度与表头不一致（2≠3）')).toBe(true)
    const e2 = v({ type: 'table', headers: ['a', 'b', 'c'], rows: [['1', '2', '3'], ['1', '2']] })
    expect(has(e2, '表格第1行宽度与表头不一致（2≠3）')).toBe(true)
  })
  it('合规表（每行宽度==表头）→ 无错', () => {
    expect(v({ type: 'table', headers: ['a', 'b', 'c'], rows: [['1', '2', '3'], ['', '5', '6']] })).toEqual([])
  })
})

// ───────────────────── 3. solve 去并集（双向） ─────────────────────
describe('Fc4 反例 · item3 solve 双向', () => {
  const it_ = (type) => ({ type, question: 'q', answer: 'a' })

  it('quiz 带 solve → 报「题目[0] 未知题型: solve」', () => {
    expect(has(v({ type: 'quiz', items: [it_('solve')] }), '题目[0] 未知题型: solve')).toBe(true)
  })
  it('quiz 带 single/judge/fill → 全通过', () => {
    expect(v({ type: 'quiz', items: [it_('single'), it_('judge'), it_('fill')] })).toEqual([])
  })
  it('exam 带 solve → 通过', () => {
    expect(v({ type: 'exam', items: [it_('solve')] })).toEqual([])
  })
  it('exam 带 single/judge/fill → 通过', () => {
    expect(v({ type: 'exam', items: [it_('single'), it_('judge'), it_('fill')] })).toEqual([])
  })
  it('exam 带未知题型 → 报「模拟卷题目[0] 未知题型」', () => {
    expect(has(v({ type: 'exam', items: [it_('__x__')] }), '模拟卷题目[0] 未知题型: __x__')).toBe(true)
  })
  it('schema 独立核对：quizItem.type 不含 solve；examItem.type 含 solve', () => {
    expect(schemaJson.definitions.quizItem.properties.type.enum).not.toContain('solve')
    expect(schemaJson.definitions.quizItem.properties.type.enum).toEqual(['single', 'judge', 'fill'])
    expect(schemaJson.definitions.examItem.properties.type.enum).toContain('solve')
  })
})

// ───────────────────── 4. columns 补强 ─────────────────────
describe('Fc4 反例 · item4 columns', () => {
  const col = () => [{ type: 'knowledge', paragraphs: ['x'] }]

  it('cols:4 → 报「分栏 cols 只支持 2/3」', () => {
    expect(v({ type: 'columns', cols: 4, items: [col(), col()] })).toContain('分栏 cols 只支持 2/3: 4')
  })
  it('cols:1 / cols:0 → 报错', () => {
    expect(has(v({ type: 'columns', cols: 1, items: [col()] }), '分栏 cols 只支持 2/3')).toBe(true)
    expect(has(v({ type: 'columns', cols: 0, items: [] }), '分栏 cols 只支持 2/3')).toBe(true)
  })
  it('cols:2 但 3 列 → 报「分栏列数 3 与 cols 2 不一致」', () => {
    expect(v({ type: 'columns', cols: 2, items: [col(), col(), col()] })).toContain('分栏列数 3 与 cols 2 不一致')
  })
  it('cols:3 但 2 列 → 报不一致', () => {
    expect(has(v({ type: 'columns', cols: 3, items: [col(), col()] }), '分栏列数 2 与 cols 3 不一致')).toBe(true)
  })
  it('缺 items → 报「分栏区块缺少 items」', () => {
    expect(v({ type: 'columns', cols: 2 })).toContain('分栏区块缺少 items')
  })
  it('cols:2 + 2 列 / cols:3 + 3 列 → 无错', () => {
    expect(v({ type: 'columns', cols: 2, items: [col(), col()] })).toEqual([])
    expect(v({ type: 'columns', cols: 3, items: [col(), col(), col()] })).toEqual([])
  })
  it('cols 缺省（向后兼容存量）→ 不因列数报错', () => {
    expect(v({ type: 'columns', items: [col()] })).toEqual([])
  })
  it('容器内子区块仍被递归校验（cols 合规但子区块坏 → 报子错）', () => {
    const errs = v({ type: 'columns', cols: 2, items: [[{ type: 'warning' }], col()] })
    expect(has(errs, 'warning 区块 text 为空')).toBe(true)
  })
})

// ───────────────────── 5. diagram 新字段可选 ─────────────────────
describe('Fc4 反例 · item5 diagram（可选字段不得成为新负担）', () => {
  const diagramBranch = schemaJson.definitions.block.allOf.find(
    (b) => b.if?.properties?.type?.const === 'diagram'
  )

  it('schema：required 仅 ["boardId"]（未新增必填）', () => {
    expect(diagramBranch.then.required).toEqual(['boardId'])
  })
  it('schema：boundingbox/height/fixed 均在 properties 中', () => {
    const keys = Object.keys(diagramBranch.then.properties)
    for (const k of ['boundingbox', 'height', 'fixed']) expect(keys).toContain(k)
  })
  it('仅 boardId（无几何字段）→ 通过', () => {
    expect(v({ type: 'diagram', boardId: 'trig-func' })).toEqual([])
  })
  it('带全部几何字段 → 通过', () => {
    expect(v({ type: 'diagram', boardId: 'x', caption: 'c', boundingbox: [-6, 4, 6, -4], height: 320, fixed: true })).toEqual([])
  })
  it('boardId 为空/缺失 → 报错', () => {
    expect(has(v({ type: 'diagram', boardId: '' }), '缺少 boardId')).toBe(true)
    expect(has(v({ type: 'diagram' }), '缺少 boardId')).toBe(true)
  })
  it('content.d.ts 已声明可选几何字段 + 题型按块拆分', () => {
    const dts = readFileSync(join(process.cwd(), 'src/types/content.d.ts'), 'utf-8')
    for (const f of ['boundingbox?', 'height?', 'fixed?']) expect(dts).toContain(f)
    expect(dts).toMatch(/export type QuizQuestionType = 'single' \| 'judge' \| 'fill'/)
    expect(dts).toMatch(/export type ExamQuestionType = 'single' \| 'judge' \| 'fill' \| 'solve'/)
  })
})

// ───────────────────── 内容间抽检：真实 diagram 块 ─────────────────────
describe('Fc4 反例 · 真实内容 diagram 块抽检', () => {
  let diagrams = []
  let filesWithDiagram = []
  beforeAll(async () => {
    filesWithDiagram = collectFiles(CONTENT_DIR).filter((f) => {
      const t = readFileSync(f, 'utf8')
      return t.includes("'diagram'") || t.includes('"diagram"')
    })
    const walk = (blocks, out) => {
      for (const b of blocks || []) {
        if (!b || typeof b !== 'object') continue
        if (b.type === 'diagram') out.push(b)
        const kids = b.type === 'group' ? b.items : b.type === 'columns' ? (b.items || []).flat() : b.children
        if (Array.isArray(kids)) walk(kids, out)
      }
    }
    for (const f of filesWithDiagram) {
      const mod = await import(pathToFileURL(f).href)
      walk(mod.default?.blocks || mod.default?.content || [], diagrams)
    }
  }, 60000)

  it('抽检到真实 diagram 块（≥15 个）', () => {
    expect(diagrams.length).toBeGreaterThanOrEqual(15)
  })

  it('几何字段从不触发校验错误；有 boardId 的 diagram 一律通过', () => {
    const GEOM = ['boundingbox', 'height', 'fixed']
    for (const d of diagrams) {
      const errs = v(d)
      for (const g of GEOM) {
        expect(errs.some((e) => e.includes(g)), `diagram ${d.boardId} 因可选字段 ${g} 报错: ${errs}`).toBe(false)
      }
      if (d.boardId) expect(errs, `diagram ${d.boardId}: ${errs}`).toEqual([])
    }
  })

  it('无几何字段的 diagram 仍通过（可选性验证）', () => {
    const plain = diagrams.filter((d) => !('boundingbox' in d) && !('height' in d) && !('fixed' in d))
    expect(plain.length).toBeGreaterThan(0)
    for (const d of plain) expect(v(d)).toEqual([])
  })
})
