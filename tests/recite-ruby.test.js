import { describe, it, expect } from 'vitest'
import { parseAnnotatedText, looksLikePinyin, annotationStats } from '../src/utils/reciteRuby.js'

/**
 * 逐字注音解析（2026-11-02 新增）
 *
 * 它守的不是「拼音怎么显示」，而是**不许把拼音安到错的字上**：
 * 内容侧对诗词逐字全注、对长篇只注难字，两种形态混在同一份产物里。
 * 一旦判据放宽（例如只看「括号里是字母」），`莫使金樽（zūn）` 会把 zūn 配给「莫」——
 * 教错读音比不注音糟糕得多。
 */
describe('reciteRuby · 逐字注音解析', () => {
  it('诗词逐字全注：汉字数 == 音节数 → 每个字一个 ruby token', () => {
    const tokens = parseAnnotatedText('前不见古人（qián bù jiàn gǔ rén）')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].type).toBe('ruby')
    expect(tokens[0].chars.map((c) => c.char)).toEqual(['前', '不', '见', '古', '人'])
    expect(tokens[0].chars.map((c) => c.pinyin)).toEqual(['qián', 'bù', 'jiàn', 'gǔ', 'rén'])
  })

  it('长篇只注难字（4 字对 1 音节）→ 原样保留括号，绝不挪位', () => {
    const tokens = parseAnnotatedText('莫使金樽（zūn）')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].type).toBe('text')
    expect(tokens[0].text).toBe('莫使金樽（zūn）')
  })

  it('混合文本：正文 / 可注音 / 不可注音 按序拆分，不丢字符', () => {
    const src = '庆历四年春，滕子京谪（zhé）守巴陵郡。'
    const tokens = parseAnnotatedText(src)
    // 拼接回来必须与原文逐字相等（证明没有任何字符被吞掉或重复）
    const rebuilt = tokens
      .map((t) => (t.type === 'ruby' ? t.chars.map((c) => c.char).join('') : t.text))
      .join('')
    // 「滕子京谪（zhé）」是 4 字对 1 音节 → 回退成原文括号，因此重建后仍含括号
    expect(rebuilt).toBe(src)
    expect(tokens.some((t) => t.type === 'text')).toBe(true)
  })

  it('中文说明性括号不被当成拼音（（节选））', () => {
    const tokens = parseAnnotatedText('将进酒（节选）')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].type).toBe('text')
  })

  it('单字 + 中文括号不误判（这是长度判据最容易漏的边界）', () => {
    // 「（节选）」前面恰好 1 个汉字时，若只比长度就会误判成「1 字 1 音节」
    const tokens = parseAnnotatedText('序（节选）')
    expect(tokens[0].type).toBe('text')
    expect(tokens[0].text).toBe('序（节选）')
  })

  it('朝代标注（唐）不误判', () => {
    const tokens = parseAnnotatedText('李白（唐）')
    expect(tokens[0].type).toBe('text')
  })

  it('轻声也当一个音节（衣裳 yī shang：2 字 2 音节 → 逐字对齐）', () => {
    const tokens = parseAnnotatedText('衣裳（yī shang）')
    expect(tokens[0].type).toBe('ruby')
    expect(tokens[0].chars.map((c) => c.char)).toEqual(['衣', '裳'])
    expect(tokens[0].chars.map((c) => c.pinyin)).toEqual(['yī', 'shang'])
  })

  it('空输入 / 非字符串 → 空数组（不抛错）', () => {
    expect(parseAnnotatedText('')).toEqual([])
    expect(parseAnnotatedText(null)).toEqual([])
    expect(parseAnnotatedText(undefined)).toEqual([])
    expect(parseAnnotatedText(42)).toEqual([])
  })

  it('无注音纯文本 → 单个 text token', () => {
    const tokens = parseAnnotatedText('床前明月光，疑是地上霜。')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toEqual({ type: 'text', text: '床前明月光，疑是地上霜。' })
  })

  it('looksLikePinyin：只认含元音的拉丁串', () => {
    expect(looksLikePinyin('qián bù jiàn')).toBe(true)
    expect(looksLikePinyin('lǜ')).toBe(true)
    expect(looksLikePinyin('节选')).toBe(false)
    expect(looksLikePinyin('zh')).toBe(false) // 无元音 → 不是音节
    expect(looksLikePinyin('')).toBe(false)
    expect(looksLikePinyin('   ')).toBe(false)
  })

  it('annotationStats：区分「诗词全注」与「长篇只注难字」', () => {
    const poem = annotationStats('前不见古人（qián bù jiàn gǔ rén）')
    expect(poem).toEqual({ total: 1, ruby: 1, ratio: 1 })

    const prose = annotationStats('莫使金樽（zūn）')
    expect(prose.ruby).toBe(0)
    expect(prose.total).toBe(1)
    expect(prose.ratio).toBe(0)

    const none = annotationStats('床前明月光')
    expect(none).toEqual({ total: 0, ruby: 0, ratio: 0 })
  })
})
