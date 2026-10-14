// @vitest-environment jsdom
/**
 * workcard 的「三遍步骤」字段 passes（H5 白名单流程）
 *
 * 覆盖：
 *  A. 渲染：含 passes → 逐遍渲染 text；只给一部分 → 其余回落内置；不含 → 全部回落（零回归）
 *  B. 变异验证（关键）：key 枚举外 / text 非字符串 / 重复 key / passes 非数组 / text 空串
 *     → 校验器**必须拒绝**；合法 passes → 零错误
 *  C. 已入库的 4 张卡（无 passes）→ 校验零错误 + 渲染仍走内置描述（零回归实测）
 *  D. 接线：schema 分支形状 + content.d.ts 声明
 *  E. 源码锚：label（第几遍 · 名字）保持硬编码，不读字段
 *
 * 说明：默认 environment 是 node，本文件用 docblock 切 jsdom（与 workcard-block.test.js 同款）。
 */
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import WorkCardBlock from '@/components/blocks/WorkCardBlock.vue'
import { createBlockValidator } from '@/utils/validateBlock'

const ROOT = process.cwd()
const schema = JSON.parse(readFileSync(join(ROOT, 'schema', 'content-schema.json'), 'utf-8'))
const validateBlock = createBlockValidator(schema)

const STUBS = { AppIcon: true }

/** 组件内置的占位描述（与 WorkCardBlock.vue 的 CHECK_DEFS 保持一致） */
const BUILTIN_DESC = {
  guided: '对着成品一步步做（文案等待内容侧）',
  restore: '只看成品，凭记忆复原过程（文案等待内容侧）',
  timed: '不看参考，限时独立完成（文案等待内容侧）'
}

/** 渲染出的三遍描述文本（按渲染顺序） */
const descsOf = (w) => w.findAll('.workcard__desc').map((n) => n.text())

