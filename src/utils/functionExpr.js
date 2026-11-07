/**
 * functionExpr —— 函数表达式解析与求值（CSP 安全）
 *
 * 背景：演练场原先用 GeoGebra，其 GWT 引导脚本会在运行期注入内联 <script>，
 * 被生产 CSP 的 script-src 'self'（无 unsafe-inline / unsafe-eval）拦下，
 * 计算器永远加载不出来 → 该区块白屏。改用 jsxgraph 后，表达式求值由 expr-eval 承担。
 *
 * ⚠️ CSP 底线（禁止"优化"）：
 *   expr-eval 有两套求值路径：evaluate() 走它自带的 token-stack 解释器（不依赖任何 eval）；
 *   另一套「把表达式编译成原生 JS 函数」的 API 则依赖 Function 构造器 —— 那正是会被生产 CSP
 *   （script-src 'self'，无 unsafe-eval）拦下的机制。
 *   因此本模块**只调用 parser.parse(...).evaluate(...)**，
 *   **严禁改用那套编译 API** —— 一旦改用，桌面端会静默丢曲线（重蹈 functiongraph 的坑）。
 *
 * 支持语法：+ - * / % ^、括号、sin/cos/tan（及 asin/acos/atan 等）、ln/log（自然对数）、
 *           sqrt/abs/exp、常量 PI/E；隐式乘法（2x、2(x+1)）由 preprocess 补全。
 */
import { Parser } from 'expr-eval'

// 单个共享解析器实例（无状态，可复用）
const parser = new Parser()

/** 允许出现的变量名（其余一律判为未知变量并报错） */
const ALLOWED_VARS = new Set(['x', 'y'])

/**
 * 判断表达式片段是否引用了某个变量（按标识符边界匹配，避免把函数名里的字母算进来）。
 * 不使用后行断言（lookbehind），以兼容旧版 WebKit。
 * @param {string} expr 预处理后的表达式
 * @param {string} name 变量名（x / y）
 * @returns {boolean}
 */
