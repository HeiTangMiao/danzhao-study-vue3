/**
 * reciteParity —— 「产物 ↔ 内容同源」验收的测试 harness（2026-10-30 方案变更后重写）
 *
 * 原使命是 A3 的判分 parity：
 *     判分路径 A（组件 DOM）≡ 判分路径 B（`clozeJudge.gradeCloze`），对全部篇目 × 变体 × 逐空成立。
 * 2026-10-30 起本功能**不再挖空、不再判分**（内容侧 10-29 变更通知），路径 B 已经不存在，
 * 那条等式失去对象 —— 于是把它改造成同等强度的等式：
 *
 *     产物里第 N 篇的 `paragraphs` ≡ 内容页第 N 个 `knowledge` 区块的 `paragraphs` （**逐字**）
 *     产物里第 N 篇的 `fp`      ≡ `fingerprintOf(内容页第 N 个 knowledge 区块)`
 *
 * 它咬住的是同一条不变量：**「产物与内容页同源」**（构建期抽取不漏字 / 不串行 / 不错序 / 不改写）。
 * 之前那一版实际上也验了同一件事的一半 —— 只有 `blockOf` 能命中块，才能拿到 `items` 去判分；
 * 现在把"命中"升级成"逐字相等"，覆盖面比原来更严（原来不比对 `title` 之外的任何文本）。
 *
 * 四条设计纪律（沿用原 harness，第 3 条是本轮新加）：
 *  1. **只读产物，不现场扫库** —— 被测对象必须是「即将发布的那份清单」。
 *     直接 `JSON.parse` 后取 `.pieces` 是**错的**：产物键风格可能变（紧凑键 ↔ 长键），
 *     直接读会静默拿到 `undefined`（或空数组），测试从此变成永远绿的假证。
 *     故一律经 `sanitizeBank()`，并断言篇数 = `BASELINE.pieces`（数量断言是「静默丢条」的最后一道网）。
 *  2. **按产物坐标取真实内容块**，定位规则与运行时逐字一致：
 *     `page.blocks.filter(b => b.type === 'knowledge')[blockIndex]`。
 *     这一步本身就在验「构建期 knowledge 流水号」与「运行时 filter 后下标」是同一条规则 ——
 *     全设计里最容易静默错位、且肉眼绝对看不出来的一个点。
 *  3. **不在测试侧复刻构建期的抽取规则**（★ 本轮新增）：`rawParagraphs()` 刻意只做「原样读出」，
 *     不写 `.map(String)` 之类的规整。一旦复刻，两边用同一条规则时即使规则本身是错的也比对不出差异
 *     —— 那是「用同一份 bug 互相验证」。数值型段落值会让 `toEqual` 红，这正是想要的行为。
 *  4. **确定性输入，零启发式**：不猜「哪个字像错字」，比对就是逐字相等。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RECITE_BANK_PATH, sanitizeBank } from '@/content/reciteBank'
import { pageFileKeyOf } from '@/content/pageMeta'
import { BASELINE, fingerprintOf } from '../../scripts/build-recite-bank.mjs'
import { CONTENT_DIR, buildMetaIndex, importFresh } from '../../scripts/lib/load-content.mjs'

/**
 * 产物基线篇数。
 *
 * ⚠️ **不写数字**：唯一填写处是 `scripts/build-recite-bank.mjs` 的 `BASELINE.pieces`
 *    （该文件用 `import.meta.url === pathToFileURL(process.argv[1]).href` 守卫 `build()`，
 *    被 import 时**只暴露纯函数、不写 public/**，故这里引用它零副作用）。
 *
 * 为什么不在这里再写一个 `64`：`BASELINE` 是**内容快照基线**，内容侧增删背诵篇目时的
 * 正确流程是「有意识地更新 BASELINE → 重建产物 → 复核 A3 预算与复习触发」。
 * 如果本文件另写一份 64，那次**正确变更**会让这里变红、报错信息还是「期望 64，实际 65」，
 * 看起来像产物坏了 —— 假红会训练人去改数字直到变绿，这比不设防更糟。
 * 引用 BASELINE 后：忘更新 → 这里变红（绊线照旧生效）；按流程更新 → 这里自动跟随，
 * 且下面的 `describe.each` 会**自动覆盖新增的篇**（覆盖率只增不减，绝不静默缩小）。
 */
export const EXPECTED_PIECE_COUNT = BASELINE.pieces

/**
 * ① 读**产物**并清洗（唯一合法入口）。
 *
 * ⚠️ 为什么不 `JSON.parse(...).pieces` 直接返回：见文件头纪律 1。
 * ⚠️ 为什么在这里断言篇数：`sanitizeBank` 的契约是「只保证每条可用」，
 *    不保证「条目数与 JSON 一样多」（缺 `key` / 缺正文的条目会被丢弃）。少收一篇用户看得见，
 *    但少收一篇**测试不会红** —— 除非这里钉住数量。
 *
 * @returns {Array<object>} 规范化后的篇目（按 `order` 升序）
 * @throws {Error} 产物不存在 / 形状不可用 / 清洗后篇数不符
 */
