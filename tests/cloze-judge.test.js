/**
 * clozeJudge 共享判分层单测（每日背诵 T01）
 *
 * 背景：`parseCloze` / `blankMatches` 原先**私有**在 `ClozeBlock.vue` 的 `<script setup>` 里，
 * 组件外部（背诵构建脚本 / 首页「N 空」/ parity 测试）拿不到 → 只能各写一份 ≈ 破 H7。
 * T01 把这一层抽到 `src/content/clozeJudge.js`，本文件钉死「抽取没抽错」：
 *
 * 覆盖（设计 §5 T01 验收方式）：
 *  - ① `parseCloze`：未闭合 `{{` 原样保留为文本；答案两侧空白 trim；一句多空；空串
 *  - ② 14 组通假（`CLOZE_VARIANTS` 全量，不写死条数）在**非 strict** 句判对、在 **strict** 句判错
 *  - ③ 红线句专项（`关雎`「辗转反侧」）：strict 下写「返」必判错、写「反」判对；非 strict 下「返」仍判对
 *  - ④ `alts` 与主答案并集判对
 *  - ⑤ 全角→半角折叠 / 数值容差（委托 answerNorm 的既有判据）
 *  - ⑥ 空输入 / 非字符串输入判错（绝不误判对）
 *  - ⑦ `gradeCloze().results` 长度与 `flattenBlanks()` 逐位一致；`allCorrect` 只在「有空位且全中」时为真
 *       （`total === 0` 按设计 §4.3 I10 **不写用例**：那是算术约定，不是待测场景）
 *  - ⑧ 模块纯净度：**裸 Node 可 import** —— 只允许两个相对 import，不得出现 Vue / DOM / `@/` 别名
 *
 * ⚠️ 本文件**不加** `@vitest-environment jsdom`：这是刻意的 —— `clozeJudge.js` 必须能在
 *    裸 Node 下被 `scripts/build-recite-bank.mjs`（T02）直接 import。测试跑在 node 环境
 *    本身就是「无浏览器依赖」的一项证据。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parseCloze,
  buildClozeItems,
  flattenBlanks,
  blankMatches,
  gradeCloze
} from '@/content/clozeJudge'
import { CLOZE_VARIANTS } from '@/content/clozeVariants'

/** 构造单个空位（与 flattenBlanks 产出同形） */
function blankOf(main, extra) {
  return { gi: 0, i: 0, si: 0, main, alts: [], strict: false, ...(extra || {}) }
}

describe('① parseCloze：切分口径', () => {
  it('普通文字与空位交替切分，答案保留原文并 trim', () => {
    const segs = parseCloze('关关雎鸠，{{ 在河之洲 }}。窈窕淑女，{{君子好逑}}。')
    expect(segs).toEqual([
      { text: '关关雎鸠，' },
      { blank: true, answer: '在河之洲' },
      { text: '。窈窕淑女，' },
      { blank: true, answer: '君子好逑' },
      { text: '。' }
    ])
  })

  it('未闭合的 {{ 原样保留为文字（不炸、不吞字）', () => {
    expect(parseCloze('海内存知己，{{天涯若比邻')).toEqual([{ text: '海内存知己，{{天涯若比邻' }])
    expect(parseCloze('{{')).toEqual([{ text: '{{' }])
    // 只有开标记、后面还有另一半句子：整段仍是文字
    const segs = parseCloze('甲{{乙，丙}}丁{{戊')
    expect(segs).toEqual([
      { text: '甲' },
      { blank: true, answer: '乙，丙' },
      { text: '丁{{戊' }
    ])
  })

  it('空串 / 无空位 / 空答案的边界', () => {
    expect(parseCloze('')).toEqual([])
    expect(parseCloze('没有空位的一句话。')).toEqual([{ text: '没有空位的一句话。' }])
    // `{{}}` 是空答案：仍算一个空位（校验器会拦，解析层只负责不炸）
    expect(parseCloze('甲{{}}乙')).toEqual([
      { text: '甲' },
      { blank: true, answer: '' },
      { text: '乙' }
    ])
  })

  it('非字符串入参按空串处理（组件外部调用可能传 undefined）', () => {
    expect(parseCloze(undefined)).toEqual([])
    expect(parseCloze(null)).toEqual([])
  })
})

