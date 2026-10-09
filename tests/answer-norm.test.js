/**
 * answerNorm 纯函数单测（批 B B-1）
 * 覆盖（batch-b-tasks B-1 测试要点 ①–⑦）：
 *  - ① 评审验收锚点：0.5 == 1/2 == 0.500 == 0.50（数值容差通路）
 *  - ② LaTeX 剥离：\(a = 3\)（因为 \(2^3 = 8\)）。 → RHS 抽取路径
 *  - ③ 全半角/空格容错
 *  - ④ 语文短语首分句抽取
 *  - ⑤ 判对从严反向锚定：抽不出候选 / 映射不得制造误判
 *  - ⑥ 容差边界与相对容差（大数值）
 *  - ⑦ parseNumeric 负分数 / 假分数 / '.5' / 'π' → null / '1//2' → null / 空串 → null
 */
import { describe, it, expect } from 'vitest'
import {
  stripLatex,
  foldWidth,
  collapseSpace,
  parseNumeric,
  extractCandidates,
  normalizeAnswer,
  answerMatches,
  isFillItem
} from '@/content/answerNorm'
import { CLOZE_VARIANTS } from '@/content/clozeVariants'

describe('基础规整函数', () => {
  it('stripLatex：四种包裹形态剥壳，无包裹原样返回', () => {
    expect(stripLatex('\\(a = 3\\)')).toBe('a = 3')
    expect(stripLatex('\\[x+y\\]')).toBe('x+y')
    expect(stripLatex('$$\\frac{1}{2}$$')).toBe('\\frac{1}{2}')
    expect(stripLatex('$3$ 元')).toBe('3 元')
    expect(stripLatex('没有包裹的文本')).toBe('没有包裹的文本')
    // 组合：剥完不再二次解析（$ 单包在 $$ 后判断）
    expect(stripLatex('\\(a\\)与\\(b\\)')).toBe('a与b')
  })

  it('foldWidth：全角 ASCII 折半角、全角空格折空格、CJK 汉字不动', () => {
    expect(foldWidth('ｘ＝－１')).toBe('x=-1')
    expect(foldWidth('１２３ＡＢＣ')).toBe('123ABC')
    expect(foldWidth('（）：；？！，')).toBe('():;?!,') // 常用全角标点折半角（两侧对称，等价性不破坏）
    expect(foldWidth('１２　３４')).toBe('12 34')
    // 硬约束：CJK 汉字一字一码原样（通假字映射不被先行破坏）；。为 CJK 句号（U+3002）不在折叠区
    expect(foldWidth('不亦说乎。')).toBe('不亦说乎。')
    expect(foldWidth('海内存知己，天涯若比邻')).toBe('海内存知己,天涯若比邻')
  })

  it('collapseSpace：移除全部空白字符', () => {
    expect(collapseSpace('1 / 2')).toBe('1/2')
    expect(collapseSpace('  a　b\n c ')).toBe('abc')
  })

  it('normalizeAnswer：策略链串联 + variantMap 逐字映射（对称）', () => {
    expect(normalizeAnswer('不亦说乎', { variantMap: CLOZE_VARIANTS })).toBe('不亦悦乎')
    expect(normalizeAnswer('ｘ＝－１')).toBe('x=-1')
    expect(normalizeAnswer('Ａ Ｂ，Ｃ。')).toBe('AB,C。') // 全半角折叠后空格移除、，折半角；。为 CJK 句号保留
    expect(normalizeAnswer('')).toBe('')
  })
})

describe('parseNumeric 分数↔小数互认', () => {
  it('⑦ 十进制 / 分数 / 负数 / 前导点', () => {
    expect(parseNumeric('0.500')).toBe(0.5)
    expect(parseNumeric('.5')).toBe(0.5)
    expect(parseNumeric('1/2')).toBe(0.5)
    expect(parseNumeric('-3/4')).toBe(-0.75)
    expect(parseNumeric('4/2')).toBe(2)
    expect(parseNumeric('0.5/1')).toBe(0.5)
    expect(parseNumeric('-1.5')).toBe(-1.5)
    expect(parseNumeric('１/２')).toBe(0.5) // 全角折叠后可解析
  })

  it('⑦ 非数值一律 null：π / √2 / 1//2 / 空串 / 空白 / 分母 0', () => {
    expect(parseNumeric('π')).toBeNull()
    expect(parseNumeric('√2')).toBeNull()
    expect(parseNumeric('1//2')).toBeNull()
    expect(parseNumeric('')).toBeNull()
    expect(parseNumeric('   ')).toBeNull()
    expect(parseNumeric('1/0')).toBeNull()
    expect(parseNumeric('a=3')).toBeNull()
    expect(parseNumeric('1/2/3')).toBeNull()
  })
})

describe('extractCandidates 期望值抽取（只产候选，不判对）', () => {
  it('LaTeX 段含 = 取最右 RHS（更正 1 主路径）', () => {
    const cands = extractCandidates('\\(a = 3\\)（因为 \\(2^3 = 8\\)）。')
    expect(cands).toContain('3')
    expect(cands).toContain('8')
  })

  it('语文短语：句读切分取首分句', () => {
    const cands = extractCandidates('转折。"出淤泥而不染"中…')
    expect(cands[0]).toBe('转折')
  })

  it('尾部解说括号被剥除', () => {
    const cands = extractCandidates('3（注：任何值）')
    expect(cands[0]).toBe('3')
  })

  it('多空 / 序列类返回空数组（判对从严：第一批不判）', () => {
    expect(extractCandidates('enable → configure terminal → router rip')).toEqual([])
    expect(extractCandidates('第一空______第二空______')).toEqual([])
  })

  it('空串 / 非字符串返回空数组', () => {
    expect(extractCandidates('')).toEqual([])
    expect(extractCandidates('   ')).toEqual([])
    expect(extractCandidates(undefined)).toEqual([])
  })

  it('兜底：整串归一化结果也是候选', () => {
    expect(extractCandidates('天涯若比邻')).toContain('天涯若比邻')
  })
})

