/**
 * 构建期内容快照 / 清单生成脚本（批 S1 · 纯构建期，零运行时影响）
 *
 * 职责：
 *  - 遍历 src/content 全部内容页，产出远程内容快照：
 *      public/content-remote/manifest.json            清单（单元索引 + 全局指纹）
 *      public/content-remote/{学科}/{单元号}.json      每单元一个分片（页面 blocks 原样搬运）
 *  - 逐页算规范化 hash（sha256）；逐块复用 CI 同款校验器，校验不过 → **不落盘任何分片**
 *  - 产物是纯 JSON：运行期由 S2 的 fetch + JSON.parse 消费（本批**不**接 loadPage /
 *    IndexedDB / CSP，也不新增任何前端 import()/eval）
 * 用法：npm run build:content-remote（P-S05：独立手动脚本，不进 prebuild / build:index）
 *
 * 说明：文件遍历与「路径 → 元信息」索引来自 scripts/lib/load-content.mjs；
 *      区块校验来自 src/utils/validateBlock.js（与 CI 同一份，schema 参数注入）；
 *      文件路径与清单形状来自 src/content/contentManifest.js（两端共用，唯一真相源）。
 *
 * hash 口径（钉死，见派工单 §3）：
 *  - pageHash   = sha256(canonical({subject,unitNum,fileIndex,fileKey,op,blocks}))，不含 generatedAt
 *  - units[k]   = sha256(canonical(pages))，该分片整体指纹
 *  - contentHash= sha256(全页按 fileKey 升序后 'fileKey:pageHash' 逐行 join('\n'))，
 *                 不受分片顺序与 generatedAt 影响
 *  - canonical  = 递归键序归一后 JSON.stringify（零依赖）
 */
import { writeFileSync, mkdirSync, rmSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import {
  ROOT, CONTENT_DIR, collectFiles, collectBoardIds, buildMetaIndex, importFresh, relPathOf
} from './lib/load-content.mjs'
import { createBlockValidator } from '../src/utils/validateBlock.js'
import { pageFileKeyOf } from '../src/content/pageMeta.js'
import {
  SCHEMA_VERSION, CONTENT_VERSION, OPTIONAL_SECTIONS, SHARD_WARN_BYTES,
  MANIFEST_PATH, REMOTE_DIR, shardPath, unitKeyOf, OP, HASH_PREFIX
} from '../src/content/contentManifest.js'

const PUBLIC_DIR = join(ROOT, 'public')
const REMOTE_OUT_DIR = join(PUBLIC_DIR, REMOTE_DIR)
const MANIFEST_OUT = join(PUBLIC_DIR, MANIFEST_PATH)

/**
 * 区块语义校验器（与 CI 同一份实现）
 * schema 用 fs 读而非 import：本脚本跑在裸 Node 下，不走 Vite 的 JSON 导入
 * （照 scripts/validate-content.mjs:15/24/29）。
 */
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(SCHEMA, { knownBoardIds: new Set(collectBoardIds()) })

/**
 * 规范化序列化：对象键**升序**递归归一后 stringify；数组保序；undefined 值剔除。
 * 零依赖（P-S06 b）—— 客户端（S2）要能算出同一个 hash，键序差异必须被消除。
 * @param {unknown} value 任意可 JSON 化的值
 * @returns {string} 规范化的紧凑 JSON 文本
 */
export function canonicalJSON(value) {
  if (value === undefined) return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(value[k])}`).join(',')}}`
}

/** sha256 十六进制摘要 */
export function sha256hex(text) {
  return createHash('sha256').update(String(text), 'utf-8').digest('hex')
}

/** 带统一前缀的 hash（形如 `sha256:<hex64>`） */
export function hashOf(value) {
  return HASH_PREFIX + sha256hex(canonicalJSON(value))
}

/** 字节数（UTF-8 实际长度，中文不能用字符数估） */
const byteLen = (s) => Buffer.byteLength(String(s), 'utf-8')

/**
 * 采集内容快照（**纯函数、不落盘**，供测试直接断言形状）
 *
 * @param {{contentVersion?: number, generatedAt?: string, warnBytes?: number}} [options]
 *   注入项：contentVersion 覆盖清单版本号；generatedAt 固定时间戳（测试不该锚它浮动值）；
 *   warnBytes 覆盖分片体积告警阈值（测试注入小值触发告警）
 * @returns {Promise<{manifest: object, shards: Array<{path: string, unitKey: string, bytes: number,
 *   json: object}>, errors: string[]}>}
 * @throws {Error} 任一页 / 块校验失败 → 抛错（err.errors 为明细），调用方据此不落盘任何分片
 */
