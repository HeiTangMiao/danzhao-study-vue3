/**
 * 背诵正文的「逐字注音」解析（纯函数，零 import，可裸 Node 测试）
 *
 * 背景：内容侧交付的注音格式是**整句内联括号**——
 *   `前不见古人（qián bù jiàn gǔ rén），后不见来者（hòu bù jiàn lái zhě）。`
 * 逐字显示更利于跟读，但**不能假设每段都能对齐**：
 *   - 诗词（诗/词/曲）：逐字全注 → 汉字数 == 音节数，可一一配对；
 *   - 文言文与长篇（>150 字）：**只注难字**（多音字/生僻字/通假字）→ 前面几个字根本没注音，
 *     例如 `莫使金樽（zūn）` 是 4 个字对 1 个音节。
 *   实测全库 685 个注音片段：563 对齐（82.2%）、122 不对齐 —— 后者**是内容设计，不是脏数据**。
 *
 * 所以本模块的策略是「能对齐就逐字，对不齐就原样保留括号」：
 * 绝不为了凑整齐去挪动拼音——把 `zūn` 硬安到「莫」头上比不注音更糟（教错读音）。
 *
 * ⚠️ 为什么不用 `<ruby>` 拼 HTML 字符串再 `v-html`：
 *   本仓 CSP 虽允许内联样式，但把内容文本拼进 HTML 就多了一条注入路径；
 *   渲染层改为「解析成 token → 模板里渲染 `<ruby>`」，内容永远走文本绑定。
 */

/** 拼音合法字符集：拉丁字母 + 常见声调/变音符 + 空白（用于排除「（节选）」这类中文括号） */
const PINYIN_RE = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêńňǹḿ\s]+$/

/** 汉字串 + 全角括号注音（与内容侧交付格式一致） */
const ANNOTATED_RE = /([\u4e00-\u9fff]+)（([^）]*)）/g

/**
 * 该括号内容是否真的是拼音（而不是「（节选）」「（唐）陈子昂」这类中文说明）。
 * 只靠长度相等判断不够：`（节选）` 配上 1 个汉字时会误判成「1 字 1 音节」。
 * @param {string} s 括号内文本
 * @returns {boolean}
 */
export function looksLikePinyin(s) {
  const t = typeof s === 'string' ? s.trim() : ''
  if (!t) return false
  if (!PINYIN_RE.test(t)) return false
  // 至少要有一个元音，否则不是音节（排除纯空格、纯辅音噪声）
  return /[aeiouāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüê]/.test(t)
}

/**
 * 把一段正文解析成渲染 token 序列。
 *
 * token 形状（二选一）：
 *  - `{ type: 'ruby', chars: [{ char, pinyin }, ...] }` —— 逐字注音，可直接渲染 `<ruby>`
 *  - `{ type: 'text', text }`                          —— 普通文本（含未能对齐的原文括号）
 *
 * @param {string} text 原始段落文本
 * @returns {Array<{type: 'ruby', chars: Array<{char: string, pinyin: string}>} | {type: 'text', text: string}>}
 */
export function parseAnnotatedText(text) {
  const src = typeof text === 'string' ? text : ''
  if (!src) return []

  const out = []
  let last = 0
  ANNOTATED_RE.lastIndex = 0
  let m
  while ((m = ANNOTATED_RE.exec(src))) {
    const [whole, han, pyRaw] = m
    if (m.index > last) out.push({ type: 'text', text: src.slice(last, m.index) })

    const syllables = looksLikePinyin(pyRaw) ? pyRaw.trim().split(/\s+/).filter(Boolean) : []
    const chars = [...han]
    if (syllables.length === chars.length && chars.length > 0) {
      out.push({
        type: 'ruby',
        chars: chars.map((char, i) => ({ char, pinyin: syllables[i] }))
      })
    } else {
      // 对不齐 → 原样保留「汉字（拼音）」整体，**不猜、不挪位**
      out.push({ type: 'text', text: whole })
    }
    last = m.index + whole.length
  }
  if (last < src.length) out.push({ type: 'text', text: src.slice(last) })
  return out
}

/**
 * 统计一段文本的可逐字注音比例（诊断用：区分「诗词全注」与「长篇只注难字」）。
 * @param {string} text 段落文本
 * @returns {{total: number, ruby: number, ratio: number}} ratio 为 0~1；无注音时为 0
 */
export function annotationStats(text) {
  const tokens = parseAnnotatedText(text)
  const ruby = tokens.filter((t) => t.type === 'ruby').length
  const total = ruby + countFallbackBrackets(tokens)
  return { total, ruby, ratio: total > 0 ? ruby / total : 0 }
}

/** 统计回退成纯文本的注音括号个数（内部用） */
function countFallbackBrackets(tokens) {
  let n = 0
  for (const t of tokens) {
    if (t.type !== 'text') continue
    const hits = String(t.text).match(/[\u4e00-\u9fff]+（[^）]*）/g)
    if (hits) n += hits.length
  }
  return n
}
