/**
 * 发布 / 回滚 SOP 静态断言（批 S4 · S4-3）
 *
 * SOP 是纯文档，没有运行时行为可测 —— 于是把「它必须包含什么」变成**可断言的文本不变量**：
 *  ① 四段流程小标题齐（Bump / 重建 / 部署 / 验证）且**顺序正确**（顺序错 = 事故）
 *  ② 反事故条款齐（**严禁同号覆盖** / 严禁降版本号）
 *  ③ 被三处引用（`contentManifest.js` 注释 / 路线图 S4 行 / 远程内容链路验证清单 §2.4）
 *     —— 这三处原先各自散落一段纪律，S4 收敛为「单一 SOP + 三处指向它」
 *
 * ⚠️ 读文本用 `readFileSync`（本环境 shell `grep` 漏命中，已多次实证 → 不用 grep）。
 * 反向锚：把「严禁同号覆盖」删掉 → 断言必须失败（先证明守卫会咬）。
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SOP = 'docs/content-release-runbook.md'
const SOP_PATH = join(ROOT, SOP)
const README_SOP = 'docs/content-release-runbook.md' // 引用文本（各文档里写的路径）

/** 四段流程必须齐、且顺序如此 */
const SECTIONS = ['第 1 段 · Bump', '第 2 段 · 重建', '第 3 段 · 部署', '第 4 段 · 验证']
/** 反事故条款（逐条不可省） */
const HARD_CLAUSES = ['严禁同号覆盖', '严禁降 `CONTENT_VERSION`']

/** 文本里缺哪些要素（抽成函数 → 反向锚可对变异文本验证它真的会报缺） */
function missingIn(text, needles) {
  return needles.filter((n) => !text.includes(n))
}

const sopText = existsSync(SOP_PATH) ? readFileSync(SOP_PATH, 'utf-8') : ''

describe('SOP 文件本身', () => {
  it('存在且内容非空（不是占位文件）', () => {
    expect(existsSync(SOP_PATH)).toBe(true)
    expect(sopText.length).toBeGreaterThan(1500)
  })

  it('四段流程小标题齐全', () => {
    expect(missingIn(sopText, SECTIONS)).toEqual([])
  })

  it('四段**顺序**正确（Bump → 重建 → 部署 → 验证）', () => {
    const idx = SECTIONS.map((s) => sopText.indexOf(s))
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i], `${SECTIONS[i]} 必须排在 ${SECTIONS[i - 1]} 之后`).toBeGreaterThan(idx[i - 1])
    }
  })

  it('反事故条款齐全（严禁同号覆盖 / 严禁降版本号）', () => {
    expect(missingIn(sopText, HARD_CLAUSES)).toEqual([])
  })

  it('写明「先分片、后清单」的部署顺序与理由', () => {
    expect(sopText).toContain('先分片')
    expect(sopText).toContain('manifest.json')
  })

  it('写明回滚 = 发一版号更大的旧内容', () => {
    expect(sopText).toContain('前进式回滚')
    expect(sopText).toMatch(/号更大/)
  })

  it('写明产物自检命令与部署后探测（含 Content-Type 判据）', () => {
    expect(sopText).toContain('npm run check:content-remote')
    expect(sopText).toContain('Content-Type')
    expect(sopText).toContain('text/html')
  })
})

describe('三处引用（消除散落）', () => {
  it('contentManifest.js 的 CONTENT_VERSION 注释指向 SOP', () => {
    const src = readFileSync(join(ROOT, 'src/content/contentManifest.js'), 'utf-8')
    expect(src).toContain(README_SOP)
  })

  it('路线图 S4 行指向 SOP', () => {
    const src = readFileSync(join(ROOT, 'docs/proposals/implementation-roadmap.md'), 'utf-8')
    expect(src).toContain('content-release-runbook.md')
  })

  it('远程内容链路验证清单 §2.4 指向 SOP', () => {
    const src = readFileSync(join(ROOT, 'docs/远程内容链路验证清单.md'), 'utf-8')
    expect(src).toContain('content-release-runbook.md')
  })
})

describe('反向锚（变异）· 守卫真的会咬', () => {
  it('删掉「严禁同号覆盖」→ missingIn 必须报缺', () => {
    const mutated = sopText.split('严禁同号覆盖').join('可随意覆盖')
    expect(missingIn(mutated, HARD_CLAUSES)).toEqual(['严禁同号覆盖'])
  })

  it('把第 2 / 第 3 段调换 → 顺序断言必须失败', () => {
    const swapped = sopText
      .split(SECTIONS[1]).join('@@TMP@@')
      .split(SECTIONS[2]).join(SECTIONS[1])
      .split('@@TMP@@').join(SECTIONS[2])
    const idx = SECTIONS.map((s) => swapped.indexOf(s))
    expect(idx[2]).toBeLessThan(idx[1]) // 变异后顺序确实反了
  })

  it('删掉某一段小标题 → 齐全性断言必须失败', () => {
    const mutated = sopText.split(SECTIONS[3]).join('## （已删除）')
    expect(missingIn(mutated, SECTIONS)).toEqual([SECTIONS[3]])
  })
})
