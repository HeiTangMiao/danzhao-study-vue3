/**
 * reciteParity —— A3 验收的测试 harness（设计 §5.7）
 *
 * A3 的实质不是「抽 10 篇人工对比」，而是一条可执行的等式：
 *
 *     判分路径 A（**组件 DOM**：挂载 ClozeBlock → 填 → 点提交 → 读 `.cloze-input` 的 class）
 *       ≡
 *     判分路径 B（**共享纯函数** `clozeJudge.gradeCloze`）
 *
 * 对**全部 73 篇 × 3 组确定性变体 × 逐空**成立。本文件提供这条等式的两端原料。
 *
 * 三条设计纪律：
 *  1. **只读产物，不现场扫库** —— 被测对象必须是「即将发布的那份清单」。
 *     直接 `JSON.parse` 后取 `.pieces` 是**错的**：产物键风格正在变（紧凑键 ↔ 长键），
 *     直接读会静默拿到 `undefined`（或空数组），测试从此变成永远绿的假证。
 *     故一律经 `sanitizeBank()`，并断言篇数 = 73（数量断言是「静默丢条」的最后一道网）。
 *  2. **按产物坐标取真实内容块**，定位规则与运行时逐字一致：
 *     `page.blocks.filter(b => b.type === 'cloze')[blockIndex]`。
 *     这一步本身就在验「构建期 cloze 流水号」与「运行时 filter 后下标」是同一条规则 ——
 *     全设计里最容易静默错位、且肉眼绝对看不出来的一个点。
 *  3. **确定性输入，零启发式**（不做任何「猜哪个字像错字」的猜测）：
 *     见 `variantsOf`。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ClozeBlock from '@/components/blocks/ClozeBlock.vue'
import { RECITE_BANK_PATH, sanitizeBank } from '@/content/reciteBank'
import { buildClozeItems, flattenBlanks } from '@/content/clozeJudge'
import { pageFileKeyOf } from '@/content/pageMeta'
import { BASELINE } from '../../scripts/build-recite-bank.mjs'
import { CONTENT_DIR, buildMetaIndex, importFresh } from '../../scripts/lib/load-content.mjs'

/**
 * 产物基线篇数。
 *
 * ⚠️ **不写数字**：唯一填写处是 `scripts/build-recite-bank.mjs` 的 `BASELINE.pieces`
 *    （该文件用 `import.meta.url === pathToFileURL(process.argv[1]).href` 守卫 `build()`，
 *    被 import 时**只暴露纯函数、不写 public/**，故这里引用它零副作用）。
 *
 * 为什么不在这里再写一个 `73`：`BASELINE` 是**内容快照基线**，内容侧增删默写篇目时的
 * 正确流程是「有意识地更新 BASELINE → 重建产物 → 复核 A3 预算与复习触发」。
 * 如果本文件另写一份 73，那次**正确变更**会让这里变红、报错信息还是「期望 73，实际 74」，
 * 看起来像产物坏了 —— 假红会训练人去改数字直到变绿，这比不设防更糟。
 * 引用 BASELINE 后：忘更新 → 这里变红（绊线照旧生效）；按流程更新 → 这里自动跟随，
 * 且 A3 的 `describe.each` 会**自动覆盖新增的篇**（覆盖率只增不减，绝不静默缩小）。
 */
export const EXPECTED_PIECE_COUNT = BASELINE.pieces

/** 本仓库会渲染的最大空位数（用于「空位数与 DOM 输入框数一致」的交叉校验上限） */
export const MAX_BLANKS_PER_PIECE = 64

/**
 * ① 读**产物**并清洗（唯一合法入口）。
 *
 * ⚠️ 为什么不 `JSON.parse(...).pieces` 直接返回：见文件头纪律 1。
 * ⚠️ 为什么在这里断言篇数：`sanitizeBank` 的契约是「只保证每条可用」，
 *    不保证「条目数与 JSON 一样多」（缺 `key` 的条目会被丢弃）。少收一篇用户看得见，
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
        '  ① 内容侧有意增删了默写篇目 → 先更新 BASELINE.pieces 并重建产物（node scripts/build-recite-bank.mjs），' +
        '再复核 A3 的逐空等式是否仍成立（新增篇自动进入 describe.each，覆盖率只增不减）；\n' +
        '  ② 没人动过内容 → 说明产物损坏或被截断（缺失 key / fileKey / title 的条目会被 sanitizeBank 静默丢弃），' +
        '请重建后重跑；若重建仍不符，查 src/content 的 cloze 区块是否被误删。\n' +
        `产物：${RECITE_BANK_PATH}`
    )
  }
  return bank.pieces
}

/**
 * ② 建「产物 fileKey → 内容文件」索引。
 *
 * 产物条目只带 `fileKey`（`chinese_07_01-先秦至魏晋名篇`），磁盘上是
 * `chinese/07-默写专项/01-先秦至魏晋名篇.js`。两者的换算**只有** `pageFileKeyOf` 一份规则
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
 * @returns {Promise<{block: object, page: object}>} 内容块与所属页面
 * @throws {Error} 文件未注册 / 块不存在（**抛错而不是返回 undefined**：静默 skip 会让 A3 假绿）
 */
