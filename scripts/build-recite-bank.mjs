/**
 * 每日背诵 · 篇目产物构建脚本（T02，P0）
 * 作者：engineer（Alex）
 * 目的：遍历 src/content 全部内容页的 **顶层** cloze 区块，为每一篇烘焙一张「坐标 + 计数 +
 *      角色 + 内容指纹」的卡片，产出 public/recite-bank/chinese.json，供背诵 Tab
 *      （L1 队列 / L2 单篇默写）离线消费。
 *
 * 纪律（与 build-practice-bank.mjs 同一套）：
 *  - 文件遍历与元信息一律来自 scripts/lib/load-content.mjs（collectFiles / buildMetaIndex /
 *    importFresh / relPathOf），`fileKey` 来自 pageMeta.pageFileKeyOf —— 不在本脚本手拼路径或键。
 *  - 计数**不在本脚本重新解析**：句数 / 空数 / strict 数一律走 shared 层
 *    `clozeJudge.buildClozeItems` / `flattenBlanks`（H7：判分与解析单一真相源）。
 *  - 产物形状（紧凑键 / 主键格式 / 版本号归属）来自 `reciteBank.js`；`contentVersion` **投影**
 *    `contentManifest.CONTENT_VERSION`，严禁新开独立版本号（设计 §3.4 / §7.2）。
 *  - 任何「跳过」都必须 console.warn 点名（嵌套 cloze / 未注册文件 / 加载失败 / 非语文学科），
 *    不允许静默少收 —— 少收一篇用户看得见，静默错收一篇用户看不见，两者都必须留痕。
 *  - 只读内容、只写 public/recite-bank/，不碰 src/content/ 数据页。
 *
 * ⚠️ 断言是「内容快照式硬断言」：**故意**让内容侧一改 cloze 就构建失败。
 *    73 篇 / 170 句 / 193 空 / 16 篇一句多空 是全功能的事实基线，变了必须有人重新核验
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
import { buildClozeItems, flattenBlanks } from '../src/content/clozeJudge.js'
import {
  BANK_SCHEMA_VERSION,
  BANK_DIR,
  RECITE_BANK_PATH,
  PIECE_ROLE,
  PIECE_TRIGGER,
  CLOZE_MODE_INPUT,
  pieceKeyOf,
  deriveCounts,
  sanitizeBank
} from '../src/content/reciteBank.js'

const PUBLIC_DIR = join(ROOT, 'public')
const OUT_DIR = join(PUBLIC_DIR, BANK_DIR)
const OUT_FILE = join(PUBLIC_DIR, RECITE_BANK_PATH)

/** 一期只有语文（设计 §3.4：产物根 `subject` 恒为 'chinese'） */
export const SUBJECT = 'chinese'

/**
 * 内容基线（**内容快照式硬断言**，非"参考值"）
 *
 * 这些数字是全功能的事实基线，来自 design-recitation.md §0 的本机实测复核。
 * 内容侧一旦新增 / 删减 / 调整默写篇目，本脚本会失败 —— 这是**有意设计**：
 * 篇数变了必须有人重新核验「daily 队列上限 / 复习触发 / A3 parity」是否仍然成立。
 * 复核后请同步更新本常量，并复核 design-recitation.md §0 与 PRD 的篇数口径。
 */
