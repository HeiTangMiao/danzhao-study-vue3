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
import { BLOCK_TYPES, BLOCK_TYPES_META, labelOf, iconOf } from '@/components/blocks/blockTypes'

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
