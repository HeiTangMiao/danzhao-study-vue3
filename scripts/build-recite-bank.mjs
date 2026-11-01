/**
 * 每日背诵 · 篇目产物构建脚本（T02，P0）
 * 作者：engineer（Alex）
 * 目的：遍历 **08-背诵专项** 的 `knowledge` 区块（每个区块 = 一篇完整诗词原文 + 注音），
 *      为每一篇烘焙一张「坐标 + 正文 + 角色 + 内容指纹」的卡片，
 *      产出 public/recite-bank/chinese.json，供背诵页（队列 / 单篇）离线消费。
 *
 * 纪律（与 build-practice-bank.mjs 同一套）：
 *  - 文件遍历与元信息一律来自 scripts/lib/load-content.mjs（collectFiles / buildMetaIndex /
 *    importFresh / relPathOf），`fileKey` 来自 pageMeta.pageFileKeyOf —— 不在本脚本手拼路径或键。
 *  - **不切句、不数空**：2026-10-30 起本功能**不再挖空、不再判分**（内容侧 10-29 变更通知，
 *    原「复用 cloze 挖空默写」方案作废）。正文原样取 `knowledge.paragraphs`
 *    （注音以括号内联在文本里），构建期**不做任何文本解析**。
 *  - 产物形状（**长键** / 主键格式 / 版本号归属）来自 `reciteBank.js`；每条篇目先经
 *    `normalizePiece` 归一再按 `PIECE_FIELDS` 重排落盘 —— 产物形状 === 运行时形状，
 *    「有人直接 `JSON.parse` 产物再读 `piece.fileKey`」这类错位从根上消失。
 *    `contentVersion` **投影** `contentManifest.CONTENT_VERSION`，严禁新开独立版本号（设计 §3.4 / §7.2）。
 *  - 任何「跳过」都必须 console.warn 点名（嵌套 cloze / 未注册文件 / 加载失败 / 非语文学科），
 *    不允许静默少收 —— 少收一篇用户看得见，静默错收一篇用户看不见，两者都必须留痕。
 *  - 只读内容、只写 public/recite-bank/，不碰 src/content/ 数据页。
 *
 * ⚠️ 断言是「内容快照式硬断言」：**故意**让内容侧一改篇目就构建失败。
 *    **64 篇 / lesson 64 / review 0** 是当前的事实基线（2026-10-30 随方案变更重定；
 *    原 73 篇 / 170 句 / 193 空 的 cloze 基线已随方案**作废**）。变了必须有人重新核验
 *    （见 design-recitation.md §0 与 PRD 的篇数口径）。失败信息必须能直接指导动作，
 *    所以 assertBaseline 收集**全部**失败项后一次性打印「期望 / 实际 / 差 / 差异清单」，而不是抛 assert 就退出。
 *
 * 用法：node scripts/build-recite-bank.mjs（或 npm run build:recite）
 */
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, CONTENT_DIR, collectFiles, buildMetaIndex, importFresh, relPathOf } from './lib/load-content.mjs'
import { pageFileKeyOf } from '../src/content/pageMeta.js'
import { CONTENT_VERSION } from '../src/content/contentManifest.js'
import {
  BANK_SCHEMA_VERSION,
  BANK_DIR,
  RECITE_BANK_PATH,
  PIECE_ROLE,
  PIECE_TRIGGER,
  PIECE_FIELDS,
  hasReadableBody,
  pieceKeyOf,
  normalizePiece,
  deriveCounts,
  sanitizeBank
} from '../src/content/reciteBank.js'

const PUBLIC_DIR = join(ROOT, 'public')
const OUT_DIR = join(PUBLIC_DIR, BANK_DIR)
const OUT_FILE = join(PUBLIC_DIR, RECITE_BANK_PATH)

/** 一期只有语文（设计 §3.4：产物根 `subject` 恒为 'chinese'） */
export const SUBJECT = 'chinese'

/**
 * 背诵篇目所在单元号（`src/content/chinese/08-背诵专项/`）。
 *
 * 为什么限定单元而不是「全库 knowledge 都收」：其它单元的 knowledge 是知识点讲解，
 * 不是背诵篇目，全收会把它们混进每日队列。跳过时**必须点名**（见 `reportSkipped`）——
 * 静默少收一篇，用户只会看到「今天没有背诵」，无从自查。
 */
export const RECITE_UNIT_NUM = '08'

