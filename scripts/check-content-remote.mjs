/**
 * 远程内容产物自检（批 S4 · S4-4b）
 *
 * 职责：对**已落盘的产物**（`public/content-remote/`）做清单骨架 + 分片齐备性自检，
 *      作为 CI 的**具名步骤**跑（`npm run check:content-remote`）。
 *
 * ⚠️ 为什么要一个独立步骤（而不是只靠构建期自检）：
 *   `build:content-remote` 里已有 `assertManifestInvariants`，但那只覆盖「跑脚本的那条路」。
 *   CI 的「生产构建」走的是 `npm run build` → prebuild 链；若哪天链子被改坏
 *   （prebuild 少挂一环 / 产物被后续步骤覆盖），**构建仍可能通过而产物缺失**——
 *   正是 2026-10-15 那类「看起来没报错、线上却拿不到」的失效。
 *   本脚本直接读**盘上的产物**断言，把「产物确实存在且形态正确」变成 CI 门禁。
 *
 * 硬口径：
 *   - 产物缺失 / 清单非法 JSON / 不变量不满足 / 清单声明的分片在盘上缺失 → **退出码 1**（不静默）。
 *   - 不变量口径**复用** `build-content-remote.mjs` 的 `assertManifestInvariants`（H7：一处实现）。
 *   - 只读本地产物，**不联网**（「与线上版本对比」属人工 SOP，见 docs/content-release-runbook.md）。
 *
 * 用法：npm run check:content-remote
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from './lib/load-content.mjs'
import { REMOTE_DIR, MANIFEST_PATH } from '../src/content/contentManifest.js'
import { assertManifestInvariants } from './build-content-remote.mjs'

const PUBLIC_DIR = join(ROOT, 'public')
const REMOTE_ABS = join(PUBLIC_DIR, REMOTE_DIR)
const MANIFEST_ABS = join(PUBLIC_DIR, MANIFEST_PATH)

/**
 * 递归数分片 JSON（排除清单自身）
 * @param {string} dir 目录绝对路径
 * @returns {string[]} 相对 content-remote/ 的路径列表（已排序）
 */
export function listShardFiles(dir) {
  if (!existsSync(dir)) return []
  const walk = (d, prefix) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    return e.isDirectory() ? walk(join(d, e.name), rel) : [rel]
  })
  return walk(dir, '')
    .filter((rel) => rel.endsWith('.json') && rel !== MANIFEST_PATH.slice(REMOTE_DIR.length + 1))
    .sort()
}

/** 失败即退出（统一口径：把明细逐条打出来，便于 CI 日志定位） */
function fail(headline, details = []) {
  console.error(`✗ [check:content-remote] ${headline}`)
  for (const line of details) console.error('  - ' + line)
  process.exit(1)
}

export function check() {
  if (!existsSync(MANIFEST_ABS)) {
    fail(`产物缺失：public/${MANIFEST_PATH}（先跑 npm run build:content-remote）`)
  }

  let manifest = null
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_ABS, 'utf-8'))
  } catch (e) {
    fail(`清单不是合法 JSON：${e.message}`)
  }

  const shards = listShardFiles(REMOTE_ABS)
  try {
    assertManifestInvariants(manifest, { shardCount: shards.length })
  } catch (e) {
    fail(e.message, e.errors || [])
  }

  // 清单声明的每个分片必须**真在盘上**（清单自洽但文件缺失 = 客户端 404 → 静默回退内置）
  const missing = Object.entries(manifest.units)
    .filter(([, u]) => !existsSync(join(REMOTE_ABS, u.path)))
    .map(([k, u]) => `${k} → ${u.path}`)
  if (missing.length) fail('清单声明了但盘上缺失的分片：', missing)

  const pageTotal = Object.values(manifest.units).reduce((a, u) => a + u.count, 0)
  console.log(
    `[check:content-remote] ✓ schemaVersion=${manifest.schemaVersion} ` +
      `contentVersion=${manifest.contentVersion} 单元=${Object.keys(manifest.units).length} ` +
      `分片文件=${shards.length} 页=${pageTotal} contentHash=${String(manifest.contentHash).slice(0, 15)}…`
  )
  return { manifest, shardCount: shards.length, pageTotal }
}

// 直接执行时才自检（被测试 import 时只暴露函数；照 build-content-remote.mjs 的 argv 守卫纪律）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  check()
}
