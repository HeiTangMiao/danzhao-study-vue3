/**
 * jsxgraph eval 守卫（#20）—— 静态扫描 src/geometry/boards/*.js 的每一个 create 调用
 *
 * 作者：software-engineer（Alex）
 * 目的：防止画板代码重新引入「字符串 parent → JessieCode → eval」执行路径。
 *       生产 CSP 为 script-src 'self'（无 unsafe-eval），该路径在桌面端必然抛 EvalError
 *       （#10 的 7 板曲线丢失正是这条路径）。
 *
 * 规则总览（细节与"为什么"写在各数据表/检查函数上）：
 *   R0 类型门槛：元素类型必须是字符串字面量且属于已复核清单（新类型默认拒绝）
 *   R1 表达式型元素：parents 禁止字符串字面量（函数体内豁免）
 *   R2 text 专属：content 与坐标位的放行条件（条件表见 TEXT_RULES）
 *   R3 全目录禁用模式：functiongraph（防 #10 修复回退）
 *
 * 结构约定（团队规范：高内聚低耦合 + 中文注释只写"为什么"）：
 *   第一节是【规则数据表】——新增元素类型、调整 text 放行条件、增删禁用模式，
 *   只改这一节的数据，绝不改第四节扫描器的断言代码；
 *   第三节的检查函数只消费数据表，不写死任何类型名与条件值；
 *   注释只写决策原因、陷阱提醒、机制因果，不复述代码"是什么"。
 *
 * 根因备忘（写给未来的"优化者"，升级 jsxgraph 后必须重读）：
 *   valueTagToJessieCode()（jsxgraph src/base/text.js:885-891）对**任何输入**都返回数组
 *   —— 纯文本也会 push 带引号的条目，这正是 text.js:311 `content[i][0] !== '"'` 判假、
 *   从而跳过 snippet 的根因。若把它"优化"成对纯文本返回原始字符串，数组分支会静默失效、
 *   全部标签改道 snippet → 静默引入 eval。本守卫覆盖不到 jsxgraph 上游变更。
 *
 * 扫描器自校验（防"扫到空气"）：断言 20 个板文件全部被扫描、每个文件都发现 create 调用、
 *   总调用数达到基准；另有 9 个 fixture 用例验证"既不漏报也不误报"。
 *   画板数量变化时请同步更新 BASELINE 并复核覆盖面。
 *
 * /tmp 产出卫生纪律（team-lead 立规）：临时脚本必须带本人前缀（eng-/qa-/arch-/pm-）
 *   且脚本头注明作者与目的，避免出现"看起来像某人产出"的误导性文件。
 *
 * @author software-engineer
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BOARD_DIR } from '../scripts/lib/load-content.mjs'

/* ==================================================================
 * 一、规则数据表 —— 守卫的全部"政策"都在这一节
 * ================================================================== */

/**
 * 已复核元素类型清单（R0 白名单）。
 * 为什么默认拒绝：类型白名单对未知类型是漏报（危险方向），默认拒绝是误报（安全方向，
 * 会响亮地要求人工复核）。新类型入库路径：确认其字符串 parent 是否经 JessieCode 求值
 * ——不经求值 → 加入本清单；经求值 → 同时加入 EXPR_ELEMENT_TYPES。
 */
const SAFE_ELEMENT_TYPES = new Set([
  'text', 'segment', 'point', 'curve', 'slider', 'arrow',
  'line', 'polygon', 'glider', 'hyperbola', 'ellipse', 'circle', 'angle'
])

/**
 * 表达式型元素清单（R1）：字符串 parent 会被 Type.createFunction / board.jc.snippet
 * 包装成函数体，最终走进 jessiecode defineFunction 的 eval —— 生产 CSP 必然拦下。
 * 清单不是凭"名字像表达式"写的，来自 jsxgraph 源码 createFunction 调用点实证：
 *   base/curve.js（curve / functiongraph / implicitcurve / parametriccurve）
 *   base/line.js:1364（line 的 parents 逐个 createFunction）
 *   base/circle.js:139/520（半径走 createFunction，字符串半径同样进 eval）
 *   element/conic.js、element/vectorfield.js
 * 升级 jsxgraph 后需重新核对本清单。
 */
