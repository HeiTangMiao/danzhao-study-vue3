/**
 * 练习题库运行时加载器（P6）
 *
 * CSP 红线：题库产物是 JSON，运行时只能 fetch + JSON.parse（SearchPanel 同款模式），
 * 禁止动态 import() 消费产物；分片按需加载 + 内存缓存，弱网/离线（IndexedDB 应用
 * 场景）下首次 fetch 后不再重复请求。
 */
import { BANK_INDEX_FILE, practiceShardPath, normalizeBankItem } from '@/content/practiceBank'

/** 汇总索引缓存（小文件，练习首页每次进入都可能要看） */
let indexCache = null

/**
 * 加载题库汇总索引（学科题量 / gradable 占比 / 真题卷清单）
 * @returns {Promise<object>} index.json 内容
 */
export async function loadBankIndex() {
  if (indexCache) return indexCache
  const res = await fetch(`./${BANK_INDEX_FILE}`)
  if (!res.ok) throw new Error(`题库索引加载失败：HTTP ${res.status}`)
  indexCache = await res.json()
  return indexCache
}

/** 学科分片缓存：subject -> 运行时条目数组 */
const shardCache = new Map()

/**
 * 加载某学科的题库分片（带缓存）
 * @param {string} subject 学科 key
 * @returns {Promise<Array>} 运行时条目（字段全名）
 */
export async function loadSubjectBank(subject) {
  if (shardCache.has(subject)) return shardCache.get(subject)
  const res = await fetch(`./${practiceShardPath(subject)}`)
  if (!res.ok) throw new Error(`题库分片加载失败：HTTP ${res.status}`)
  const rawList = await res.json()
  const items = rawList.map(normalizeBankItem)
  shardCache.set(subject, items)
  return items
}