describe('answerMatches 判分唯一入口', () => {
  it('① 评审验收锚点：0.5 == 1/2 == 0.500 == 0.50 全部 matched numeric', () => {
    expect(answerMatches('0.5', '1/2')).toEqual({ matched: true, mode: 'numeric' })
    expect(answerMatches('1/2', '0.500')).toEqual({ matched: true, mode: 'numeric' })
    expect(answerMatches('0.50', '0.5')).toEqual({ matched: true, mode: 'numeric' })
  })

  it('② LaTeX 剥离：复合答案文本中抽取 RHS 后命中', () => {
    expect(answerMatches('3', '\\(a = 3\\)（因为 \\(2^3 = 8\\)）。')).toEqual({
      matched: true,
      mode: 'numeric'
    })
  })

  it('③ 全半角与空格容错', () => {
    // 分数候选先行进入数值通路（mode 由策略链自然决定，验收只锚定 matched）
    expect(answerMatches('ｘ＝－１', 'x=-1')).toEqual({ matched: true, mode: 'exact' })
    expect(answerMatches('1 / 2', '1/2').matched).toBe(true)
    expect(answerMatches('0.5', '1 / 2').matched).toBe(true)
  })

  it('④ 语文短语：首分句精确命中', () => {
    expect(answerMatches('转折', '转折。"出淤泥而不染"中…')).toEqual({
      matched: true,
      mode: 'exact'
    })
  })

  it('⑤ 反向锚定：多空/序列/抽不出候选 → matched:false（回落自评）', () => {
    expect(answerMatches('4', '\\(S_5 = \\frac{1(1-2^5)}{1-2}\\)…')).toEqual({
      matched: false,
      mode: 'none'
    })
    expect(answerMatches('随便答', 'enable → configure terminal → router rip')).toEqual({
      matched: false,
      mode: 'none'
    })
  })

  it('⑤ 反向锚定：variantMap 不得制造误判（映射只做等价替换，候选仍需比对命中）', () => {
    expect(answerMatches('悦', '说通"悦"，意为愉快。', { variantMap: CLOZE_VARIANTS })).toEqual({
      matched: false,
      mode: 'none'
    })
  })

  it('⑤ 反向锚定：形似不判对 —— 错误输入一律 none', () => {
    expect(answerMatches('0.6', '1/2')).toEqual({ matched: false, mode: 'none' })
    expect(answerMatches('', '1/2')).toEqual({ matched: false, mode: 'none' })
    expect(answerMatches('转折了', '转折。"出淤泥而不染"中…')).toEqual({
      matched: false,
      mode: 'none'
    })
  })

  it('⑥ 容差边界：|a-b| 恰等于 tol*max(1,|b|) 计 matched；超出即不计（显式 tol 隔离浮点噪声）', () => {
    expect(answerMatches('1.1', '1', { numericTol: 0.1 })).toEqual({ matched: true, mode: 'numeric' })
    expect(answerMatches('1.10001', '1', { numericTol: 0.1 }).matched).toBe(false)
    expect(answerMatches('2', '1', { numericTol: 1 })).toEqual({ matched: true, mode: 'numeric' })
  })

  it('⑥ 相对容差：大数值不被绝对容差误杀；调大 tol 可命中', () => {
    expect(answerMatches('100000001', '100000000').matched).toBe(false) // 1e8+1 vs 1e8，默认容差不命中
    expect(answerMatches('100000001', '100000000', { numericTol: 1e-8 }).matched).toBe(true)
  })

  it('通假字映射：user 与 expect 两侧对称映射后命中（cloze 场景）', () => {
    expect(answerMatches('悦', '说', { variantMap: CLOZE_VARIANTS })).toEqual({
      matched: true,
      mode: 'exact'
    })
    expect(answerMatches('不亦悦乎', '不亦说乎', { variantMap: CLOZE_VARIANTS })).toEqual({
      matched: true,
      mode: 'exact'
    })
  })
})

describe('isFillItem 形态判据', () => {
  it('type:fill 命中；无 type 但题干含 ______ 同样命中（覆盖省略 type 的存量）', () => {
    expect(isFillItem({ type: 'fill', question: '任意' })).toBe(true)
    expect(isFillItem({ question: '函数 f(x)=______ 的值是多少' })).toBe(true)
  })

  it('选择题 / 判断题 / 普通解答题不命中', () => {
    expect(isFillItem({ type: 'single', question: '下列正确的是' })).toBe(false)
    expect(isFillItem({ type: 'judge', question: '判断：1+1=2' })).toBe(false)
    expect(isFillItem({ question: '求证：三角形内角和为 180°' })).toBe(false)
    // 两个下划线不构成填空标记（≥3 才算）
    expect(isFillItem({ question: 'a__b' })).toBe(false)
  })

  it('健壮性：null / 非对象返回 false', () => {
    expect(isFillItem(null)).toBe(false)
    expect(isFillItem('fill')).toBe(false)
    expect(isFillItem({})).toBe(false)
  })
})