function usesVar(expr, name) {
  return new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`).test(expr)
}

/**
 * 预处理：补隐式乘法、归一化常量。
 * expr-eval 原生不支持 2x / 2(x+1) 这类写法，也不认识小写 pi。
 * @param {string} expr 原始表达式片段
 * @returns {string} 预处理后的表达式（已去除空白）
 */
export function preprocess(expr) {
  let s = String(expr == null ? '' : expr).trim()
  // expr-eval 不接受空白，全部去掉（不影响语义）
  s = s.replace(/\s+/g, '')
  if (!s) return s
  // 小写 pi → 内置常量 PI（避免破坏含 pi 的标识符）
  s = s.replace(/(^|[^A-Za-z])pi(?![A-Za-z])/g, '$1PI')
  // 数字 后接 字母：2x → 2*x（数字不能是标识符的一部分，如 log10 的 10）
  s = s.replace(/(^|[^A-Za-z0-9_])(\d+)([A-Za-z])/g, '$1$2*$3')
  // 数字 后接 左括号：2(x+1) → 2*(x+1)
  s = s.replace(/(^|[^A-Za-z0-9_])(\d+)(\()/g, '$1$2*(')
  // 变量 后接 数字：x2 → x*2
  s = s.replace(/(^|[^A-Za-z0-9_])([A-Za-z])(\d)/g, '$1$2*$3')
  // 右括号 后接 字母/数字/左括号：)x → )*x，)( → )*(
  s = s.replace(/\)([A-Za-z0-9(])/g, ')*$1')
  // 单字母变量 后接 左括号：x( → x*( ；函数名（sin/log/ln…）前面还有字母，不会误插
  s = s.replace(/(^|[^A-Za-z0-9_])([A-Za-z])\(/g, '$1$2*(')
  return s
}

/**
 * 解析表达式串（安全包装），失败时抛出面向用户的中文错误。
 * @param {string} pre 预处理后的表达式
 * @returns {import('expr-eval').Expression}
 */
function safeParse(pre) {
  try {
    return parser.parse(pre)
  } catch (e) {
    throw new Error('表达式无法解析：' + (e && e.message ? e.message : String(e)), { cause: e })
  }
}

/**
 * 校验并收集未知变量。
 * @param {import('expr-eval').Expression} compiled
 * @returns {string[]} 未知变量名
 */
function unknownVars(compiled) {
  return compiled.variables().filter((v) => !ALLOWED_VARS.has(v))
}

/**
 * 编译显函数 y = f(x)。
 * @param {string} pre 预处理后的右侧表达式
 * @param {string} source 原始输入（用于回显）
 */
function compileExplicit(pre, source) {
  const compiled = safeParse(pre)
  const unknown = unknownVars(compiled)
  if (unknown.length) throw new Error(`包含未知变量：${unknown.join('、')}`)
  if (usesVar(pre, 'y')) throw new Error('显函数右侧不应包含 y（隐式方程请写成 F(x,y)=0 的形式）')
  return {
    kind: 'explicit',
    source: String(source).trim(),
    // 只调用 evaluate（走解释器），不碰会编译成原生函数的 API（那会触发 CSP）
    evaluate: (x) => Number(compiled.evaluate({ x }))
  }
}

/**
 * 编译隐式方程 F(x,y) = 0。
 * @param {string} pre 预处理后的 F 表达式
 * @param {string} source 原始输入（用于回显）
 */
function compileImplicit(pre, source) {
  const compiled = safeParse(pre)
  const unknown = unknownVars(compiled)
  if (unknown.length) throw new Error(`只支持变量 x、y，检测到未知变量：${unknown.join('、')}`)
  return {
    kind: 'implicit',
    source: String(source).trim(),
    // 同上：只用 evaluate 解释器，保证 CSP 安全
    evaluate: (x, y) => Number(compiled.evaluate({ x, y }))
  }
}

/**
 * 解析并编译一条用户表达式。
 *
 * 识别规则：
 *  - 无等号：含 y → 隐式方程 F(x,y)=0；否则视为显函数 y=…
 *  - 有等号且左侧是 f(x) / g(x) / … / y，且右侧不含 y → 显函数 y=右侧
 *  - 其它（含 x^2+y^2=1、y^2-2x+4y=0 等）→ 隐式方程 F = 左 − 右 = 0
 *
 * @param {string} text 用户输入，如 "f(x)=x^2"、"y=2x+1"、"y^2-2x+4y=0"
 * @returns {{kind:'explicit'|'implicit', source:string, evaluate:(x:number,y?:number)=>number}}
 * @throws {Error} 解析失败或含未知变量时抛出（message 为面向用户的中文原因）
 */
export function analyze(text) {
  const raw = String(text == null ? '' : text).trim()
  if (!raw) throw new Error('表达式为空')

  const parts = raw.split('=')
  if (parts.length > 2) throw new Error('只能包含一个等号“=”')

  // 无等号
  if (parts.length === 1) {
    const pre = preprocess(parts[0])
    if (!pre) throw new Error('表达式为空')
    return usesVar(pre, 'y') ? compileImplicit(pre, raw) : compileExplicit(pre, raw)
  }

  // 有等号
  // 注意：左侧的「函数定义式」f(x) / g(x) / y 必须在**预处理之前**识别 ——
  //       否则 preprocess 会把 f(x) 里的 f( 当成隐式乘法，误写成 f*(x)。
  const lhsFlat = parts[0].replace(/\s+/g, '')
  const rhsNorm = preprocess(parts[1])
  if (!lhsFlat) throw new Error('等号左侧为空')
  if (!rhsNorm) throw new Error('等号右侧为空')

  const isExplicitForm = /^[A-Za-z]\w*\(x\)$/.test(lhsFlat) || lhsFlat === 'y'
  if (isExplicitForm && !usesVar(rhsNorm, 'y')) {
    return compileExplicit(rhsNorm, raw)
  }
  // 其余一律按隐式方程处理：F(x,y) = 左 − 右 = 0
  const lhsNorm = preprocess(parts[0])
  return compileImplicit(`(${lhsNorm})-(${rhsNorm})`, raw)
}
