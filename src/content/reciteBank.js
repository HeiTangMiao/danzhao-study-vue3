/**
 * 每日背诵 · 篇目产物（recite-bank）的形状定义（纯 ESM，**零 import** ——
 * 构建脚本与浏览器两端共用）
 *
 * 背景（每日背诵 T01）：背诵要按「篇」调度，而 `cloze` 区块**没有 id / key 字段**
 * （内容侧红线也禁止新增字段），所以篇主键只能由坐标派生：
 *   pieceKey = `${subject}|${fileKey}|${blockIndex}`
 * 其中 `fileKey` = `pageFileKeyOf(meta)`（`src/content/pageMeta.js:63`），
 * `blockIndex` = **页内 cloze 区块流水号**（不是 `page.blocks` 原始下标）。
 *
 * 这个文件是「构建产物形状」的**唯一真相源**：构建脚本（`scripts/build-recite-bank.mjs`）、
 * 运行时加载器（`src/utils/reciteBankClient.js`）、store 与测试三方必须看同一份定义 ——
 * 与 `practiceBank.js` / `searchIndex.js` / `judgeDerive.js` 同一纪律。
 *
 * ⚠️ 本文件刻意**零 import**：构建脚本会在**裸 Node** 下直接 import 它；一旦引入依赖链
 *    就会把浏览器侧代码（Vue / DOM / `@/` 别名）拖进 Node 构建进程。
 *
 * ⚠️ 版本权威只有 `CONTENT_VERSION` 一个（`contentManifest.js:42`）：产物里的
 *    `contentVersion` 是它的**投影**，禁止新开 `RECITE_VERSION` 之类独立版本线。
 *
 * ⚠️ 主键里**不含** `title` / `text` / `fp`：内容侧修错别字、改标题都不会丢进度
 *    （`fp` 只用于诊断与自动迁移，见设计 §3.2）。
 */

/** 产物形状版本：运行时不匹配 → 视为该源不可用（不做向前兼容猜测） */
export const BANK_SCHEMA_VERSION = 1

/** 产物目录名（`public/` 下的相对路径前缀） */
export const BANK_DIR = 'recite-bank'

/** 产物文件名（一期只有语文一科） */
export const BANK_FILE = 'chinese.json'

/**
 * 产物路径（`public/` 下相对路径）—— **全仓唯一定义**
 * 说明（设计 §7.2）：client / store / 测试都从这里取，禁止在别处手拼字符串。
 */
export const RECITE_BANK_PATH = `${BANK_DIR}/${BANK_FILE}`

/** 篇目角色：'lesson' = 每日新篇池；'review' = 条件触发池（文件/整轮复习篇） */
export const PIECE_ROLE = {
  LESSON: 'lesson',
  REVIEW: 'review'
}

/**
 * 复习篇触发方式（**仅 role==='review' 有**，由构建期按 `title` 烘焙，运行时不猜）：
 *  - 'file'：其所属 `fileKey` 的全部 lesson 篇 `stage >= 1` 的次日进队列
 *  - 'all' ：整轮（`title` 含「冲关」）的次日进队列
 */
export const PIECE_TRIGGER = {
  FILE: 'file',
  ALL: 'all'
}

/** 可默写模式（产物内恒为 'input'：reveal 篇构建期即排除） */
export const CLOZE_MODE_INPUT = 'input'

/**
 * 产物条目使用紧凑单字母键（键名瘦身换加载体积，与 `practiceBank.BANK_ITEM_KEYS` 同款）。
 * 此映射是「紧凑键 → 运行时字段名」的**唯一对照表**，`normalizePiece` 据此展开；
 * 产物也可以直接写长键（`normalizePiece` 两者都认）。
 */
export const PIECE_KEYS = {
  k: 'key', // 主键 `${subject}|${fileKey}|${blockIndex}`
  o: 'order', // 全局顺序：文件顺序 × 块顺序
  r: 'role', // 'lesson' | 'review'
  tg: 'trigger', // 仅 review：'file' | 'all'
  u: 'unitNum', // '07'
  fi: 'fileIndex', // 0 起（site.js files[] 下标）
  bi: 'blockIndex', // 页内 cloze 流水号（0 起）
  fk: 'fileKey', // 'chinese_07_01-先秦至魏晋名篇'
  ft: 'fileTitle', // '默写专项 · 先秦至魏晋名篇'
  ut: 'unitTitle', // '默写专项'
  ti: 'title', // '《诗经》 · 关雎'
  m: 'mode', // 恒为 'input'
  sc: 'sentenceCount', // 句数（与 PRD / 内容侧对账用）
  bc: 'blankCount', // 真空位数（UI「N 空」唯一来源）
  stc: 'strictCount', // strict:true 的句数（A3 筛红线句用）
  fp: 'fp' // 内容指纹（诊断 + 自动迁移，**不是主键的一部分**）
}

/** 运行时字段名清单（`PIECE_KEYS` 的值，顺序即规范化后的属性顺序；供构建脚本/测试断言形状） */
export const PIECE_FIELDS = Object.keys(PIECE_KEYS).map((k) => PIECE_KEYS[k])

