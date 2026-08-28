/**
 * 搜索匹配工具（供 SearchPanel 检索索引使用，纯函数便于单测）
 * 每个条目结构：{ subject, unitNum, fileIndex, unitTitle, title, subtitle, keywords, ... }
 */

/**
 * 对索引条目预计算一次小写检索串（SearchPanel 加载索引后调用缓存，
 * 避免每次按键都对全部条目重新拼接字符串）
 * @param {Array} items - 搜索索引条目
 * @returns {Array<Object>} 附加 _hay 字段的条目（matchSearch 自动复用）
 */
export function prepareSearchIndex(items) {
  return (items || []).map((item) => ({
    ...item,
    _hay: [item.title, item.unitTitle, item.subtitle, item.keywords].join(' ').toLowerCase()
  }))
}

/**
 * 对索引条目做关键词匹配，返回命中列表（按原顺序，最多 limit 条）
 * @param {Array} items - 搜索索引条目（可含 _hay 预计算字段）
 * @param {string} query - 查询关键词（子串匹配，不区分大小写）
 * @param {number} limit - 命中上限，默认 30
 * @returns {Array<Object>} 命中条目（附加 snippet 匹配上下文摘要）
 */
export function matchSearch(items, query, limit = 30) {
  const kw = (query || '').trim().toLowerCase()
  if (!kw) return []
  const hits = []
  for (const item of items) {
    // 优先使用预计算的检索串，缺失时按原逻辑现场拼接（兼容旧调用方/单测）
    const hay = item._hay || [item.title, item.unitTitle, item.subtitle, item.keywords].join(' ').toLowerCase()
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