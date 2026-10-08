/**
 * 内容推广一次性改造：把页面开篇的「知识结构导图 + 学习目标」包进 hero 封套
 *
 * 背景：
 *   「思维导图 + 学习目标」是学习页的标准开篇。math/01/01、chinese/01/03 等试点页
 *   已把它们用布局原语 hero（as:"hero", props:{align:"start", tone:"accent"}）包起来，
 *   获得统一的首屏强调底色与对齐。本次改造把这一写法推广到全站所有符合条件的页面。
 *
 * 改造范围（由本脚本按规则重新枚举，不盲信固定名单）：
 *   blocks 顶层前两个区块恰为 {mindmap, objectives}（顺序不限）且相邻，
 *   且开头尚无 layout 封套（含 layout 的试点页自动跳过）。
 *   —— 开头不是 mindmap/objectives 的页面（复习测验 warning 开头、易错专项 errorfocus
 *   开头等）封套语义不适用，一律跳过。
 *
 * 改造语义：**只包裹，不重写**。
 *   - 不改任何区块内容（emoji / 符号 / 文本一个字符都不动）
 *   - 不增删区块、不改其余部分
 *   - 两个区块之间的空行与注释（如「// ---------- 学习目标 ----------」）原样保留在 children 内
 *   - 包裹后两个区块整体缩进 +4，与 math/01/01 的实际写法严格对齐
 *
 * 实现：用「括号配对 + 字符串/注释感知」的扫描器精确定位前两个区块的起止，
 *       做行级的最小文本替换（插入封套 + 缩进），而非重新序列化 AST。
 *
 * 用法：
 *   node scripts/migrate-hero-wrap.mjs                 # 仅枚举 + 输出将改动清单与 diff 预览（不写盘）
 *   node scripts/migrate-hero-wrap.mjs --dry-run       # 同上，显式写法
 *   node scripts/migrate-hero-wrap.mjs --write         # 真正改写
 *   node scripts/migrate-hero-wrap.mjs --only "math/02-不等式/01,chinese/02-现代文阅读/01"  # 限定子串命中
 *
 * 幂等：已含 layout 封套的页面自动识别并跳过，重复运行不会二次包裹。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { CONTENT_DIR, collectFiles, relPathOf, importFresh } from './lib/load-content.mjs'

const WRITE = process.argv.includes('--write')
// --only a,b,c：按相对路径子串限定范围（用于分步试点）
const onlyArgIdx = process.argv.indexOf('--only')
const ONLY = onlyArgIdx !== -1 && process.argv[onlyArgIdx + 1]
  ? process.argv[onlyArgIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
  : null

// ============================================================
// 一、字符串 / 注释 / 模板字符串感知的括号扫描
// ============================================================

/** 跳过行注释，返回换行符位置（不含注释体） */
function skipLineComment(src, i) {
  let j = i + 2
  while (j < src.length && src[j] !== '\n') j++
  return j
}

/** 跳过块注释，返回结束符之后的位置 */
function skipBlockComment(src, i) {
  let j = i + 2
  while (j < src.length && !(src[j] === '*' && src[j + 1] === '/')) j++
  return j + 2
}

/** 跳过单/双引号字符串，返回闭合引号之后的位置（处理反斜杠转义） */
function skipString(src, i, quote) {
  let j = i + 1
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') { j += 2; continue }
    if (c === quote) return j + 1
    if (c === '\n') return j // 未闭合（不该发生）—— 防御性退出
    j++
  }
  return j
}

/**
 * 跳过模板字符串（含 ${...} 内的代码嵌套），返回反引号之后的位置
 * @param {string} src 源码
 * @param {number} i 反引号位置
 */
function skipTemplate(src, i) {
  let j = i + 1
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') { j += 2; continue }
    if (c === '`') return j + 1
    if (c === '$' && src[j + 1] === '{') {
      // 进入插值表达式：按代码扫描到匹配的 }
      j += 2
      let depth = 1
      while (j < src.length && depth > 0) {
        const d = src[j]
        if (d === '\\') { j += 2; continue }
        if (d === '"' || d === "'") { j = skipString(src, j, d); continue }
        if (d === '`') { j = skipTemplate(src, j); continue }
        if (d === '/' && src[j + 1] === '/') { j = skipLineComment(src, j); continue }
        if (d === '/' && src[j + 1] === '*') { j = skipBlockComment(src, j); continue }
        if (d === '{') depth++
        else if (d === '}') depth--
        j++
      }
      continue
    }
    j++
  }
  return j
}