/**
 * 内容基线（**内容快照式硬断言**，非"参考值"）
 *
 * 这些数字是全功能的事实基线，来自 design-recitation.md §0 的本机实测复核。
 * 内容侧一旦新增 / 删减 / 调整默写篇目，本脚本会失败 —— 这是**有意设计**：
 * 篇数变了必须有人重新核验「daily 队列上限 / 复习触发 / A3 parity」是否仍然成立。
 * 复核后请同步更新本常量，并复核 design-recitation.md §0 与 PRD 的篇数口径。
 */
export const BASELINE = {
  /** 08-背诵专项 的 knowledge 区块数（**唯一数据源**；其它单元的 knowledge 不收） */
  totalReciteBlocks: 64,
  /** 产物篇目数（本方案无 reveal 排除规则，等于 totalReciteBlocks） */
  pieces: 64,
  /** 正课篇数（role === 'lesson'） */
  lesson: 64,
  /** 复习篇数（role === 'review'，title 匹配 /自测|冲关/；08 单元当前为 0） */
  review: 0
}

/** 复习篇判定：title 命中「自测」或「冲关」（设计 §0 / T02 实现要点） */
const REVIEW_TITLE_RE = /自测|冲关/

/** 整轮复习篇判定：title 含「冲关」（`trigger: 'all'`，其余 review 为 `'file'`） */
const CHALLENGE_KEYWORD = '冲关'

/**
 * 内容指纹（FNV-1a 32 位 → base36，6–7 字符；设计 §3.2）
 *
 * 用途**不是校验**，而是自动迁移：主键只由坐标派生，内容搬家（插入/删除一篇、文件改名）
 * 会让坐标漂移，运行时用指纹认领旧进度（reciteBank 的 `reconcile`）。
 * 取 `title` + `paragraphs` 全文（含内联注音）；**不取**元信息字段（单元/顺序变了不是内容变更）。
 *
 * 不用 crypto.subtle（异步 + 需 secure context），32 位抗碰撞对「同一文件内几十篇」足够。
 * @param {{title?: string, items?: Array<object>}} block cloze 区块
 * @returns {string} base36 指纹
 */
