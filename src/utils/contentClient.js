/**
 * 远程内容客户端 loader（批 S2 · 内容双轨的「拉 + 存」层）
 *
 * 职责（只这两件，别的都归别处）：
 *   1. 启动时 / 后台**静默**拉远程清单 → 版本闸门 → 增量拉变更分片 → 校验 → 写 IndexedDB
 *   2. 进页时按坐标**读缓存**给 loadPage 用（离线优先；读不到就返回 null，由 loadPage 回落内置）
 *
 * ⚠️ 红线与纪律：
 *   - **H1**：全程 `fetch + JSON.parse`（纯 JSON 资产）。本文件**不得**出现任何 `import()`
 *     或 eval —— `tests/csp-guard.test.js` L6 会扫 src/**。
 *   - **红线 2（轨道 A 零回归）**：本模块的每个对外入口都**不抛**（内部消化异常并返回
 *     null / {updated:false}），调用方无需 try/catch 就能保证「远程拿不到 → 走内置」。
 *   - **红线 6（离线优先）**：失败一律静默跳过，不重试（P-S14 a）；再试的时机是
 *     **下次启动且 contentVersion 已前进**（同版本内闸门为 false，不会再拉 —— 见 doRefresh ④）；
 *     内容缓存**不进 sync 的 LWW 同步**（派生数据，见 studyDb 的注释）。
 *   - **H7（单一真相源）**：路径 / 键 / op / 协议常量一律取自 `contentManifest.js`，
 *     裁决一律走 `mergeContent.js`，本文件不复制、不自造口径。
 *
 * 缓存粒度：**unitKey 整片**（P-S12 a），与 manifest.units 分片 1:1。
 */
import { API_BASE, IS_ABSOLUTE_API } from '@/sync/apiBase'
import {
  REMOTE_DIR, MANIFEST_PATH, SCHEMA_VERSION, OP, unitKeyOf, pageKeyOf
} from '@/content/contentManifest'
import { isNewer, isUsablePage, verifyHash, isWellFormedHash } from '@/content/mergeContent'
import { fetchJson, DEFAULT_TIMEOUT_MS } from '@/utils/fetchJson'
import { useStudyDbStore } from '@/stores/studyDb'
import { useContentStore } from '@/stores/content'

/** 清单文件名（`content-remote/manifest.json` → 相对内容根的 `manifest.json`） */
export const MANIFEST_FILE = MANIFEST_PATH.slice(REMOTE_DIR.length + 1)

/** content_meta 里存「整份清单摘要」的记录键（当前只有一条） */
export const CONTENT_META_KEY = 'manifest'

/** 进程内二级缓存：unitKey -> 分片条目（避免每次进页都读一次 IndexedDB） */
const memoryCache = new Map()

/** 并发去重：刷新进行中时复用同一个 Promise（启动检查与手触发可能撞车） */
let inflight = null

/** 会话内是否已触发过后台刷新（P-S14 a：不重试；下次启动 + 版本前进时才自然再试） */
let backgroundStarted = false

/**
 * 远程内容根地址（P-S16，含 team-lead 的**强制修正**）
 *
 * - 相对模式（dev / Web 生产）：`./content-remote` —— 与 `practiceBankClient.js:19/:35`、
 *   `SearchPanel.vue:124/:153` 同款相对路径纪律；Web 生产同源走 CSP `'self'`。
 * - 绝对模式（Tauri）：**站点根** + `/content-remote`，即取 `new URL(API_BASE).origin`。
 *   ⚠️ 不能直接 `API_BASE + '/content-remote/'`：`.env.tauri` 注入的是
 *   `https://520305.top/api`，而 `/api` 在 nginx 是反代给 Fastify 的路由前缀，
 *   静态内容目录并不挂在它下面 → 会稳定拿到 **404**（不是网络错误，极难排查）。
 *   取 origin 后域名仍为 `https://520305.top`（已在 CSP `connect-src`）→ **无需改 CSP**。
 *
 * @returns {string} 内容根地址（不带尾斜杠；fetchJson 会补）
 */
export function contentRoot() {
  return contentRootFrom(API_BASE, IS_ABSOLUTE_API)
}

/**
 * 基址派生的**纯函数**内核（P-S16）—— 从 contentRoot() 里拆出来只为可测：
 * 绝对分支无法在 Node 单测里靠 import.meta.env 构造，把口径抽成函数即可直接注入断言。
 *
 * @param {string} apiBase API 基址（可能带 `/api` 之类的路径前缀）
 * @param {boolean} isAbsolute 是否为绝对地址模式（Tauri）
 * @returns {string} 内容根地址
 */
export function contentRootFrom(apiBase, isAbsolute) {
  if (!isAbsolute) return `./${REMOTE_DIR}`
  return `${originOf(apiBase)}/${REMOTE_DIR}`
}

/**
 * 取站点根（origin）—— 剥离 `/api` 之类的路径前缀，只保留协议 + 域名 + 端口
 * @param {string} apiBase API 基址
 * @returns {string} origin，形如 `https://520305.top`
 */