export const BASELINE = {
  /** 全库 page.blocks 顶层 cloze 区块数（含 reveal 篇） */
  totalClozeBlocks: 74,
  /** 被排除的 reveal 篇数（`(block.mode || 'reveal') !== 'input'`） */
  excludedReveal: 1,
  /** 产物篇目数 = totalClozeBlocks − excludedReveal */
  pieces: 73,
  /** 正课篇数（role === 'lesson'） */
  lesson: 67,
  /** 复习篇数（role === 'review'） */
  review: 6,
  /** 产物内总句数（sentenceCount 之和） */
  totalSentence: 170,
  /** 产物内总空位数（blankCount 之和。注意：不是句数，PRD 的 1.79 是句/篇） */
  totalBlank: 193,
  /** 产物内「一句多空」的篇数（blankCount > sentenceCount） */
  multiBlankPieces: 16,
  /** 全库「一句多空」的块数（含被排除的 reveal 篇，供汇总行对照） */
  multiBlankAllBlocks: 17,
  /** 产物内含 strict 句的篇内 strict 句总数（红线句，A3 用） */
  strictSentences: 1
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
 * 取 `title` + 每句 `text` + 每句 `alts`；**不取** `mode`（改名不影响内容同一性）、
 * **不取** `strict`（红线标记翻转不是内容变更）。
 *
 * 不用 crypto.subtle（异步 + 需 secure context），32 位抗碰撞对「同一文件内几十篇」足够。
 * @param {{title?: string, items?: Array<object>}} block cloze 区块
 * @returns {string} base36 指纹
 */
export function fingerprintOf(block) {
  const items = block && Array.isArray(block.items) ? block.items : []
  const src =
    String((block && block.title) || '') +
    '\u0001' +
    items
      .map((it) => {
        const text = String((it && it.text) || '')
        const alts = it && Array.isArray(it.alts) ? it.alts.join('\u0003') : ''
        return text + '\u0002' + alts
      })
      .join('\u0001')
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
export function collectClozeBlocks(blocks) {
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
      if (block.type === 'cloze') {
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
 * 单块计数：句数 / 空数 / strict 句数 —— **一律**走共享判分层，本函数不做任何文本解析。
 *
 * `strictCount` 是**句数**而非空位数（`reciteBank.PIECE_KEYS` 契约原文：「`strict:true` 的句数」，
 * 设计 §3.4 同口径）：关雎的 strict 句含 2 个空、但只算 **1 句** —— 该字段用途是
 * 「A3 筛出含红线句的篇」，按句计数才与「全库仅 1 句 strict」这个事实基线对得上。
 * @param {{items?: Array<object>}} block cloze 区块
 * @returns {{sentenceCount: number, blankCount: number, strictCount: number}}
 */
export function countBlock(block) {
  const items = buildClozeItems(block)
  const blanks = flattenBlanks(items)
  return {
    sentenceCount: items.length,
    blankCount: blanks.length,
    strictCount: items.filter((it) => it.strict === true).length
  }
}

/** 求和（负数/非数字按 0 计，避免产物字段缺失把汇总算成 NaN） */
function sumOf(rows, field) {
  return rows.reduce((acc, r) => acc + (Number.isFinite(r[field]) ? r[field] : 0), 0)
}

/**
 * 计算汇总口径（纯函数，便于单测/断言复用）。
 * lesson / review 由 `deriveCounts` 从 pieces 派生（不第二次数），保证与运行时的口径同源。
 * @param {Array<object>} pieces 产物篇目（紧凑键）
 * @param {Array<object>} blockRows 全库顶层 cloze 块（含 reveal，诊断用）
 * @returns {object} 汇总指标
 */
export function summarize(pieces, blockRows) {
  const rows = Array.isArray(pieces) ? pieces : []
  const blocks = Array.isArray(blockRows) ? blockRows : []
  const counts = deriveCounts(rows.map((p) => ({ role: p.r })))
  return {
    totalClozeBlocks: blocks.length,
    excludedReveal: blocks.filter((b) => b.mode !== CLOZE_MODE_INPUT).length,
    pieces: rows.length,
    lesson: counts.lesson,
    review: counts.review,
    totalSentence: sumOf(rows, 'sc'),
    totalBlank: sumOf(rows, 'bc'),
    multiBlankPieces: rows.filter((p) => p.bc > p.sc).length,
    multiBlankAllBlocks: blocks.filter((b) => b.bc > b.sc).length,
    strictSentences: sumOf(rows, 'stc')
  }
}

/** 按 fileKey 聚合「篇 / 句 / 空」，供断言失败时打印可定位的差异清单 */
function breakdownByFile(rows) {
  const map = new Map()
  for (const r of rows) {
    const cur = map.get(r.fk) || { fk: r.fk, ft: r.ft, n: 0, sc: 0, bc: 0, reveal: 0 }
    cur.n += 1
    cur.sc += Number.isFinite(r.sc) ? r.sc : 0
    cur.bc += Number.isFinite(r.bc) ? r.bc : 0
    if (r.mode && r.mode !== CLOZE_MODE_INPUT) cur.reveal += 1
    map.set(r.fk, cur)
  }
  return [...map.values()].map(
    (g) =>
      `${g.ft || g.fk}（${g.fk}）：${g.n} 篇 / ${g.sc} 句 / ${g.bc} 空${g.reveal ? `（含已排除 reveal ${g.reveal}）` : ''}`
  )
}

/** 「一句多空」清单（证明该字段不是摆设：这些篇的 blankCount > sentenceCount） */
function multiBlankLines(rows) {
  return rows
    .filter((r) => r.bc > r.sc)
    .map((r) => `${r.ft || r.fk} · ${r.ti}（${r.sc} 句 / ${r.bc} 空）`)
}

/** 「有正文却零空位」清单（运行时会渲染不出任何输入框，必须点名） */
function emptyBlankLines(rows) {
  return rows.filter((r) => !(r.bc > 0)).map((r) => `${r.k}（${r.ft || r.fk} · ${r.ti}）`)
}

/** 重复主键清单 */
function duplicateLines(rows) {
  const seen = new Map()
  for (const r of rows) seen.set(r.k, (seen.get(r.k) || 0) + 1)
  return [...seen.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k}（出现 ${n} 次）`)
}

/** order 不连续清单：列出「期望值 ≠ 实际值」的位置 */
function orderMismatchLines(rows) {
  const out = []
  rows.forEach((r, i) => {
    if (r.o !== i) out.push(`第 ${i} 位：期望 order=${i} / 实际 order=${r.o}（${r.k}）`)
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
  const multiLines = multiBlankLines(rows)
  const failures = []
  const add = (label, expected, actual, hints = []) => {
    if (expected === actual) return
    failures.push({ label, expected, actual, delta: actual - expected, hints })
  }

  // ① 全库块数（含 reveal）：这一项变了说明有页面新增/删除了 cloze，属于内容结构变更
  add('全库顶层 cloze 块数（含 reveal）', BASELINE.totalClozeBlocks, summary.totalClozeBlocks, [
    '全库按文件分布：',
    ...allBreakdown
  ])
  // ② 排除的 reveal 篇数
  add('排除的 reveal 块数（mode 缺省或 !== input）', BASELINE.excludedReveal, summary.excludedReveal, [
    '全库按文件分布：',
    ...allBreakdown
  ])
  // ③ 篇数 = 74 − 1
  add(
    `篇目数（全库 ${BASELINE.totalClozeBlocks} − reveal ${BASELINE.excludedReveal}）`,
    BASELINE.pieces,
    summary.pieces,
    ['产物按文件分布：', ...bankBreakdown]
  )
  // ④ 正课 / 复习
  add('lesson 篇数', BASELINE.lesson, summary.lesson, ['产物按文件分布：', ...bankBreakdown])
  add('review 篇数（title 匹配 /自测|冲关/）', BASELINE.review, summary.review, [
    '若 review 数变化，请先确认内容侧是否新增/删除了「综合自测 / 综合大冲关」块。',
    '产物按文件分布：',
    ...bankBreakdown
  ])
  // ⑤ 句数 / 空数
  add('总句数（sentenceCount 之和）', BASELINE.totalSentence, summary.totalSentence, [
    '产物按文件分布：',
    ...bankBreakdown
  ])
  add('总空位数（blankCount 之和）', BASELINE.totalBlank, summary.totalBlank, [
    '产物按文件分布：',
    ...bankBreakdown
  ])
  // ⑥ 一句多空篇数
  add('一句多空的篇数（产物内 blankCount > sentenceCount）', BASELINE.multiBlankPieces, summary.multiBlankPieces, [
    '当前产物内一句多空的篇：',
    ...multiLines
  ])
  // ⑦ 结构性不变量（与内容基线无关，永远必须成立）
  add('全库一句多空的块数（含 reveal，仅用于汇总行对照）', BASELINE.multiBlankAllBlocks, summary.multiBlankAllBlocks, [
    '全库按文件分布：',
    ...allBreakdown
  ])
  add('含 strict 句的篇内 strict 句总数', BASELINE.strictSentences, summary.strictSentences, [
    'strict 句是红线句（全库仅关雎 1 句），数字变化意味着红线标记被翻转或新增 —— 必须复核 A3 专项断言。'
  ])

  // ⑧ order 为 0..n-1 连续
  const orderIssues = orderMismatchLines(rows)
  add('order 连续（0..n-1）', 0, orderIssues.length, orderIssues.slice(0, 20))
  // ⑨ key 唯一
  const dups = duplicateLines(rows)
  add('重复主键数（key 必须唯一）', 0, dups.length, dups.slice(0, 20))
  // ⑩ 每篇 blankCount > 0（零空篇渲染不出输入框 → 用户看到空白页且无报错）
  const emptyBlanks = emptyBlankLines(rows)
  add('零空位的篇数（每篇必须 blankCount > 0）', 0, emptyBlanks.length, emptyBlanks.slice(0, 20))
  // ⑪ contentVersion 必须是有限数字（双源比较的唯一键）
  add('contentVersion 非有限数字（1 = 非法）', 0, Number.isFinite(extra.contentVersion) ? 0 : 1, [
    `期望：来自 contentManifest.CONTENT_VERSION 的有限数字 / 实际：${String(extra.contentVersion)}`
  ])
  // ⑫ 产物必须能被运行时的 sanitizeBank 认出来（否则发布后加载即「产物不可用」）
  if (extra.roundTripPieces !== undefined) {
    add('产物经 sanitizeBank 往返后的篇数', summary.pieces, extra.roundTripPieces, [
      '被 sanitizeBank 丢弃的条目（缺 key / fileKey / title，或 schemaVersion / contentVersion 不合规）：',
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
    '[recite-bank] 若内容侧确认新增/调整了默写篇目，请同步更新 scripts/build-recite-bank.mjs 顶部的 BASELINE 常量，' +
      '并复核 docs/design-recitation.md §0 与 PRD 的篇数口径（73 篇 / 170 句 / 193 空 / 16 篇一句多空）。'
  )
  lines.push('[recite-bank] 产物**未**写入磁盘（断言先于落盘，避免把不合基线的产物入库）。')
  console.error(lines.join('\n'))
}

/**
 * 采集背诵篇目（**不落盘**，供测试直接断言形状；构建入口 build() 消费它再断言 + 写盘）。
 *
 * 排除规则：`(block.mode || 'reveal') !== 'input'`（reveal 篇不能默写）。
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
 *   nonChinese: Array<{rel: string, title: string}>
 * }>}
 */
export async function collectReciteBank() {
  const metaByRel = await buildMetaIndex()
  const candidates = [] // { info, fileKey, blockIndex, piece }
  const blockRows = [] // 全库顶层 cloze 统计（含 reveal）
  const nested = []
  const unregistered = []
  const loadFailed = []
  const nonChinese = []

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
    const fileKey = pageFileKeyOf(info)
    const { topLevel, nested: nestedBlocks } = collectClozeBlocks(page.blocks)

    for (const n of nestedBlocks) {
      nested.push({ rel, fileTitle: info.title, title: n.block.title || '', depth: n.depth })
    }

    topLevel.forEach((block, blockIndex) => {
      const mode = block.mode || 'reveal'
      const title = typeof block.title === 'string' ? block.title : ''
      const { sentenceCount, blankCount, strictCount } = countBlock(block)

      // 全库统计：用于汇总行的「全库 N」与 reveal 计数（含被排除的块）
      blockRows.push({
        fk: fileKey,
        ft: info.title,
        rel,
        ti: title,
        mode,
        sc: sentenceCount,
        bc: blankCount,
        stc: strictCount
      })

      // 排除 reveal 篇（不可默写；设计 §T02 实现要点）
      if (mode !== CLOZE_MODE_INPUT) return
      // 一期只产出语文：其它学科的 cloze 不写入 chinese.json，但必须点名（不允许静默少收）
      if (info.subject !== SUBJECT) {
        nonChinese.push({ rel, title })
        return
      }

      const role = REVIEW_TITLE_RE.test(title) ? PIECE_ROLE.REVIEW : PIECE_ROLE.LESSON
      const piece = {
        k: pieceKeyOf(info.subject, fileKey, blockIndex),
        // order 在排序后统一回填（此处占位，保持产物键序稳定）
        o: 0,
        r: role,
        u: info.unitNum,
        fi: info.fileIndex,
        bi: blockIndex,
        fk: fileKey,
        ft: info.title,
        ut: info.unitTitle,
        ti: title,
        m: CLOZE_MODE_INPUT,
        sc: sentenceCount,
        bc: blankCount,
        stc: strictCount,
        fp: fingerprintOf(block)
      }
      if (role === PIECE_ROLE.REVIEW) {
        // 只有这一处按 title 判定 trigger，判定结果落进产物（运行时不猜）
        piece.tg = title.indexOf(CHALLENGE_KEYWORD) >= 0 ? PIECE_TRIGGER.ALL : PIECE_TRIGGER.FILE
      }
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
    c.piece.o = i
    return c.piece
  })

  const counts = deriveCounts(pieces.map((p) => ({ role: p.r })))
  const bank = {
    schemaVersion: BANK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    subject: SUBJECT,
    counts: { all: counts.all, lesson: counts.lesson, review: counts.review },
    pieces
  }

  return { bank, pieces, blockRows, nested, unregistered, loadFailed, nonChinese }
}

/** 打印「跳过类」告警：嵌套 cloze / 未注册文件 / 加载失败 / 非语文学科 —— 一律点名 */
function reportSkipped({ nested, unregistered, loadFailed, nonChinese }) {
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
  if (nonChinese.length) {
    console.warn(
      `[recite-bank] ⚠️ 以下 cloze 不属于 ${SUBJECT}，已跳过（一期只产出 ${RECITE_BANK_PATH}）：\n  ` +
        nonChinese.map((n) => `${n.rel} · 「${n.title || '(无标题)'}」`).join('\n  ')
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
  const droppedKeys = pieces.map((p) => p.k).filter((k) => !keptKeys.has(k))

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
      `排除 reveal ${summary.excludedReveal}；sentence ${summary.totalSentence} / blank ${summary.totalBlank}；` +
      `一句多空 ${summary.multiBlankPieces}（全库 ${summary.multiBlankAllBlocks}）；` +
      `strict ${summary.strictSentences}；contentVersion ${bank.contentVersion}；` +
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
