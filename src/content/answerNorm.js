/**
 * 答案规整与判分纯函数库（批 B，P0-2 / P0-8 共用地基）
 *
 * 策略链：剥 LaTeX → 全半角折叠 → 空白归一 → 期望值抽取 → 数值/精确比对。
 * 判对从严（batch-b-tasks §0.1）：`answerMatches` 只有命中候选值才返回 matched:true；
 * 抽取不到候选 / 比对失败一律 matched:false —— 调用方据此回落自评，绝不「形似判对」。
 *
 * ★ 单一真相源（H7）：本文件只此一份 —— practice store / ExamBlock / QuizBlock /
 *   ClozeBlock / 构建脚本都 import 它，**不得**在任一落点内联第二份正则或容差常量。
 *
 * ⚠️ 本文件刻意零 import：构建脚本会在裸 Node 下直接 import 它，一旦引入依赖链
 *    就会把浏览器侧代码拖进构建进程（与 judgeDerive.js / practiceBank.js 同一纪律）。
 */

/** 数值容差（相对误差上界）：0.5 与 1/2 的浮点表示差远小于此；可由 opts.numericTol 覆盖 */
export const DEFAULT_NUMERIC_TOL = 1e-9

/** LaTeX 包裹形态（剥壳顺序无关紧要；$ 单包必须放在 $$ 之后判断，避免误切） */
const LATEX_WRAPPED = [
  /\\\(([\s\S]*?)\\\)/g, // \( … \)
  /\\\[([\s\S]*?)\\\]/g, // \[ … \]
  /\$\$([\s\S]*?)\$\$/g, // $$ … $$
  /\$([^$\n]*?)\$/g // $ … $（禁跨行，降低误配）
]

/**
 * 剥 LaTeX 包裹：\(…\) / \[…\] / $$…$$ / $…$ → 内文；无包裹原样返回。
 * 只剥「包裹定界符」，不解析 LaTeX 语法（\frac 等原样保留，交给后续比对）。
 * @param {string} s 原文
 * @returns {string}
 */
export function stripLatex(s) {
  let out = typeof s === 'string' ? s : ''
  for (const re of LATEX_WRAPPED) {
    out = out.replace(re, (_m, inner) => inner)
  }
  return out
}

/** 全角→半角折叠区间（ASCII 可见区 + 全角空格）；区间外的 CJK 汉字一字一码，原样保留 */
const FW_BEGIN = 0xff01
const FW_END = 0xff5e
const FW_OFFSET = 0xfee0

/**
 * 全角→半角折叠：ASCII 可见字符 + 常用标点 + 全角空格；CJK 汉字不动。
 * 不折 CJK 是硬约束：通假字映射（variantMap）在折叠之后应用，先行折叠会破坏等价关系
 * （batch-b-tasks B-1 要点 1）。
 * @param {string} s 原文
 * @returns {string}
 */
export function foldWidth(s) {
  let out = ''
  for (const ch of typeof s === 'string' ? s : '') {
    const code = ch.codePointAt(0)
    if (code === 0x3000) {
      out += ' ' // 全角空格 → 半角空格（后续 collapseSpace 移除）
    } else if (code >= FW_BEGIN && code <= FW_END) {
      out += String.fromCharCode(code - FW_OFFSET)
    } else {
      out += ch
    }
  }
  return out
}

/**
 * 空白归一：移除全部空白字符（数学/语文答案中空格均无判分语义）
 * @param {string} s 原文
 * @returns {string}
 */
export function collapseSpace(s) {
  return (typeof s === 'string' ? s : '').replace(/\s+/g, '')
}

/** 数值字面量：整数 / 小数（含前导点），带可选符号 */
const NUM_RE = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/

/**
 * 分数↔小数互认：'1/2' / '-3/4' / '0.500' / '.5' → number | null
 * 仅接受严格 a/b（a、b 为整数或小数）与十进制；'π'、'√2' 等返回 null
 * （本批不做符号数值，batch-b-tasks B-1 签名注释）；分母为 0 返回 null。
 * @param {string} s 待解析串
 * @returns {number|null}
 */
