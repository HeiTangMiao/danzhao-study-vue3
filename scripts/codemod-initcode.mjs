/**
 * 一次性 codemod：把内容页里的 initCode 字符串迁移为真实画板模块
 *
 * 背景：diagram 区块原先在内容数据里带一段 initCode 字符串，运行期由
 *       GeometryBlock 用 new Function 编译执行。生产 CSP 的 script-src 'self'
 *       不含 'unsafe-eval'，因此桌面端必然抛 EvalError、几何图渲染不出来。
 *       改法（B1′）：把 20 段 initCode 落成 20 个真实 ES 模块
 *       src/geometry/boards/<boardId>.js，运行期按 boardId 惰性 import。
 *
 * 用法：
 *   node scripts/codemod-initcode.mjs            # 只扫描并打印解析结果（不写盘）
 *   node scripts/codemod-initcode.mjs --write    # 确认段数无误后才真正改写
 *
 * ⚠️ 迁移已完成（20 段全部落成模块）。重复运行会因闸门拦截而退出 1
 *    （内容页里已无 initCode → 解析出 0 段 ≠ 期望 20），属预期行为，不会误写。
 *    确认不再需要回滚后可直接删除本脚本。
 *
 * 安全闸门：
 *   - 解析出的段数必须等于 EXPECTED，否则直接退出（不写任何文件）
 *   - boardId 必须全局唯一、且是合法文件名标识符
 *   - 内容页里的 initCode 必须是「单行双引号字符串」，否则拒绝改写（避免正则误伤）
 *
 * 跑完即可删除本脚本。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { ROOT, CONTENT_DIR, collectFiles, relPathOf, importFresh } from './lib/load-content.mjs'

/** 画板模块输出目录 */
const BOARDS_DIR = join(ROOT, 'src', 'geometry', 'boards')
/** 期望迁移的 initCode 段数（审计值：14 个内容页 / 20 段） */
const EXPECTED = 20
/** 合法文件名标识符：kebab-case */
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const WRITE = process.argv.includes('--write')

/**
 * 递归收集 diagram 区块（需穿透 columns / group 嵌套）
 * @param {Array} blocks 区块数组
 * @param {string} path 当前所在的嵌套路径（用于报错定位）
 * @param {Array<object>} out 收集结果
 */
function collectDiagrams(blocks, path, out) {
  if (!Array.isArray(blocks)) return
  blocks.forEach((block, i) => {
    if (!block || typeof block !== 'object') return
    const here = `${path}[${i}]`
    if (block.type === 'diagram') {
      out.push({ block, path: here })
      return
    }
    // 容器型：columns.items 是「列数组的数组」，group.items 是区块数组
    if (Array.isArray(block.items)) {
      if (block.type === 'columns') {
        block.items.forEach((col, ci) => collectDiagrams(col, `${here}.columns[${ci}]`, out))
      } else {
        collectDiagrams(block.items, `${here}.items`, out)
      }
    }
  })
}

/**
 * 生成画板模块源码
 * @param {string} boardId 画板标识（即文件名）
 * @param {string} code initCode 原文（已解析为真实换行）
 * @param {string} sourceFile 来源内容页（进注释，方便回溯）
 * @returns {string} 模块源码
 */
function renderModule(boardId, code, sourceFile) {
  // 函数体统一缩进 2 空格（原 initCode 自带部分缩进，这里按行重排，语义不变）
  const body = code
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : '  ' + line))
    .join('\n')
  return (
    `/**\n` +
    ` * 几何画板：${boardId}\n` +
    ` *\n` +
    ` * 由 scripts/codemod-initcode.mjs 从内容页提取（来源：src/content/${sourceFile}）。\n` +
    ` * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，\n` +
    ` * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。\n` +
    ` *\n` +
    ` * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例\n` +
    ` * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板\n` +
    ` * @param {object} JXG jsxgraph 命名空间\n` +
    ` */\n` +
    `export default function setup(board, colors, JXG) {\n` +
    `${body}\n` +
    `}\n`
  )
}

/** 内容页里 initCode 那一行的形态：单行双引号字符串，行尾可有逗号 */
const INIT_CODE_LINE_RE = /^(\s*)initCode:\s*".*",?\s*$/

/**
 * 从内容页源码里删掉 initCode 字段
 * @param {string} source 文件原文
 * @returns {{ next: string, removed: number }} 改写后的源码与被删行数
 */
function stripInitCode(source) {
  const lines = source.split('\n')
  const kept = []
  let removed = 0
  for (const line of lines) {
    if (INIT_CODE_LINE_RE.test(line)) {
      removed++
      continue
    }
    kept.push(line)
  }
  // 删掉的是对象最后一个属性时，上一行会残留一个尾逗号，这里顺手去掉
  const next = kept.map((line, i) => {
    const trimmed = line.trimEnd()
    const isLastProp = trimmed.endsWith(',') && i + 1 < kept.length && /^\s*\},?\s*$/.test(kept[i + 1])
    return isLastProp ? trimmed.slice(0, -1) : line
  })
  return { next: next.join('\n'), removed }
}