function originOf(apiBase) {
  try {
    return new URL(apiBase).origin
  } catch {
    // 兜底（IS_ABSOLUTE_API 已保证 http(s)，理论上走不到）：去掉最后一段路径
    return String(apiBase).replace(/\/[^/]*$/, '')
  }
}

/**
 * 清单形态校验（轻量，P-S17 a）
 * 协议版本不符 → **整份不消费**（宁可继续用内置，也不能按错误协议解析）
 * @param {unknown} m 解析后的清单对象
 * @returns {boolean}
 */
export function isValidManifest(m) {
  if (!m || typeof m !== 'object') return false
  if (m.schemaVersion !== SCHEMA_VERSION) return false
  if (!Number.isFinite(Number(m.contentVersion))) return false
  if (!m.units || typeof m.units !== 'object' || Array.isArray(m.units)) return false
  return true
}

/**
 * 把一个分片整理成可落缓存的条目（纯函数，便于单测直接注入 fixture）
 *
 * 逐页三重轻量校验（P-S17 a）：op 白名单 → 结构可用 → 哈希形态合法；
 * 任一不过 → **丢弃该页**（该坐标回退内置），不影响同分片其它页。
 *
 * @param {string} unitKey 单元键，形如 `math/01`
 * @param {object} unit 清单里的单元描述（{hash, version, path, updatedAt, count}）
 * @param {unknown} shard 分片 JSON
 * @returns {{key: string, version: number, hash: string, pageHashes: Record<string,string>,
 *   pages: Array<object>, manifestUpdatedAt: string|null}|null} 无可用页时返回 null
 */
export function buildShardEntry(unitKey, unit, shard) {
  if (!shard || typeof shard !== 'object') return null
  if (shard.unitKey !== unitKey) return null
  if (Number(shard.contentVersion) !== Number(unit?.version)) return null
  if (!Array.isArray(shard.pages)) return null

  const pages = []
  const pageHashes = {}
  for (const p of shard.pages) {
    // P-S19 a：B1 只认 UPSERT；'append' 等未知 op 一律**静默忽略** → 该坐标回落内置（B2 再补）
    if (!p || typeof p !== 'object' || p.op !== OP.UPSERT) continue
    if (!Number.isFinite(Number(p.fileIndex))) continue
    if (!isUsablePage(p)) continue
    if (!isWellFormedHash(p.hash)) continue
    pageHashes[pageKeyOf(p)] = p.hash
    pages.push(p)
  }
  if (pages.length === 0) return null

  return {
    key: unitKey,
    version: Number(unit.version),
    hash: unit.hash ?? null,
    pageHashes,
    pages,
    manifestUpdatedAt: unit.updatedAt ?? null
  }
}

/** 取 DB 访问器（pinia 未激活时抛，调用方已兜住） */
function dbStore() {
  return useStudyDbStore()
}

/**
 * 刷新远程内容（**闸门 + 增量 + 原子写**），任何失败都静默返回 `{updated:false}`
 *
 * 流程：
 *   ① 拉清单 → 形态校验
 *   ② **版本闸门**：`isNewer(manifest.contentVersion, 本地已见版本)` → 等值/更旧一律**不写**
 *   ③ **增量**：只拉「清单里的单元哈希 ≠ 缓存里记录」的分片（P-S12 a 整片粒度）
 *   ④ 逐片轻量校验 → 先写 **content_cache（body）**，全部成功后才写 **content_meta（提交点）**
 *   ⑤ 通知 `stores/content.js`（P-S13 a）
 *
 * @param {{timeout?: number, base?: string}} [options] timeout 毫秒；base 覆盖内容根（测试注入）
 * @returns {Promise<{updated: boolean, version: number|null, units: string[], reason: string}>}
 */
export async function refreshIfNewer({ timeout = DEFAULT_TIMEOUT_MS, base = contentRoot() } = {}) {
  if (inflight) return inflight
  inflight = doRefresh({ timeout, base }).finally(() => { inflight = null })
  return inflight
}

