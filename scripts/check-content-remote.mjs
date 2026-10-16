/**
 * 远程内容产物自检（批 S4 · S4-4b；批 S5 · S5-5 扩展到 search / practice 子段）
 *
 * 职责：对**已落盘的产物**（`public/`）做清单骨架 + 分片齐备性自检，
 *      作为 CI 的**具名步骤**跑（`npm run check:content-remote`）。
 *
 * ⚠️ 为什么要一个独立步骤（而不是只靠构建期自检）：
 *   `build-content-remote` 里已有 `assertManifestInvariants`，但那只覆盖「跑脚本的那条路」。
 *   CI 的「生产构建」走的是 `npm run build` → prebuild 链；若哪天链子被改坏
 *   （prebuild 少挂一环 / 产物被后续步骤覆盖），**构建仍可能通过而产物缺失**——
 *   正是 2026-10-15 那类「看起来没报错、线上却拿不到」的失效。
 *   本脚本直接读**盘上的产物**断言，把「产物确实存在且形态正确」变成 CI 门禁。
 *
 * S5-5 起覆盖四份产物：`content-remote/`（清单 + 单元分片）、`search-meta.json` +
 * `search-body/*`、`practice-bank/*` —— 把 S4-4a 的「发布闭环」从 1 份扩到 4 份。
 *
 * 硬口径：
 *   - 产物缺失 / 清单非法 JSON / 不变量不满足 / 声明分片在盘上缺失 / 子段计数不符
 *     → **退出码 1**（不静默）。
 *   - 不变量口径**复用** `build-content-remote.mjs` 的 `assertManifestInvariants`（H7：一处实现）。
 *   - 只读本地产物，**不联网**（「与线上版本对比」属人工 SOP，见 content-release-runbook.md）。
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
const MANIFEST_BASENAME = MANIFEST_PATH.split('/').pop()

/**
 * 递归列目录下的分片 JSON（排除清单自身）
 * @param {string} dir 目录绝对路径
 * @returns {string[]} 相对该目录的路径列表（已排序）
 */
export function listShardFiles(dir) {
  if (!existsSync(dir)) return []
  const walk = (d, prefix) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    return e.isDirectory() ? walk(join(d, e.name), rel) : [rel]
  })
  return walk(dir, '')
    .filter((rel) => rel.endsWith('.json') && rel !== MANIFEST_BASENAME)
    .sort()
}

/**
 * 按产物形态数条目数：数组 → length；对象 → 键数
 * @param {string} absPath 文件绝对路径
 * @returns {number|null} 读不出 / 形态不认 → null
 */
function countEntries(absPath) {
  try {
    const parsed = JSON.parse(readFileSync(absPath, 'utf-8'))
    if (Array.isArray(parsed)) return parsed.length
    if (parsed && typeof parsed === 'object') return Object.keys(parsed).length
    return null
  } catch {
    return null
  }
}

/**
 * 执行自检
 * @param {string} [publicDir] public/ 目录（测试可注入 fixture 目录）
 * @returns {{manifest: object, shardCount: number, pageTotal: number,
 *   subSections: Record<string, number>}} 汇总（供日志与测试断言）
 * @throws {Error} 任一检查不满足；`err.errors` 为逐条明细
 */
export function check(publicDir = PUBLIC_DIR) {
  const errors = []
  const manifestAbs = join(publicDir, MANIFEST_PATH)

  if (!existsSync(manifestAbs)) {
    const err = new Error(`产物缺失：public/${MANIFEST_PATH}（先跑 npm run build:content-remote）`)
    err.errors = [err.message]
    throw err
  }

  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestAbs, 'utf-8'))
  } catch (e) {
    const err = new Error(`清单不是合法 JSON：${e.message}`)
    err.errors = [err.message]
    throw err
  }

  // ① 清单不变量（复用 build-content-remote 的同一函数；预留键在 S5-1 起允许「null 或合法子段」）
  const shards = listShardFiles(join(publicDir, REMOTE_DIR))
  try {
    assertManifestInvariants(manifest, { shardCount: shards.length })
  } catch (e) {
    errors.push(...(e.errors || [e.message]))
  }

  // ② 清单声明的每个单元分片必须**真在盘上**（自洽但缺失 = 客户端 404 → 静默回退内置）
  for (const [unitKey, unit] of Object.entries(manifest.units || {})) {
    if (!existsSync(join(publicDir, REMOTE_DIR, unit.path))) {
      errors.push(`清单声明的分片缺失：${unitKey} → ${unit.path}`)
    }
  }

  // ③ S5-5：子段声明的分片必须真在盘上，且**计数与文件内容一致**
  //    （count 是构建期从产物实读后登记进 manifest 的；对不上 = 构建与登记不同源）
  const subSections = {}
  for (const key of ['search', 'practice']) {
    const sub = manifest[key]
    // ⚠️ 不再 `continue` 跳过（D-S5-1）：子段为 null 曾被整段跳过，导致「4 份产物缺 3 份」时
    //    自检 exit 0 全绿放行。子段缺失本身就是必须拦下的缺陷。
    if (!sub) {
      errors.push(`manifest.${key} 子段缺失（S5 起不允许 null：产物必须与清单同批产出）`)
      continue
    }
    let declared = 0
    for (const [path, entry] of Object.entries(sub)) {
      declared += 1
      const abs = join(publicDir, path)
      if (!existsSync(abs)) {
        errors.push(`子段 ${key} 声明的分片缺失：${path}`)
        continue
      }
      const actual = countEntries(abs)
      if (entry.count != null && actual !== null && actual !== entry.count) {
        errors.push(`子段 ${key} 分片 ${path} 计数不符：清单 ${entry.count} / 实际 ${actual}`)
      }
    }
    subSections[key] = declared
  }

  if (errors.length) {
    const err = new Error(`产物自检失败 ${errors.length} 处：${errors[0]}`)
    err.errors = errors
    throw err
  }

  const pageTotal = Object.values(manifest.units || {}).reduce((a, u) => a + (u.count || 0), 0)
  return { manifest, shardCount: shards.length, pageTotal, subSections }
}

// 直接执行时才自检（被测试 import 时只暴露函数；照 build-content-remote.mjs 的 argv 守卫纪律）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { manifest, shardCount, pageTotal, subSections } = check()
    const sub = Object.entries(subSections)
      .map(([k, n]) => `${k} ${n} 项`)
      .join(' / ')
    console.log(
      `[check:content-remote] ✓ schemaVersion=${manifest.schemaVersion} ` +
        `contentVersion=${manifest.contentVersion} 单元=${Object.keys(manifest.units).length} ` +
        `分片文件=${shardCount} 页=${pageTotal}` +
        (sub ? ` 子段指针=${sub}` : '') +
        ` contentHash=${String(manifest.contentHash).slice(0, 15)}…`
    )
  } catch (e) {
    console.error(`✗ [check:content-remote] ${e.message}`)
    for (const line of e.errors || []) console.error('  - ' + line)
    process.exit(1)
  }
}