/** 长键 → 紧凑键的反查表（模块内私有，避免调用方各拼一份） */
const COMPACT_OF = Object.keys(PIECE_KEYS).reduce((acc, compact) => {
  acc[PIECE_KEYS[compact]] = compact
  return acc
}, {})

/**
 * 取字段值：紧凑键优先（产物瘦身形态），回退长键，再回退默认值。
 * 显式传 `null` 视为「未提供」—— 产物里不写 `null`，写 `null` 与不写等价。
 * @param {object} src 原始条目
 * @param {string} longName 运行时字段名
 * @param {*} fallback 默认值
 * @returns {*}
 */
function pick(src, longName, fallback) {
  const compact = COMPACT_OF[longName]
  if (compact !== undefined && src[compact] !== undefined && src[compact] !== null) {
    return src[compact]
  }
  if (src[longName] !== undefined && src[longName] !== null) return src[longName]
  return fallback
}

/**
 * 非负整数规整：非法值（NaN / 负数 / 非数字）一律回落到 `fallback`。
 * 不允许四舍五入成"看起来合法"的数字 —— 坐标错一位就是把进度记到别的篇上。
 * @param {*} v 原值
 * @param {number} fallback 默认值
 * @returns {number}
 */
function toIndex(v, fallback) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return fallback
  return n
}

/**
 * 字符串规整：非字符串一律转成字符串（产物里不该出现对象/数组字段）
 * @param {*} v 原值
 * @param {string} fallback 默认值
 * @returns {string}
 */
function toText(v, fallback) {
  if (typeof v === 'string') return v
  if (v === undefined || v === null) return fallback
  return String(v)
}

/**
 * 篇主键（**唯一格式**，设计 §7.2）：
 * `` `${subject}|${fileKey}|${blockIndex}` ``
 * @param {string} subject 学科 key（chinese / math / computer）
 * @param {string} fileKey `pageFileKeyOf(meta)` 的结果
 * @param {number} blockIndex 页内 cloze 流水号（0 起）
 * @returns {string}
 */
export function pieceKeyOf(subject, fileKey, blockIndex) {
  return `${toText(subject, '')}|${toText(fileKey, '')}|${toIndex(blockIndex, 0)}`
}

/**
 * 从篇主键反解学科 key（`recite_progress.subject` 的取值来源）。
 * 为什么放在本文件：它是 `pieceKeyOf` 的逆运算，必须与正运算同源，
 * 不允许在 store / 视图里各自 `split('|')[0]`。
 * @param {{key?: string}} piece 篇目条目
 * @returns {string} 解析不出时返回空串
 */
export function subjectOfPiece(piece) {
  const key = piece && typeof piece.key === 'string' ? piece.key : ''
  const i = key.indexOf('|')
  return i > 0 ? key.slice(0, i) : ''
}

/**
 * 条目是否可用于渲染/调度（形状最小完整度）。
 * 缺 `fileKey`（定位不到页）或 `title`（identity 守卫要用它比对）的条目一律不收 ——
 * 宁可不收，也不能收进来把作答结果写到错的篇上。
 * @param {object} piece `normalizePiece` 的产出
 * @returns {boolean}
 */
function isUsablePiece(piece) {
  if (!piece || typeof piece !== 'object') return false
  if (!piece.key) return false
  if (!piece.fileKey) return false
  if (!piece.title) return false
  return true
}

/**
 * 把产物里的单条篇目规范化成运行时形状（缺字段补默认值，非法值回落）。
 * 接受紧凑键（`PIECE_KEYS`）与长键两种写法，产出**只有长键**的稳定对象。
 *
 * 字段契约见设计 §3.4 `interface RecitePiece`：本函数是它的唯一实现处，
 * 其它模块**不得**再写一份字段默认值表。
 * @param {object} raw 产物里的原始条目
 * @returns {{
 *   key: string, order: number, role: string, trigger?: string,
 *   unitNum: string, fileIndex: number, blockIndex: number,
 *   fileKey: string, fileTitle: string, unitTitle: string,
 *   title: string, mode: string,
 *   sentenceCount: number, blankCount: number, strictCount: number,
 *   fp: string
 * }} 规范化后的篇目
 */