/**
 * 定位 `blocks:` 后面的数组开括号 '[' 的下标
 * @param {string} src 文件源码
 * @returns {number} '[' 的下标；未找到返回 -1
 */
function findBlocksArrayOpen(src) {
  const m = /(^|\n)\s*blocks\s*:\s*\[/.exec(src)
  if (!m) return -1
  return src.indexOf('[', m.index)
}

/**
 * 把数组内容按顶层逗号切分为若干元素，返回每个元素的 [start, end) 字符区间。
 * start 指向元素第一个有效字符（对象为 '{'）；end 指向元素最后一个有效字符之后。
 * 该函数对字符串 / 注释 / 模板字符串 / 各类括号嵌套均安全。
 * @param {string} src 源码
 * @param {number} openIdx 数组 '[' 下标
 * @returns {Array<{start:number,end:number}>} 元素区间（顺序即数组顺序）
 */
function splitArrayElements(src, openIdx) {
  const elements = []
  let i = openIdx + 1
  let depth = 0
  let elemStart = -1
  let lastEnd = -1

  const flush = () => {
    if (elemStart !== -1) elements.push({ start: elemStart, end: lastEnd })
    elemStart = -1
    lastEnd = -1
  }

  while (i < src.length) {
    const ch = src[i]
    // 注释
    if (ch === '/' && src[i + 1] === '/') { i = skipLineComment(src, i); continue }
    if (ch === '/' && src[i + 1] === '*') { i = skipBlockComment(src, i); continue }
    // 字符串 / 模板字符串
    if (ch === '"' || ch === "'") {
      if (elemStart === -1) elemStart = i
      i = skipString(src, i, ch)
      lastEnd = i
      continue
    }
    if (ch === '`') {
      if (elemStart === -1) elemStart = i
      i = skipTemplate(src, i)
      lastEnd = i
      continue
    }
    // 括号
    if (ch === '[' || ch === '{' || ch === '(') {
      if (depth === 0 && elemStart === -1) elemStart = i
      depth++
      lastEnd = i + 1
      i++
      continue
    }
    if (ch === ']' || ch === '}' || ch === ')') {
      depth--
      if (depth < 0) { // 收尾：数组的 ']'
        flush()
        break
      }
      lastEnd = i + 1
      i++
      continue
    }
    // 顶层逗号：元素分隔
    if (ch === ',' && depth === 0) {
      flush()
      i++
      continue
    }
    // 其它有效字符
    if (!/\s/.test(ch) && elemStart === -1) elemStart = i
    if (!/\s/.test(ch)) lastEnd = i + 1
    i++
  }
  return elements
}

/** 第 idx 个字符所属的行号（0 基） */
function lineOf(src, idx) {
  let n = 0
  for (let k = 0; k < idx; k++) if (src[k] === '\n') n++
  return n
}

// ============================================================
// 二、包裹变换
// ============================================================

/** 判断页面是否为「已封套」或「不适用」——返回 {eligible, reason} */
function classify(page) {
  const blocks = page.blocks
  if (!Array.isArray(blocks) || blocks.length < 2) return { eligible: false, reason: '区块不足两个' }
  const [a, b] = blocks
  if (a.type === 'layout') return { eligible: false, reason: '开头已是 layout（试点页）' }
  const types = new Set([a.type, b.type])
  if (!(types.has('mindmap') && types.has('objectives'))) {
    return { eligible: false, reason: `开头非 {mindmap,objectives}（实际 ${a.type}+${b.type}）` }
  }
  return { eligible: true, reason: '' }
}

/**
 * 生成包裹后的源码
 * @param {string} src 原始源码
 * @returns {{next:string, changed:boolean, reason:string}}
 */
function wrapSource(src) {
  const openIdx = findBlocksArrayOpen(src)
  if (openIdx === -1) return { next: src, changed: false, reason: '未定位 blocks 数组' }
  const els = splitArrayElements(src, openIdx)
  if (els.length < 2) return { next: src, changed: false, reason: '顶层元素不足两个' }

  const e0 = els[0]
  const e1 = els[1]
  const lines = src.split('\n')

  let firstLine = lineOf(src, e0.start)
  const lastLine = lineOf(src, e1.end - 1)

  // 把紧贴第一个区块上方的行注释一并纳入封套（math/01/01 的「// ---- 知识结构导图 ----」
  // 就在 children 内）。注释行以 // 开头，不会误吞 blocks: [ 这类真实代码行。
  while (firstLine - 1 >= 0 && /^\s*\/\//.test(lines[firstLine - 1])) firstLine--

  const baseIndent = (/^[ \t]*/.exec(lines[firstLine]) || [''])[0]
  const body = lines.slice(firstLine, lastLine + 1)

  // 原第一个区块非末元素（elements≥3）→ 封套后仍需尾随逗号
  const hasFollowing = els.length >= 3

  const indented = body.map((line) => (line.trim() === '' ? '' : '    ' + line))
  const wrapped = [
    `${baseIndent}{`,
    `${baseIndent}  type: "layout",`,
    `${baseIndent}  as: "hero",`,
    `${baseIndent}  props: { align: "start", tone: "accent" },`,
    `${baseIndent}  children: [`,
    ...indented,
    `${baseIndent}  ]`,
    `${baseIndent}}${hasFollowing ? ',' : ''}`
  ]

  const out = [...lines.slice(0, firstLine), ...wrapped, ...lines.slice(lastLine + 1)]
  return { next: out.join('\n'), changed: true, reason: '' }
}

// ============================================================
// 三、diff 预览（行级 LCS）
// ============================================================

/** 行级最长公共子序列 diff，返回逐行标注 [{type:' '|'-'|'+', text}] */
function lineDiff(a, b) {
  const n = a.length
  const m = b.length
  // 为控制内存，仅在片段上做 DP（文件不大，直接全量）
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: ' ', text: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: '-', text: a[i] }); i++ }
    else { out.push({ type: '+', text: b[j] }); j++ }
  }
  while (i < n) { out.push({ type: '-', text: a[i] }); i++ }
  while (j < m) { out.push({ type: '+', text: b[j] }); j++ }
  return out
}