export async function collectSnapshot({
  contentVersion = CONTENT_VERSION,
  generatedAt = new Date().toISOString(),
  warnBytes = SHARD_WARN_BYTES
} = {}) {
  // 1) 「文件相对路径 → 元信息」索引（site.js 为唯一真相源，保证坐标有序且齐全）
  const metaByRel = await buildMetaIndex()
  const files = collectFiles(CONTENT_DIR)

  const errors = []
  /** unitKey → 页条目数组 */
  const byUnit = new Map()

  for (const file of files.sort()) {
    const rel = relPathOf(file)
    const meta = metaByRel.get(rel)
    // 未注册进 site.js：拿不到 fileIndex/fileKey 坐标，无法安全发布 → 视为硬错误
    if (!meta) {
      errors.push(`${rel}: 未注册进 site.js（无元信息坐标），拒绝发布`)
      continue
    }
    let blocks
    try {
      const mod = await importFresh(file)
      blocks = mod.default?.blocks
    } catch (e) {
      errors.push(`${rel}: 加载失败（${e.message}）`)
      continue
    }
    if (!Array.isArray(blocks)) {
      errors.push(`${rel}: 缺少 blocks 数组`)
      continue
    }
    // 2) 逐块校验（与 CI 同款）：任一错都不产出，避免把坏内容发布成远程快照
    blocks.forEach((b, i) => {
      for (const e of validateBlock(b)) errors.push(`${rel} 区块[${i}] ${e}`)
    })

    const fileKey = pageFileKeyOf(meta) // ⚠️ meta 里没有 fileKey，必须派生
    const base = {
      subject: meta.subject,
      unitNum: meta.unitNum, // 字符串，如 "01"
      fileIndex: meta.fileIndex, // 数字，坐标身份（H2：不得重排/位移）
      fileKey,
      op: OP.UPSERT // B1 恒 upsert；'append' 仅协议预留
    }
    const page = { ...base, blocks, hash: hashOf({ ...base, blocks }) }

    const uk = unitKeyOf(meta)
    if (!byUnit.has(uk)) byUnit.set(uk, [])
    byUnit.get(uk).push(page)
  }

  // 3) 校验失败 → 抛错，绝不产出（H6：宁可不发布，也不发布坏内容）
  if (errors.length) {
    const err = new Error(`内容校验失败 ${errors.length} 处，不产出任何分片`)
    err.errors = errors
    throw err
  }

  // 4) 按单元聚合分片；单元内按 fileIndex 升序（坐标语义，稳定可复现）
  const allPages = []
  const shards = []
  const units = {}
  for (const uk of [...byUnit.keys()].sort()) {
    const pages = byUnit.get(uk)
      .slice()
      .sort((a, b) => a.fileIndex - b.fileIndex)
    allPages.push(...pages)

    const subject = pages[0].subject
    const unitNum = pages[0].unitNum
    const json = { schemaVersion: SCHEMA_VERSION, contentVersion, unitKey: uk, pages }
    const text = JSON.stringify(json)
    const bytes = byteLen(text)
    const path = shardPath(subject, unitNum)

    shards.push({ path, unitKey: uk, bytes, json })
    units[uk] = {
      hash: hashOf(pages),
      updatedAt: generatedAt,
      // ⚠️ 相对 content-remote/ 的路径：客户端拼 基址 + '/content-remote/' + path
      path: path.slice(REMOTE_DIR.length + 1),
      count: pages.length,
      version: contentVersion
    }

    // 5) 超限只告警、不截断：远程快照必须与内置同构，截断 = 静默丢尾部区块
    if (bytes > warnBytes) {
      console.warn(
        `[content-remote] ⚠️ 分片 ${uk}（${path}）体积 ${(bytes / 1024).toFixed(1)} KB，` +
          `超过告警阈值 ${(warnBytes / 1024).toFixed(1)} KB —— 仅告警，内容未截断`
      )
    }
  }

  // 6) 全局指纹：全页按 fileKey 升序 join → 不受分片顺序与 generatedAt 影响
  const contentHash = HASH_PREFIX + sha256hex(
    allPages
      .slice()
      .sort((a, b) => (a.fileKey < b.fileKey ? -1 : a.fileKey > b.fileKey ? 1 : 0))
      .map((p) => `${p.fileKey}:${p.hash}`)
      .join('\n')
  )

  // B1：sitePatch 恒为空结构（P-S04 a），键位一次到位；只算 hash 不产出任何 site 变更
  const sitePatch = { units: {}, fileMetaUpdates: [] }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    contentVersion,
    contentHash,
    generatedAt,
    sitePatchHash: hashOf(sitePatch),
    sitePatch,
    units
  }
  // S5+ 才填充的子段：留键位（协议一次到位），当前恒 null（P-S07 a）
  for (const key of OPTIONAL_SECTIONS) manifest[key] = null

  return { manifest, shards, errors: [] }
}

async function build() {
  const { manifest, shards } = await collectSnapshot()

  // 输出：先清掉整个目录，避免单元下线后旧分片残留在产物里（照 build-search-index.mjs:209-213）
  mkdirSync(PUBLIC_DIR, { recursive: true })
  rmSync(REMOTE_OUT_DIR, { recursive: true, force: true })
  mkdirSync(REMOTE_OUT_DIR, { recursive: true })

  writeFileSync(MANIFEST_OUT, JSON.stringify(manifest), 'utf-8')
  for (const shard of shards) {
    mkdirSync(join(PUBLIC_DIR, shard.path, '..'), { recursive: true })
    writeFileSync(join(PUBLIC_DIR, shard.path), JSON.stringify(shard.json), 'utf-8')
  }

  const manifestBytes = statSync(MANIFEST_OUT).size
  console.log(
    `[content-remote] 已生成 public/${MANIFEST_PATH}（${manifestBytes} B，` +
      `${Object.keys(manifest.units).length} 个单元）+ ${shards.length} 个单元分片` +
      `；页合计 ${Object.values(manifest.units).reduce((a, u) => a + u.count, 0)} 页，` +
      `contentHash ${manifest.contentHash.slice(0, 15)}…`
  )
  // 超限告警由 collectSnapshot 在采集期点名（构建期同样生效，阈值 SHARD_WARN_BYTES）
}

// 直接执行时构建；被测试 import 时只暴露 collectSnapshot（避免测试一 import 就往 public/ 里写）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    if (Array.isArray(e.errors)) {
      console.error(`[content-remote] 校验失败，未产出任何分片（${e.errors.length} 处）：`)
      for (const line of e.errors) console.error('  ✗ ' + line)
    } else {
      console.error('[content-remote] 生成失败:', e)
    }
    process.exit(1)
  })
}