export function normalizePiece(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const fileKey = toText(pick(src, 'fileKey', ''), '')
  const blockIndex = toIndex(pick(src, 'blockIndex', 0), 0)
  const rawRole = toText(pick(src, 'role', PIECE_ROLE.LESSON), PIECE_ROLE.LESSON)
  const role = rawRole === PIECE_ROLE.REVIEW ? PIECE_ROLE.REVIEW : PIECE_ROLE.LESSON

  const out = {
    // 主键**不由本函数派生**：缺 key 的条目一律由 sanitizeBank 丢弃。
    // 理由：主键含 subject，而条目里没有 subject 字段；用空 subject 拼出来的 key
    // 会把作答结果写到一个谁也认领不了的篇上 —— 宁可不收，也不收一条错的。
    key: toText(pick(src, 'key', ''), ''),
    order: toIndex(pick(src, 'order', 0), 0),
    role,
    unitNum: toText(pick(src, 'unitNum', ''), ''),
    fileIndex: toIndex(pick(src, 'fileIndex', 0), 0),
    blockIndex,
    fileKey,
    fileTitle: toText(pick(src, 'fileTitle', ''), ''),
    unitTitle: toText(pick(src, 'unitTitle', ''), ''),
    title: toText(pick(src, 'title', ''), ''),
    mode: toText(pick(src, 'mode', CLOZE_MODE_INPUT), CLOZE_MODE_INPUT),
    sentenceCount: toIndex(pick(src, 'sentenceCount', 0), 0),
    blankCount: toIndex(pick(src, 'blankCount', 0), 0),
    strictCount: toIndex(pick(src, 'strictCount', 0), 0),
    fp: toText(pick(src, 'fp', ''), '')
  }

  // trigger 只对 review 有意义（§3.4：`trigger?` 为可选字段，lesson 篇不写）
  if (role === PIECE_ROLE.REVIEW) {
    const rawTrigger = toText(pick(src, 'trigger', PIECE_TRIGGER.FILE), PIECE_TRIGGER.FILE)
    out.trigger = rawTrigger === PIECE_TRIGGER.ALL ? PIECE_TRIGGER.ALL : PIECE_TRIGGER.FILE
  }

  return out
}

/**
 * 由篇目数组派生计数（`counts` 的兜底口径，与构建期断言口径一致）
 * @param {Array<{role?: string}>} pieces 篇目数组
 * @returns {{all: number, lesson: number, review: number}}
 */
export function deriveCounts(pieces) {
  const rows = Array.isArray(pieces) ? pieces : []
  let review = 0
  for (const p of rows) {
    if (p && p.role === PIECE_ROLE.REVIEW) review += 1
  }
  return { all: rows.length, lesson: rows.length - review, review }
}

/**
 * 产物根规范化 + 清洗。**不可用即返回 `null`**（调用方据此判「该源不可用」，
 * 不许把半残的 bank 交给 UI —— 那会让首页显示错误的「已背 X / N」）。
 *
 * 判定不可用的情形：
 *  - 根不是对象 / `schemaVersion` 不匹配（形状代际不同，不做猜测性兼容）
 *  - `contentVersion` 不是有限数字（版本比较的唯一键，缺了就没法做双源裁决）
 *  - `pieces` 不是数组（结构缺失）
 *
 * 清洗规则：
 *  - 逐条 `normalizePiece`，丢掉不可用的（缺 fileKey / title）
 *  - 按 `order` 升序稳定排序（同等 order 保持产物原序）
 *  - `counts` **恒由篇目派生**（`deriveCounts`）；产物里声明的 `counts` **运行时一律不读**，
 *    它只服务两个用途：构建期断言对象 + 人工阅读。
 *
 * @param {unknown} raw 产物 JSON.parse 的结果
 * @returns {{
 *   schemaVersion: number,
 *   contentVersion: number,
 *   generatedAt: string,
 *   subject: string,
 *   counts: {all: number, lesson: number, review: number},
 *   pieces: Array<object>
 * } | null}
 */
export function sanitizeBank(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (Array.isArray(raw)) return null

  const schemaVersion = toIndex(raw.schemaVersion, -1)
  if (schemaVersion !== BANK_SCHEMA_VERSION) return null

  const contentVersion = typeof raw.contentVersion === 'number' ? raw.contentVersion : NaN
  if (!Number.isFinite(contentVersion)) return null

  if (!Array.isArray(raw.pieces)) return null

  const pieces = []
  for (const item of raw.pieces) {
    const piece = normalizePiece(item)
    if (isUsablePiece(piece)) pieces.push(piece)
  }
  // 稳定排序：Array.prototype.sort 在 ES2019+ 已是稳定排序，同等 order 保持产物原序
  pieces.sort((a, b) => a.order - b.order)

  /**
   * `counts` **一律由篇目派生**，不读产物里声明的值（team-lead 裁定，T01 复核后反转优先级）。
   *
   * 为什么不是「声明值优先、不全才派生」：
   *   声明值与派生值一旦**可以**不一致，就必然会有不一致的那一天。而它不一致时，
   *   运行时不会报错、也没有任何东西会报警 —— 只会把首页分母（「已背 3 / 67」里的 67）
   *   静默显示成错的数。派生 73 条篇目的成本可以忽略，所以让这条失效路径从根上不存在。
   *
   * 产物里的 `counts` 仍然要烘焙，但只服务两个用途：
   *   ① 构建期的断言对象（T02 的 `assertCounts` 拿它跟真实统计对账）；
   *   ② 人工打开 JSON 时的可读性。
   *   **运行时不用它。** 想让这里重新采用声明值，先回答："声明值与派生值不一致时谁报警？"
   */
  const counts = deriveCounts(pieces)

  const subject = toText(raw.subject, '')
  return {
    schemaVersion,
    contentVersion,
    generatedAt: toText(raw.generatedAt, ''),
    subject: subject || (pieces.length ? subjectOfPiece(pieces[0]) : ''),
    counts,
    pieces
  }
}
