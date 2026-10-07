/**
 * 区块类型单一真相源守护测试
 * 背景：区块类型清单曾在 6 处各写一份且互有出入
 *      （content-schema / validate-content / content.d.ts / BlockRenderer /
 *        UnitView 的 TOC_ICON / EditorView 的 TYPE_LABEL），
 *      导致 divider 被校验器放行却在渲染层静默空白。
 * 职责：任一处漏改或漂移，本测试立即失败并指出应该改哪里。
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BLOCK_TYPES, BLOCK_TYPES_META, BLOCK_KINDS, KIND_EXEMPT, labelOf, iconOf, kindOf
} from '@/components/blocks/blockTypes'
import { ICON_SHAPES } from '@/components/icons/lucide-paths'
import { SUBJECT_META } from '@/content/index'

const ROOT = process.cwd()
const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'content-schema.json'), 'utf-8'))

/** schema 中声明的区块类型（唯一真相源） */
const schemaTypes = schema.definitions.block.properties.type.enum
/** schema 中为每个类型给出的字段定义分支 */
const branchTypes = schema.definitions.block.allOf
  .map((b) => b.if?.properties?.type?.const)
  .filter(Boolean)
/** 从 content.d.ts 的 BlockType 联合类型中提取字面量 */
const dtsTypes = [...readFileSync(join(ROOT, 'src', 'types', 'content.d.ts'), 'utf-8')
  .split('export type BlockType =')[1]
  .split('export type')[0]
  .matchAll(/'([a-z]+)'/g)].map((m) => m[1])

const sorted = (arr) => [...arr].sort()

describe('区块类型清单一致性', () => {
  it('content-schema.json 的类型枚举无重复', () => {
    expect(schemaTypes.length).toBe(new Set(schemaTypes).size)
  })

  it('blockTypes.js 与 content-schema.json 完全一致', () => {
    expect(sorted(BLOCK_TYPES)).toEqual(sorted(schemaTypes))
  })

  it('content.d.ts 的 BlockType 联合类型与 content-schema.json 一致', () => {
    expect(sorted(new Set(dtsTypes))).toEqual(sorted(schemaTypes))
  })

  it('每个类型在 content-schema.json 中都有字段定义分支', () => {
    expect(sorted(new Set(branchTypes))).toEqual(sorted(schemaTypes))
  })

  it('每个类型都配置了中文名（供编辑器下拉使用）', () => {
    const missing = BLOCK_TYPES.filter((t) => !BLOCK_TYPES_META[t]?.label)
    expect(missing).toEqual([])
    expect(labelOf('__不存在__')).toBe('__不存在__') // 未知类型原样返回
  })

  it('iconOf 对未知类型返回空字符串（不会误进目录）', () => {
    expect(iconOf('__不存在__')).toBe('')
  })
})

describe('图标数据契约（P2-T1：icon 字段 = Lucide 名，AppIcon 渲染）', () => {
  // 引 AppIcon 的数据表做存在性校验：icon 写错名字时渲染层会静默出空 svg，
  // 在这里拦住比到页面上肉眼发现便宜得多
  it('每个区块类型的 icon 都是路径表里存在的 Lucide 名（或空串 = 不进目录）', () => {
    const bad = Object.entries(BLOCK_TYPES_META)
      .filter(([, meta]) => meta.icon && !ICON_SHAPES[meta.icon])
      .map(([type, meta]) => `${type}: ${meta.icon}`)
    expect(bad).toEqual([])
  })

  it('每个学科的 icon 都是路径表里存在的 Lucide 名', () => {
    const bad = Object.entries(SUBJECT_META)
      .filter(([, meta]) => !ICON_SHAPES[meta.icon])
      .map(([key, meta]) => `${key}: ${meta.icon}`)
    expect(bad).toEqual([])
  })

  it('icon 取值不含 emoji（UI 侧 emoji 清零，验收按文件扫描 src/ 除 content/）', () => {
    // icon 契约 = Lucide 官方名（纯 ASCII），任何非 ASCII 字符（emoji/全角）都算违约
    const emojiRe = /\P{ASCII}/u
    const all = [
      ...Object.values(BLOCK_TYPES_META).map((m) => m.icon),
      ...Object.values(SUBJECT_META).map((m) => m.icon)
    ]
    expect(all.filter((v) => emojiRe.test(v))).toEqual([])
  })
})

describe('区块类型与渲染组件的绑定', () => {
  // 单跑约 1.2s（动态 import 22 个 Vue SFC 的 transform 开销），但全量并行执行时
  // CPU 竞争会把它推过 vitest 默认 5s 上限，导致 CI 间歇性假失败。单独放宽到 30s。
  it(
    '每个类型都绑定了渲染组件',
    async () => {
      const { componentOf } = await import('@/components/blocks/registry')
      const unbound = BLOCK_TYPES.filter((t) => !componentOf(t))
      expect(unbound).toEqual([])
    },
    30000
  )

  it('未知类型不返回组件（由 BlockRenderer 渲染显式降级提示）', async () => {
    const { componentOf } = await import('@/components/blocks/registry')
    expect(componentOf('__不存在__')).toBeNull()
    expect(componentOf(undefined)).toBeNull()
  })
})