const EXPR_ELEMENT_TYPES = new Set([
  'curve', 'functiongraph', 'implicitcurve', 'parametriccurve',
  'line', 'circle', 'ellipse', 'hyperbola', 'parabola',
  'vectorfield', 'slopetrace', 'tracecurve', 'foreignobject'
])

/**
 * text 元素放行条件表（R2 的全部条件值都来自这里）。
 *
 * text 放行条件：content 不含 bannedContentPattern 且未启用任一 bannedVisProps。
 * 根因：valueTagToJessieCode()（text.js:885-891）对任何输入都返回数组，
 * 数组分支必然命中 → 跳过 JessieCode snippet → 不触发 eval。
 * 若有人把该函数改成返回字符串，含 <value> 的标签会静默引入 eval（被 CSP 拦 → 白屏）。
 *
 * bannedVisProps 是"隐性开关"清单：这些 visProp 全库无默认定义（evalVisProp 返回
 * undefined、默认 falsy），今天不改一切正常；但一旦有人启用，text.js:270 的岔路会把
 * 纯字符串 content 改道 :348 的 snippet —— "今天安全、明天一个配置就翻车"，故显式拦截。
 */
const TEXT_RULES = {
  coordinateSlots: 2, // parents[0..1] 是坐标位：坐标字符串同样经 JC 求值，禁字符串
  contentSlot: 2, // parents[2] 是 content
  bannedContentPattern: /<\s*value/i,
  bannedVisProps: [
    { name: 'useasciimathml', falsyLiterals: new Set(['false', '0', 'null', 'undefined', 'NaN', '']) }
  ]
}

/**
 * 全目录禁用模式（R3）：在"仅注释剔除"视图里出现即违规。
 * 为什么保留 functiongraph 检查：#10 已把 7 板 functiongraph→curve 修复，
 * 它的字符串 parent 是历史上唯一真实触发的 eval 事故，回退必须响亮报错。
 */
const BANNED_SOURCE_PATTERNS = [{ name: 'functiongraph', rule: 'R3' }]

/** 画板文件数量基准（防"扫到空气"；画板增删时同步更新并人工复核覆盖面） */
const BASELINE_FILE_COUNT = 20
/** create 调用总数基准：实际计数 194，此处取下限 150 —— 只防"扫描器失灵空转"，不追求与实际计数相等 */
const BASELINE_CALL_COUNT = 150

/* ==================================================================
 * 二、词法与语义工具（与具体规则无关，规则变化时这里不应被改动）
 * ================================================================== */

/**
 * 扫描一个带引号字符串字面量
 * @param {string} src 源码
 * @param {number} start 开引号位置
 * @param {string} quote 引号字符（' 或 "）
 * @returns {{end: number, value: string}} 结束位置（闭引号后一格）与去转义后的内容
 */
function scanQuoted(src, start, quote) {
  let j = start + 1
  while (j < src.length) {
    const ch = src[j]
    if (ch === '\\') { j += 2; continue }
    if (ch === quote) { j++; break }
    j++
  }
  return { end: j, value: unescapeChars(src.slice(start + 1, j - 1)) }
}

/**
 * 扫描模板字面量（${...} 插值内的嵌套大括号做深度跟踪，
 * 否则 `a ${b ? '{' : '}'} c` 会提前截断）
 * @param {string} src 源码
 * @param {number} start 反引号位置
 * @returns {{end: number, value: string}} 结束位置与原始内容
 */
function scanTemplate(src, start) {
  let depth = 0
  let j = start + 1
  while (j < src.length) {
    const ch = src[j]
    if (ch === '\\') { j += 2; continue }
    if (depth === 0 && ch === '`') return { end: j + 1, value: src.slice(start + 1, j) }
    if (depth === 0 && ch === '$' && src[j + 1] === '{') { depth = 1; j += 2; continue }
    if (depth > 0) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
    }
    j++
  }
  return { end: src.length, value: src.slice(start + 1) }
}

/**
 * 处理常见转义序列（\n \t \r \0 与 \' \" \\ 等）
 * @param {string} raw 原始字符串内容
 * @returns {string} 去转义后的内容
 */
function unescapeChars(raw) {
  return raw.replace(/\\(.)/g, (m, ch) => {
    switch (ch) {
      case 'n': return '\n'
      case 't': return '\t'
      case 'r': return '\r'
      case '0': return '\0'
      default: return ch
    }
  })
}

