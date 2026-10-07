/**
 * 内容文件风格契约测试
 *
 * 背景：内容文件曾有两套写法 —— 手写风格与 `JSON.stringify(page, null, 2)` 的引号键风格
 *      （实测 62 个文件）。当时风格定义与序列化器收敛在 `src/content/serializePage.js`，
 *      由「编辑器导出 / 开发期写回 / 迁移脚本」三方共用。
 *
 * 变更（P2-T4）：低代码编辑器全链下线后，序列化器（serializePage.js）、写回插件与迁移脚本
 *      都已删除 —— 内容文件从此没有任何程序化写入方。因此本测试**收窄为「钉死仓库现状」**：
 *      只保证存量内容文件仍符合统一风格，不再测试已删除的序列化器（它已不存在，测它等于测空气）。
 *
 * 职责：
 *  - 钉死仓库现状：内容页文件里不得再出现行首引号键、且都以文件头注释开头
 *  - 钉死内容目录里「非页面模块」的登记完整性（漏登记会被当成孤儿页）
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT_DIR, collectFiles } from '../scripts/lib/load-content.mjs'

const pages = collectFiles(CONTENT_DIR)

describe('仓库现状：内容页不得再出现引号键', () => {
  it('扫描得到内容页文件', () => {
    expect(pages.length).toBeGreaterThan(100)
  })

  it('没有任何内容页文件带行首引号键（引号键风格已归一化）', () => {
    const offenders = []
    for (const file of pages) {
      const src = readFileSync(file, 'utf-8')
      if (/^\s*"[A-Za-z_$][\w$]*"\s*:/m.test(src)) {
        offenders.push(file.replace(CONTENT_DIR, '').replace(/\\/g, '/'))
      }
    }
    expect(offenders).toEqual([])
  })

  it('每个内容页都以块注释开头（文件头模板）', () => {
    const missing = []
    for (const file of pages) {
      const src = readFileSync(file, 'utf-8')
      if (!/^\s*\/\*[\s\S]*?\*\//.test(src)) {
        missing.push(file.replace(CONTENT_DIR, '').replace(/\\/g, '/'))
      }
    }
    expect(missing).toEqual([])
  })

  it('内容目录里的非页面模块都登记在 NON_PAGE_FILES（否则会被当成孤儿页）', async () => {
    const mod = await import('../scripts/lib/load-content.mjs')
    // 抽几个代表：站点配置、元信息推导、加载入口、搜索索引形状
    for (const name of ['site.js', 'pageMeta.js', 'loadPage.js', 'searchIndex.js']) {
      expect(mod.NON_PAGE_FILES.has(name), `${name} 未登记在 NON_PAGE_FILES`).toBe(true)
    }
  })

  it('内容目录里的纯模块（pageMeta.js）保持零 import（两端共用）', () => {
    const src = readFileSync(join(CONTENT_DIR, 'pageMeta.js'), 'utf-8')
    expect(src, 'pageMeta.js 不应有 import').not.toMatch(/^\s*import\s/m)
  })
})
