/**
 * 内容页面序列化（纯函数，零 import —— 浏览器与 Node 两端共用）
 *
 * 背景：内容文件的写法此前有两套 —— 手写风格（无引号键 + 块间空行）与
 *      `JSON.stringify(page, null, 2)` 产出的引号键风格（实测 62 个文件）。
 *      编辑器「导出 / 复制 .js」走的是后者，等于每导一次就产生一个新风格的文件。
 *      与 pageMeta.js 同理：风格定义只能有一份，两端共用。
 *
 * 固定手写风格（本文件即契约）：
 *  - 文件头保留原有块注释（新建文件用 buildHeader 生成）
 *  - `export default {` / `  blocks: [` / 2 空格缩进 / 结尾换行
 *  - 键**不加引号**（只有不是合法标识符时才加）
 *  - 字符串一律双引号 + JSON 转义（`\n` / `\"`），长字符串也保持单行
 *  - 对象一律多行；数组为空写 `[]`，全部是标量且整行不超 100 列时才写单行
 *  - **顶层区块之间空一行**（嵌套数组不空行）
 *
 * ⚠️ schema 用参数注入的写法不适用这里：本模块不依赖任何东西，两端直接 import。
 */

/** 一级缩进 */
const INDENT = '  '
/** 允许单行渲染的最大宽度（含缩进与 `key: ` 前缀） */
const INLINE_WIDTH = 100

/** 合法 JS 标识符（不合法才给键加引号） */
const IDENT_RE = /^[A-Za-z_$][\w$]*$/

/** 字符串一律双引号 + JSON 转义 */
function quote(text) {
  return JSON.stringify(text)
}

/**
 * 尝试把值渲染成单行；不适合单行时返回 null
 * 说明：对象一律返回 null（多行），数组要求元素全是标量且本身可单行
 */
function inlineOf(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const parts = []
    for (const el of value) {
      const one = inlineOf(el)
      if (one === null) return null
      parts.push(one)
    }
    return `[${parts.join(', ')}]`
  }
  if (typeof value === 'string') return quote(value)
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

/**
 * 序列化一个值
 * @param {*} value 任意 JSON 风格数据
 * @param {string} indent 当前行的缩进
 * @param {string} prefix 同行前缀（`key: `），参与行宽判断
 */
function renderValue(value, indent, prefix = '') {
  const inline = inlineOf(value)
  if (inline !== null && indent.length + prefix.length + inline.length <= INLINE_WIDTH) {
    return inline
  }
  if (Array.isArray(value)) return renderArray(value, indent)
  if (value && typeof value === 'object') return renderObject(value, indent)
  // 超宽的长字符串：仍然单行（内容段落本来就是一行），与 JSON 语义一致
  if (typeof value === 'string') return quote(value)
  if (value === undefined) return 'null' // 与 JSON.stringify 对数组元素的处理一致
  return String(value)
}

/**
 * 序列化数组
 * @param {Array} arr 数组
 * @param {string} indent 闭合括号所在缩进
 * @param {boolean} blankBetween 元素之间是否空一行（仅顶层区块用）
 */
function renderArray(arr, indent, blankBetween = false) {
  if (arr.length === 0) return '[]'
  const inner = indent + INDENT
  const lines = arr.map((el, i) => {
    const sep = i < arr.length - 1 ? ',' : ''
    return inner + renderValue(el, inner) + sep
  })
  return `[\n${lines.join(blankBetween ? '\n\n' : '\n')}\n${indent}]`
}

/** 序列化对象（一律多行；值为 undefined 的键按 JSON 语义丢弃） */
function renderObject(obj, indent) {
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined)
  if (keys.length === 0) return '{}'
  const inner = indent + INDENT
  const lines = keys.map((k, i) => {
    const sep = i < keys.length - 1 ? ',' : ''
    const key = IDENT_RE.test(k) ? k : quote(k)
    const prefix = `${key}: `
    return inner + prefix + renderValue(obj[k], inner, prefix) + sep
  })
  return `{\n${lines.join('\n')}\n${indent}}`
}

/**
 * 取出文件开头的块注释（文件头模板），没有则返回空字符串
 * @param {string} source 文件源码
 */
export function extractHeader(source) {
  const m = String(source).match(/^\s*(\/\*[\s\S]*?\*\/)/)
  return m ? `${m[1]}\n` : ''
}

/**
 * 生成新文件的文件头注释
 * @param {{title?:string, subtitle?:string}} meta 页面元信息（来自 site.js）
 */
export function buildHeader(meta = {}) {
  const title = meta.title ? `${meta.title}${meta.subtitle ? `（${meta.subtitle}）` : ''}` : ''
  const lines = ['/**', ' * 内容页面数据（content-schema 的实例）']
  if (title) lines.push(` * 页面：${title}`)
  lines.push(' * 说明：本文件只描述 blocks；页面元信息（标题 / 单元 / 顺序）的唯一真相源是 site.js')
  lines.push(' */')
  return `${lines.join('\n')}\n`
}

/**
 * 把 blocks 序列化为内容文件源码（固定手写风格，见文件头契约）
 * @param {Array} blocks 区块数组（内容数据，不含元信息）
 * @param {{header?:string}} [options] header 为文件头注释（含结尾换行）；缺省则不加
 * @returns {string} 完整文件源码（以换行结尾）
 */
export function serializePage(blocks, options = {}) {
  const header = options.header ? `${String(options.header).replace(/\s*$/, '')}\n` : ''
  const body = `export default {\n${INDENT}blocks: ${renderArray(
    Array.isArray(blocks) ? blocks : [],
    INDENT,
    true
  )}\n}\n`
  return header + body
}

/**
 * 仅去掉行首的键引号（`"type":` → `type:`），其余字符原样保留
 * 用途：文件里带行注释时不能整体重排（注释不在数据里，重排会丢），
 *      但引号归一化仍然可以安全地做 —— 见 scripts/migrate-content-style.mjs
 */
export function stripKeyQuotes(source) {
  return String(source).replace(/^(\s*)"([A-Za-z_$][\w$]*)"(\s*):/gm, '$1$2$3:')
}