/**
 * 把源码切成 token 序列（普通代码以 gap 隐含，只记录 comment/string/template）
 * @param {string} src 源码
 * @param {number} [from=0] 起始偏移
 * @param {number} [to=src.length] 结束偏移
 * @returns {Array<{type:'comment'|'string'|'template', start:number, end:number, value?:string}>}
 */
function tokenize(src, from = 0, to = src.length) {
  const tokens = []
  let i = from
  while (i < to) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2)
      const end = close === -1 ? to : close + 2
      tokens.push({ type: 'comment', start: i, end })
      i = end
    } else if (c === '/' && src[i + 1] === '/') {
      let end = src.indexOf('\n', i)
      if (end === -1 || end > to) end = to
      tokens.push({ type: 'comment', start: i, end })
      i = end
    } else if (c === "'" || c === '"') {
      const { end, value } = scanQuoted(src, i, c)
      tokens.push({ type: 'string', start: i, end, value })
      i = end
    } else if (c === '`') {
      const { end, value } = scanTemplate(src, i)
      tokens.push({ type: 'template', start: i, end: Math.min(end, to), value })
      i = end
    } else {
      i++
    }
  }
  return tokens
}

/**
 * 构造"注释与字符串整体替换为空格"的掩码视图：
 * 括号配对/参数切分必须在此视图上做 —— 字符串里的 , ( ) 才不会被误当成代码结构
 * @param {string} src 源码
 * @param {Array} tokens tokenize 结果
 * @returns {string} 与 src 等长的掩码视图
 */
function buildMasked(src, tokens) {
  const out = src.split('')
  for (const t of tokens) {
    for (let k = t.start; k < t.end; k++) out[k] = ' '
  }
  return out.join('')
}

/**
 * 构造"仅注释替换为空格"的掩码视图（字符串保留）：
 * R3 要连"经变量传入的类型名字符串"一起抓，所以字符串必须可见；注释提及不算使用
 * @param {string} src 源码
 * @param {Array} tokens tokenize 结果
 * @returns {string} 与 src 等长的掩码视图
 */
function buildNoComments(src, tokens) {
  const out = src.split('')
  for (const t of tokens) {
    if (t.type === 'comment') {
      for (let k = t.start; k < t.end; k++) out[k] = ' '
    }
  }
  return out.join('')
}

/**
 * 在掩码视图上寻找与 openIdx 配对的闭括号（字符串/注释已是空格，天然被跳过）
 * @param {string} masked 掩码视图
 * @param {number} openIdx 开括号位置
 * @returns {number} 闭括号位置，找不到返回 -1
 */
function findMatching(masked, openIdx) {
  const openCh = masked[openIdx]
  const closeCh = openCh === '(' ? ')' : openCh === '[' ? ']' : '}'
  let depth = 0
  for (let k = openIdx; k < masked.length; k++) {
    const ch = masked[k]
    if (ch === openCh) depth++
    else if (ch === closeCh) {
      depth--
      if (depth === 0) return k
    }
  }
  return -1
}

/**
 * 在 [from, to) 区间按"顶层逗号"切分（深度以掩码视图计）
 * @param {string} src 原始源码
 * @param {string} masked 掩码视图
 * @param {number} from 起始（含）
 * @param {number} to 结束（不含）
 * @returns {Array<{start:number, end:number, text:string}>} 区间列表
 */
function splitTopLevel(src, masked, from, to) {
  const ranges = []
  let depth = 0
  let argStart = from
  for (let k = from; k < to; k++) {
    const ch = masked[k]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 0) {
      ranges.push({ start: argStart, end: k })
      argStart = k + 1
    }
  }
  ranges.push({ start: argStart, end: to })
  return ranges.map((r) => ({ start: r.start, end: r.end, text: src.slice(r.start, r.end) }))
}

/**
 * 计算某个绝对偏移所在的行号（从 1 起）
 * @param {string} src 源码
 * @param {number} pos 偏移
 * @returns {number} 行号
 */
function lineOf(src, pos) {
  let line = 1
  for (let k = 0; k < pos && k < src.length; k++) {
    if (src[k] === '\n') line++
  }
  return line
}

/**
 * 把一个参数表达式分类：纯字符串 / 函数 / 其它。
 * "函数"单独成类的原因：函数体内的字符串是普通 JS（直接执行、不经 JC），
 * 规则上必须与"会被 JC 求值的字符串"区别对待，否则真函数写法没法通过守卫。
 * @param {string} text 参数原文
 * @returns {{kind:'empty'|'string'|'function'|'complex', value?:string, tokens:Array}}
 */