function mountCard(block, context = {}) {
  return mount(WorkCardBlock, { props: { block, context }, global: { stubs: STUBS } })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

// ============================================================================
// A. 渲染
// ============================================================================
describe('A. passes 渲染与回落', () => {
  it('含完整 passes → 三遍分别渲染各自的 text', () => {
    const w = mountCard({
      type: 'workcard',
      title: 'PS-1',
      passes: [
        { key: 'guided', text: '第一步：抠出人像换底色' },
        { key: 'restore', text: '第二步：只看成品要求还原' },
        { key: 'timed', text: '第三步：限时 6 分钟独立做' }
      ]
    })
    expect(descsOf(w)).toEqual([
      '第一步：抠出人像换底色',
      '第二步：只看成品要求还原',
      '第三步：限时 6 分钟独立做'
    ])
    w.unmount()
  })

  it('乱序写 passes → 仍按遍次正确对位（按 key 查，不按数组顺序）', () => {
    const w = mountCard({
      type: 'workcard',
      passes: [
        { key: 'timed', text: 'T' },
        { key: 'guided', text: 'G' },
        { key: 'restore', text: 'R' }
      ]
    })
    expect(descsOf(w)).toEqual(['G', 'R', 'T'])
    w.unmount()
  })

  it('只给一部分 → 未给的遍回落内置描述（零回归）', () => {
    const w = mountCard({
      type: 'workcard',
      passes: [{ key: 'restore', text: '只看成品独立还原' }]
    })
    expect(descsOf(w)).toEqual([
      BUILTIN_DESC.guided,
      '只看成品独立还原',
      BUILTIN_DESC.timed
    ])
    w.unmount()
  })

  it('不含 passes（已入库 4 张卡的形态）→ 三遍全部回落内置描述', () => {
    const w = mountCard({ type: 'workcard', id: 'ps-idphoto', title: 'PS-1', duration: 360 })
    expect(descsOf(w)).toEqual([BUILTIN_DESC.guided, BUILTIN_DESC.restore, BUILTIN_DESC.timed])
    w.unmount()
  })

  it('passes 形状不对（非数组 / 元素不是对象 / text 非字符串）→ 静默忽略，不崩', () => {
    const bad = [
      { type: 'workcard', passes: 'oops' },
      { type: 'workcard', passes: [null, 42] },
      { type: 'workcard', passes: [{ key: 'guided', text: 123 }] },
      { type: 'workcard', passes: [{ key: 'guided', text: '   ' }] }
    ]
    for (const block of bad) {
      const w = mountCard(block)
      expect(descsOf(w)).toEqual([BUILTIN_DESC.guided, BUILTIN_DESC.restore, BUILTIN_DESC.timed])
      w.unmount()
    }
  })

  it('label（第几遍 · 名字）不受 passes 影响 —— 仍是内置骨架', () => {
    const w = mountCard({
      type: 'workcard',
      passes: [{ key: 'guided', text: '任意文案' }]
    })
    expect(w.findAll('.workcard__label').map((n) => n.text())).toEqual([
      '第一遍 · 对照做',
      '第二遍 · 只看成品还原',
      '第三遍 · 限时独立做'
    ])
    w.unmount()
  })
})

// ============================================================================
// B. 变异验证（校验器必须咬得住）
// ============================================================================
describe('B. 变异验证 · 校验器必须拒绝坏 passes', () => {
  it('反向锚：合法的完整 passes → 零错误', () => {
    const errs = validateBlock({
      type: 'workcard',
      title: '卡',
      passes: [
        { key: 'guided', text: 'A' },
        { key: 'restore', text: 'B' },
        { key: 'timed', text: 'C' }
      ]
    })
    expect(errs).toEqual([])
  })

  it('反向锚：完全不给 passes → 零错误（可选字段）', () => {
    expect(validateBlock({ type: 'workcard', title: '卡', intro: '总纲', duration: 900 })).toEqual([])
    expect(validateBlock({ type: 'workcard' })).toEqual([])
  })

  it('key 写成枚举外的值（guidedx）→ 拒绝', () => {
    const errs = validateBlock({
      type: 'workcard',
      passes: [{ key: 'guidedx', text: 'A' }]
    })
    expect(errs.length).toBeGreaterThan(0)
    expect(errs.join('|')).toMatch(/未知遍次 key/)
  })

  it('key 缺失 / 非字符串 → 拒绝', () => {
    expect(validateBlock({ type: 'workcard', passes: [{ text: 'A' }] }).join('|')).toMatch(/key 为空/)
    expect(validateBlock({ type: 'workcard', passes: [{ key: 1, text: 'A' }] }).join('|')).toMatch(/key 为空/)
  })

  it('text 写成数字 → 拒绝', () => {
    const errs = validateBlock({ type: 'workcard', passes: [{ key: 'guided', text: 123 }] })
    expect(errs.length).toBeGreaterThan(0)
    expect(errs.join('|')).toMatch(/text 应为字符串/)
  })

  it('text 为空串 → 拒绝', () => {
    expect(validateBlock({ type: 'workcard', passes: [{ key: 'guided', text: '   ' }] }).join('|'))
      .toMatch(/text 为空/)
  })

  it('重复 key → 拒绝（同一遍两条文案互相矛盾，组件取哪条属未定义）', () => {
    const errs = validateBlock({
      type: 'workcard',
      passes: [
        { key: 'guided', text: 'A' },
        { key: 'guided', text: 'B' }
      ]
    })
    expect(errs.length).toBeGreaterThan(0)
    expect(errs.join('|')).toMatch(/遍次 key 重复/)
  })

  it('passes 非数组 → 拒绝', () => {
    expect(validateBlock({ type: 'workcard', passes: 'oops' }).join('|')).toMatch(/passes 应为数组/)
  })

  it('数组元素不是对象 → 拒绝', () => {
    expect(validateBlock({ type: 'workcard', passes: [42] }).join('|')).toMatch(/不是对象/)
  })

  it('⚠️ 本仓无 JSON-Schema 引擎（无 Ajv）：类型/枚举只能靠本校验器拦', async () => {
    // 判据：没有任何依赖或脚本引入 Ajv —— schema 里写的 type/enum 只供编辑器提示与常量派生
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(Object.keys(allDeps).filter((d) => /^ajv/i.test(d))).toEqual([])
  })
})

// ============================================================================
// C. 已入库 4 张卡零回归（读真实内容文件）
// ============================================================================
describe('C. 已入库的 4 张卡（无 passes）零回归', () => {
  const FILE = 'src/content/computer/04-数字媒体技术/09-作品训练卡（三遍法）.js'

  it('4 个 workcard 块全部通过校验（字段新增不误伤存量内容）', async () => {
    const mod = await import(pathToFileURL(join(ROOT, FILE)).href)
    const cards = mod.default.blocks.filter((b) => b.type === 'workcard')
    expect(cards).toHaveLength(4)
    expect(cards.map((c) => c.id)).toEqual(['ps-idphoto', 'ps-poster', 'pr-title', 'pr-shortfilm'])
    const errs = cards.flatMap((c, i) => validateBlock(c).map((e) => `卡${i} ${e}`))
    expect(errs).toEqual([])
  })

  it('按真实卡片数据渲染 → 三遍走内置描述，进度/勾选不受影响', async () => {
    const mod = await import(pathToFileURL(join(ROOT, FILE)).href)
    const card = mod.default.blocks.find((b) => b.id === 'ps-idphoto')
    const w = mountCard(card, { fileKey: 'computer_04_x' })
    expect(descsOf(w)).toEqual([BUILTIN_DESC.guided, BUILTIN_DESC.restore, BUILTIN_DESC.timed])
    expect(w.find('.workcard__progress').text()).toBe('0/3')
    await w.findAll('.workcard__box')[0].trigger('click')
    expect(w.find('.workcard__progress').text()).toBe('1/3')
    w.unmount()
  })
})

// ============================================================================
// D / E. 接线与源码锚
// ============================================================================
describe('D. 接线一致性', () => {
  it('schema 的 workcard 分支含 passes，形状与裁定一致（key 枚举 + text 字符串 + 两者必填）', () => {
    const branch = schema.definitions.block.allOf.find(
      (b) => b.if?.properties?.type?.const === 'workcard'
    )
    const passes = branch.then.properties.passes
    expect(passes.type).toBe('array')
    expect(passes.items.required).toEqual(['key', 'text'])
    expect(passes.items.properties.key.enum).toEqual(['guided', 'restore', 'timed'])
    expect(passes.items.properties.text.type).toBe('string')
  })

  it('passes 是**可选**字段 —— workcard 分支没有 required（存量 4 张卡不受影响）', () => {
    const branch = schema.definitions.block.allOf.find(
      (b) => b.if?.properties?.type?.const === 'workcard'
    )
    expect(branch.then.required).toBeUndefined()
  })

  it('content.d.ts 声明了 WorkCardPass 与 WorkCardBlock.passes', () => {
    const dts = readFileSync(join(ROOT, 'src', 'types', 'content.d.ts'), 'utf-8')
    expect(dts).toMatch(/interface WorkCardPass/)
    expect(dts).toMatch(/passes\?: WorkCardPass\[\]/)
  })
})

describe('E. 源码锚 · label 不读字段', () => {
  it('WorkCardBlock 的三遍 label 仍是字面量（骨架，不交给内容侧）', () => {
    const src = readFileSync(join(ROOT, 'src', 'components', 'blocks', 'WorkCardBlock.vue'), 'utf-8')
    for (const label of ['第一遍 · 对照做', '第二遍 · 只看成品还原', '第三遍 · 限时独立做']) {
      expect(src).toContain(label)
    }
    // 渲染时只覆盖 desc，不改 label
    expect(src).toMatch(/desc:\s*passMap\.value\[c\.key\]/)
  })
})