export function parseNumeric(s) {
  const t = collapseSpace(foldWidth(typeof s === 'string' ? s : ''))
  if (!t) return null
  const frac = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\/([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/.exec(t)
  if (frac) {
    const a = Number(frac[1])
    const b = Number(frac[2])
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null
    return a / b
  }
  if (!NUM_RE.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/**
 * 单串全链路规整：stripLatex → foldWidth → collapseSpace → variantMap 逐（键）映射。
 * variantMap 应用时机：collapseSpace 之后、比对之前（batch-b-tasks B-1 要点 2）；
 * 键按长度降序替换，保证多字键优先于单字键。
 * @param {string} raw 原文
 * @param {{variantMap?: Record<string,string>}} [opts]
 * @returns {string}
 */
export function normalizeAnswer(raw, opts) {
  let s = collapseSpace(foldWidth(stripLatex(raw)))
  const vm = opts && opts.variantMap
  if (vm && typeof vm === 'object') {
    const keys = Object.keys(vm)
      .filter((k) => k)
      .sort((a, b) => b.length - a.length)
    for (const k of keys) {
      if (s.includes(k)) s = s.split(k).join(vm[k])
    }
  }
  return s
}

/** 句读切分符：句号 / 分号 / 感叹号 / 换行（语文短语型答案按首分句抽取） */
const SENTENCE_SPLIT_RE = /[。；;!\n]/

/** 尾部解说括号：全半角小括号（如「（因为 …）」「(注: …)」），可连续多层 */
const TRAILING_PAREN_RE = /\s*[（(][^（）()]*[）)]\s*$/

/**
 * 主值区切割符：首个句末标点（。；;！!）/ 换行 / **全角左括号（解说括号起始）**。
 * 逗号「，」**不切**（保留多值 / 连写型答案）；冒号「：」**不切**（`答案：` 标签与「…：<推导>」均需保留）。
 */
const VALUE_REGION_CUT_RE = /[。；;！!\n（]/

/** 主值区前缀标签：`答案：` / `答：`（含可选 `**` 强调包裹）——剥离后主值不再被标签黏连而漏抽 */
const ANSWER_LABEL_RE = /^(?:\*\*)?\s*(?:答案|答)\s*[:：]\s*/

/**
 * 期望值抽取（batch-b-tasks 更正 1 的核心；启发式，**只产候选、不判对**）：
 * 从「值+解析」复合答案文本抽候选值，返回 0..N 个**已规整**的规范串。
 * 步骤（有序，全去重）：
 *   0) **主值区截断**：只在首个解说边界（。；;！!/换行/全角左括号）之前抽候选，
 *      并剥前缀标签（`答案：`）与强调标记（`**`）——从源头杜绝从解析段误抽候选（§0.1）；
 *   1) 逐段剥 LaTeX：段内文含 '=' 取最右 RHS（`a = 3` → `3`）；
 *      LaTeX 外的普通文本剥尾部解说括号后按句读切分取首个非空短句
 *   2) 兜底：整串规整化结果本身也是候选
 * 多空/序列类（含 '→' 或 `___` 填空标记）→ 返回空数组（判对从严：第一批不判）。
 * 产出候选仍要走 numeric/exact 精确比对 —— 启发式只会「漏判（回落自评）」不会「误判对」。
 * @param {string} expectRaw 复合答案原文
 * @param {{variantMap?: Record<string,string>}} [opts] 规整选项（候选与 user 侧同映射，保证对称）
 * @returns {string[]}
 */
export function extractCandidates(expectRaw, opts) {
  const raw = typeof expectRaw === 'string' ? expectRaw : ''
  if (!raw.trim()) return []
  if (raw.includes('→') || /_{3,}/.test(raw)) return []

  // 主值区（判对从严的关键闸门）：「值 + 解析」复合答案的**解析段**常含数字/等式
  //   （如 `\(16\pi\)。由 \(V=…=8\) …`、`\(\log_3 9 = 2\)（因为 \(3^2 = 9\)）`）。
  //   若整串逐段抽候选，会把解析里的 8、9 当成候选 → 学生填 8/9 被**误判对**（§0.1 严禁）。
  //   故只在首个「解说边界」之前的主值区抽候选：
  //   · 边界 = 句末标点（。；;！!）/ 换行 / 全角左括号（解说括号起始）；
  //   · 截断**只删候选、不新增** → 仅可能把「判对」降级为「回落自评」，方向恒为从严；
  //   · 再剥前缀标签（`答案：`/`答：`）与强调标记（`**`），使 `答案：4` / `**590**` 的主值可被抽出。
  const cut = raw.search(VALUE_REGION_CUT_RE)
  const region = cut >= 0 ? raw.slice(0, cut) : raw
  const valueRegion = region.replace(ANSWER_LABEL_RE, '').replace(/\*\*/g, '')

  const out = []
  const seen = new Set()
  const push = (text) => {
    const norm = normalizeAnswer(text, opts)
    if (norm && !seen.has(norm)) {
      seen.add(norm)
      out.push(norm)
    }
  }

  /** LaTeX 段内文：含 '=' 取最右 RHS；否则整段作为候选 */
  const pushLatex = (inner) => {
    if (!inner) return
    const eq = inner.lastIndexOf('=')
    if (eq >= 0 && eq < inner.length - 1) {
      push(inner.slice(eq + 1))
    } else {
      push(inner)
    }
  }

  /** LaTeX 外普通文本：剥尾部解说括号（可多层）→ 句读切分取首个非空短句 */
  const pushText = (text) => {
    let t = typeof text === 'string' ? text.trim() : ''
    while (TRAILING_PAREN_RE.test(t)) t = t.replace(TRAILING_PAREN_RE, '').trim()
    if (!t) return
    const first = t.split(SENTENCE_SPLIT_RE).find((p) => p.trim())
    if (first) push(first)
  }

  // 逐段扫描主值区：LaTeX 段（\( \) \[ \] $$ $）与段间普通文本交替
  const re = /\\([\[(])([\s\S]*?)\\[\])]|\$\$([\s\S]*?)\$\$|\$([^$\n]*?)\$/g
  let last = 0
  let m
  while ((m = re.exec(valueRegion)) !== null) {
    if (m.index > last) pushText(valueRegion.slice(last, m.index))
    pushLatex(m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4])
    last = m.index + m[0].length
  }
  if (last < valueRegion.length) pushText(valueRegion.slice(last))
  push(raw) // 兜底：整串归一化结果本身也是候选
  return out
}

/**
 * 判分唯一入口（practice / ExamBlock / QuizBlock / cloze 共用）：
 *   matched=true 仅当 user 与 extractCandidates(expect) 的某候选：
 *     - 双方 parseNumeric 成功 → |a-b| <= tol*max(1,|b|)（mode:'numeric'，相对容差）
 *     - 或归一化后全等（mode:'exact'）
 *   抽取不到候选 / 全部不等 → { matched:false, mode:'none' }（调用方回落自评）
 * @param {string} userRaw 学生输入原文
 * @param {string} expectRaw 期望答案原文（可为「值+解析」复合文本）
 * @param {{numericTol?: number, variantMap?: Record<string,string>}} [opts]
 * @returns {{matched: boolean, mode: 'numeric'|'exact'|'none'}}
 */
export function answerMatches(userRaw, expectRaw, opts) {
  const tolOpt =
    opts && typeof opts.numericTol === 'number' && opts.numericTol > 0
      ? opts.numericTol
      : DEFAULT_NUMERIC_TOL
  const candidates = extractCandidates(expectRaw, opts)
  if (!candidates.length) return { matched: false, mode: 'none' }
  const userNorm = normalizeAnswer(typeof userRaw === 'string' ? userRaw : '', opts)
  if (!userNorm) return { matched: false, mode: 'none' }
  const userNum = parseNumeric(userRaw)
  for (const cand of candidates) {
    const candNum = parseNumeric(cand)
    if (userNum !== null && candNum !== null) {
      // 相对容差：大数值不被绝对容差误杀（batch-b-tasks B-1 要点 5）。
      // 容差边界（|a-b| 恰等于上界）计 matched：附 16*EPSILON 量级的浮点噪声吸收，
      // 仅吸收「数值相等、边界相切」级别的误差，不影响真实的超界差异。
      const scale = Math.max(1, Math.abs(candNum))
      const diff = Math.abs(userNum - candNum)
      if (diff <= tolOpt * scale + Number.EPSILON * 16 * scale) {
        return { matched: true, mode: 'numeric' }
      }
      continue
    }
    if (userNorm === cand) return { matched: true, mode: 'exact' }
  }
  return { matched: false, mode: 'none' }
}

/** 填空标记：连续下划线 ≥3 个（`______`）；形态判据，不看答案 */
const FILL_BLANK_RE = /_{3,}/

/**
 * 该条目是否为「填空题」（**形态判据，对齐 judgeDerive 先例**）：
 * type==='fill' 或题干含 `___` 填空标记（覆盖省略 type 的存量内容）。
 * 三落点（practice / ExamBlock / QuizBlock）与构建脚本共用同一判据，勿内联。
 * @param {{type?: string, question?: string}} item
 * @returns {boolean}
 */
export function isFillItem(item) {
  if (!item || typeof item !== 'object') return false
  if (item.type === 'fill') return true
  return typeof item.question === 'string' && FILL_BLANK_RE.test(item.question)
}
