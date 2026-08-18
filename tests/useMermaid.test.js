/**
 * useMermaid · decorateMindmap 单测
 * 覆盖方案 B2 语义着色的核心分类逻辑，防止回归
 */
import { describe, it, expect } from 'vitest'
import { decorateMindmap } from '../src/composables/useMermaid.js'

describe('decorateMindmap 语义着色', () => {
  it('仅处理 flowchart/graph 图，其它图原样返回', () => {
    const pie = 'pie title 占比\n "A" : 40'
    expect(decorateMindmap(pie)).toBe(pie)

    const seq = 'sequenceDiagram\n A->>B: hi'
    expect(decorateMindmap(seq)).toBe(seq)
  })

  it('空值安全返回', () => {
    expect(decorateMindmap(null)).toBeNull()
    expect(decorateMindmap(undefined)).toBeUndefined()
    expect(decorateMindmap('')).toBe('')
  })

  it('为 flowchart 追加 classDef 分类（N0 序列命名 + graph LR）', () => {
    const src = `graph LR
  N0["二次函数"]
  N1["三种形式"]
  N0 --> N1
  N2["易错注意"]
  N1 --> N2
  N3["求值方法"]
  N1 --> N3
  N4["判定准则"]
  N1 --> N4`
    const out = decorateMindmap(src)
    // 分类存在
    expect(out).toContain('class N2 mmErr')
    expect(out).toContain('class N3 mmMethod')
    expect(out).toContain('class N4 mmJudge')
    expect(out).toContain('classDef mmConc')
    expect(out).toContain('classDef mmErr')
    expect(out).toContain('classDef mmMethod')
    expect(out).toContain('classDef mmJudge')
    // 常规概念走兜底
    expect(out).toContain('class N0 mmConc')
    expect(out).toContain('class N1 mmConc')
  })

  it('兼容 ROOT + 字母命名 + 边内联定义 + 结论类关键词', () => {
    const src = `graph LR
  ROOT["任意角"]
  ROOT --> A["角的概念推广"]
  A --> A1["核心结论"]
  A --> A2["易混辨析"]
  B["性质定理"]
  ROOT --> B`
    const out = decorateMindmap(src)
    expect(out).toContain('class A1 mmKey')
    expect(out).toContain('class A2 mmErr')
    expect(out).toContain('class B mmKey')
    expect(out).toContain('class ROOT mmConc')
  })

  it('keyword 优先级：易错优先于方法（同时命中时按规则顺序）', () => {
    const src = `graph TD
  N0["主题"]
  N1["易错考点列表方法"]
  N0 --> N1`
    const out = decorateMindmap(src)
    // 规则顺序：mmJudge→mmErr→mmMethod→mmKey；"易错"命中 mmErr，先于"方法"
    expect(out).toContain('class N1 mmErr')
  })

  it('不会误触发 graph 关键字本身', () => {
    const src = 'graph LR\n  N0["图例"]\n  N0 --> N1["结论"]\n  N1 --> N2["方法"]'
    const out = decorateMindmap(src)
    expect(out).toContain('class N0 mmConc')
    expect(out).toContain('class N1 mmKey')
    expect(out).toContain('class N2 mmMethod')
    // 不应把 graph 行当节点处理（不会产生非法 class）
    expect(out).not.toMatch(/class graph /)
  })
})