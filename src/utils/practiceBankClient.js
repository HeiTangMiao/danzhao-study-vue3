/**
 * 练习题库运行时加载器（P6 + 批 S5 · S5-4 远程化）
 *
 * 优先级链：**缓存（IndexedDB）> 远程（同源静态目录）> 抛错**
 * 与内容层 / 搜索层的差异：题库**没有内置兜底层**，也没有「退一级还能用」的形态
 * （空题库 = 组不出卷），所以远程失败且无缓存时**抛错**，由 practice store 的视图兜底。
 *
 * CSP 红线：产物是 JSON，运行时只能 fetch + JSON.parse，禁止动态 import() 消费。
 * 缓存键（P-S52）：`practice:index` / `practice:{subject}`（复用 content_cache，零 DB 升版）。
 */
import { BANK_INDEX_FILE, practiceShardPath, normalizeBankItem } from '@/content/practiceBank'
import { siteRoot } from '@/utils/assetBase'
import { readByKey, commitBestEffort, readLocalMaxVersion, safeDb } from '@/utils/assetClient'
import { fetchJson } from '@/utils/fetchJson'

/** content_cache 键：汇总索引 */
export const BANK_INDEX_KEY = 'practice:index'

/**
 * content_cache 键：学科分片
 * @param {string} subject 学科 key
 */
export function bankShardKey(subject) {
  return `practice:${subject}`
}

/** 进程内二级缓存（与内容层 memoryCache 同款；原 indexCache/shardCache 由它统一取代） */
const memory = new Map()

/** 清空进程内二级缓存（供测试隔离；生产无需调用） */
export function resetPracticeClient() {
  memory.clear()
}

/**
 * 单题轻量校验（S5-4 契约 3：坏条丢弃，**粒度 = practiceKeyOf**）
 *
 * 单题坏 → 丢该题，不影响同分片其它题（组卷只少一个候选，不崩）。
 * `normalizeBankItem` 是形状的兜底真相源（H7，**零改动**）—— 本函数只在其上补
 * 「缺题干 / 缺坐标」这两条会让学员点进空白页或 404 的硬伤。
 *
 * @param {unknown} raw 分片里的一条（紧凑键）
 * @returns {object|null} 运行时条目；不可用 → null
 */
export function sanitizeBankItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = normalizeBankItem(raw)
  if (typeof item.question !== 'string' || item.question.trim() === '') return null
  if (typeof item.key !== 'string' || item.key === '') return null
  if (typeof item.fileKey !== 'string' || item.fileKey === '') return null
  return item
}

/**
 * 学科分片逐条清洗
 * @param {unknown} list 远程分片数组
 * @returns {Array<object>|null} 条目数组；**形状坏或全被丢弃 → null**（调用方据此抛错，
 *          好过静默返回空库让用户看到「无题可组」还以为是自己选错了条件）
 */
export function sanitizeBankShard(list) {
  if (!Array.isArray(list)) return null
  const kept = list.map(sanitizeBankItem).filter(Boolean)
  if (list.length > 0 && kept.length === 0) return null
  return kept
}

/** 汇总索引形态兜底（统计对象；不逐条清洗） */
function sanitizeBankIndex(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw
}

/**
 * 载入一个远程资产（缓存 → 远程 → 都失败则抛错）
 *
 * ⚠️ 读路径**不拉 manifest**（与 searchClient 同款理由）：版本判据用「本地已见版本」，
 *    它是全站唯一的版本权威（P-S51）。
 *
 * @param {string} key content_cache 键
 * @param {string} path 站点根下的产物路径
 * @param {(data: unknown) => any} sanitize 逐条清洗；返回 null 表示「产物不可用」
 * @returns {Promise<any>}
 * @throws 远程失败且无缓存，或产物形状不可用
 */
async function loadAsset(key, path, sanitize) {
  // 同 searchClient：存储不可用 → db 为 null，退化为「直连远程」，不阻断组卷
  const db = safeDb()
  const minVersion = await readLocalMaxVersion(db)

  const fresh = await readByKey(db, key, { memory, minVersion })
  if (fresh.entry) return fresh.entry.payload

  // 读时闸门判为陈旧的条目留作兜底：远程不可达时「旧的」好过「什么都没有」
  const stale = fresh.source === 'stale' ? await readByKey(db, key, { memory, minVersion: null }) : null

  let data
  try {
    data = sanitize(await fetchJson(siteRoot(), path))
  } catch (e) {
    if (stale && stale.entry) return stale.entry.payload
    throw e
  }
  if (data === null || data === undefined) {
    if (stale && stale.entry) return stale.entry.payload
    throw new Error(`题库产物形状不合法：${path}`)
  }
  // 只有知道当前代次才写缓存（无版本号的条目无法参与读时闸门）
  if (minVersion != null) {
    await commitBestEffort(db, [entryOf(key, minVersion, data)], null, { memory })
  }
  return data
}

/** 造一条可落缓存的条目 */
function entryOf(key, version, payload) {
  return { key, version: Number(version) || 0, payload }
}

/**
 * 加载题库汇总索引（学科题量 / gradable 占比 / 真题卷清单）
 * @returns {Promise<object>} index.json 内容
 */
export async function loadBankIndex() {
  return loadAsset(BANK_INDEX_KEY, BANK_INDEX_FILE, sanitizeBankIndex)
}

/**
 * 加载某学科的题库分片（带缓存）
 * @param {string} subject 学科 key
 * @returns {Promise<Array>} 运行时条目（字段全名）
 */
export async function loadSubjectBank(subject) {
  return loadAsset(bankShardKey(subject), practiceShardPath(subject), sanitizeBankShard)
}
