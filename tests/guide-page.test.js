// @vitest-environment jsdom
/**
 * 志愿填报页（/guide）骨架构守卫（批 F · F-1 / Fc6）
 *
 * 覆盖：
 *  1. 页面数据合 schema（blocks 经 createBlockValidator 校验，逐区块零错）
 *  2. 页面数据是**纯数据 ESM**（零 import）；唯一外链 = 官方入口（无第三方 URL）
 *  3. 路由 /guide 存在（独立顶层页）
 *  4. 入口可达：HomeView 复用「工具卡」模式挂 /guide（只加路由不算完成）
 *  5. GuideView 用 BlockRenderer 渲染区块；官方入口按钮 → openExternal(entry.url)
 *  6. 内容扫描把 guide/ 判为非学科页目录（不产生孤儿错误）
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'

// openExternal 以 spy 形态供「官方入口行为」用例断言（hoisted）
vi.mock('@/utils/openExternal', () => ({ openExternal: vi.fn() }))

import schemaJson from '../schema/content-schema.json'
import { createBlockValidator } from '@/utils/validateBlock'
import guidePage from '@/content/guide/01-志愿填报'
import { collectFiles, NON_PAGE_DIRS, CONTENT_DIR, relPathOf } from '../scripts/lib/load-content.mjs'

const ROOT = process.cwd()
const GUIDE_PATH = join(ROOT, 'src/content/guide/01-志愿填报.js')
const validateBlock = createBlockValidator(schemaJson)

describe('guide 页面数据', () => {
  it('每个骨架区块合 schema（validateBlock 零错）', () => {
    expect(Array.isArray(guidePage.blocks)).toBe(true)
    const errors = []
    guidePage.blocks.forEach((b, i) => {
      validateBlock(b).forEach((e) => errors.push(`区块[${i}] ${e}`))
    })
    expect(errors).toEqual([])
  })

  it('官方入口是唯一外链，且指向浙江省教育考试院', () => {
    const text = readFileSync(GUIDE_PATH, 'utf-8')
    const urls = [...text.matchAll(/https?:\/\/[^\s'"]+/g)].map((m) => m[0])
    expect(urls).toEqual(['https://www.zjzs.net'])
    expect(guidePage.entry.url).toBe('https://www.zjzs.net')
    expect(typeof guidePage.entry.label).toBe('string')
    expect(guidePage.entry.label.length).toBeGreaterThan(0)
  })

  it('是纯数据 ESM：零 import', () => {
    const text = readFileSync(GUIDE_PATH, 'utf-8')
    expect(text).not.toMatch(/^\s*import\b/m)
  })
})

describe('guide 路由与入口可达性', () => {
  it('router 声明了 /guide（独立顶层页）', () => {
    const src = readFileSync(join(ROOT, 'src/router/index.js'), 'utf-8')
    expect(src).toMatch(/path:\s*'\/guide'/)
    expect(src).toMatch(/name:\s*'guide'/)
    expect(src).toMatch(/import\('@\/views\/GuideView\.vue'\)/)
  })

  it('HomeView 有 /guide 的入口（复用工具卡模式）', () => {
    const src = readFileSync(join(ROOT, 'src/views/HomeView.vue'), 'utf-8')
    expect(src).toMatch(/to="\/guide"/)
    expect(src).toMatch(/tool-card/)
  })
})

describe('GuideView 渲染与官方入口行为', () => {
  it('经 BlockRenderer 渲染全部区块；点官方入口调 openExternal(entry.url)', async () => {
    const { openExternal } = await import('@/utils/openExternal')
    // 见下 vi.mock：openExternal 已被替换为 spy
    const wrapper = mount((await import('@/views/GuideView.vue')).default, {
      global: { stubs: { BlockRenderer: true, AppIcon: true, 'router-link': true } }
    })
    // 区块数 = 数据里的 blocks 数（每个区块一个 BlockRenderer）
    expect(wrapper.findAll('block-renderer-stub').length).toBe(guidePage.blocks.length)
    // 点官方入口
    await wrapper.find('.guide-entry__btn').trigger('click')
    expect(openExternal).toHaveBeenCalledWith('https://www.zjzs.net')
    wrapper.unmount()
  })
})

describe('内容扫描边界：guide/ 是非学科页目录', () => {
  it('NON_PAGE_DIRS 登记了 guide', () => {
    expect(NON_PAGE_DIRS.has('guide')).toBe(true)
  })

  it('collectFiles 不把 guide/ 当内容页（无孤儿报错）', () => {
    const files = collectFiles(CONTENT_DIR).map((f) => relPathOf(f))
    expect(files.some((f) => f.startsWith('guide/'))).toBe(false)
  })
})
