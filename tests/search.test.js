/**
 * search 工具 —— 全文检索纯函数测试（阶段 7.4 起索引两级化）
 * 覆盖：标题/单元/副标题匹配、正文分片命中（含 800 字符之后的尾部内容）、
 *      未加载分片时的降级、大小写不敏感、空查询、命中上限、摘要生成、键作用域
 */
import { describe, it, expect } from 'vitest'
import { matchSearch, prepareSearchIndex } from '@/utils/search'
import { bodyKeyOf } from '@/content/searchIndex'

// meta 条目：不再含 keywords（正文一律从分片取）
const idx = [
  { subject: 'math', unitNum: '04', fileIndex: 0, unitTitle: '三角函数', title: '任意角与弧度制', subtitle: '角度弧度换算' },
  { subject: 'math', unitNum: '06', fileIndex: 0, unitTitle: '数列', title: '数列基础', subtitle: '通项公式' },
  { subject: 'chinese', unitNum: '01', fileIndex: 0, unitTitle: '语言文字运用', title: '字音字形', subtitle: '多音字形近字' }
]

// 关键：把「终边相同」挤到第 800 字符之后再出现 —— 旧索引在此处被截断，正是「77% 内容搜不到」的现场
const FILLER = '基础铺垫'.repeat(150) // 600 字
const bodies = {
  [bodyKeyOf(idx[0])]: `${FILLER}${'填充'.repeat(150)}任意角 弧度 换算 弧长公式 终边相同的角${'收尾'.repeat(60)}`,
  [bodyKeyOf(idx[1])]: '等差数列 等比数列 通项公式'
}

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

  it('按正文分片命中（该词只出现在正文里）', () => {
    const r = matchSearch(idx, '弧长公式', { bodies })
    expect(r.length).toBe(1)
    expect(r[0].unitNum).toBe('04')
  })

  it('正文出现在第 800 字符之后也能命中（旧索引在此截断）', () => {
    const body = bodies[bodyKeyOf(idx[0])]
    const pos = body.indexOf('终边相同的角')
    expect(pos, '夹具本身要保证关键词在 800 字符之后').toBeGreaterThan(800)
    const r = matchSearch(idx, '终边相同的角', { bodies })
    expect(r.length).toBe(1)
    expect(r[0].title).toBe('任意角与弧度制')
  })

  it('未加载正文分片时降级为标题级匹配（不报错、不误命中）', () => {
    expect(matchSearch(idx, '弧长公式')).toEqual([])
    expect(matchSearch(idx, '通项公式').length).toBe(1) // 副标题里也有，属标题级
  })

  it('分片键按学科作用域生效：没有该学科的键就不会命中其正文', () => {
    // bodies 只含 math 的两条，chinese 条目的正文键不存在 → 只能按标题级匹配
    expect(matchSearch(idx, '读音')).toEqual([])
  })

  it('大小写不敏感（英文/拼音场景）', () => {
    const data = [{ subject: 'math', unitNum: '1', fileIndex: 0, unitTitle: '集合', title: 'AB测试', subtitle: '' }]
    expect(matchSearch(data, 'match', { bodies: { '1/0': 'substring Match' } }).length).toBe(1)
    expect(matchSearch(data, 'ab测').length).toBe(1)
  })

  it('命中上限生效（limit）', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ subject: 'math', unitNum: String(i), fileIndex: 0, unitTitle: '单元', title: `页${i}`, subtitle: '' }))
    expect(matchSearch(many, '页', { limit: 10 }).length).toBe(10)
  })

  it('命中正文时生成摘要 snippet（取自正文，不是标题）', () => {
    const r = matchSearch(idx, '通项公式', { bodies })
    expect(r[0].snippet).toContain('通项公式')
    expect(r[0].snippet).toContain('等差数列')
  })

  it('仅标题命中时 snippet 为空（标题本身已展示，不需要再截一段）', () => {
    const r = matchSearch(idx, '字音字形')
    expect(r.length).toBe(1)
    expect(r[0].snippet).toBe('')
  })

  it('片段两端带省略号（命中处不在正文首尾时）', () => {
    const r = matchSearch(idx, '弧长公式', { bodies })
    expect(r[0].snippet.startsWith('…')).toBe(true)
    expect(r[0].snippet.endsWith('…')).toBe(true)
  })

  it('prepareSearchIndex 的预计算串必须含正文（契约：prepare 与 matchSearch 传同一份 bodies）', () => {
    const prepared = prepareSearchIndex(idx, bodies)
    // 只靠 _hay（不传 bodies）也能命中正文：证明确实把正文并进了预计算串
    expect(matchSearch(prepared, '终边相同的角').length).toBe(1)
  })
})