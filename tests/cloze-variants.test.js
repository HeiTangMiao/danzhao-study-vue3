/**
 * clozeVariants 映射表单测（批 B B-1 测试要点 ⑧）
 * 覆盖：
 *  - 映射表形状：键值均为非空字符串、单字（首批约定）、无自映射、无重复键冲突
 *  - 应用规则：normalizeAnswer 逐字映射生效（不亦说乎 → 不亦悦乎）
 *  - 对称性：user 与 expect 两侧同映射，等价组双向命中
 */
import { describe, it, expect } from 'vitest'
import { CLOZE_VARIANTS } from '@/content/clozeVariants'
import { normalizeAnswer, answerMatches } from '@/content/answerNorm'

describe('CLOZE_VARIANTS 映射表形状', () => {
  it('是普通对象且非空', () => {
    expect(CLOZE_VARIANTS).toBeTypeOf('object')
    expect(Object.keys(CLOZE_VARIANTS).length).toBeGreaterThan(0)
  })

  it('键值均为非空字符串，且无自映射（自映射等于没映射，属于数据笔误）', () => {
    for (const [k, v] of Object.entries(CLOZE_VARIANTS)) {
      expect(k, '键应为非空字符串').toBeTypeOf('string')
      expect(k.length, `键 ${k} 应非空`).toBeGreaterThan(0)
      expect(v, `键 ${k} 的值应为非空字符串`).toBeTypeOf('string')
      expect(v.length, `键 ${k} 的值应非空`).toBeGreaterThan(0)
      expect(v, `键 ${k} 不应自映射`).not.toBe(k)
    }
  })

  it('首批约定：键为单字（通假字以字为单位；多字组交内容侧 alts 承载）', () => {
    for (const k of Object.keys(CLOZE_VARIANTS)) {
      expect([...k].length, `键 ${k} 应为单字`).toBe(1)
    }
  })

  it('无重复键冲突（同一 variant 不得指向两个 canonical —— JS 对象天然去重，这里防数据合并回归）', () => {
    // JSON/对象字面量重复键会被静默覆盖，ESLint no-dupe-keys 已把关；
    // 此用例锚定「键集合与条目数一致」，防止未来从外部数据源合并时引入重复。
    const keys = Object.keys(CLOZE_VARIANTS)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('首批高频组存在：说→悦、反→返、惠→慧（内容侧增补时不得移除既有键）', () => {
    expect(CLOZE_VARIANTS['说']).toBe('悦')
    expect(CLOZE_VARIANTS['反']).toBe('返')
    expect(CLOZE_VARIANTS['惠']).toBe('慧')
  })
})

describe('映射应用规则（经 normalizeAnswer / answerMatches）', () => {
  it('normalizeAnswer 逐字映射生效（全角标点按折叠规则输出半角）', () => {
    expect(normalizeAnswer('不亦说乎', { variantMap: CLOZE_VARIANTS })).toBe('不亦悦乎')
    expect(normalizeAnswer('始一反焉', { variantMap: CLOZE_VARIANTS })).toBe('始一返焉')
    expect(normalizeAnswer('甚矣，汝之不惠', { variantMap: CLOZE_VARIANTS })).toBe('甚矣,汝之不慧')
  })

  it('收录准则反向锚定：常用字不进映射表（判对从严，防跨句误判对）', () => {
    // 知/内/见/莫/直 等常用字不得作映射键 —— 否则「海内存知己」会被错折
    for (const common of ['知', '内', '见', '莫', '直', '亡', '生', '从']) {
      expect(CLOZE_VARIANTS[common], `常用字 ${common} 不应作映射键`).toBeUndefined()
    }
    // 普通名句规整后除全角标点折叠外保持原样
    expect(normalizeAnswer('海内存知己，天涯若比邻', { variantMap: CLOZE_VARIANTS })).toBe(
      '海内存知己,天涯若比邻'
    )
  })

  it('对称性：等价组双向命中（variant 输入 vs canonical 期望、反之亦然）', () => {
    const opts = { variantMap: CLOZE_VARIANTS }
    expect(answerMatches('悦', '说', opts).matched).toBe(true)
    expect(answerMatches('说', '悦', opts).matched).toBe(true)
    expect(answerMatches('返', '反', opts).matched).toBe(true)
    expect(answerMatches('反', '返', opts).matched).toBe(true)
  })

  it('不含映射键的文本规整后保持原样（CJK 汉字不受影响，全角标点按折叠规则输出）', () => {
    expect(normalizeAnswer('海内存知己，天涯若比邻', { variantMap: CLOZE_VARIANTS })).toBe(
      '海内存知己,天涯若比邻'
    )
  })
})
