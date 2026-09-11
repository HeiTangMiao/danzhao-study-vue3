#!/usr/bin/env node
/**
 * 元信息去重迁移脚本（阶段 1B）
 *
 * 背景：内容页的元信息（id / unitNum / subject / title / subtitle）曾在每个内容文件里
 *      手写一份，又在 site.js 里各写一份。阶段 1A 已把 site.js 定为唯一真相源，
 *      内容文件里的那份从此是死数据 —— 不但冗余，而且会继续漂移（实测 19/139 页曾不一致）。
 *      本脚本把这份死数据从内容文件中剥离。
 *
 * 用法：
 *   node scripts/migrate-content-meta.mjs           # 干跑，只打印计划（默认，不写盘）
 *   node scripts/migrate-content-meta.mjs --write   # 实际写入
 *
 * 安全默认：不加 --write 一律不落盘。本脚本会改写 139 个内容文件，
 *          让「看一眼再动手」成为默认路径，而不是要记住加 --dry。
 *
 * 安全性设计（三道闸门，任一不过就不写）：
 *   1. 区间约束：只在「export default { 行」到「首个 blocks: 行」之间动手。
 *      这道约束是必须的 —— blocks 内部有大量区块级 title（例题标题、分组标题），
 *      不做区间约束的正则会连它们一起删掉。
 *   2. 白名单约束：区间内出现的顶层键必须在 STRIP_KEYS 里；遇到意料之外的键直接报错拒绝迁移，
 *      而不是「凡键皆删」。
 *   3. 等价性验证：把改后的内容写到临时文件并真实 import，与改前的 blocks 做逐字比对。
 *      只有 blocks 完全一致、且导出对象恰好只剩 blocks 一个键，才允许改写该文件。
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { CONTENT_DIR, collectFiles, importFresh, relPathOf, buildMetaIndex } from './lib/load-content.mjs'
// 剥离清单与校验器共用同一条定义（见 src/content/pageMeta.js），避免两处各写一份再漂移
import { PAGE_META_KEYS } from '../src/content/pageMeta.js'

/** 允许从内容文件中剥离的顶层键 */
const STRIP_KEYS = new Set(PAGE_META_KEYS)

/** 用于漂移核对、能与 site.js 逐字段比对的键（icon 只属于站点配置，无对应推导值） */
const DRIFT_KEYS = PAGE_META_KEYS.filter((k) => k !== 'icon')