export async function blockOf(piece, fileIndex) {
  const entry = fileIndex.get(piece.fileKey)
  if (!entry) throw new Error(`产物 fileKey 在内容侧找不到对应文件：${piece.fileKey}`)
  const mod = await importFresh(join(CONTENT_DIR, entry.rel))
  const page = mod && mod.default ? mod.default : {}
  const blocks = Array.isArray(page.blocks) ? page.blocks : []
  const clozeBlocks = blocks.filter((b) => b && b.type === 'cloze')
  const block = clozeBlocks[piece.blockIndex]
  if (!block) {
    throw new Error(
      `块不存在：${piece.key}（${entry.rel} 的 cloze 流水号 ${piece.blockIndex}，共 ${clozeBlocks.length} 块）`
    )
  }
  return { block, page }
}

/**
 * ASCII 可打印字符 → 全角（0x21..0x7E 偏移 0xFEE0）。
 * 空格**不转**：`U+3000` 是否被 `answerMatches` 的 foldWidth 吃掉属于另一回事，
 * 而 A3 要验的是「全角链路没被改坏」，不是「全角空格也该等价」—— 别给这条用例加戏。
 * @param {string} text 原文
 * @returns {string} 全角化文本
 */
export function toFullWidth(text) {
  const src = typeof text === 'string' ? text : ''
  let out = ''
  for (let i = 0; i < src.length; i++) {
    const code = src.charCodeAt(i)
    if (code >= 0x21 && code <= 0x7e) out += String.fromCharCode(code + 0xfee0)
    else out += src[i]
  }
  return out
}

/**
 * ④ 每组变体的确定性输入（设计 §5.7「怎么自动化」第 3 步）。
 *
 * 为什么用「追加一个错字」而不是「改成形近字」：形近字需要一份映射表 —— 那等于再造一份判据，
 * 而「追加字符」在 `answerMatches` 的 exact 比对下**必然不命中**，对数值型答案同样成立
 * （`parseNumeric` 失败 → 落 exact → 不等）。判定 100% 确定，不引入任何猜测。
 *
 * @param {object} block cloze 区块
 * @returns {Array<{name: string, values: string[], expect: boolean[]}>} 变体列表
 * @throws {Error} 区块没有空位（I10 说明：当前内容下不可达，出现了说明内容侧越过了校验器）
 */
export function variantsOf(block) {
  const blanks = flattenBlanks(buildClozeItems(block))
  if (!blanks.length) throw new Error(`区块没有可判分的空位：${block && block.title}`)
  const all = blanks.map((b) => b.main)

  // all：每空填主答案原文 → 期望全对
  const expectAll = blanks.map(() => true)

  // wrongOne：仅第 1 空追加一个「错」字 → 期望该空判错、其余全对
  const wrongOne = all.slice()
  wrongOne[0] = `${wrongOne[0]}错`
  const expectWrongOne = blanks.map((_, i) => i !== 0)

  // fullWidth：把 all 里的 ASCII 转全角 → 期望仍全对（验 foldWidth 链路没被改坏）
  const fullWidth = all.map(toFullWidth)

  return [
    { name: 'all', values: all, expect: expectAll },
    { name: 'wrongOne', values: wrongOne, expect: expectWrongOne },
    { name: 'fullWidth', values: fullWidth, expect: expectAll }
  ]
}

/**
 * 判分路径 A：挂载 `ClozeBlock` → 逐空填值 → 点「提交」→ 读每个 `.cloze-input` 的 class。
 *
 * 映射：`is-correct` → `true`，`is-wrong` → `false`，两者都没有 → `null`（= 未判分）。
 * 返回 `null` 意味着「提交后仍有空位没被标」，这本身就是缺陷，故原样返回给断言去炸。
 *
 * 说明：`ClozeBlock` 的判分是**同步**完成的（`blankMatches` 纯函数），
 * 只有错句入错题本是异步的 —— 故提交后 `await flushPromises()` 只为等后者，
 * 它对本函数读到的 class 没有影响（入队失败也不改判分展示，既有守卫）。
 *
 * @param {object} block cloze 区块
 * @param {string[]} values 每空输入（下标 = `gi`）
 * @param {{context?: object}} [opts] 可选页面上下文（默认空对象 → 不入错题本）
 * @returns {Promise<{results: Array<boolean|null>, inputCount: number}>} 逐空判定 + DOM 输入框数
 */
export async function domGrade(block, values, opts = {}) {
  const context = opts && opts.context ? opts.context : {}
  const wrapper = mount(ClozeBlock, { props: { block, context } })
  try {
    const inputs = wrapper.findAll('.cloze-input')
    const inputCount = inputs.length
    for (let i = 0; i < inputCount; i++) {
      await inputs[i].setValue(typeof values[i] === 'string' ? values[i] : '')
    }
    const submit = wrapper.find('.cloze-btn--primary')
    if (!submit.exists()) throw new Error('ClozeBlock 没有渲染提交按钮（input 模式契约变了？）')
    await submit.trigger('click')
    await nextTick()
    const domInputs = wrapper.findAll('.cloze-input')
    const results = domInputs.map((el) => {
      const cls = el.classes()
      if (cls.indexOf('is-correct') >= 0) return true
      if (cls.indexOf('is-wrong') >= 0) return false
      return null
    })
    return { results, inputCount }
  } finally {
    wrapper.unmount()
  }
}
