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
  it('每个类型都绑定了渲染组件', async () => {
    const { componentOf } = await import('@/components/blocks/registry')
    const unbound = BLOCK_TYPES.filter((t) => !componentOf(t))
    expect(unbound).toEqual([])
  })

  it('未知类型不返回组件（由 BlockRenderer 渲染显式降级提示）', async () => {
    const { componentOf } = await import('@/components/blocks/registry')
    expect(componentOf('__不存在__')).toBeNull()
    expect(componentOf(undefined)).toBeNull()
  })
})
