/**
 * 搜索匹配工具（供 SearchPanel 检索索引使用，纯函数便于单测）
 * 每个条目结构：{ subject, unitNum, fileIndex, unitTitle, title, subtitle, keywords, ... }
 */

/**
 * 对索引条目做关键词匹配，返回命中列表（按原顺序，最多 limit 条）
 * @param {Array} items - 搜索索引条目
 * @param {string} query - 查询关键词（子串匹配，不区分大小写）
 * @param {number} limit - 命中上限，默认 30
 * @returns {Array<Object>} 命中条目（附加 snippet 匹配上下文摘要）
 */
export function matchSearch(items, query, limit = 30) {
  const kw = (query || '').trim().toLowerCase()
  if (!kw) return []
  const hits = []
  for (const item of items) {
    const hay = [item.title, item.unitTitle, item.subtitle, item.keywords].join(' ').toLowerCase()
    if (hay.includes(kw)) {
      const pos = (item.keywords || '').toLowerCase().indexOf(kw)
      hits.push({
        ...item,
        snippet: pos >= 0 ? (item.keywords || '').slice(Math.max(0, pos - 12), pos + 40) + '…' : ''
      })
      if (hits.length >= limit) break
    }
  }
  return hits
}