describe('② buildClozeItems / flattenBlanks：字段契约', () => {
  it('buildClozeItems 过滤非对象条目，text 强制字符串，alts 只留非空字符串', () => {
    const items = buildClozeItems({
      items: [
        null,
        'not-an-object',
        { text: '甲{{乙}}', alts: ['丙', '', 3, null], strict: true },
        { alts: ['丁'] }
      ]
    })
    expect(items).toHaveLength(2)
    expect(items[0].text).toBe('甲{{乙}}')
    expect(items[0].alts).toEqual(['丙'])
    expect(items[0].strict).toBe(true)
    // 缺 text → 空串；缺 alts → 空数组；strict 非布尔 true → false（严格 === true）
    expect(items[1].text).toBe('')
    expect(items[1].segments).toEqual([])
    expect(items[1].alts).toEqual(['丁'])
    expect(items[1].strict).toBe(false)
  })

  it('block 缺失 / items 非数组 → 空列表（不抛异常）', () => {
    expect(buildClozeItems(undefined)).toEqual([])
    expect(buildClozeItems({})).toEqual([])
    expect(buildClozeItems({ items: 'nope' })).toEqual([])
  })

  it('flattenBlanks 跨句连续编号 gi，且 i / si / main / alts / strict 逐位对齐', () => {
    const items = buildClozeItems({
      items: [
        { text: '{{甲}}。{{乙}}。', alts: ['甲2'] },
        { text: '{{丙}}。', strict: true }
      ]
    })
    const blanks = flattenBlanks(items)
    expect(blanks.map((b) => b.gi)).toEqual([0, 1, 2])
    expect(blanks.map((b) => b.main)).toEqual(['甲', '乙', '丙'])
    expect(blanks.map((b) => b.i)).toEqual([0, 0, 1])
    // si 是「句内片段序号」而非「句内第几空」：中间夹着普通文字片段，故为 0 / 2
    expect(blanks.map((b) => b.si)).toEqual([0, 2, 0])
    expect(blanks[0].alts).toEqual(['甲2'])
    expect(blanks[2].alts).toEqual([])
    expect(blanks.map((b) => b.strict)).toEqual([false, false, true])
  })

  it('flattenBlanks 对空列表 / 非数组入参返回空数组', () => {
    expect(flattenBlanks([])).toEqual([])
    expect(flattenBlanks(undefined)).toEqual([])
    expect(flattenBlanks([{ text: '无空位' }])).toEqual([])
  })
})

describe('③ 通假映射：非 strict 判对、strict 判错（CLOZE_VARIANTS 全量）', () => {
  const pairs = Object.entries(CLOZE_VARIANTS)

  it('映射表非空（回归锚：表被清空时本组用例会静默变空 → 这里先钉住条数 > 0）', () => {
    expect(pairs.length).toBeGreaterThan(0)
  })

  it.each(pairs)(
    '通假组「%s → %s」：非 strict 句判对，strict 句判错',
    (variant, canonical) => {
      const loose = blankOf(variant, { strict: false })
      const strict = blankOf(variant, { strict: true })
      // 非 strict：两侧对称映射 → 命中
      expect(blankMatches(canonical, loose), `${canonical} 应判对 ${variant}（非 strict）`).toBe(
        true
      )
      // strict：不传 variantMap → 逐字比对，不等即判错（红线）
      expect(blankMatches(canonical, strict), `${canonical} 不应判对 ${variant}（strict）`).toBe(
        false
      )
    }
  )

  it('对称性：反向（正解写变体写法、用户写课本形）在非 strict 下同样命中', () => {
    expect(blankMatches('说', blankOf('悦'))).toBe(true)
    expect(blankMatches('反', blankOf('返'))).toBe(true)
  })
})