// ============ 1. 扫描：从内容页提取全部 diagram 区块 ============
/** @type {Array<{boardId:string, code:string, file:string, rel:string, path:string}>} */
const entries = []
/** 记录每个内容页源码里实际的 initCode 行数，用于与解析结果对账 */
const initCodeLineCount = new Map()

const files = collectFiles(CONTENT_DIR)
for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const lineCount = raw.split('\n').filter((l) => INIT_CODE_LINE_RE.test(l)).length
  if (lineCount > 0) initCodeLineCount.set(file, lineCount)

  const mod = await importFresh(file)
  const page = mod.default
  if (!page || !Array.isArray(page.blocks)) continue
  const diagrams = []
  collectDiagrams(page.blocks, '', diagrams)
  for (const { block, path } of diagrams) {
    entries.push({
      boardId: block.boardId,
      code: block.initCode,
      file,
      rel: relPathOf(file),
      path
    })
  }
}

const diagramCount = entries.length
const withCode = entries.filter((e) => typeof e.code === 'string' && e.code.trim() !== '')
const ids = entries.map((e) => e.boardId)
const uniqueIds = new Set(ids)
const badIds = ids.filter((id) => typeof id !== 'string' || !ID_RE.test(id))
const srcLineTotal = [...initCodeLineCount.values()].reduce((a, b) => a + b, 0)

console.log('========== 扫描结果 ==========')
console.log(`内容页总数（collectFiles）      : ${files.length}`)
console.log(`含 initCode 的内容页            : ${initCodeLineCount.size}`)
console.log(`源码里 initCode 行数            : ${srcLineTotal}`)
console.log(`解析出的 diagram 区块           : ${diagramCount}`)
console.log(`其中带非空 initCode 的          : ${withCode.length}`)
console.log(`boardId 去重后                  : ${uniqueIds.size}`)
console.log(`非法 boardId（非 kebab-case）   : ${badIds.length ? badIds.join(', ') : '无'}`)
console.log('--------------------------------')
for (const e of entries) {
  console.log(`  ${String(e.boardId).padEnd(28)} ${String(e.code ? e.code.length : 0).padStart(5)} 字符  ${e.rel}${e.path}`)
}
console.log('===============================')

// ============ 2. 闸门：数量/唯一性/形态全部对上才允许写盘 ============
const problems = []
if (diagramCount !== EXPECTED) problems.push(`diagram 区块数 ${diagramCount} ≠ 期望 ${EXPECTED}`)
if (withCode.length !== EXPECTED) problems.push(`带 initCode 的区块 ${withCode.length} ≠ 期望 ${EXPECTED}`)
if (uniqueIds.size !== withCode.length) problems.push('boardId 不唯一，无法用作文件名')
if (srcLineTotal !== withCode.length) problems.push(`源码 initCode 行数 ${srcLineTotal} ≠ 解析出的 ${withCode.length}（存在多行字符串，正则改写不安全）`)
if (badIds.length) problems.push(`存在非法 boardId: ${badIds.join(', ')}`)

if (problems.length) {
  console.error('❌ 闸门未通过，未写入任何文件：')
  problems.forEach((p) => console.error('   - ' + p))
  process.exit(1)
}

if (!WRITE) {
  console.log('✅ 闸门通过。以上为 --dry-run，未写盘；确认无误后加 --write 执行。')
  process.exit(0)
}

// ============ 3. 写出 20 个画板模块 ============
mkdirSync(BOARDS_DIR, { recursive: true })
for (const e of withCode) {
  const target = join(BOARDS_DIR, `${e.boardId}.js`)
  writeFileSync(target, renderModule(e.boardId, e.code, e.rel), 'utf8')
}
console.log(`✅ 已写出 ${withCode.length} 个画板模块 → src/geometry/boards/`)

// ============ 4. 改写内容页：删掉 initCode 字段 ============
let rewritten = 0
let removedTotal = 0
for (const [file, expectRemoved] of initCodeLineCount) {
  const raw = readFileSync(file, 'utf8')
  const { next, removed } = stripInitCode(raw)
  if (removed !== expectRemoved) {
    console.error(`❌ ${relPathOf(file)}: 预期删 ${expectRemoved} 行，实际删 ${removed} 行，已中止（此前写出的模块保留）`)
    process.exit(1)
  }
  if (removed > 0) {
    writeFileSync(file, next, 'utf8')
    rewritten++
    removedTotal += removed
  }
}
console.log(`✅ 已改写 ${rewritten} 个内容页，共删除 ${removedTotal} 个 initCode 字段`)

// ============ 5. 收尾提示 ============
console.log('\n下一步：')
console.log('  1) node scripts/codemod-initcode.mjs   （复跑一次，应显示 diagram 20 段、但 initCode 已清空）')
console.log('  2) npm run validate:content && npm test && npm run lint')
console.log('  3) 确认无误后可删除本脚本：rm scripts/codemod-initcode.mjs')
console.log(`  （boards 目录：${BOARDS_DIR}，共 ${basename(BOARDS_DIR)}/${withCode.length} 个模块）`)
