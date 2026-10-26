/**
 * 挖空默写的解析 / 判分共享层（纯 ESM，零 UI、零浏览器 API）
 *
 * 背景（每日背诵 T01）：这些逻辑原先**私有**在 `src/components/blocks/ClozeBlock.vue` 的
 * `<script setup>` 里（`parseCloze` / `blankMatches` / `items` / `blanks` 四个 computed），
 * 组件外部拿不到 → 背诵功能在组件之外至少有三处需要同一份逻辑：
 *   ① 产物里的 `blankCount` / `strictCount`（scripts/build-recite-bank.mjs）
 *   ② 首页卡片「N 空」（ReciteTaskCard）
 *   ③ A3 的逐空 parity 测试
 * 不抽 = 在这三处各写一份 ≈ 直接破 H7（判分单一真相源）。
 *
 * ★ 单一真相源（H7）：本文件只提供「解析 + 判分编排」这一层，
 *   **判据本身仍然只在** `answerNorm.answerMatches` 与 `clozeVariants.CLOZE_VARIANTS` 里，
 *   本文件是**调用方**，不是第二份判据 —— 不得在此内联正则、容差常量或通假映射。
 *
 * ⚠️ 本文件刻意**零浏览器依赖**：`scripts/build-recite-bank.mjs`（T02）会在**裸 Node**
 *    下直接 import 它来算 `blankCount` / `sentenceCount`。因此这里只允许两个相对 import
 *    （`answerNorm.js` / `clozeVariants.js` 均为零依赖纯 ESM），**严禁**引入 Vue / DOM /
 *    `window` / `import.meta.glob` / `.vue` / `@/` 别名（裸 Node 解析不了别名）。
 *    与 `practiceBank.js` / `judgeDerive.js` 的文件头纪律同款。
 *
 * 回归纪律（T01 三条，改本文件前必读）：
 *  1. `parseCloze` 与 `blankMatches` 是**逐字搬运**自 ClozeBlock.vue（含正则
 *     `/\{\{([\s\S]*?)\}\}/g` 与 `blank.strict ? undefined : { variantMap: CLOZE_VARIANTS }`），
 *     连注释一起搬 —— 不得"顺手优化"。`blankMatches` 头部的 D-0 长注释是防未来有人
 *     把 strict 分支优化掉的**唯一护栏**。
 *  2. `buildClozeItems` / `flattenBlanks` 分别等价于原 `items` / `blanks` 两个 computed，
 *     产出字段（`gi` / `i` / `si` / `main` / `alts` / `strict`）一字不改 ——
 *     `ClozeBlock` 模板与 `enqueueWrongSentences` 依赖这些字段名。
 *  3. 判分结果只经 `blankMatches` 产出；`gradeCloze` 是**编排**（不新增判据）。
 */
import { answerMatches } from './answerNorm.js'
import { CLOZE_VARIANTS } from './clozeVariants.js'

/**
 * 把一段文本切成「普通文字」与「空位」两种片段
 * 未闭合的 {{ 原样保留为文字（校验器会拦下，渲染层只负责不炸）
 * @param {string} text 原始句子（可含 `{{答案}}` 标记）
 * @returns {Array<{text?: string, blank?: true, answer?: string}>} 片段数组
 */
export function parseCloze(text) {
  const segs = []
  const re = /\{\{([\s\S]*?)\}\}/g
  const src = typeof text === 'string' ? text : ''
  let last = 0
  let m
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) segs.push({ text: src.slice(last, m.index) })
    segs.push({ blank: true, answer: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < src.length) segs.push({ text: src.slice(last) })
  return segs
}

/**
 * 把 cloze 区块的 `items` 展开成渲染/判分用的句子数组（原 `items` computed 的等价实现）。
 *
 * 每句产出：`{ text, segments, alts, strict }`
 *  - `segments`：`parseCloze` 的切分结果（普通文字 / 空位）
 *  - `alts`：该句空位的其他可接受答案（与主答案并列判对；通假/异体字走 clozeVariants，勿写这里）
 *  - `strict`：句级 strict（D-0）：true → 该句禁用全局通假映射（红线句专用，见 blankMatches 注释）
 *
 * 入参过滤口径与抽取前完全一致：非对象条目丢弃、`text` 强制成字符串、`alts` 只留非空字符串。
 * @param {{items?: Array<object>}} block cloze 区块
 * @returns {Array<{text: string, segments: Array<object>, alts: string[], strict: boolean}>}
 */
