/**
 * 内容文件风格归一化（阶段 6）
 *
 * 背景：内容文件曾有两套写法 —— 手写风格（无引号键 + 块间空行）与
 *      `JSON.stringify(page, null, 2)` 产出的引号键风格。实测 145 个 .js 中
 *      有 62 个是后者（编辑器导出 / 早期脚本留下的）。风格定义见
 *      src/content/serializePage.js（浏览器与 Node 共用同一份）。
 *
 * 做法：只动**引号键**的文件；已经是手写风格的一律不碰（避免无谓 churn）。
 *  - 无行注释：整体按 serializePage 重排（文件头注释原样保留）
 *  - 带行注释：注释不在数据里，重排会丢，因此只做 `"key":` → `key:` 的去引号
 *  - 无论哪条路径，都先写临时文件 import 回来，与改写前的数据做深度比对，
 *    不一致就跳过 —— 只允许格式变化，绝不允许数据变化
 *
 * 用法：
 *   node scripts/migrate-content-style.mjs          # 干跑（默认，不落盘）
 *   node scripts/migrate-content-style.mjs --write  # 落盘
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { CONTENT_DIR, collectFiles, importFresh, relPathOf } from './lib/load-content.mjs'
import { serializePage, extractHeader, stripKeyQuotes } from '../src/content/serializePage.js'

const WRITE = process.argv.includes('--write')

/** 顶层 blocks 键带引号 = 需要归一化的文件 */
const QUOTED_BLOCKS_RE = /^\s*"blocks"\s*:/m
/** 行首行注释：有它就不能整体重排 */
const LINE_COMMENT_RE = /^\s*\/\//m

/** 把序列化结果写进临时文件再 import 回来，用于数据比对（不落盘到内容目录） */
async function parseGenerated(source) {
  const dir = mkdtempSync(join(tmpdir(), 'content-style-'))
  const file = join(dir, 'page.mjs')
  writeFileSync(file, source, 'utf-8')
  try {
    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
    return mod.default
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const files = collectFiles(CONTENT_DIR).sort()
const changed = []
const problems = []
let rewritten = 0
let deQuoted = 0
let alreadyOk = 0

for (const file of files) {
  const rel = relPathOf(file)
  const src = readFileSync(file, 'utf-8')

  if (!QUOTED_BLOCKS_RE.test(src)) {
    alreadyOk++
    continue
  }

  const mod = await importFresh(file)
  const blocks = mod.default?.blocks
  if (!Array.isArray(blocks)) {
    problems.push(`${rel}：读不到 blocks 数组，已跳过`)
    continue
  }

  const withComments = LINE_COMMENT_RE.test(src)
  const next = withComments
    ? stripKeyQuotes(src)
    : serializePage(blocks, { header: extractHeader(src) })

  const roundTrip = await parseGenerated(next)
  if (JSON.stringify(roundTrip?.blocks) !== JSON.stringify(blocks)) {
    problems.push(`${rel}：改写前后数据不一致，已跳过`)
    continue
  }

  const before = src.split('\n').length
  const after = next.split('\n').length
  changed.push(`${rel}  ${before} → ${after} 行${withComments ? '（含行注释：只去引号）' : ''}`)
  if (withComments) deQuoted++
  else rewritten++
  if (WRITE) writeFileSync(file, next, 'utf-8')
}

console.log(`\n扫描 ${files.length} 个内容页文件`)
console.log(`需要归一化：${rewritten + deQuoted}（其中带行注释、仅去引号：${deQuoted}）`)
console.log(`已是手写风格（未改动）：${alreadyOk}`)
if (changed.length) {
  console.log('\n受影响文件：')
  for (const line of changed) console.log(`  · ${line}`)
}
if (problems.length) {
  console.error('\n⚠️ 以下文件被跳过：')
  for (const p of problems) console.error(`  ✗ ${p}`)
}

if (!WRITE) {
  console.log('\n（干跑模式，未落盘；确认无误后加 --write 生效）')
}
process.exit(problems.length ? 1 : 0)