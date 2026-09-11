/**
 * 内容文件渲染侧冒烟测试
 * 背景：BlockRenderer 对未知 type 的处理曾经是「静默返回 null、渲染一片空白」，
 *      内容里写错 type 或写了渲染层未注册的类型都不会报错，只能靠肉眼发现。
 * 职责：真正导入全部内容页面，断言每个区块的 type 都能被渲染层识别。
 *      比 npm run validate:content 更强的地方在于：它同时验证了渲染侧的注册表覆盖度，
 *      而不只是 schema 白名单。
 */
import { describe, it, expect } from 'vitest'
import { relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BLOCK_TYPES } from '@/components/blocks/blockTypes'
// 「哪些文件算内容页」与校验脚本、搜索索引脚本共用同一条扫描规则，
// 避免内容目录新增系统模块（pageMeta.js / loadPage.js 等）时三处各漏一处
import { CONTENT_DIR, collectFiles } from '../scripts/lib/load-content.mjs'

const pages = collectFiles(CONTENT_DIR)

describe('内容文件渲染侧冒烟测试', () => {
  it('能扫描到内容页文件', () => {
    // 仅防止「扫描逻辑坏掉后测试静默通过」，不锁定具体页数以免新增内容时误报
    expect(pages.length).toBeGreaterThan(100)
  })

  it('每个区块的 type 都能被渲染层识别', async () => {
    const unknown = []
    for (const file of pages) {
      const mod = await import(pathToFileURL(file).href)
      const blocks = mod.default?.blocks || []
      blocks.forEach((b, i) => {
        if (!BLOCK_TYPES.includes(b.type)) {
          unknown.push(`${relative(CONTENT_DIR, file)} 区块[${i}] type=${b.type}`)
        }
      })
    }
    expect(unknown).toEqual([])
  })

  it('每个内容页都有非空的 blocks 数组', async () => {
    const broken = []
    for (const file of pages) {
      const mod = await import(pathToFileURL(file).href)
      if (!Array.isArray(mod.default?.blocks) || mod.default.blocks.length === 0) {
        broken.push(relative(CONTENT_DIR, file))
      }
    }
    expect(broken).toEqual([])
  })
})