describe('布局原语（P0）', () => {
  /** schema 里的 as 取值域（布局原语种类） */
  const layoutKindEnum = schema.definitions.layoutKind.enum
  /** schema 里的参数白名单表：kind → { propKey: { enum? } } */
  const layoutProps = schema.definitions.layoutProps.properties
  /** 从 content.d.ts 的 LayoutKind 联合类型中提取字面量 */
  const dtsLayoutKind = [...readFileSync(join(ROOT, 'src', 'types', 'content.d.ts'), 'utf-8')
    .split('export type LayoutKind =')[1]
    .split('\n')[0]
    .matchAll(/'([a-z]+)'/g)].map((m) => m[1])

  it('as 的取值域是六个布局原语', () => {
    expect(sorted(layoutKindEnum)).toEqual(sorted(['grid', 'stack', 'split', 'hero', 'bleed', 'rail']))
  })

  it('每个原语都有参数白名单，且不多不少（无漂移、无遗漏）', () => {
    // 三者必须同时改：schema 的 layoutKind / layoutProps、校验器（从 schema 派生）以及 d.ts
    expect(sorted(Object.keys(layoutProps))).toEqual(sorted(layoutKindEnum))
  })

  it('content.d.ts 的 LayoutKind 与 schema 一致', () => {
    expect(sorted(new Set(dtsLayoutKind))).toEqual(sorted(layoutKindEnum))
  })

  it('layout 在 schema 中有字段定义分支（供编辑器推导表单）', () => {
    expect(branchTypes).toContain('layout')
  })

  it('layout 分支声明 as 与 children 必填', () => {
    const branch = schema.definitions.block.allOf.find(
      (b) => b.if?.properties?.type?.const === 'layout'
    )
    // 编辑器下线后 then 改成了 $ref（此前为让编辑器从 allOf 分支推导表单字段，只能内联），
    // 所以这里要解析一次引用再断言。
    const then = branch?.then?.$ref
      ? schema.definitions[branch.then.$ref.replace('#/definitions/', '')]
      : branch?.then
    expect(sorted(then?.required || [])).toEqual(['as', 'children'])
  })
})

describe('内容角色（P4-T3：data-kind 五值域）', () => {
  // 为什么钉死这张表：data-kind 是「内容角色 → 差异化样式」的唯一入口，
  // 值写错不会报错，只会导致 CSS 永远命中不到 —— 典型的静默失败。
  const kindSet = new Set(BLOCK_KINDS)

  it('每个类型都有 kind，或出现在显式豁免清单里（防新增类型漏配）', () => {
    const missing = BLOCK_TYPES.filter((t) => !BLOCK_TYPES_META[t]?.kind && !KIND_EXEMPT[t])
    expect(missing).toEqual([])
  })

  it('kind 取值不超出五值域（防手写错值）', () => {
    const bad = BLOCK_TYPES.filter((t) => {
      const k = BLOCK_TYPES_META[t]?.kind
      return k && !kindSet.has(k)
    }).map((t) => `${t}: ${BLOCK_TYPES_META[t].kind}`)
    expect(bad).toEqual([])
  })

  it('豁免清单不含未知类型（防拼写错误 / 类型删除后残留）', () => {
    const stale = Object.keys(KIND_EXEMPT).filter((t) => !BLOCK_TYPES.includes(t))
    expect(stale).toEqual([])
  })

  it('同一类型不得同时有 kind 与豁免（口径必须唯一）', () => {
    const both = Object.keys(KIND_EXEMPT).filter((t) => Boolean(BLOCK_TYPES_META[t]?.kind))
    expect(both).toEqual([])
  })

  it('每个豁免项都写了理由（失败时能直接点名，不用再翻代码）', () => {
    const noReason = Object.entries(KIND_EXEMPT)
      .filter(([, reason]) => !reason)
      .map(([t]) => t)
    expect(noReason).toEqual([])
  })

  it('kindOf 对 6 类无角色类型返回空串（模板据此省略 data-kind 属性）', () => {
    for (const t of Object.keys(KIND_EXEMPT)) {
      expect(kindOf(t)).toBe('')
    }
    // 未知类型同样无角色：宁可没有样式，也不能套错样式
    expect(kindOf('__不存在__')).toBe('')
  })

  it('五个角色都被真实类型用到（防值域里躺着永不生效的角色）', () => {
    const used = new Set(BLOCK_TYPES.map((t) => BLOCK_TYPES_META[t]?.kind).filter(Boolean))
    const unused = BLOCK_KINDS.filter((k) => !used.has(k))
    expect(unused).toEqual([])
  })
})

describe('内容角色的样式落点（源码级契约）', () => {
  // 只做「可被文本确定性判定」的断言：jsdom 不算布局、也不支持容器查询，
  // 硬写 DOM 断言只会得到一串假绿。这里钉的是两条结构性约定。
  const css = readFileSync(join(ROOT, 'src', 'assets', 'css', 'blocks.css'), 'utf-8')
  const unitView = readFileSync(join(ROOT, 'src', 'views', 'UnitView.vue'), 'utf-8')

  it('blocks.css 为五个角色各写了 [data-kind=...] 规则', () => {
    const missing = BLOCK_KINDS.filter((k) => !css.includes(`[data-kind='${k}']`))
    expect(missing).toEqual([])
  })

  it('blocks.css 不给豁免类型写任何 data-kind 规则（防误样式化）', () => {
    const offending = Object.keys(KIND_EXEMPT).filter((t) => css.includes(`[data-kind='${t}']`))
    expect(offending).toEqual([])
  })

  it('UnitView 在 .block-anchor 上绑定 data-kind，且无角色时传 null（而非空串）', () => {
    // 为什么强调 null：Vue 只在值为 null/undefined 时**省略**属性。
    // 若写成 kindOf(...) 返回 '' ，DOM 上会出现 data-kind=""，
    // 值选择器虽不会误命中，但会污染 DOM 语义（"这个块有角色，只是值是空的"）。
    expect(unitView).toMatch(/:data-kind="kindOf\(block\.type\) \|\| null"/)
    // 属性必须落在 .block-anchor 容器上，而不是内层区块元素
    expect(unitView).toMatch(/class="block-anchor"[\s\S]{0,80}:data-kind=/)
  })
})