export function fingerprintOf(block) {
  const paras = block && Array.isArray(block.paragraphs) ? block.paragraphs : []
  const src = String((block && block.title) || '') + '\u0001' + paras.map((p) => String(p || '')).join('\u0001')
  let h = 0x811c9dc5
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

/**
 * 在区块树里找 cloze，并按「顶层 / 嵌套」分流（纯函数，便于单测；不读盘、不写盘）。
 *
 * 下钻规则与 `build-practice-bank.walkBlocks` 同一批容器口径：任意对象的 `items`（含
 * `columns` 的数组的数组）与 `children` 都下钻 —— 遍历口径分叉会让"全库块数"这个断言失去意义。
 * cloze 是叶子：一个 cloze 的 `items` 是句子数组（`{text, alts, strict}`），不是区块，无需下钻。
 *
 * @param {Array<object>} blocks 页面区块树
 * @returns {{topLevel: Array<object>, nested: Array<{depth: number, block: object}>}}
 */
export function collectReciteBlocks(blocks) {
  const topLevel = []
  const nested = []
  const walk = (list, depth) => {
    if (!Array.isArray(list)) return
    for (const block of list) {
      // columns 的 items 是「数组的数组」，先摊平再按同样口径下钻
      if (Array.isArray(block)) {
        walk(block, depth)
        continue
      }
      if (!block || typeof block !== 'object') continue
      if (block.type === 'knowledge') {
        if (depth === 0) topLevel.push(block)
        else nested.push({ depth, block })
        continue
      }
      if (Array.isArray(block.items)) walk(block.items, depth + 1)
      if (Array.isArray(block.children)) walk(block.children, depth + 1)
    }
  }
  walk(blocks, 0)
  return { topLevel, nested }
}

/**
 * 把归一化后的篇目按 `PIECE_FIELDS` 的顺序重排（**键集合的唯一权威是 PIECE_FIELDS，不手抄**）。
 *
 * 两个作用：
 *  ① `normalizePiece` 把 `trigger` 追加在尾部（因为它是可选字段），而产物里希望它紧跟 `role`；
 *  ② 产物条目的键集合被 PIECE_FIELDS **结构性**限定 —— 任何"顺手"加进来的字段进不了产物，
 *     也就不会出现「产物有、运行时认不出」的旁路数据。
 * @param {object} piece `normalizePiece` 的产出
 * @returns {object} 键序与 PIECE_FIELDS 一致的新对象（未提供的可选字段不写）
 */
export function orderFields(piece) {
  const src = piece && typeof piece === 'object' ? piece : {}
  const out = {}
  for (const field of PIECE_FIELDS) {
    if (src[field] !== undefined) out[field] = src[field]
  }
  return out
}

/**
 * 计算汇总口径（纯函数，便于单测/断言复用）。
 * lesson / review 由 `deriveCounts` 从 pieces 派生（不第二次数），保证与运行时的口径同源。
 * @param {Array<object>} pieces 产物篇目（长键，与运行时形状一致）
 * @param {Array<object>} blockRows 全库顶层 cloze 块（含 reveal，诊断用，字段名与篇目对齐）
 * @returns {object} 汇总指标
 */
export function summarize(pieces, blockRows) {
  const rows = Array.isArray(pieces) ? pieces : []
  const blocks = Array.isArray(blockRows) ? blockRows : []
  const counts = deriveCounts(rows.map((p) => ({ role: p.role })))
  return {
    totalReciteBlocks: blocks.length,
    pieces: rows.length,
    lesson: counts.lesson,
    review: counts.review,
    totalParagraphs: rows.reduce((a, r) => a + (Array.isArray(r.paragraphs) ? r.paragraphs.length : 0), 0)
  }
}

/** 按 fileKey 聚合「篇 / 段落」，供断言失败时打印可定位的差异清单 */
function breakdownByFile(rows) {
  const map = new Map()
  for (const r of rows) {
    const cur = map.get(r.fileKey) || { fileKey: r.fileKey, fileTitle: r.fileTitle, n: 0, paras: 0 }
    cur.n += 1
    cur.paras += Array.isArray(r.paragraphs) ? r.paragraphs.length : 0
    map.set(r.fileKey, cur)
  }
  return [...map.values()].map(
    (g) => `${g.fileTitle || g.fileKey}（${g.fileKey}）：${g.n} 篇 / ${g.paras} 段`
  )
}

/** 「无正文」清单（渲染出来是空白页且不报错，必须点名）。
 *
 * ⚠️ 判据**不在此重写**：一律 import `reciteBank.hasReadableBody` —— 运行时 `isUsablePiece`
 *    用的是同一个函数。两边各写一份的后果是「运行时丢掉这篇、构建期却说没问题」，
 *    谁也不报警，空白正文就那样进了产物（历史教训：`['']` 这种形态两边都判成"有正文"）。
 */
function emptyBodyLines(rows) {
  return rows
    .filter((r) => !hasReadableBody(r.paragraphs))
    .map((r) => `${r.key}（${r.fileTitle || r.fileKey} · ${r.title}）`)
}

/** 重复主键清单 */
function duplicateLines(rows) {
  const seen = new Map()
  for (const r of rows) seen.set(r.key, (seen.get(r.key) || 0) + 1)
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k}（出现 ${n} 次）`)
}

/** order 不连续清单：列出「期望值 ≠ 实际值」的位置 */
function orderMismatchLines(rows) {
  const out = []
  rows.forEach((r, i) => {
    if (r.order !== i) out.push(`第 ${i} 位：期望 order=${i} / 实际 order=${r.order}（${r.key}）`)
  })
  return out
}

/**
 * 快照基线断言：**收集全部失败项**后交给调用方统一打印（不在第一处失败就退出，
 * 免得修一个跑一次）。返回空数组 = 通过。
 * @param {ReturnType<typeof summarize>} summary 汇总指标
 * @param {Array<object>} pieces 产物篇目（用于差异清单）
 * @param {Array<object>} blockRows 全库顶层 cloze 块（含 reveal）
 * @param {object} [extra] 附加检查输入（`roundTripPieces` / `contentVersion` / `droppedKeys`）
 * @returns {Array<{label: string, expected: *, actual: *, delta: *, hints: string[]}>}
 */
export function assertBaseline(summary, pieces, blockRows, extra = {}) {
  const rows = Array.isArray(pieces) ? pieces : []
  const blocks = Array.isArray(blockRows) ? blockRows : []
  const bankBreakdown = breakdownByFile(rows)
  const allBreakdown = breakdownByFile(blocks)
  const failures = []
  const add = (label, expected, actual, hints = []) => {
    if (expected === actual) return
    failures.push({ label, expected, actual, delta: actual - expected, hints })
  }

  // ① 08 单元 knowledge 块数（唯一数据源）：变了说明内容侧新增/删减了背诵篇目
  add('08-背诵专项 的 knowledge 块数', BASELINE.totalReciteBlocks, summary.totalReciteBlocks, [
    '全库按文件分布：',
    ...allBreakdown
  ])
  // ② 产物篇目数
  add('篇目数', BASELINE.pieces, summary.pieces, ['产物按文件分布：', ...bankBreakdown])
  // ③ 正课 / 复习
  add('lesson 篇数', BASELINE.lesson, summary.lesson, ['产物按文件分布：', ...bankBreakdown])
  add('review 篇数（title 匹配 /自测|冲关/）', BASELINE.review, summary.review, [
    '08 单元当前无复习篇；若数字变化，先确认内容侧是否新增了「综合自测 / 综合大冲关」块。',
    '产物按文件分布：',
    ...bankBreakdown
  ])
  // ④ 结构性不变量（与内容基线无关，永远必须成立）
  const orderIssues = orderMismatchLines(rows)
  add('order 连续（0..n-1）', 0, orderIssues.length, orderIssues.slice(0, 20))
  const dups = duplicateLines(rows)
  add('重复主键数（key 必须唯一）', 0, dups.length, dups.slice(0, 20))
  // ⑤ 每篇必须有正文：无正文的篇渲染出来是空白页且不报错（静默失败，必须拦在构建期）
  const emptyBody = emptyBodyLines(rows)
  add('无正文的篇数（每篇必须 paragraphs.length > 0）', 0, emptyBody.length, emptyBody.slice(0, 20))
  // ⑥ contentVersion 必须是有限数字（双源比较的唯一键）
  add('contentVersion 非有限数字（1 = 非法）', 0, Number.isFinite(extra.contentVersion) ? 0 : 1, [
    `期望：来自 contentManifest.CONTENT_VERSION 的有限数字 / 实际：${String(extra.contentVersion)}`
  ])
  // ⑦ 产物必须能被运行时的 sanitizeBank 认出来（否则发布后加载即「产物不可用」）
  if (extra.roundTripPieces !== undefined) {
    add('产物经 sanitizeBank 往返后的篇数', summary.pieces, extra.roundTripPieces, [
      '被 sanitizeBank 丢弃的条目（缺 key / fileKey / title / 正文，或版本不合规）：',
      ...(Array.isArray(extra.droppedKeys) && extra.droppedKeys.length ? extra.droppedKeys : ['（无明细）'])
    ])
  }

  return failures
}

/**
 * 打印断言失败报告：每条含「期望 / 实际 / 差」+「差异清单」，末尾附可操作指引。
 * @param {Array<object>} failures `assertBaseline` 的返回
 */
export function printFailures(failures) {
  const list = Array.isArray(failures) ? failures : []
  const lines = [
    `[recite-bank] ❌ 内容基线断言失败 ${list.length} 项（基线常量：scripts/build-recite-bank.mjs 顶部 BASELINE）`
  ]
  list.forEach((f, i) => {
    lines.push(`  ${i + 1}. ${f.label}：期望 ${f.expected} / 实际 ${f.actual} / 差 ${f.delta > 0 ? '+' : ''}${f.delta}`)
    for (const hint of f.hints || []) lines.push(`       ${hint}`)
  })
  lines.push(
    '[recite-bank] 若内容侧确认新增/调整了背诵篇目，请同步更新 scripts/build-recite-bank.mjs 顶部的 BASELINE 常量，' +
      '并复核 docs/design-recitation.md §0 与 PRD 的篇数口径（当前：64 篇 / lesson 64 / review 0）。'
  )
  lines.push('[recite-bank] 产物**未**写入磁盘（断言先于落盘，避免把不合基线的产物入库）。')
  console.error(lines.join('\n'))
}

/**
 * 采集背诵篇目（**不落盘**，供测试直接断言形状；构建入口 build() 消费它再断言 + 写盘）。
 *
 * 采集范围：**只收** `08-背诵专项`（`RECITE_UNIT_NUM`）的**顶层** `knowledge` 区块；
 *          其它单元整体跳过并点名（`otherUnits`）—— 它们的 knowledge 是知识点讲解，不是背诵篇目。
 * 无排除规则：本方案不再有 reveal 概念（不挖空、不判分），所有篇目都可展示。
 * 角色规则：`title` 匹配 `/自测|冲关/` → `role: 'review'`，否则 `'lesson'`；
 *          review 里 `title` 含「冲关」→ `trigger: 'all'`，其余 `'file'`（**只在这一处**按 title 判定，
 *          判定结果落进产物，运行时不猜）。
 *
 * @returns {Promise<{
 *   bank: object,
 *   pieces: Array<object>,
 *   blockRows: Array<object>,
 *   nested: Array<{rel: string, fileTitle: string, title: string, depth: number}>,
 *   unregistered: string[],
 *   loadFailed: Array<{rel: string, message: string}>,
 * }>}
 */
export async function collectReciteBank() {
  const metaByRel = await buildMetaIndex()
  const candidates = [] // { info, fileKey, blockIndex, piece }
  const blockRows = [] // 全库顶层 cloze 统计（含 reveal）
  const nested = []
  const unregistered = []
  const loadFailed = []
  const otherUnits = []

  for (const file of collectFiles(CONTENT_DIR)) {
    const rel = relPathOf(file)
    const info = metaByRel.get(rel)
    // 未注册进 site.js 的磁盘文件：validate:content 会拦下，这里兜底只记告警（不静默）
    if (!info) {
      unregistered.push(rel)
      continue
    }
    let page
    try {
      page = (await importFresh(file)).default
    } catch (e) {
      loadFailed.push({ rel, message: e.message })
      continue
    }
    if (!page) continue

    // fileKey 由 pageMeta 唯一真相源生成（与 UnitView 的 pageKey 同一条规则）
    // 只收「语文学科 + 08-背诵专项」。
    // ⚠️ 单元号在三个学科间**会重复**：computer_08 是数据库、math_08 是计数原理。
    //    只判 unitNum 会把它们的 knowledge 一起收进来 —— 本脚本第一次跑就吃了这个亏
    //    （实测收到 88 篇而非 64 篇，正是多算了这两个单元）。学科与单元**必须同时**限定。
    if (info.subject !== SUBJECT || String(info.unitNum) !== RECITE_UNIT_NUM) {
      otherUnits.push({ rel, title: info.title })
      continue
    }

    const fileKey = pageFileKeyOf(info)
    const { topLevel, nested: nestedBlocks } = collectReciteBlocks(page.blocks)

    for (const n of nestedBlocks) {
      nested.push({ rel, fileTitle: info.title, title: n.block.title || '', depth: n.depth })
    }

    topLevel.forEach((block, blockIndex) => {
      const title = typeof block.title === 'string' ? block.title : ''
      const paragraphs = Array.isArray(block.paragraphs)
        ? block.paragraphs.map((p) => String(p == null ? '' : p))
        : []

      // 全库统计：用于汇总行的「全库 N」；字段名与产物篇目对齐，差异清单才能一行两用
      blockRows.push({ fileKey, fileTitle: info.title, rel, title, paragraphs })


      const role = REVIEW_TITLE_RE.test(title) ? PIECE_ROLE.REVIEW : PIECE_ROLE.LESSON
      // 先组装长键原文 → `normalizePiece` 归一并补默认值（lesson 剥 trigger / review 补 'file'）
      // → `orderFields` 按 PIECE_FIELDS 重排。落盘的就是运行时形状，不是第二套形态。
      // `subject` **刻意不写进条目**：学科由产物根 `subject` 给出（T01 裁定），
      // 条目里塞一个 subject 只会让「用空 subject 拼出无人认领的 key」这条静默错误有缝可钻。
      const piece = orderFields(
        normalizePiece({
          key: pieceKeyOf(info.subject, fileKey, blockIndex),
          // order 在排序后统一回填（此处占位，顺序确定后覆盖）
          order: 0,
          role,
          // 只有这一处按 title 判定 trigger，判定结果落进产物（运行时不猜）
          trigger:
            role === PIECE_ROLE.REVIEW
              ? title.indexOf(CHALLENGE_KEYWORD) >= 0
                ? PIECE_TRIGGER.ALL
                : PIECE_TRIGGER.FILE
              : undefined,
          unitNum: info.unitNum,
          fileIndex: info.fileIndex,
          blockIndex,
          fileKey,
          fileTitle: info.title,
          unitTitle: info.unitTitle,
          title,
          paragraphs,
          fp: fingerprintOf(block)
        })
      )
      candidates.push({ info, fileKey, blockIndex, piece })
    })
  }

  // 全局顺序 = 单元号 × 文件顺序 × 页内 cloze 流水号（设计 §3.4：先秦 → 唐诗上 → … → 高频易错）
  // 显式排序而非依赖 readdirSync 的返回顺序 —— 否则产物在不同文件系统上会飘（幂等性要求）。
  candidates.sort((a, b) => {
    if (a.info.unitNum !== b.info.unitNum) return a.info.unitNum < b.info.unitNum ? -1 : 1
    if (a.info.fileIndex !== b.info.fileIndex) return a.info.fileIndex - b.info.fileIndex
    return a.blockIndex - b.blockIndex
  })

  const pieces = candidates.map((c, i) => {
    c.piece.order = i
    return c.piece
  })

  const counts = deriveCounts(pieces.map((p) => ({ role: p.role })))
  const bank = {
    schemaVersion: BANK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    subject: SUBJECT,
    counts: { all: counts.all, lesson: counts.lesson, review: counts.review },
    pieces
  }

  return { bank, pieces, blockRows, nested, unregistered, loadFailed, otherUnits }
}

/** 打印「跳过类」告警：嵌套 cloze / 未注册文件 / 加载失败 / 非语文学科 —— 一律点名 */
function reportSkipped({ nested, unregistered, loadFailed, otherUnits }) {
  if (nested.length) {
    console.warn(
      '[recite-bank] ⚠️ 以下**嵌套** cloze 已跳过（运行时按 page.blocks 顶层 cloze 流水号定位，' +
        '嵌套的定位不到；收进来背诵页会渲染失败 —— 宁可少收一篇，也不收一篇打不开的）：\n  ' +
        nested
          .map((n) => `${n.rel} · 「${n.title || '(无标题)'}」（depth=${n.depth}，所在页：${n.fileTitle}）`)
          .join('\n  ')
    )
  }
  if (unregistered.length) {
    console.warn(
      '[recite-bank] ⚠️ 以下文件未注册进 site.js，已跳过：\n  ' + unregistered.join('\n  ')
    )
  }
  if (loadFailed.length) {
    console.warn(
      '[recite-bank] ⚠️ 以下页面加载失败，已跳过：\n  ' +
        loadFailed.map((f) => `${f.rel}（${f.message}）`).join('\n  ')
    )
  }
  if (otherUnits.length) {
    console.warn(
      `[recite-bank] 以下 ${otherUnits.length} 个文件不在 ${SUBJECT}/${RECITE_UNIT_NUM}-背诵专项，已跳过` +
        '（只收「语文 + 08 单元」的 knowledge；其余或是别的学科，或是知识点讲解而非背诵篇目）：\n  ' +
        otherUnits.map((o) => `${o.rel}（${o.title}）`).join('\n  ')
    )
  }
}

async function build() {
  const collected = await collectReciteBank()
  const { bank, pieces, blockRows } = collected

  // 1) 跳过类告警先打印：它们会改变篇数，先给现场再给断言结论
  reportSkipped(collected)

  // 2) 产物必须能被运行时 sanitizeBank 认出（形状/版本契约的往返验证）
  const roundTripped = sanitizeBank(JSON.parse(JSON.stringify(bank)))
  const keptKeys = new Set(roundTripped ? roundTripped.pieces.map((p) => p.key) : [])
  const droppedKeys = pieces.map((p) => p.key).filter((k) => !keptKeys.has(k))

  // 3) 快照基线断言（全部通过才落盘）
  const summary = summarize(pieces, blockRows)
  const failures = assertBaseline(summary, pieces, blockRows, {
    contentVersion: bank.contentVersion,
    roundTripPieces: roundTripped ? roundTripped.pieces.length : -1,
    droppedKeys
  })
  if (failures.length) {
    printFailures(failures)
    process.exit(1)
  }

  // 4) 落盘（先建目录；产物键序稳定 → 除 generatedAt 外字节级幂等）
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(bank), 'utf-8')

  const kb = (statSync(OUT_FILE).size / 1024).toFixed(1)
  console.log(
    `[recite-bank] ${summary.pieces} 篇（lesson ${summary.lesson} / review ${summary.review}），` +
      `正文段落 ${summary.totalParagraphs}；contentVersion ${bank.contentVersion}；` +
      `→ ${RECITE_BANK_PATH}（${kb} KB）`
  )
}

// 直接执行时构建并落盘；被测试 import 时只暴露纯函数（避免一 import 就写 public/）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error('[recite-bank] 生成失败:', e)
    process.exit(1)
  })
}
