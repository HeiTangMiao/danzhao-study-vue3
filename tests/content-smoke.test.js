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

// 页面模块缓存：139 个内容页会被多条用例复用。原先每条用例各自 for-await import 一遍，
// 首次 Vite transform 的开销被重复支付；这里并发加载一次供全部用例共享，
// I/O 并行也能显著压低墙钟耗时。
const pageModules = new Map()
const loadAllPages = async () => {
  if (pageModules.size) return pageModules
  await Promise.all(
    pages.map(async (file) => {
      pageModules.set(file, await import(pathToFileURL(file).href))
    })
  )
  return pageModules
}

// 超时放宽说明（勿删）：本文件会真实 import 全部 139 个内容页并递归遍历区块，
// 绝大部分耗时是 Vite 首次 transform 的开销。全量并行执行时 CPU 竞争会把耗时
// 推过 vitest 默认 5s 上限，造成 CI 上间歇性假失败（超时而非断言失败）。
// 下面两条用例单独放宽超时到 30s，不影响其他测试文件的严格度。
describe('内容文件渲染侧冒烟测试', () => {
  it('能扫描到内容页文件', () => {
    // 仅防止「扫描逻辑坏掉后测试静默通过」，不锁定具体页数以免新增内容时误报
    expect(pages.length).toBeGreaterThan(100)
  })

  it('每个区块的 type 都能被渲染层识别（含容器内子区块）', async () => {
    const unknown = []
    // 容器型区块：子区块在 items 里（columns 是「数组的数组」、group 是区块数组）
    const childBlocksOf = (b) => {
      if (b.type === 'group') return b.items || []
      if (b.type === 'columns') return (b.items || []).flat()
      return []
    }
    const walk = (blocks, file, path) => {
      blocks.forEach((b, i) => {
        const loc = `${path}[${i}]`
        if (!BLOCK_TYPES.includes(b.type)) {
          unknown.push(`${file} 区块${loc} type=${b.type}`)
        }
        walk(childBlocksOf(b), file, loc)
      })
    }
    const mods = await loadAllPages()
    for (const file of pages) {
      walk(mods.get(file).default?.blocks || [], relative(CONTENT_DIR, file), '区块')
    }
    expect(unknown).toEqual([])
  }, 30000)

  it('每个内容页都有非空的 blocks 数组', async () => {
    const broken = []
    const mods = await loadAllPages()
    for (const file of pages) {
      const mod = mods.get(file)
      if (!Array.isArray(mod.default?.blocks) || mod.default.blocks.length === 0) {
        broken.push(relative(CONTENT_DIR, file))
      }
    }
    expect(broken).toEqual([])
  }, 30000)
})
