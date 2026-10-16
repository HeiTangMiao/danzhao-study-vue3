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
 *   - **红线 6（离线优先）**：失败一律静默跳过，不重试（P-S14 a）；再试的时机有两个：
 *     ① **下次启动且 contentVersion 已前进**（正常增量路径）；
 *     ② **同版本自愈**（S4-2）：失败片记进 `content_meta.pendingUnits`，随「每会话一次的后台刷新」
 *        在闸门**之外**补拉，连续 `PENDING_MAX_ATTEMPTS` 次失败则停止并一次性点名 warn。
 *     内容缓存**不进 sync 的 LWW 同步**（派生数据，见 studyDb 的注释）。
 *   - **H7（单一真相源）**：路径 / 键 / op / 协议常量一律取自 `contentManifest.js`，
 *     裁决一律走 `mergeContent.js`，本文件不复制、不自造口径。
 *
 * 缓存粒度：**unitKey 整片**（P-S12 a），与 manifest.units 分片 1:1。
 */
import { MANIFEST_FILE, CONTENT_META_KEY, OP, unitKeyOf, pageKeyOf } from '@/content/contentManifest'
import { isUsablePage, verifyHash, isWellFormedHash, computeRetrySet, isValidManifest } from '@/content/mergeContent'
import { fetchJson, DEFAULT_TIMEOUT_MS } from '@/utils/fetchJson'
import { contentRoot, contentRootFrom } from '@/utils/assetBase'
import { useStudyDbStore } from '@/stores/studyDb'
import { useContentStore } from '@/stores/content'

// 基址派生与纯函数已分别迁入 assetBase / mergeContent（S5-2：共用关注点收敛一处）；
// MANIFEST_FILE / CONTENT_META_KEY 迁至 contentManifest（协议与存储键的归属模块）。
// 以下 re-export 保持既有调用方（含 QA 的 s2-verify-* 测试）零改动
export { contentRoot, contentRootFrom }
export { computeRetrySet, isValidManifest }
export { MANIFEST_FILE, CONTENT_META_KEY }

/** 进程内二级缓存：unitKey -> 分片条目（避免每次进页都读一次 IndexedDB） */
const memoryCache = new Map()

/** 并发去重：刷新进行中时复用同一个 Promise（启动检查与手触发可能撞车） */
let inflight = null

/** 会话内是否已触发过后台刷新（P-S14 a：不重试；下次启动 + 版本前进时才自然再试） */
let backgroundStarted = false

/**
 * 同版本自愈的重试上限（P-S44 a）
 *
 * 语义：某片连续失败达到该次数 → 从 `pendingUnits` 移除并**一次性** `console.warn` 点名
 * （「超限必报告」纪律：允许静默跳过，但**不允许永久静默陈旧**）。
 * 为什么是 5：按会话一次的后台刷新计，约等于「连开 5 天都没拉到」——
 * 足以排除偶发弱网，又不至于让一条坏分片把 pending 列表永远占着。
 * ⚠️ 这是**次数**上限，不是退避（不持久化时间戳；P-S44 a 明确不做时间退避）。
 */