async function doRefresh({ timeout, base }) {
  try {
    const db = dbStore()
    const manifest = await fetchJson(base, MANIFEST_FILE, { timeout })
    if (!isValidManifest(manifest)) return { updated: false, version: null, units: [], reason: 'invalid-manifest' }

    const meta = await db.getContentMeta(CONTENT_META_KEY)
    // 版本闸门（红线 3）：旧的 / 等值的一律不写 —— 等值不重写可免一次无意义 IDB 写放大
    if (!isNewer(manifest.contentVersion, meta?.contentVersion ?? null)) {
      return { updated: false, version: meta?.contentVersion ?? null, units: [], reason: 'not-newer' }
    }

    const cachedUnits = (meta && meta.units) || {}
    const changedKeys = Object.keys(manifest.units)
      .filter((k) => !cachedUnits[k] || cachedUnits[k].hash !== manifest.units[k].hash)

    // ④ 逐片拉取 + 校验。**单片失败只跳过该片**（红线 6 静默）：
    //    失败片在 meta 里保留**旧哈希** → 待 `contentVersion` **前进**（下一版发布）时
    //    才会被判为「已变更」重新拉取；**同一版本内不会重试** —— 同版本 `isNewer` 为 false，
    //    压根不进刷新流程。这是 P-S14(a)「不重试」的预期行为，**不是缺陷**。
    //    若将来需要「同版本自愈」，需另存 `pendingUnits` 在闸门之外单独重试（本批不做）。
    const entries = []
    for (const unitKey of changedKeys) {
      const unit = manifest.units[unitKey]
      if (!unit || typeof unit.path !== 'string') continue
      try {
        const shard = await fetchJson(base, unit.path, { timeout })
        const entry = buildShardEntry(unitKey, unit, shard)
        if (entry) entries.push(entry)
      } catch { /* 静默：该片留待 contentVersion 前进后再拉（同版本内不重试，见上方 ④） */ }
    }

    // body 先落：此刻 meta 尚未前进 → 中途断电/异常也不会让闸门误以为已更新
    for (const entry of entries) {
      await db.saveContentCache(entry)
      memoryCache.set(entry.key, entry)
    }
    // 提交点：meta 一写，闸门前进（下次刷新将跳过同版本）。
    // ⚠️ units 只把**本次真正写成功的片**更新为新哈希，其余沿用旧记录 ——
    //    否则失败片会被记成新哈希，从此再也不拉（静默陈旧）。
    // ⚠️ 口径：失败片「再拉」要等 `contentVersion` 前进（见上方 ④），**同版本内不重试**。
    const nextUnits = { ...cachedUnits }
    for (const entry of entries) nextUnits[entry.key] = manifest.units[entry.key]

    await db.saveContentMeta({
      key: CONTENT_META_KEY,
      contentVersion: Number(manifest.contentVersion),
      contentHash: manifest.contentHash ?? null,
      units: nextUnits
    })

    const units = entries.map((e) => e.key)
    try {
      useContentStore().applyUpdate({ version: Number(manifest.contentVersion), units })
    } catch { /* 通知层不可用时不影响内容本身 */ }

    return { updated: units.length > 0, version: Number(manifest.contentVersion), units, reason: 'ok' }
  } catch {
    // 红线 6：离线 / 404 / 解析失败 / IDB 不可用 —— 一律静默跳过，不抛
    return { updated: false, version: null, units: [], reason: 'error' }
  }
}

/**
 * 读取远程缓存里的某一页（**离线优先**，供 loadPage 用）
 *
 * 读路径：进程内 Map → IndexedDB `content_cache`（整片）→ 按 fileIndex 找页。
 * 逐页哈希比对（P-S17 a）：`page.hash` 与写入时登记的 `pageHashes` 不符 → 丢弃该页。
 *
 * @param {string} subject 学科 key
 * @param {string} unitNum 单元号，如 "01"
 * @param {number} fileIndex 页内下标（site.js files[] 的下标）
 * @returns {Promise<object|null>} 远程页条目（含 blocks）；无缓存 / 不可用 / 哈希不符 → null
 */
export async function getRemotePage(subject, unitNum, fileIndex) {
  const unitKey = unitKeyOf({ subject, unitNum })
  try {
    let entry = memoryCache.get(unitKey)
    if (!entry) {
      entry = await dbStore().getContentCache(unitKey)
      if (entry) memoryCache.set(unitKey, entry)
    }
    if (!entry || !Array.isArray(entry.pages)) return null

    const page = entry.pages.find(
      (p) => p && p.op === OP.UPSERT && Number(p.fileIndex) === Number(fileIndex)
    )
    if (!page) return null
    if (!isUsablePage(page)) return null // 结构不过 → 回退内置

    const expected = entry.pageHashes ? entry.pageHashes[pageKeyOf({ unitNum, fileIndex })] : null
    // 哈希不符 → 丢弃该页（只影响这一页，同分片其它页照常）
    if (expected && !verifyHash(page, expected)) return null

    return page
  } catch {
    return null // 红线 2/6：读缓存失败绝不冒泡，由 loadPage 走内置兜底
  }
}

/**
 * 启动 / 后台静默刷新（P-S11 a：网络**不进关键路径**）
 * fire-and-forget：不 await、不抛、一次会话只触发一次（P-S14 a 不重试）
 *
 * @param {{timeout?: number}} [options]
 * @returns {boolean} 是否真正触发（已触发过则返回 false）
 */
export function startBackgroundRefresh(options = {}) {
  if (backgroundStarted) return false
  backgroundStarted = true
  Promise.resolve()
    .then(() => refreshIfNewer(options))
    .catch(() => { /* 红线 6：静默 */ })
  return true
}

/** 清空进程内二级缓存与「已触发」标记（供测试隔离；生产无需调用） */
export function resetContentClient() {
  memoryCache.clear()
  inflight = null
  backgroundStarted = false
}
