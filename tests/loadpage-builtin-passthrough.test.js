/**
 * 内置兜底路径**不加可用性闸门**（批 S2 复核纠正项）
 *
 * 背景（team-lead 复核提出）：`loadPage` 曾写成
 *     `return hydratePage(pickPage(mod.default, null), meta)`
 * 让**内置兜底**也走了一遍 `isUsablePage`。这给内置路径引入了一个**改前不存在**的失效模式：
 * 一旦某页被判不可用（例如某块缺 `type`），`pickPage` 返回 null → 整页 blocks 变空；
 * 而改动前是直接渲染原内容。内置 182 页已由构建期 `validate:content` 把关（这正是轨道 A
 * 的意义），运行期再加闸门不增加安全性。故闸门**只作用于远程**。
 *
 * 本文件用两条钉死这个契约：
 *   ① **行为锚**：把一个内置页模块替换成「块缺 type」的畸形模块，断言 `loadPage`
 *      **原样透传**（blocks 仍是那个数组），而不是被判不可用变空。
 *   ② **反向锚**：同一个畸形模块喂给 `pickPage` 必须判为不可用 —— 证明 ① 不是
 *      「畸形模块刚好也合法」的假绿（没有这条，① 在闸门回归时会静默通过）。
 *   ③ **源码锚**：内置兜底必须是 `hydratePage(mod.default, meta)`，且不得出现
 *      `pickPage(mod.default`（后者等于把闸门又加回来）。
 *
 * ⚠️ 为什么单独一个文件：`vi.mock('@/content/<某页>.js')` 是**文件级**的替身，
 *    若写进 `loadpage-remote-fallback.test.js`，会把那一页在**该文件全部用例**里都换掉
 *    （包括「内置零回归」与「与内置模块逐块比对」两类断言，它们会退化成「替身 vs 替身」）。
 *    故隔离成独立文件。
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// 远程层置空 → 强制走内置兜底路径
vi.mock('@/utils/contentClient', () => ({ getRemotePage: async () => null }))

// 把一个真实存在的内置页替换成「块缺 type」的畸形模块
vi.mock('@/content/math/01-集合与逻辑/01-集合的概念与表示.js', () => ({
  default: { blocks: [{ text: '缺 type 的块' }, { type: 'text', text: '正常块' }] }
}))

import { loadPage } from '@/content/loadPage'
import { pickPage, isUsablePage } from '@/content/mergeContent'

const ROOT = process.cwd()
/** 畸形模块的 blocks（与上方 vi.mock 工厂保持一致） */
const MALFORMED_BLOCKS = [{ text: '缺 type 的块' }, { type: 'text', text: '正常块' }]

describe('内置兜底 · 原样透传（不经可用性闸门）', () => {
  it('畸形内置页仍按原样 hydrate，不被判不可用变空', async () => {
    const page = await loadPage('math', '01', 0)
    expect(page).not.toBeNull()
    // 关键：blocks 必须**原样**是那个数组（含缺 type 的块），而不是 []
    expect(page.blocks).toEqual(MALFORMED_BLOCKS)
    expect(page.blocks.length).toBe(2)
  })

  it('反向锚：同一个畸形模块喂给 pickPage 必须判为不可用（证明上条不是假绿）', () => {
    expect(isUsablePage({ blocks: MALFORMED_BLOCKS })).toBe(false)
    expect(pickPage({ blocks: MALFORMED_BLOCKS }, null)).toBeNull()
    // 闸门若被加回内置路径，上一条用例的 blocks 就会变成 [] —— 反向锚确保那时必红
  })

  it('元信息仍来自内置 site.js（透传的是内容，不动坐标）', async () => {
    const page = await loadPage('math', '01', 0)
    expect(page.subject).toBe('math')
    expect(page.unitNum).toBe('01')
    expect(page.fileIndex).toBe(0)
    expect(page.id).toBe('math-01-01')
  })
})

describe('源码锚 · 闸门只作用于远程', () => {
  const src = readFileSync(join(ROOT, 'src/content/loadPage.js'), 'utf-8')

  it('内置兜底是 hydratePage(mod.default, meta)，不加闸门', () => {
    expect(src).toContain('return hydratePage(mod.default, meta)')
  })

  it('不得把内置模块再喂给 pickPage（否则闸门又回到内置路径）', () => {
    expect(src).not.toContain('pickPage(mod.default')
  })
})