export const PENDING_MAX_ATTEMPTS = 5

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
 * 刷新远程内容（**闸门 + 增量 + 同版本自愈 + 原子写**），任何失败都静默返回 `{updated:false}`
 *
 * 流程：
 *   ① 拉清单 → 形态校验
 *   ② **闸门判定 + 待拉集计算**（`computeRetrySet`，红线 4：`isNewer` 严格大于语义不变）
 *      · 版本前进 → changedKeys（原有增量逻辑）
 *      · 版本等值/更旧但有待重试片 → **同版本自愈**（S4-2，闸门**之外**补拉）
 *      · 两者皆无 → `not-newer`，一片都不拉
 *   ③ 逐片轻量校验 → 先写 **content_cache（body）**，全部成功后才写 **content_meta（提交点）**
 *      （`units` 只把**本轮成功**的片前进；`pendingUnits` 与 `units` **同一次 put**）
 *   ④ 通知 `stores/content.js`（P-S13 a）
 *
 * @param {{timeout?: number, base?: string}} [options] timeout 毫秒；base 覆盖内容根（测试注入）
 * @returns {Promise<{updated: boolean, version: number|null, units: string[], reason: string}>}
 *          reason: 'ok'（版本前进）| 'healed'（同版本补拉成功）| 'not-newer' | 'invalid-manifest' | 'error'
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
    // ② 闸门判定 + 待拉集（红线 4：isNewer 严格大于语义不变，此处只多一个自愈分支）
    const { mode, targets } = computeRetrySet(manifest, meta)
    if (mode === 'skip') {
      // 等值/更旧且无待重试片 → 维持 S2 行为：清单拉到了，但一片都不拉
      return { updated: false, version: meta?.contentVersion ?? null, units: [], reason: 'not-newer' }
    }

    // ③ 逐片拉取 + 校验。**单片失败只跳过该片**（红线 6 静默），但记入 `pendingUnits`
    //    以便**同版本内**下次后台刷新补拉（S4-2 自愈；闸门之外，不放宽闸门）。
    const entries = []
    const stillPending = []
    for (const t of targets) {
      const unit = { hash: t.hash, version: t.version, path: t.path }
      try {
        const shard = await fetchJson(base, t.path, { timeout })
        const entry = buildShardEntry(t.unitKey, unit, shard)
        if (entry) {
          entries.push(entry)
          continue
        }
        // 分片拿到了但结构/协议不符 → 同样算「本轮没成功」，留待重试
        stillPending.push({ ...t, attempts: t.attempts + 1 })
      } catch {
        stillPending.push({ ...t, attempts: t.attempts + 1 })
      }
    }

    // 上限（P-S44 a）：达到上限的片从 pending 移除 + **一次性**点名 warn。
    // 不 warn 的话「永久静默陈旧」会悄悄发生；warn 一次即止，避免刷屏。
    const giveUp = stillPending.filter((p) => p.attempts >= PENDING_MAX_ATTEMPTS)
    const nextPending = stillPending.filter((p) => p.attempts < PENDING_MAX_ATTEMPTS)
    if (giveUp.length > 0) {
      console.warn(
        `[content-client] ⚠️ ${giveUp.length} 个单元连续 ${PENDING_MAX_ATTEMPTS} 次补拉失败，` +
          `已停止重试（这些单元将保持旧版内容，直至发布新版本）：` +
          giveUp.map((p) => p.unitKey).join('、')
      )
    }

    // body 先落：此刻 meta 尚未前进 → 中途断电/异常也不会让闸门误以为已更新
    for (const entry of entries) {
      await db.saveContentCache(entry)
      memoryCache.set(entry.key, entry)
    }

    // 提交点：`units` / `pendingUnits` 与版本号**同一次 put**（不存在「body 落了但 pending 没落」）。
    // ⚠️ units 只把**本轮真正写成功的片**更新为新哈希，其余沿用旧记录 ——
    //    否则失败片会被记成新哈希，从此再也不拉（静默陈旧，S2 已钉死该口径）。
    const cachedUnits = (meta && meta.units) || {}
    const nextUnits = { ...cachedUnits }
    const targetByKey = new Map(targets.map((t) => [t.unitKey, t]))
    for (const entry of entries) {
      if (mode === 'newer') {
        // 版本前进：沿用清单里的单元描述（形状与 S2 完全一致）
        nextUnits[entry.key] = manifest.units[entry.key]
      } else {
        // 同版本自愈：没有（可用的）远程清单描述 → 用分片自身信息补齐形状
        const t = targetByKey.get(entry.key)
        nextUnits[entry.key] = {
          hash: entry.hash,
          version: entry.version,
          path: t ? t.path : entry.key,
          count: entry.pages.length,
          updatedAt: entry.manifestUpdatedAt
        }
      }
    }

    // 版本号：只有「版本前进」才前进；自愈只是补拉，**内容代次没变**（红线 4）
    const nextVersion = mode === 'newer' ? Number(manifest.contentVersion) : (meta?.contentVersion ?? null)
    const nextHash = mode === 'newer' ? (manifest.contentHash ?? null) : (meta?.contentHash ?? null)

    await db.saveContentMeta({
      key: CONTENT_META_KEY,
      contentVersion: nextVersion,
      contentHash: nextHash,
      units: nextUnits,
      pendingUnits: nextPending
    })

    const units = entries.map((e) => e.key)
    try {
      useContentStore().applyUpdate({ version: nextVersion, units })
    } catch { /* 通知层不可用时不影响内容本身 */ }

    return {
      updated: units.length > 0,
      version: nextVersion,
      units,
      reason: mode === 'newer' ? 'ok' : 'healed'
    }
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
