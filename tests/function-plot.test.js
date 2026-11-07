/**
 * functionPlot —— 绘图契约测试（桩画板，不依赖 DOM / canvas）
 *
 * 目的：验证「8 个示例真的能生成几何元素」（不是只看容器在），
 *       并覆盖显函数离散采样的断点处理（1/x 的渐近线不应连成竖线）。
 * 说明：jest 式桩 board 只记录 create 调用；sampleSegments 是纯计算。
 */
import { describe, it, expect } from 'vitest'
import { plotExpression, sampleSegments } from '@/utils/functionPlot'

/** 构造一个记录 create 调用的桩画板 */
function makeStubBoard(bbox = [-6, 5, 6, -5]) {
  const created = []
  return {
    created,
    getBoundingBox: () => bbox,
    create: (type, parents, attrs) => {
      const el = { type, parents, attrs }
      created.push(el)
      return el
    },
    removeObject: () => {},
    update: () => {}
  }
}

// 与组件里的 8 个示例一致
const EXAMPLES = [
  { expr: 'f(x) = x^2', kind: 'explicit', type: 'curve' },
  { expr: 'f(x) = 2x + 1', kind: 'explicit', type: 'curve' },
  { expr: 'f(x) = sin(x)', kind: 'explicit', type: 'curve' },
  { expr: 'f(x) = ln(x)', kind: 'explicit', type: 'curve' },
  { expr: 'f(x) = 2^x', kind: 'explicit', type: 'curve' },
  { expr: 'f(x) = 1/x', kind: 'explicit', type: 'curve' },
  { expr: 'f(x) = x^2 - 2x - 3', kind: 'explicit', type: 'curve' },
  { expr: 'y^2 - 2x + 4y = 0', kind: 'implicit', type: 'implicitcurve' }
]

describe('sampleSegments（显函数离散采样）', () => {
  it('连续函数得到单段', () => {
    const segs = sampleSegments((x) => x * x, -6, 6, 200)
    expect(segs.length).toBe(1)
    expect(segs[0][0].length).toBeGreaterThan(100)
  })

  it('1/x 在 0 处断开为两段（不连出竖直假线）', () => {
    const segs = sampleSegments((x) => 1 / x, -6, 6, 600, 20)
    expect(segs.length).toBe(2)
    // 两段分别落在 x<0 与 x>0
    expect(Math.max(...segs[0][0])).toBeLessThan(0)
    expect(Math.min(...segs[1][0])).toBeGreaterThan(0)
  })

  it('非有限值被跳过（ln(x) 在 x<=0 处无点）', () => {
    const segs = sampleSegments((x) => (x > 0 ? Math.log(x) : NaN), -6, 6, 600)
    expect(segs.length).toBe(1)
    expect(Math.min(...segs[0][0])).toBeGreaterThan(0)
  })
})

describe('plotExpression（8 个示例都能画出元素）', () => {
  it('每个示例都生成 ≥1 个元素，且元素类型正确', () => {
    for (const { expr, kind, type } of EXAMPLES) {
      const board = makeStubBoard()
      const res = plotExpression(board, expr, {})
      expect(res.kind, `${expr} 的 kind`).toBe(kind)
      expect(res.elements.length, `${expr} 应至少生成 1 个元素`).toBeGreaterThan(0)
      expect(board.created.length).toBeGreaterThan(0)
      for (const el of board.created) {
        expect(el.type, `${expr} 的元素类型`).toBe(type)
      }
    }
  })

  it('隐函数示例只生成 1 个 implicitcurve', () => {
    const board = makeStubBoard()
    const res = plotExpression(board, 'y^2 - 2x + 4y = 0', {})
    expect(res.kind).toBe('implicit')
    expect(board.created.length).toBe(1)
    expect(board.created[0].type).toBe('implicitcurve')
    // 传给 implicitcurve 的必须是"真函数"，不是字符串（字符串会走 eval）
    expect(typeof board.created[0].parents[0]).toBe('function')
  })

  it('显函数 1/x 生成两段 curve', () => {
    const board = makeStubBoard()
    const res = plotExpression(board, 'f(x) = 1/x', {})
    expect(res.kind).toBe('explicit')
    expect(board.created.length).toBe(2)
  })

  it('自定义颜色被透传到元素属性', () => {
    const board = makeStubBoard()
    plotExpression(board, 'f(x) = x^2', { color: '#abcdef' })
    expect(board.created[0].attrs.strokeColor).toBe('#abcdef')
  })

  it('解析失败会抛错（由调用方展示，不静默吞掉）', () => {
    const board = makeStubBoard()
    expect(() => plotExpression(board, 'f(x) = x^2 +', {})).toThrow()
    expect(board.created.length).toBe(0)
  })
})
