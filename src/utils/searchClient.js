/**
 * 搜索索引的远程化加载器（批 S5 · S5-3）
 *
 * 优先级链：**缓存（IndexedDB）> 远程（同源静态目录）> 保持旧值**
 *
 * ⚠️ 搜索**没有内置兜底层**（内容层有 `src/content/**` 的懒加载 chunk，搜索产物只存在于 `public/`，
 *    卡 §0 更正 4）：所以远程失败时的终点是「缓存」；缓存也没有 → 抛错，由 SearchPanel
 *    置 error 态（统一降级契约，卡 §4 第 5 条）。
 *
 * 缓存键（P-S52）：`search:meta` / `search:{subject}` —— 复用 `content_cache`（键加前缀隔离），
 * **零 DB 升版**。条目形如 `{ key, version, payload }`，`version` 取自 manifest 的
 * `contentVersion`（P-S51：三层共用一个版本号），读时闸门由 `assetClient.readByKey` 把关。
 */
import { META_FILE, bodyShardPath } from '@/content/searchIndex'
import { siteRoot } from '@/utils/assetBase'
import { readByKey, commitBestEffort, readLocalMaxVersion, safeDb } from '@/utils/assetClient'
import { fetchJson } from '@/utils/fetchJson'

/** content_cache 键：标题级索引 */
export const SEARCH_META_KEY = 'search:meta'

/**
 * content_cache 键：学科正文分片
 * @param {string} subject 学科 key
 */
export function searchBodyKey(subject) {
  return `search:${subject}`
}

/** 进程内二级缓存（与内容层 `memoryCache` 同款，避免每次进页都读一次 IDB） */
const memory = new Map()

/** 清空进程内二级缓存（供测试隔离；生产无需调用 —— 与 `resetContentClient` 同款纪律） */
export function resetSearchClient() {
  memory.clear()
}

/** 造一条可落缓存的条目 */
function entryOf(key, version, payload) {
  return { key, version: Number(version) || 0, payload }
}

/**
 * meta 条目逐条轻量校验（S5-3 契约 3：坏条丢弃）
 * 缺坐标 / 缺标题的条目会让结果点进去 404 或显示空白 → 丢弃该条，不影响其它条目。
 * @param {unknown} list 远程 meta 数组
 * @returns {Array<object>}
 */
export function sanitizeMetaList(list) {
  if (!Array.isArray(list)) return []
  return list.filter((it) =>
    it && typeof it === 'object' &&
    typeof it.subject === 'string' && it.subject !== '' &&
    typeof it.unitNum === 'string' && it.unitNum !== '' &&
    Number.isFinite(Number(it.fileIndex)) &&
    typeof it.title === 'string' && it.title !== ''
  )
}

/**
 * 正文分片逐条轻量校验（S5-3 契约 3：坏条丢弃，**粒度 = bodyKeyOf**）
 *
 * 某页正文结构坏（值不是字符串 / 空串 / 键形态不对）→ **只丢该页**，其它页照常：
 * 复用 `buildShardEntry` 的逐条丢弃范式，不因一条坏数据让整个学科搜不了。
 * 键的形态口径与 `bodyKeyOf`（`unitNum/fileIndex`）一致 —— 这里只做**结构**校验，
 * 不重新定义路径 / 键（H7：形状仍归 `searchIndex.js`）。
 *
 * @param {unknown} shard 远程正文分片
 * @returns {Object<string, string>} 清洗后的分片（可能为空对象 = 该学科只剩标题级检索）
 */
export function sanitizeBodyShard(shard) {
  if (!shard || typeof shard !== 'object' || Array.isArray(shard)) return {}
  const out = {}
  for (const [key, text] of Object.entries(shard)) {
    if (typeof key !== 'string' || key === '') continue
    const seg = key.split('/')
    if (seg.length !== 2 || seg[0] === '' || !Number.isFinite(Number(seg[1]))) continue
    if (typeof text !== 'string' || text.trim() === '') continue
    out[key] = text
  }
  return out
}

/**
 * 载入一个远程资产（缓存 → 远程 → 远程失败时回退缓存）
 *
 * ⚠️ 读路径**不拉 manifest**：版本判据用「本地已见版本」（`content_meta.contentVersion`，
 *    由内容层的启动后台刷新维护）—— 它是全站唯一的版本权威（P-S51）。
 *    若为了拿版本号而先拉一次 manifest，冷启动的搜索预取就要多付一次往返，
 *    违背 `search-panel.test.js` 钉死的「预取只取 meta（1 次请求）」契约。
 *
 * @param {string} key content_cache 键
 * @param {string} path 站点根下的产物路径（如 `search-meta.json`）
 * @param {(data: unknown) => any} sanitize 逐条轻量校验（坏条丢弃）
 * @returns {Promise<any>} 产物 JSON（已清洗）
 * @throws 远程失败且无任何缓存时抛出（调用方置 error 态）
 */
async function loadAsset(key, path, sanitize) {
  // 存储是加速器不是数据源：取不到 / 用不了 → db 为 null，全链路退化为「直连远程」
  const db = safeDb()
  const minVersion = await readLocalMaxVersion(db)

  // ① 缓存（进程内 → IDB）+ 读时闸门：entry.version < 本地已见版本 → 视为未命中
  const fresh = await readByKey(db, key, { memory, minVersion })
  if (fresh.entry) return fresh.entry.payload

  // 读时闸门判为「陈旧」的条目先留下来：远程不可达时，「旧的」好过「什么都没有」
  // （minVersion 传 null 即绕过闸门做一次裸读）
  const stale = fresh.source === 'stale' ? await readByKey(db, key, { memory, minVersion: null }) : null

  try {
    const data = sanitize(await fetchJson(siteRoot(), path))
    // 只有知道当前代次才写缓存：无版本号的条目无法参与读时闸门，
    // 写了反而每次都被判陈旧、反复重拉（宁可这次不缓存）
    if (minVersion != null) {
      await commitBestEffort(db, [entryOf(key, minVersion, data)], null, { memory })
    }
    return data
  } catch (e) {
    if (stale && stale.entry) return stale.entry.payload
    throw e
  }
}

/**
 * 加载标题级索引（`search-meta.json`）
 * @returns {Promise<Array>} meta 条目数组
 */
export async function loadSearchMeta() {
  return loadAsset(SEARCH_META_KEY, META_FILE, sanitizeMetaList)
}

/**
 * 按学科加载正文分片（`search-body/{subject}.json`）—— **按需加载**，
 * 不因远程化改成启动全量拉（一次搜索只拉当前学科，卡 §S5-3 契约 2 / R-4）。
 * @param {string} subject 学科 key
 * @returns {Promise<Object>} `bodyKeyOf(条目)` → 正文
 */
export async function loadSearchBody(subject) {
  return loadAsset(searchBodyKey(subject), bodyShardPath(subject), sanitizeBodyShard)
}