describe('③-bis 红线句专项：关雎「辗转反侧」（设计 §1 异议 6 要求显式覆盖）', () => {
  // 与 src/content/chinese/07-默写专项/01-先秦至魏晋名篇.js 的第 2 句同形
  const redLine = {
    text: '求之不得，{{寤寐思服}}。悠哉悠哉，{{辗转反侧}}。',
    strict: true
  }

  it('strict 句：「辗转返侧」判错（通假表被绕开）', () => {
    const items = buildClozeItems({ items: [redLine] })
    const blanks = flattenBlanks(items)
    // 第 0 空 = 寤寐思服，第 1 空 = 辗转反侧
    expect(blankMatches('寤寐思服', blanks[0])).toBe(true)
    expect(blankMatches('辗转返侧', blanks[1])).toBe(false)
  })

  it('strict 句：「辗转反侧」判对', () => {
    const items = buildClozeItems({ items: [redLine] })
    const blanks = flattenBlanks(items)
    expect(blankMatches('辗转反侧', blanks[1])).toBe(true)
  })

  it('去掉 strict 后同一句写「返」判对（证明 strict 是句级开关，不是全局关表）', () => {
    const items = buildClozeItems({
      items: [{ text: redLine.text }] // 少 strict 字段
    })
    const blanks = flattenBlanks(items)
    expect(blankMatches('辗转返侧', blanks[1])).toBe(true)
  })

  it('strict 仍认本句 alts（只关通假表，不关内容侧显式声明的等价写法）', () => {
    const blank = blankOf('辗转反侧', { strict: true, alts: ['辗转反侧（异文）'] })
    expect(blankMatches('辗转反侧（异文）', blank)).toBe(true)
    expect(blankMatches('辗转返侧', blank)).toBe(false)
  })
})

describe('④ alts 与主答案并集判对', () => {
  it('命中主答案或任一 alts 都判对，未声明的写法判错', () => {
    const blank = blankOf('床前明月光', { alts: ['床前看月光'] })
    expect(blankMatches('床前明月光', blank)).toBe(true)
    expect(blankMatches('床前看月光', blank)).toBe(true)
    expect(blankMatches('床前明月', blank)).toBe(false)
  })

  it('alts 全空时只有主答案命中', () => {
    const blank = blankOf('会当凌绝顶', { alts: [] })
    expect(blankMatches('会当凌绝顶', blank)).toBe(true)
    expect(blankMatches('一览众山小', blank)).toBe(false)
  })
})

describe('⑤ 规整与容差（委托 answerNorm 既有判据，此处只锚定调用口径）', () => {
  it('全角→半角折叠：数字与字母', () => {
    expect(blankMatches('３．１４', blankOf('3.14'))).toBe(true)
    expect(blankMatches('ＡＢＣ', blankOf('ABC'))).toBe(true)
  })

  it('空白归一：句中空格不影响判定', () => {
    expect(blankMatches(' 不亦说乎 ', blankOf('不亦说乎'))).toBe(true)
    expect(blankMatches('不 亦 说 乎', blankOf('不亦说乎'))).toBe(true)
  })

  it('数值容差：1/2 与 0.5 互认', () => {
    expect(blankMatches('1/2', blankOf('0.5'))).toBe(true)
    expect(blankMatches('0.500', blankOf('0.5'))).toBe(true)
    expect(blankMatches('0.6', blankOf('0.5'))).toBe(false)
  })

  it('LaTeX 包裹被剥掉后比对', () => {
    expect(blankMatches('16', blankOf('\\(16\\)'))).toBe(true)
  })
})

describe('⑥ 空输入 / 非字符串输入一律判错（绝不误判对）', () => {
  it('空串、纯空白、undefined、null、数字、对象都判 false', () => {
    const blank = blankOf('有答案')
    expect(blankMatches('', blank)).toBe(false)
    expect(blankMatches('   ', blank)).toBe(false)
    expect(blankMatches('\n\t', blank)).toBe(false)
    expect(blankMatches(undefined, blank)).toBe(false)
    expect(blankMatches(null, blank)).toBe(false)
    expect(blankMatches(0, blank)).toBe(false)
    expect(blankMatches({}, blank)).toBe(false)
  })

  it('判分结果恒为布尔（调用方不必再判 undefined）', () => {
    expect(typeof blankMatches('对', blankOf('对'))).toBe('boolean')
    expect(typeof blankMatches('错', blankOf('对'))).toBe('boolean')
  })
})