function classifyArg(text) {
  const tokens = tokenize(text).filter((t) => t.type !== 'comment')
  if (tokens.length === 0) return { kind: 'empty', tokens }
  if (tokens.length === 1 && tokens[0].type === 'string') {
    return { kind: 'string', value: tokens[0].value, tokens }
  }
  if (tokens.length === 1 && tokens[0].type === 'template') {
    // 无插值的模板等价于字符串；带 ${...} 的运行期才确定内容，只能按动态值处理
    return /\$\{/.test(tokens[0].value)
      ? { kind: 'complex', value: tokens[0].value, tokens }
      : { kind: 'string', value: tokens[0].value, tokens }
  }
  const trimmed = text.trim()
  if (/^function\b/.test(trimmed) || /^(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(trimmed)) {
    return { kind: 'function', tokens }
  }
  return { kind: 'complex', tokens }
}

/**
 * 找出参数中"位于函数体之外"的字符串/模板 token。
 * 函数体内的字符串是普通 JS 代码（直接执行、不经 JC），必须豁免——
 * 否则 curve 的真函数写法（可能返回字符串拼接）会被误杀。
 * @param {string} text 参数原文
 * @param {Array} tokens tokenize 结果
 * @returns {Array<{type:string, start:number, value:string}>} 需要审查的字符串 token
 */
function stringsOutsideFunctions(text, tokens) {
  const masked = buildMasked(text, tokens)
  const spans = []
  const fnRe = /function\b/g
  let m
  while ((m = fnRe.exec(masked)) !== null) {
    const parenOpen = masked.indexOf('(', m.index + m[0].length)
    if (parenOpen === -1) continue
    const parenClose = findMatching(masked, parenOpen)
    if (parenClose === -1) continue
    let braceOpen = -1
    for (let k = parenClose + 1; k < masked.length; k++) {
      if (masked[k] === '{') { braceOpen = k; break }
      if (!/\s/.test(masked[k])) break // 函数名/箭头等，非函数体声明
    }
    if (braceOpen === -1) continue
    const braceClose = findMatching(masked, braceOpen)
    if (braceClose === -1) continue
    spans.push([braceOpen, braceClose])
  }
  return tokens.filter(
    (t) =>
      (t.type === 'string' || t.type === 'template') &&
      !spans.some(([s, e]) => t.start >= s && t.end <= e + 1)
  )
}

/**
 * 有专属检查的元素类型注册表（数据化挂载点：新增专属规则类型时在此加一行，不动扫描器）
 * 函数声明提升使其可安全引用第三节定义的检查函数
 */
const TYPE_SPECIFIC_CHECKS = new Map([['text', [checkTextElement]]])

/* ==================================================================
 * 三、检查函数（只消费第一节数据表；新增类型不改这里）
 * ================================================================== */

/**
 * R1 —— 表达式型元素的 parents 检查。
 * 因果：字符串 parent 会被 Type.createFunction / board.jc.snippet 包装 →
 * jessiecode defineFunction 的 eval（:670）→ 生产 CSP 拦截 → 曲线/图形丢失。
 * @param {{label:string, type:string, parentEntries:Array}} ctx
 * @returns {Array<{rule:string, message:string}>}
 */
function checkExpressionParents(ctx) {
  const violations = []
  for (const entry of ctx.parentEntries) {
    const cls = classifyArg(entry.text)
    if (cls.kind === 'string') {
      violations.push({
        rule: 'R1',
        message: `${ctx.label}：'${ctx.type}' 的 parents 含字符串字面量 ${JSON.stringify(cls.value.slice(0, 60))} —— 会经 jc.snippet → eval，请改为真函数`
      })
      continue
    }
    if (cls.kind === 'function') continue // 真函数不经 JC，安全
    const suspects = stringsOutsideFunctions(entry.text, cls.tokens)
    if (suspects.length > 0) {
      const first = suspects[0]
      violations.push({
        rule: 'R1',
        message: `${ctx.label}：'${ctx.type}' 的 parents（数组/表达式内部）含字符串 ${JSON.stringify(String(first.value).slice(0, 60))} —— 会经 jc.snippet → eval，请改为真函数`
      })
    }
  }
  return violations
}

/**
 * R2 —— text 专属检查，全部条件取自 TEXT_RULES 数据表（本函数不含任何硬编码条件）。
 *
 * text 放行条件：content 不含 <value> 且未启用 useasciimathml。
 * 根因：valueTagToJessieCode()（text.js:885-891）对任何输入都返回数组，
 * 数组分支必然命中 → 跳过 JessieCode snippet → 不触发 eval。
 * 若有人把该函数改成返回字符串，含 <value> 的标签会静默引入 eval（被 CSP 拦 → 白屏）。
 *
 * @param {{label:string, type:string, args:Array, parentEntries:Array, src:string, masked:string}} ctx
 * @returns {Array<{rule:string, message:string}>}
 */
function checkTextElement(ctx) {
  const { label, args, parentEntries, src } = ctx
  const violations = []

  // 坐标位禁字符串：坐标字符串同样会被 JC 求值，与 content 是两条独立的进 eval 通道
  for (let ci = 0; ci < Math.min(TEXT_RULES.coordinateSlots, parentEntries.length); ci++) {
    const cls = classifyArg(parentEntries[ci].text)
    if (cls.kind === 'string') {
      violations.push({
        rule: 'R2',
        message: `${label}：text 的坐标位 parents[${ci}] 是字符串字面量 ${JSON.stringify(cls.value.slice(0, 40))} —— 坐标字符串同样经 JC 求值`
      })
    } else if (cls.kind !== 'function') {
      const suspects = stringsOutsideFunctions(parentEntries[ci].text, cls.tokens)
      if (suspects.length > 0) {
        violations.push({
          rule: 'R2',
          message: `${label}：text 的坐标位 parents[${ci}] 内含字符串 —— 坐标字符串同样经 JC 求值`
        })
      }
    }
  }

  // content 放行条件（动态值默认拒绝：静态无法证明它运行期不会变成会进 eval 的字符串）
  if (parentEntries.length > TEXT_RULES.contentSlot) {
    const content = classifyArg(parentEntries[TEXT_RULES.contentSlot].text)
    if (content.kind === 'string') {
      if (TEXT_RULES.bannedContentPattern.test(content.value)) {
        violations.push({
          rule: 'R2',
          message: `${label}：text 的 content 含 <value> 标签 —— 会走 valueTagToJessieCode() 表达式分支 → snippet → eval`
        })
      }
    } else if (content.kind !== 'function') {
      violations.push({
        rule: 'R2',
        message: `${label}：text 的 content 是动态值（非字符串字面量/函数），静态无法证明安全 —— 请改为字符串字面量或函数`
      })
    }
  }

  // 隐性开关检查：bannedVisProps 一旦 truthy，text.js:270 岔路把纯字符串改道 :348 的 snippet
  if (args.length >= 3) {
    const attrsText = src.slice(args[2].start, args[2].end)
    const attrsMasked = buildMasked(attrsText, tokenize(attrsText))
    for (const vp of TEXT_RULES.bannedVisProps) {
      const re = new RegExp(`${vp.name}\\s*:\\s*([^,}\\n\\r]+)`, 'g')
      let um
      while ((um = re.exec(attrsMasked)) !== null) {
        const value = um[1].trim()
        if (!vp.falsyLiterals.has(value)) {
          violations.push({
            rule: 'R2',
            message: `${label}：text 的 attrs 启用了 ${vp.name}: ${value} —— 会把字符串 content 改道 jc.snippet → eval`
          })
        }
      }
    }
  }
  return violations
}

/**
 * 元素类型 → 检查函数清单：表达式型查 EXPR_ELEMENT_TYPES，专属规则查 TYPE_SPECIFIC_CHECKS。
 * 本函数只做查表组装，不含任何类型名/条件值。
 * @param {string} type 已通过 R0 门槛的元素类型
 * @returns {Array<(ctx: object) => Array<{rule:string, message:string}>>}
 */
function getChecksFor(type) {
  const checks = []
  if (EXPR_ELEMENT_TYPES.has(type)) checks.push(checkExpressionParents)
  const specific = TYPE_SPECIFIC_CHECKS.get(type)
  if (specific) checks.push(...specific)
  return checks
}

/* ==================================================================
 * 四、扫描器（流程控制，不含任何规则条件）
 * ================================================================== */

/**
 * 解析单份画板源码（纯函数，供守卫自检复用）
 * @param {string} fileName 板文件名（仅用于违规消息中的定位展示）
 * @param {string} src 源码
 * @returns {{file:string, src:string, calls:number, violations:Array<{rule:string, message:string}>, bannedPatternCounts:Object<string,number>}}
 */
function analyzeSource(fileName, src) {
  const tokens = tokenize(src)
  const masked = buildMasked(src, tokens)
  const violations = []
  let calls = 0

  // 禁用模式按"仅注释剔除"视图计数：代码直写、或经变量传入类型名字符串都算使用
  const noComments = buildNoComments(src, tokens)
  const bannedPatternCounts = {}
  for (const bp of BANNED_SOURCE_PATTERNS) {
    bannedPatternCounts[bp.name] = (noComments.match(new RegExp(bp.name, 'g')) || []).length
  }

  const createRe = /\.\s*create\s*\(/g
  let m
  while ((m = createRe.exec(masked)) !== null) {
    const openIdx = m.index + m[0].length - 1
    const closeIdx = findMatching(masked, openIdx)
    if (closeIdx === -1) {
      violations.push({
        rule: 'R0',
        message: `第 ${lineOf(src, m.index)} 行：create( 括号不配对，无法解析 —— 请人工检查`
      })
      continue
    }
    calls++
    const args = splitTopLevel(src, masked, openIdx + 1, closeIdx)
    const ctxBase = { label: `${fileName}:${lineOf(src, m.index)}`, src, masked }

    if (args.length < 2) {
      violations.push({ rule: 'R0', message: `${ctxBase.label}：create 缺少 parents 参数` })
      continue
    }

    // R0 门槛：类型必须是字符串字面量 —— 动态类型无法静态判定，放行等于放弃检查
    const typeArg = classifyArg(args[0].text)
    if (typeArg.kind !== 'string') {
      violations.push({
        rule: 'R0',
        message: `${ctxBase.label}：元素类型不是字符串字面量（动态类型无法静态判定安全性）`
      })
      continue
    }
    const type = typeArg.value
    if (!SAFE_ELEMENT_TYPES.has(type)) {
      const message = EXPR_ELEMENT_TYPES.has(type)
        ? `${ctxBase.label}：元素类型 '${type}' 已被禁用 —— 其字符串 parents 会经 JessieCode → eval（见 #10），请改用 curve + 真函数`
        : `${ctxBase.label}：未知元素类型 '${type}'（默认拒绝）。` +
          `请人工复核其字符串 parent 是否会经 JessieCode 求值：` +
          `不会 → 加入 SAFE_ELEMENT_TYPES；会 → 同时加入 EXPR_ELEMENT_TYPES`
      violations.push({ rule: 'R0', message })
      continue
    }

    // parents 必须是数组字面量。注意：不能假设 args[1].end - 1 就是 ']'（可能带尾随
    // 空格/注释），必须先定位 '[' 再用掩码视图配对 —— 否则整个数组会被当成单一参数，
    // text 的 content 会被误判成坐标位（守卫开发期真实踩过的坑）
    const parentsArg = args[1]
    const pOpenRel = parentsArg.text.indexOf('[')
    if (pOpenRel === -1) {
      violations.push({
        rule: 'R0',
        message: `${ctxBase.label}：'${type}' 的 parents 不是数组字面量（动态 parents 无法静态判定）`
      })
      continue
    }
    const pOpenAbs = parentsArg.start + pOpenRel
    const pCloseAbs = findMatching(masked, pOpenAbs)
    if (pCloseAbs === -1) {
      violations.push({ rule: 'R0', message: `${ctxBase.label}：'${type}' 的 parents 数组括号不配对` })
      continue
    }

    const ctx = {
      ...ctxBase,
      type,
      args,
      parentEntries: splitTopLevel(src, masked, pOpenAbs + 1, pCloseAbs)
    }
    for (const check of getChecksFor(type)) {
      violations.push(...check(ctx))
    }
  }

  return { file: fileName, src, calls, violations, bannedPatternCounts }
}

/**
 * 读取并解析一个真实板文件
 * @param {string} fileName 板文件名
 * @returns {ReturnType<typeof analyzeSource>} 解析结果
 */
function parseBoardFile(fileName) {
  return analyzeSource(fileName, readFileSync(join(BOARD_DIR, fileName), 'utf8'))
}

/* ==================================================================
 * 五、测试：真实 20 板全量 + 自检 fixture
 * ================================================================== */

const boardFiles = readdirSync(BOARD_DIR)
  .filter((name) => name.endsWith('.js'))
  .sort()
const parsed = boardFiles.map(parseBoardFile)
const totalCalls = parsed.reduce((sum, p) => sum + p.calls, 0)

function formatViolations(rule) {
  const all = parsed.flatMap((p) => p.violations.filter((v) => v.rule === rule).map((v) => v.message))
  return all.length > 0 ? `\n${all.map((msg) => `  ✗ ${msg}`).join('\n')}` : ''
}

describe('jsxgraph eval 守卫（#20）—— src/geometry/boards/*.js 静态扫描', () => {
  it('扫描器健康检查：画板文件数量达到基准，且每个文件都被扫描到 create 调用（防"扫到空气"）', () => {
    expect(
      boardFiles.length,
      `画板文件数 ${boardFiles.length} ≠ 基准 ${BASELINE_FILE_COUNT}。` +
        `若画板确有增删，请同步更新 BASELINE_FILE_COUNT 并人工复核守卫覆盖面`
    ).toBe(BASELINE_FILE_COUNT)
    expect(
      totalCalls,
      `create 调用总数 ${totalCalls} 低于基准 ${BASELINE_CALL_COUNT}，扫描器可能失灵（扫到空气）`
    ).toBeGreaterThanOrEqual(BASELINE_CALL_COUNT)
    for (const p of parsed) {
      expect(p.calls, `${p.file} 中未发现任何 create 调用，扫描器可能未覆盖该文件`).toBeGreaterThan(0)
    }
  })

  it('R0：元素类型必须是字符串字面量，且属于已复核类型清单（新类型默认拒绝）', () => {
    expect(formatViolations('R0'), 'R0 违规见下').toBe('')
  })

  it('R1：表达式型元素（curve/line/circle/ellipse/hyperbola 等）的 parents 禁止字符串字面量', () => {
    expect(formatViolations('R1'), 'R1 违规见下').toBe('')
  })

  it('R2：text 的 content 须为字符串（无 <value>、未启用 useasciimathml）或函数；坐标位禁止字符串', () => {
    expect(formatViolations('R2'), 'R2 违规见下').toBe('')
  })

  it('R3：全目录禁止 functiongraph（#10 修复防回退）', () => {
    const offenders = parsed.filter((p) => p.bannedPatternCounts.functiongraph > 0)
    const detail = offenders
      .map((p) => `  ✗ ${p.file}：出现 ${p.bannedPatternCounts.functiongraph} 次 functiongraph`)
      .join('\n')
    expect(detail, 'functiongraph 的字符串 parent 会经 jc.snippet → eval，已被 #10 修复淘汰；请改用 curve + 真函数').toBe('')
  })
})

describe('守卫自检：喂入已知违规/安全样本，验证扫描器既不漏报也不误报', () => {
  /** 逐条断言某份源码触发了指定规则（并返回全部违规供追加断言） */
  function expectRule(src, rule, count = 1) {
    const result = analyzeSource('fixture.js', src)
    const hits = result.violations.filter((v) => v.rule === rule)
    expect(hits.length, `期望触发 ${rule} ×${count}，实际：\n${result.violations.map((v) => `  ${v.rule}: ${v.message}`).join('\n') || '  （无任何违规）'}`).toBe(count)
    return result
  }

  it('R1：curve 的字符串 parent 被拦截（单行写法）', () => {
    expectRule(`board.create('curve', ['sin(x)'], {});`, 'R1')
  })

  it('R1：curve 的字符串 parent 被拦截（多行 + 嵌套数组 + 函数体内字符串豁免）', () => {
    const result = expectRule(
      [
        'board.create("curve", [',
        '  function(t) { return t; },        // 函数体内的字符串是普通 JS，应豁免',
        '  function(t) { return t * t; },',
        '  ["0", "1"],                        // 数组内的字符串应被拦截',
        '  0, 1',
        '], {strokeColor: "#f00"});'
      ].join('\n'),
      'R1'
    )
    expect(result.violations.some((v) => v.message.includes('"0"')), '应精确指认数组内的字符串 "0"').toBe(true)
    expect(result.violations.some((v) => v.message.includes('函数体')), '不得误报函数体内的字符串').toBe(false)
  })

  it('R1：line / circle 的字符串 parent 同样被拦截（它们也走 Type.createFunction）', () => {
    expectRule(`board.create('line', ['A.x', 1]);`, 'R1')
    expectRule(`board.create('circle', [C, '3'], {});`, 'R1')
  })

  it('R1：curve 的真函数 parents 不误报（当前 20 板的真实写法）', () => {
    const result = analyzeSource(
      'fixture.js',
      [
        'board.create("curve", [',
        '  function(t){ return t; },',
        '  function(t){ return Math.pow(a.Value(), t); },',
        '  -6, 6',
        '], {strokeColor: colors.primary, strokeWidth:2});'
      ].join('\n')
    )
    expect(result.violations, JSON.stringify(result.violations)).toEqual([])
  })

  it('R2：text 含 <value> 被拦截；启用 useasciimathml 被拦截；动态 content 默认拒绝', () => {
    expectRule(`board.create('text', [1, 2, 'a<value>x</value>'], {});`, 'R2')
    expectRule(`board.create('text', [1, 2, 'ok'], {useasciimathml: true});`, 'R2')
    expectRule(`board.create('text', [1, 2, 'ok'], {useasciimathml: 1});`, 'R2')
    expectRule(`board.create('text', [1, 2, someVariable], {});`, 'R2')
    expectRule(
      ['board.create("text", [', '  1,', '  2,', '  "x<value>y</value>"', '], {});'].join('\n'),
      'R2'
    )
    // 显式写 falsy 值不应误报（放行条件表里 falsyLiterals 的回归保护）
    const safe = analyzeSource('fixture.js', `board.create('text', [1, 2, 'ok'], {useasciimathml: false});`)
    expect(safe.violations, JSON.stringify(safe.violations)).toEqual([])
  })

  it('R2：text 的合法中文标签不误报（含全角括号与逗号），坐标位字符串被拦截', () => {
    const ok = analyzeSource('fixture.js', `board.create('text', [2, -0.8, '底面（三角形）'], {fontSize:13, color: colors.muted});`)
    expect(ok.violations, JSON.stringify(ok.violations)).toEqual([])
    expectRule(`board.create('text', ['A.x', 2, '标签'], {});`, 'R2')
  })

  it('R0：未知元素类型默认拒绝；动态类型默认拒绝', () => {
    expectRule(`board.create('rose', [3], {});`, 'R0')
    expectRule(`board.create(typeVariable, [1, 2], {});`, 'R0')
  })

  it('R3：functiongraph 出现即被拦截（含经变量传入类型名的形态）', () => {
    // 直接写类型名：R0（已禁用类型）拦截 + R3 文件级计数
    const direct = analyzeSource('fixture.js', `board.create('functiongraph', ['x'], {});`)
    expect(direct.bannedPatternCounts.functiongraph, '文件级 functiongraph 计数').toBeGreaterThan(0)
    expect(
      direct.violations.length,
      `至少触发一条违规，实际：\n${direct.violations.map((v) => `  ${v.rule}: ${v.message}`).join('\n') || '  （无）'}`
    ).toBeGreaterThan(0)
    expect(direct.violations.some((v) => v.message.includes('已被禁用')), '对已禁用类型应给出明确话术').toBe(true)
    // 经变量传入类型名：类型动态 → R0 拒绝；字符串字面量 'functiongraph' 仍在 → R3 计数
    const viaVar = analyzeSource('fixture.js', `const t = 'functiongraph';\nboard.create(t, [1], {});`)
    expect(viaVar.bannedPatternCounts.functiongraph, '经字符串变量传入类型名也必须被 R3 计数').toBeGreaterThan(0)
    expect(viaVar.violations.some((v) => v.rule === 'R0'), '动态类型必须被 R0 拒绝').toBe(true)
  })

  it('扫描器对账：真实 20 板的解析结果与守卫断言同源（防"守卫与扫描器脱节"）', () => {
    // parsed 由 parseBoardFile（读真实文件）产出，analyzeSource 是其纯函数内核；
    // 两者对同一文件必须给出一致的调用数，否则守卫与扫描器已脱节
    for (const p of parsed) {
      const again = analyzeSource(p.file, p.src)
      expect(again.calls, `${p.file} 两次解析调用数不一致`).toBe(p.calls)
    }
  })
})
