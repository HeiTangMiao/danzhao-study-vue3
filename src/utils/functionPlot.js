/**
 * functionPlot —— 把表达式画到 jsxgraph 画板（CSP 安全）
 *
 * ⚠️ 两条硬约束（否则会重蹈 functiongraph / GeoGebra 的坑）：
 *  1. 显函数**不用** board.create('functiongraph', ...)：它内部会走 JessieCode 的 eval，
 *     被生产 CSP（script-src 'self'，无 unsafe-eval）拦下并静默丢曲线。
 *     这里改成先离散采样，再 board.create('curve', [xArray, yArray]) 画数据折线 —— 全程无 eval。
 *  2. 隐函数用 board.create('implicitcurve', [ (x,y)=>number ])：**必须传真函数**。
 *     jsxgraph 的 Type.createFunction 对「函数」直接采用、对「字符串」才走 JC eval。
 *     传字符串会被 CSP 拦下；传真函数则安全。
 *
 * 本模块只做"算数据 + 建元素"，不碰 DOM，便于用桩画板做单元测试。
 */
import { analyze } from './functionExpr'

/** 显函数默认采样点数 */
export const SAMPLE_COUNT = 600

/**
 * 相邻采样点 y 跳变超过该值即断开曲线。
 * 用于处理 1/x、tan(x) 等渐近线，避免在断点处连出一条竖直假线。
 */
export const DEFAULT_MAX_JUMP = 20

/**
 * 解析画板可见范围（x 轴），用于显函数采样。
 * @param {object} board jsxgraph 画板（含 getBoundingBox）
 * @param {[number,number]|null} range 显式指定范围，优先使用
 * @returns {[number,number]} [xmin, xmax]
 */
function resolveRange(board, range) {
  if (Array.isArray(range) && range.length === 2) return range
  try {
    const bbox = board && typeof board.getBoundingBox === 'function' ? board.getBoundingBox() : null
    // jsxgraph 的 boundingBox 为 [xmin, ymax, xmax, ymin]
    if (Array.isArray(bbox) && bbox.length === 4) return [bbox[0], bbox[2]]
  } catch (e) {
    /* ignore：桩画板/异常时退回默认范围 */
  }
  return [-6, 6]
}

/**
 * 把显函数离散成若干连续线段（跳过非有限值、在巨大跳变处断开）。
 * @param {(x:number, y:number)=>number} evaluate 求值函数
 * @param {number} xmin 左端
 * @param {number} xmax 右端
 * @param {number} [n] 采样点数
 * @param {number} [maxJump] 断开阈值（用户坐标）
 * @returns {Array<[number[], number[]]>} 每段为 [xs, ys]
 */
export function sampleSegments(evaluate, xmin, xmax, n = SAMPLE_COUNT, maxJump = DEFAULT_MAX_JUMP) {
  const segments = []
  let xs = []
  let ys = []
  let prevY = null
  const step = (xmax - xmin) / n

  for (let i = 0; i <= n; i++) {
    const x = xmin + step * i
    let y
    try {
      y = evaluate(x, 0)
    } catch (e) {
      y = NaN
    }
    if (!Number.isFinite(y)) {
      // 断点（如 1/x 在 0 处）：结束当前段
      if (xs.length > 1) segments.push([xs, ys])
      xs = []
      ys = []
      prevY = null
      continue
    }
    if (prevY !== null && Math.abs(y - prevY) > maxJump) {
      // 相邻点跨度过大（渐近线）：断开，避免竖直假线
      if (xs.length > 1) segments.push([xs, ys])
      xs = []
      ys = []
    }
    xs.push(x)
    ys.push(y)
    prevY = y
  }
  if (xs.length > 1) segments.push([xs, ys])
  return segments
}

/**
 * 把一条表达式画到画板上。
 * @param {object} board jsxgraph 画板
 * @param {string} text 表达式（如 "f(x)=x^2"、"y^2-2x+4y=0"）
 * @param {{color?:string, range?:[number,number], sampleCount?:number, maxJump?:number}} [options]
 * @returns {{kind:'explicit'|'implicit', elements:Array}}
 * @throws {Error} 表达式解析失败时抛出（由调用方展示）
 */
export function plotExpression(board, text, options = {}) {
  const {
    color = '#2f6fed',
    range = null,
    sampleCount = SAMPLE_COUNT,
    maxJump = DEFAULT_MAX_JUMP
  } = options

  const { kind, evaluate } = analyze(text)

  if (kind === 'implicit') {
    // 传真函数给 implicitcurve（字符串会走 eval → 被 CSP 拦）
    const el = board.create('implicitcurve', [(x, y) => evaluate(x, y)], {
      strokeColor: color,
      strokeWidth: 2,
      highlight: false
    })
    return { kind, elements: [el] }
  }

  // 显函数：离散采样 + 数据折线（curve 的曲线数据由函数父节点驱动，但这里给的是数组，同样无 eval）
  const [xmin, xmax] = resolveRange(board, range)
  const segments = sampleSegments(evaluate, xmin, xmax, sampleCount, maxJump)
  const elements = segments.map(([xs, ys]) =>
    board.create('curve', [xs, ys], {
      strokeColor: color,
      strokeWidth: 2,
      highlight: false
    })
  )
  return { kind, elements }
}
