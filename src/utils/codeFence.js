const FENCE = '```'
const LANGUAGE_RE = /^[A-Za-z0-9_+#.-]+$/

/**
 * @typedef {Object} TextSegment
 * @property {'text'} type
 * @property {string} content
 *
 * @typedef {Object} CodeSegment
 * @property {'code'} type
 * @property {string} content
 * @property {string} language
 *
 * @typedef {TextSegment | CodeSegment} CodeFenceSegment
 */

/**
 * 将三反引号围栏文本切分为普通文本段与代码段。
 *
 * 未闭合围栏整体按普通文本降级，避免错误标记吞掉后续正文。
 *
 * @param {string} text 原始文本
 * @returns {CodeFenceSegment[]} 按原始顺序排列的片段
 */
export function splitCodeFences(text = '') {
  const source = String(text)
  if (!source.includes(FENCE)) return [{ type: 'text', content: source }]

  const segments = []
  let cursor = 0

  while (cursor < source.length) {
    const openingIndex = source.indexOf(FENCE, cursor)
    if (openingIndex === -1) {
      pushTextSegment(segments, source.slice(cursor))
      break
    }

    const closingIndex = source.indexOf(FENCE, openingIndex + FENCE.length)
    if (closingIndex === -1) {
      return [{ type: 'text', content: source }]
    }

    pushTextSegment(segments, source.slice(cursor, openingIndex))
    segments.push(toCodeSegment(source.slice(openingIndex + FENCE.length, closingIndex)))
    cursor = closingIndex + FENCE.length
  }

  return segments
}

/** 空文本段没有可见输出，省略后可避免产生多余的行内容器。 */
function pushTextSegment(segments, content) {
  if (content) segments.push({ type: 'text', content })
}

/** 围栏首尾换行属于标记结构，不应成为代码中的空白行。 */
function toCodeSegment(rawContent) {
  let content = rawContent
  let language = ''
  const lineBreak = content.match(/\r?\n/)

  if (lineBreak?.index !== undefined) {
    const header = content.slice(0, lineBreak.index).trim()
    if (!header || LANGUAGE_RE.test(header)) {
      language = header
      content = content.slice(lineBreak.index + lineBreak[0].length)
    }
  }

  content = content.replace(/\r?\n$/, '')
  return { type: 'code', content, language }
}