/** 导出语句行 */
const EXPORT_LINE = /^export default\s*\{/
/** 首个 blocks 行（引号键与无引号键两种风格都存在） */
const BLOCKS_LINE = /^\s*(?:"|')?blocks(?:"|')?\s*:/
/** 区间内任意顶层键行 */
const ANY_KEY_LINE = /^\s*(?:"|')?([A-Za-z_$][\w$]*)(?:"|')?\s*:/

const args = process.argv.slice(2)
const SHOULD_WRITE = args.includes('--write')

/** 取一行里的顶层键名；不是键行则返回 null */
function keyOf(line) {
  const m = line.match(ANY_KEY_LINE)
  return m ? m[1] : null
}

/**
 * 计算单个文件的迁移结果（纯函数，不落盘）
 * @returns {{status:'clean'|'ok'|'error', next?:string, stripped?:string[], error?:string, exportIdx?:number, blocksIdx?:number}}
 */
function planFile(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)

  const exportIdx = lines.findIndex((l) => EXPORT_LINE.test(l))
  if (exportIdx < 0) return { status: 'error', error: '找不到 `export default {` 行' }

  const blocksIdx = lines.findIndex((l, i) => i > exportIdx && BLOCKS_LINE.test(l))
  if (blocksIdx < 0) return { status: 'error', error: '找不到 `blocks:` 行' }

  // 区间：导出行之后、blocks 行之前，应为顶层元信息键
  const stripped = []
  const dropIdx = new Set()
  for (let i = exportIdx + 1; i < blocksIdx; i++) {
    const line = lines[i]
    if (!line.trim()) continue // 空行不参与
    const key = keyOf(line)
    if (!key) {
      return { status: 'error', error: `区间内第 ${i + 1} 行不是顶层键行：${JSON.stringify(line.slice(0, 60))}` }
    }
    if (!STRIP_KEYS.has(key)) {
      return { status: 'error', error: `区间内出现非元信息键 \`${key}\`（第 ${i + 1} 行），拒绝迁移` }
    }
    stripped.push(key)
    dropIdx.add(i)
  }

  if (stripped.length === 0) return { status: 'clean', stripped: [], exportIdx, blocksIdx }

  const next = lines.filter((_, i) => !dropIdx.has(i)).join(eol)
  return { status: 'ok', next, stripped, exportIdx, blocksIdx }
}

/**
 * 等价性验证：改前改后都真实 import，比对 blocks 与导出对象的键集合
 * 内容文件实测零 import（纯数据），因此复制到临时目录也不会破坏相对引用
 */
async function verifyEquivalent(file, nextText, tmpRoot) {
  const oldMod = await importFresh(file)
  const tmpFile = join(tmpRoot, createHash('sha1').update(file).digest('hex') + '.mjs')
  writeFileSync(tmpFile, nextText, 'utf8')
  const newMod = await importFresh(tmpFile)

  const oldBlocks = JSON.stringify(oldMod.default?.blocks)
  const newBlocks = JSON.stringify(newMod.default?.blocks)
  if (oldBlocks !== newBlocks) return 'blocks 内容发生了变化'

  const keys = Object.keys(newMod.default || {})
  if (keys.length !== 1 || keys[0] !== 'blocks') {
    return `迁移后导出对象的键为 [${keys.join(', ')}]，应恰好只有 blocks`
  }
  return null
}

async function main() {
  const files = collectFiles(CONTENT_DIR)
  const metaIndex = await buildMetaIndex()
  const tmpRoot = mkdtempSync(join(tmpdir(), 'danzhao-meta-'))

  const changed = []
  const clean = []
  const failed = []
  const drifts = []

  try {
    for (const file of files) {
      const rel = relPathOf(file)
      const text = readFileSync(file, 'utf8')
      const plan = planFile(text)

      if (plan.status === 'error') {
        failed.push({ rel, error: plan.error })
        continue
      }
      if (plan.status === 'clean') {
        clean.push(rel)
        continue
      }

      const mismatch = await verifyEquivalent(file, plan.next, tmpRoot)
      if (mismatch) {
        failed.push({ rel, error: `等价性验证未通过：${mismatch}` })
        continue
      }

      // 漂移核对：被剥离的值与 site.js 推导值不一致的页面（阶段 1A 曾实测 19 页）
      const meta = metaIndex.get(rel)
      if (meta) {
        const oldMod = await importFresh(file)
        const raw = oldMod.default || {}
        for (const key of DRIFT_KEYS) {
          if (raw[key] !== undefined && raw[key] !== meta[key]) {
            drifts.push({ rel, key, old: raw[key], now: meta[key] })
          }
        }
      }

      changed.push({ rel, stripped: plan.stripped })

      if (SHOULD_WRITE) writeFileSync(file, plan.next, 'utf8')
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true })
  }

  // ---- 报告 ----
  const mode = SHOULD_WRITE ? '实跑' : '干跑'
  console.log(`\n内容元信息去重迁移（${mode}）`)
  console.log(`内容文件总数：${files.length}\n`)

  for (const { rel, stripped } of changed) {
    console.log(`  剥离 ${stripped.length} 行  ${rel}`)
  }

  if (clean.length) {
    console.log(`\n  已合规（跳过）：${clean.length} 个`)
  }

  if (failed.length) {
    console.log(`\n❌ 有 ${failed.length} 个文件未能迁移：`)
    for (const { rel, error } of failed) console.log(`  ${rel}\n      ${error}`)
  }

  if (drifts.length) {
    console.log(`\n⚠️  元信息漂移核对：${drifts.length} 处（内容文件里的值已被 site.js 取代，属预期）`)
    for (const d of drifts) {
      console.log(`  ${d.rel}\n      ${d.key}：文件写的是「${d.old}」→ site.js 是「${d.now}」`)
    }
  } else {
    console.log('\n✅ 漂移核对：内容文件里的元信息与 site.js 完全一致')
  }

  console.log(`\n汇总：待迁移 ${changed.length} · 已合规 ${clean.length} · 失败 ${failed.length}`)

  if (failed.length) {
    console.log('\n存在失败项，未做任何写入。')
    process.exitCode = 1
    return
  }

  if (!SHOULD_WRITE && changed.length) {
    console.log('\n以上为干跑结果，未写入磁盘。确认无误后加 --write 实跑。')
  } else if (SHOULD_WRITE && changed.length) {
    console.log(`\n✅ 已写入 ${changed.length} 个文件。请接着运行 npm run validate:content 复核。`)
  } else {
    console.log('\n✅ 无需迁移：所有内容文件的元信息都已收敛到 site.js。')
  }
}

main().catch((err) => {
  console.error('迁移脚本异常终止：', err)
  process.exitCode = 1
})