export function buildClozeItems(block) {
  const raw = block && Array.isArray(block.items) ? block.items : []
  return raw
    .filter((it) => it && typeof it === 'object')
    .map((it) => ({
      text: String(it.text ?? ''),
      segments: parseCloze(String(it.text ?? '')),
      // 该句空位的其他可接受答案（与主答案并列判对；通假/异体字走 clozeVariants，勿写这里）
      alts: Array.isArray(it.alts) ? it.alts.filter((a) => typeof a === 'string' && a) : [],
      // 句级 strict（D-0）：true → 该句禁用全局通假映射（红线句专用，见 blankMatches 注释）
      strict: it.strict === true
    }))
}

/**
 * 空位平铺（跨句连续编号）——原 `blanks` computed 的等价实现。
 *
 * 字段契约（**下游依赖，勿改**）：
 *  - `gi` 全局空位序号（`values` / `results` 的下标）
 *  - `i` 所属句下标（句粒度冻结 / 错句入队按它分组）
 *  - `si` 句内片段序号（reveal 模式的 `revealed` 键 `i-si`）
 *  - `main` 主答案、`alts` 该句可接受别名、`strict` 该句是否禁通假映射（D-0）
 *
 * @param {Array<{segments?: Array<object>, alts?: string[], strict?: boolean}>} items
 *   `buildClozeItems` 的产出
 * @returns {Array<{gi: number, i: number, si: number, main: string, alts: string[], strict: boolean}>}
 */
export function flattenBlanks(items) {
  const list = []
  const rows = Array.isArray(items) ? items : []
  rows.forEach((it, i) => {
    if (!it || typeof it !== 'object') return
    // 防御性默认：`buildClozeItems` 的产出恒为数组，这里的兜底只为让本函数对任意入参
    // 都不抛异常（不改变任何既有路径的行为）。
    const segs = Array.isArray(it.segments) ? it.segments : []
    const alts = Array.isArray(it.alts) ? it.alts : []
    segs.forEach((seg, si) => {
      if (seg && seg.blank) {
        list.push({ gi: list.length, i, si, main: seg.answer, alts, strict: it.strict === true })
      }
    })
  })
  return list
}

/**
 * 单空比对：主答案命中或任一 alts 命中即算对（判分唯一入口 answerMatches，H7）。
 *
 * strict 句（D-0）：**不传 variantMap** → 只按正解 + 本句 alts 比对。
 * 为什么：全局通假表把「反→返」当作等价组，会把红线句「辗转反侧」里用户写的「返」
 * 折成「反」而误判对；strict 句绕开这张表即可判错。
 * 为什么不干脆删掉全局「反→返」键：该键是「寒暑易节，始一反焉」的合法通假，
 * 由 tests/cloze-variants.test.js 键锚定，删键会连带破坏合法通假 → 只能用句级开关解决。
 * 返回契约不变（仍返回布尔，内部读 answerMatches(...).matched）。
 *
 * @param {unknown} typed 用户输入（非字符串一律按空串处理）
 * @param {{main: string, alts: string[], strict: boolean}} blank 单个空位
 * @returns {boolean}
 */
export function blankMatches(typed, blank) {
  const t = typeof typed === 'string' ? typed : ''
  if (!t.trim()) return false
  const opts = blank.strict ? undefined : { variantMap: CLOZE_VARIANTS }
  if (answerMatches(t, blank.main, opts).matched) return true
  return blank.alts.some((a) => answerMatches(t, a, opts).matched)
}

/**
 * 一次性判分整个 cloze 区块（编排层：空位展开 → 逐空比对 → 汇总）。
 *
 * 返回契约（`RecitePieceView` 与 parity 测试的消费口径）：
 *  - `results`：与 `flattenBlanks(items)` **逐位对齐**的布尔数组
 *  - `correct`：对空数
 *  - `total`：总空数
 *  - `allCorrect`：**空篇不算全对**（`total > 0` 且全中）——
 *    否则空篇会被判「全对」推进背诵档位（T01 纪律 3 的显式约束）。
 *
 * @param {Array<object>} items `buildClozeItems` 的产出
 * @param {Array<string>} values 每空输入（下标 = `gi`）
 * @returns {{results: boolean[], correct: number, total: number, allCorrect: boolean}}
 */
export function gradeCloze(items, values) {
  const blanks = flattenBlanks(items)
  const vals = Array.isArray(values) ? values : []
  const results = blanks.map((b) => blankMatches(vals[b.gi], b))
  const correct = results.filter((r) => r === true).length
  const total = blanks.length
  return { results, correct, total, allCorrect: total > 0 && correct === total }
}
