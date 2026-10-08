/**
 * 判断题客观化派生（纯 ESM，零 import —— 构建脚本与浏览器两端共用）
 *
 * 背景（P0-1）：内容里的判断题普遍**不写 `type`**（数学/语文常省略），题面以「判断：」开头；
 * 也有相当一批显式 `type: 'judge'`。两类题若答案以加粗「正确。/错误。」开头，就能确定 T/F、
 * 变成可机器判分的单选题（选项固定为「正确 / 错误」）。
 *
 * ★ 单一真相源（H7）：本文件只此一份 —— `scripts/build-practice-bank.mjs`（构建期派生）
 *   与 `src/components/blocks/QuizBlock.vue`（页面内渲染期派生）都 import 它，
 *   **不得**在任一端内联第二份正则。
 *
 * ⚠️ 本文件刻意零 import：构建脚本会在裸 Node 下直接 import 它，一旦引入依赖链
 *    就会把浏览器侧代码拖进构建进程（与 practiceBank.js / searchIndex.js 同一纪律）。
 */

/** 主判据：答案以加粗「正确。/错误。」开头 → 可确定 T/F */
export const JUDGE_ANSWER_RE = /^\*\*(正确|错误)。/

/** 题型判据：type==='judge' 或题干以「判断：」开头（冒号中英文皆可，允许前导空白） */
export const JUDGE_QUESTION_RE = /^\s*判断[：:]/

/**
 * 取用于判定的「答案文本」——统一回退口径（两端必须一致）
 * 例题可能只有 solution 没有 answer，构建脚本既有回退逻辑即 answer || solution
 * @param {{answer?: string, solution?: string}} item
 * @returns {string} 非空 answer 优先，否则 solution，否则空串
 */
export function judgeAnswerOf(item) {
  if (!item || typeof item !== 'object') return ''
  if (typeof item.answer === 'string' && item.answer) return item.answer
  if (typeof item.solution === 'string') return item.solution
  return ''
}

/**
 * 该条目是否为「判断题」（**形态判据，不看答案**）
 * 先做形态判据、再看答案前缀 —— 双重校验，防止非判断题误命中（风险表 A-1 首条）
 * @param {{type?: string, question?: string}} item
 * @returns {boolean}
 */
export function isJudgeItem(item) {
  if (!item || typeof item !== 'object') return false
  if (item.type === 'judge') return true
  return typeof item.question === 'string' && JUDGE_QUESTION_RE.test(item.question)
}

/**
 * 尝试派生 T/F 客观判分形态（唯一真相源：构建脚本与 QuizBlock 都调它）
 * 前置：isJudgeItem(item) 为真 **且** 答案命中 JUDGE_ANSWER_RE
 * @param {{type?: string, question?: string, answer?: string, solution?: string}} item
 *   答案缺省时自动回退 solution（judgeAnswerOf，两端同口径）
 * @returns {{options: ['正确', '错误'], correctIndex: 0 | 1, derived: true} | null}
 *   「正确」→ correctIndex 0；「错误」→ correctIndex 1；不命中返回 null（保持原样、不判分）
 */
export function deriveJudge(item) {
  if (!isJudgeItem(item)) return null
  const m = JUDGE_ANSWER_RE.exec(judgeAnswerOf(item))
  if (!m) return null
  return { options: ['正确', '错误'], correctIndex: m[1] === '正确' ? 0 : 1, derived: true }
}

/** 例外归因：命中题干判据但答案不以加粗「正确。/错误。」开头时的细分原因 */
function exceptionReasonOf(answer) {
  if (!answer) return 'empty-answer'
  // 用「对/错」而非「正确/错误」的变体标记（如 `**对**。`）
  if (/^\*\*(对|错)/.test(answer)) return 'variant-marker'
  return 'no-bold-prefix'
}

/**
 * 例外扫描：命中 isJudgeItem 但 deriveJudge 为 null 的条目（给内容侧确认，非阻塞）
 * 输出作为构建脚本的 console.warn 落点（超限必报告纪律），不派生、不阻塞构建。
 * @param {Array<{type?: string, question?: string, answer?: string, solution?: string, k?: string, s?: string}>} items
 *   条目可携带 `k`（题库键）/`s`（学科），会原样透传到输出，便于内容侧定位
 * @returns {Array<{k?: string, s?: string, question: string, answerHead: string, reason: string}>}
 */
export function scanJudgeExceptions(items) {
  const out = []
  for (const item of items || []) {
    if (!isJudgeItem(item)) continue
    if (deriveJudge(item)) continue
    const answer = judgeAnswerOf(item)
    out.push({
      k: item.k,
      s: item.s,
      question: typeof item.question === 'string' ? item.question : '',
      answerHead: answer.slice(0, 16),
      reason: exceptionReasonOf(answer)
    })
  }
  return out
}