describe('⑦ gradeCloze：编排口径与 allCorrect 边界', () => {
  const block = {
    items: [
      { text: '{{不亦说乎}}，不亦乐乎。' },
      { text: 'π ≈ {{3.14}}。' },
      { text: '{{海内存知己}}，天涯若比邻。' }
    ]
  }

  it('results 长度与 flattenBlanks 逐位一致，correct/total 自洽', () => {
    const items = buildClozeItems(block)
    const blanks = flattenBlanks(items)
    const g = gradeCloze(items, ['不亦说乎', '３．１４', '答错了'])
    expect(blanks).toHaveLength(3)
    expect(g.results).toHaveLength(blanks.length)
    expect(g.total).toBe(blanks.length)
    expect(g.results).toEqual([true, true, false])
    expect(g.correct).toBe(2)
    expect(g.allCorrect).toBe(false)
  })

  it('values 比空位少 / 为 undefined 时，缺的位判 false（不抛异常）', () => {
    const items = buildClozeItems(block)
    const g = gradeCloze(items, ['不亦说乎'])
    expect(g.results).toEqual([true, false, false])
    expect(g.correct).toBe(1)
    expect(gradeCloze(items).results).toEqual([false, false, false])
  })

  it('全对 → allCorrect true', () => {
    const items = buildClozeItems({ items: [{ text: '{{甲}}。{{乙}}。' }] })
    const g = gradeCloze(items, ['甲', '乙'])
    expect(g.correct).toBe(2)
    expect(g.allCorrect).toBe(true)
  })

  /**
   * 刻意**不写** `total === 0` 的用例（设计 §4.3 I10 / B.1）：
   * `gradeCloze` 的 `allCorrect` 已按约定写成 `total > 0 && correct === total`，
   * 而 `total === 0` 在当前内容下不可达（`validateBlock` 拦「无 `{{}}` / 空 `{{}}`」，
   * 全库 74 块实测最少 1 空）。死守卫是负债，本仓栽过 —— 约定写对即可，不为它造场景。
   */

  it('全错 → correct 0 / allCorrect false', () => {
    const items = buildClozeItems({ items: [{ text: '{{甲}}。' }] })
    const g = gradeCloze(items, ['乙'])
    expect(g).toEqual({ results: [false], correct: 0, total: 1, allCorrect: false })
  })

  it('strict 句在 gradeCloze 全链路生效（贯通到编排层，不只是 blankMatches）', () => {
    const items = buildClozeItems({
      items: [{ text: '悠哉悠哉，{{辗转反侧}}。', strict: true }]
    })
    expect(gradeCloze(items, ['辗转返侧'])).toEqual({
      results: [false],
      correct: 0,
      total: 1,
      allCorrect: false
    })
    expect(gradeCloze(items, ['辗转反侧'])).toEqual({
      results: [true],
      correct: 1,
      total: 1,
      allCorrect: true
    })
  })
})

describe('⑧ 模块纯净度：裸 Node 可 import（T02 构建脚本的硬门槛）', () => {
  const raw = readFileSync(join(process.cwd(), 'src', 'content', 'clozeJudge.js'), 'utf-8')
  /** 剥块注释后再扫描（与 tests/csp-guard.test.js 同一纪律） */
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '')

  it('只 import 两个零依赖纯 ESM 兄弟模块（answerNorm / clozeVariants）', () => {
    const importSpecs = [...code.matchAll(/^\s*import\s[\s\S]*?from\s+['"]([^'"]+)['"]/gm)].map(
      (m) => m[1]
    )
    expect(importSpecs).toEqual(['./answerNorm.js', './clozeVariants.js'])
  })

  it('不出现浏览器侧依赖：Vue / DOM / window / @ 别名 / 动态 import / import.meta', () => {
    expect(code).not.toMatch(/\bfrom\s+['"]vue['"]/)
    expect(code).not.toMatch(/['"]@\//)
    expect(code).not.toMatch(/\bwindow\./)
    expect(code).not.toMatch(/\bdocument\./)
    expect(code).not.toMatch(/\bimport\s*\(/)
    expect(code).not.toMatch(/import\.meta/)
    expect(code).not.toMatch(/\.vue['"]/)
  })

  it('判据只经 answerMatches 一处（H7）：不得内联题目要求的正则或通假表', () => {
    // `\{\{` 只允许出现在 parseCloze 的切分正则里；不得再出现第二份「判分用」正则
    expect(code).not.toMatch(/CLOZE_VARIANTS\s*=\s*\{/)
    // 通假映射只能来自 import，不得在本文件内联键值对（如 `反: '返'`）
    expect(code).not.toMatch(/反\s*:\s*['"]返['"]/)
    expect(code).not.toMatch(/说\s*:\s*['"]悦['"]/)
  })
})
