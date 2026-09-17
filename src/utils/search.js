/**
 * 搜索匹配工具（供 SearchPanel 检索索引使用，纯函数便于单测）
 *
 * 索引分两级（见 src/content/searchIndex.js）：
 *  - meta 条目：{ subject, unitNum, fileIndex, unitTitle, title, subtitle, isTest? } —— 标题级，常驻
 *  - bodies：{ [bodyKeyOf(meta)]: 正文 } —— 按学科分片，按需加载；未加载时该学科只按标题匹配
 *
 * ⚠️ 契约：`prepareSearchIndex` 的第二个参数必须与调用 `matchSearch` 时传入的 bodies 为同一份，
 *    否则 _hay 里不含正文，正文命中会被静默漏掉（SearchPanel 在分片到位后重新 prepare 一次）。
 */
import { bodyKeyOf } from '@/content/searchIndex'

/** 检索串：标题 / 单元 / 副标题 / 正文（bodies 缺省时不含正文） */
function hayOf(item, bodies) {
  const body = bodies ? bodies[bodyKeyOf(item)] || '' : ''
  return [item.title, item.unitTitle, item.subtitle, body].join(' ').toLowerCase()
}

/**
 * 对索引条目预计算一次小写检索串（SearchPanel 加载索引后调用缓存，
 * 避免每次按键都对全部条目重新拼接字符串）
 * @param {Array} items - 搜索索引条目
 * @param {Object|null} bodies - 正文分片（键为 bodyKeyOf(条目)），未加载时传 null
 * @returns {Array<Object>} 附加 _hay 字段的条目（matchSearch 自动复用）
 */
export function prepareSearchIndex(items, bodies = null) {
  return (items || []).map((item) => ({ ...item, _hay: hayOf(item, bodies) }))
}

/** 命中处的上下文摘要（正文已被构建脚本清洗为单空格分隔） */
function snippetOf(body, pos, len) {
  const start = Math.max(0, pos - 12)
  const end = Math.min(body.length, pos + len + 28)
  return `${start > 0 ? '…' : ''}${body.slice(start, end)}${end < body.length ? '…' : ''}`
}

/**
 * 对索引条目做关键词匹配，返回命中列表（按原顺序，最多 limit 条）
 * @param {Array} items - 索引条目（可含 _hay 预计算字段）
 * @param {string} query - 查询关键词（子串匹配，不区分大小写）
 * @param {{limit?: number, bodies?: Object|null}} options - 命中上限（默认 30）与正文分片
 * @returns {Array<Object>} 命中条目（附 snippet：从正文取的命中上下文，未命中正文时为空串）
 */
export function matchSearch(items, query, options = {}) {
  const { limit = 30, bodies = null } = options
  const kw = (query || '').trim().toLowerCase()
  if (!kw) return []
  const hits = []
  for (const item of items) {
    // 优先使用预计算的检索串，缺失时按原逻辑现场拼接（兼容旧调用方/单测）
    const hay = item._hay || hayOf(item, bodies)
    if (!hay.includes(kw)) continue
    // 摘要取自正文：标题命中时标题本身已显示，不需要再截一段关键词串
    const body = (bodies && bodies[bodyKeyOf(item)]) || ''
    const pos = body.toLowerCase().indexOf(kw)
    hits.push({ ...item, snippet: pos >= 0 ? snippetOf(body, pos, kw.length) : '' })
    if (hits.length >= limit) break
  }
  return hits
}