export function loadPieces() {
  const file = join(process.cwd(), 'public', RECITE_BANK_PATH)
  let raw
  try {
    raw = JSON.parse(readFileSync(file, 'utf-8'))
  } catch (e) {
    throw new Error(`背诵产物读不到：${RECITE_BANK_PATH}（先跑 npm run build:recite）— ${e.message}`, {
      cause: e
    })
  }
  const bank = sanitizeBank(raw)
  if (!bank) throw new Error(`产物不可用（sanitizeBank 返回 null），先跑 npm run build:recite：${RECITE_BANK_PATH}`)
  if (bank.pieces.length !== EXPECTED_PIECE_COUNT) {
    throw new Error(
      `产物篇数与 BASELINE 不一致：期望 ${EXPECTED_PIECE_COUNT} / 实际 ${bank.pieces.length} / ` +
        `差 ${bank.pieces.length - EXPECTED_PIECE_COUNT}（基线 = scripts/build-recite-bank.mjs 的 BASELINE.pieces）。\n` +
        '两种可能，按分支处理：\n' +
        '  ① 内容侧有意增删了背诵篇目 → 先更新 BASELINE.pieces 并重建产物（node scripts/build-recite-bank.mjs），' +
        '新增篇会自动进入逐字比对（覆盖率只增不减）；\n' +
        '  ② 没人动过内容 → 说明产物损坏或被截断（缺 key / fileKey / title / 正文的条目会被 sanitizeBank 静默丢弃），' +
        '请重建后重跑；若重建仍不符，查 08-背诵专项 的 knowledge 区块是否被误删。\n' +
        `产物：${RECITE_BANK_PATH}`
    )
  }
  return bank.pieces
}

/**
 * ② 建「产物 fileKey → 内容文件」索引。
 *
 * 产物条目只带 `fileKey`（`chinese_08_01-背诵篇目`），磁盘上是
 * `chinese/08-背诵专项/01-背诵篇目.js`。两者的换算**只有** `pageFileKeyOf` 一份规则
 * （运行时 `UnitView.pageKey` 同源），这里复用它，不手拼。
 *
 * @returns {Promise<Map<string, {rel: string, meta: object}>>} key = `pageFileKeyOf(meta)`
 */
export async function buildFileIndex() {
  const metaByRel = await buildMetaIndex()
  const byFileKey = new Map()
  for (const [rel, meta] of metaByRel) {
    byFileKey.set(pageFileKeyOf(meta), { rel, meta })
  }
  return byFileKey
}

/**
 * ③ 按产物坐标取**真实内容块**（定位规则 = 运行时那一行）。
 *
 * @param {object} piece 产物篇目
 * @param {Map<string, {rel: string, meta: object}>} fileIndex `buildFileIndex()` 的产出
 * @returns {Promise<{block: object, page: object, knowledgeBlocks: Array<object>}>} 内容块、所属页面、该页全部 knowledge 块
 * @throws {Error} 文件未注册 / 块不存在（**抛错而不是返回 undefined**：静默 skip 会让本文件假绿）
 */
export async function blockOf(piece, fileIndex) {
  const entry = fileIndex.get(piece.fileKey)
  if (!entry) throw new Error(`产物 fileKey 在内容侧找不到对应文件：${piece.fileKey}`)
  const mod = await importFresh(join(CONTENT_DIR, entry.rel))
  const page = mod && mod.default ? mod.default : {}
  const blocks = Array.isArray(page.blocks) ? page.blocks : []
  // ⚠️ 2026-10-30 起数据源是 knowledge（此前是 cloze）；这里与 `RecitePieceView.load()` 必须一字不差，
  //    否则「命中另一口径的第 N 块」这种错位这里是绿的、线上是 stale 页（且不报错）。
  const knowledgeBlocks = blocks.filter((b) => b && b.type === 'knowledge')
  const block = knowledgeBlocks[piece.blockIndex]
  if (!block) {
    throw new Error(
      `块不存在：${piece.key}（${entry.rel} 的 knowledge 流水号 ${piece.blockIndex}，` +
        `共 ${knowledgeBlocks.length} 块）`
    )
  }
  return { block, page, knowledgeBlocks }
}

/**
 * ④ 内容块的正文：刻意**只做原样读出**，不做任何规整（见文件头纪律 3）。
 *
 * @param {object} block knowledge 区块
 * @returns {Array<unknown>} 原样段落数组（不是副本也不做 String() 转换）
 */
export function rawParagraphs(block) {
  const list = block && Array.isArray(block.paragraphs) ? block.paragraphs : []
  return list.slice()
}

/** ⑤ 内容指纹：直接复用构建脚本那一份 `fingerprintOf`（运行时自动迁移的唯一判据，禁止测试侧另写一份） */
export { fingerprintOf }
