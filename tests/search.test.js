/**
 * search 工具 —— 全文检索纯函数测试
 * 覆盖：标题/单元/正文匹配、大小写不敏感、空查询、命中上限、摘要生成
 */
import { describe, it, expect } from 'vitest'
import { matchSearch } from '@/utils/search'

const idx = [
  { subject: 'math', unitNum: '04', fileIndex: 0, unitTitle: '三角函数', title: '任意角与弧度制', subtitle: '角度弧度换算', keywords: '任意角 弧度 换算 弧长公式' },
  { subject: 'math', unitNum: '06', fileIndex: 0, unitTitle: '数列', title: '数列基础', subtitle: '通项公式', keywords: '等差数列 等比数列 通项公式' },
  { subject: 'chinese', unitNum: '01', fileIndex: 0, unitTitle: '语言文字运用', title: '字音字形', subtitle: '多音字形近字', keywords: '读音 字形 辨析' }
]

describe('matchSearch - 关键词匹配', () => {
  it('空查询返回空数组', () => {
    expect(matchSearch(idx, '')).toEqual([])
    expect(matchSearch(idx, '   ')).toEqual([])
  })

  it('按标题子串命中', () => {
    const r = matchSearch(idx, '数列')
    expect(r.length).toBe(1)
    expect(r[0].title).toBe('数列基础')
  })

  it('按正文关键词命中', () => {
    const r = matchSearch(idx, '弧度')
    expect(r.length).toBe(1)
    expect(r[0].unitNum).toBe('04')
  })

  it('大小写不敏感（英文/拼音场景）', () => {
    const data = [{ subject: 'math', unitNum: '1', fileIndex: 0, unitTitle: '集合', title: 'AB测试', subtitle: '', keywords: 'substring Match' }]
    expect(matchSearch(data, 'match').length).toBe(1)
    expect(matchSearch(data, 'ab测').length).toBe(1)
  })

  it('命中上限生效（limit）', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ subject: 'math', unitNum: String(i), fileIndex: 0, unitTitle: '单元', title: `页${i}`, subtitle: '', keywords: 'abc 通用内容' }))
    expect(matchSearch(many, 'abc', 10).length).toBe(10)
  })

  it('命中时生成正文摘要 snippet', () => {
    const r = matchSearch(idx, '通项公式')
    expect(r[0].snippet).toContain('通项公式')
  })
})