/** 只输出有变更的上下文片段（保留前后 3 行） */
function renderDiffPreview(rel, oldText, newText) {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const d = lineDiff(a, b)
  // 找到变更窗口
  const changedIdx = d.map((x, k) => (x.type !== ' ' ? k : -1)).filter((k) => k >= 0)
  if (!changedIdx.length) return ''
  const lo = Math.max(0, changedIdx[0] - 3)
  const hi = Math.min(d.length - 1, changedIdx[changedIdx.length - 1] + 3)
  const lines = [`--- ${rel}`, `+++ ${rel}（封套后）`]
  for (let k = lo; k <= hi; k++) lines.push(`${d[k].type} ${d[k].text}`)
  return lines.join('\n')
}

// ============================================================
// 四、主流程
// ============================================================

const files = collectFiles(CONTENT_DIR).sort()
const eligible = []
const skipped = []

for (const file of files) {
  const rel = relPathOf(file)
  const page = (await importFresh(file)).default
  const { eligible: ok, reason } = classify(page)
  const src = readFileSync(file, 'utf8')

  if (!ok) { skipped.push({ rel, reason }); continue }
  if (ONLY && !ONLY.some((s) => rel.includes(s))) { skipped.push({ rel, reason: '被 --only 过滤' }); continue }

  const { next, changed } = wrapSource(src)
  if (!changed) { skipped.push({ rel, reason: '包裹未产生变更' }); continue }
  eligible.push({ file, rel, oldText: src, newText: next })
}

console.log('========== 封套推广：枚举结果 ==========')
console.log(`内容页总数            : ${files.length}`)
console.log(`符合封套条件          : ${eligible.length}`)
console.log(`跳过                  : ${skipped.length}`)
console.log('----------------------------------------')
for (const e of eligible) console.log(`  待改  ${e.rel}`)
console.log('----------------------------------------')
// 跳过原因汇总
const reasonTally = new Map()
for (const s of skipped) reasonTally.set(s.reason, (reasonTally.get(s.reason) || 0) + 1)
for (const [reason, count] of reasonTally) console.log(`  跳过×${String(count).padStart(3)}  ${reason}`)
console.log('========================================')

if (!WRITE) {
  console.log('\n---------- diff 预览 ----------')
  for (const e of eligible) {
    const preview = renderDiffPreview(e.rel, e.oldText, e.newText)
    if (preview) console.log('\n' + preview)
  }
  console.log('\n（--dry-run：未写盘；确认无误后加 --write 执行）')
  process.exit(0)
}

let written = 0
for (const e of eligible) {
  writeFileSync(e.file, e.newText, 'utf8')
  written++
}
console.log(`\n✅ 已改写 ${written} 个文件`)
