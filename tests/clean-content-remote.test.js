/**
 * 远程快照清理脚本测试（批 S2 · 边界裁决配套）
 *
 * 钉死三件事：
 *   ① **守卫真的咬得住**（反向验证）：任何不是 `<repoRoot>/public/content-remote` 的目标
 *      —— public 本身 / 仓库根 / 仓库外 / 形似但不同名 —— 一律抛错，**且不删任何东西**；
 *   ② 目标路径**复用 `REMOTE_DIR` 常量**，脚本里不硬编码目录名；
 *   ③ 目录不存在 → **静默成功**（removed=false，退出码 0）。
 *
 * 风格：只调纯函数 + 注入假 io，**不在测试里执行真实删除**。
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { targetDir, assertSafeTarget, clean } from '../scripts/clean-content-remote.mjs'
import { REMOTE_DIR } from '@/content/contentManifest'

const ROOT = process.cwd()

describe('clean-content-remote · 目标目录', () => {
  it('目标 = <repoRoot>/public/content-remote（且为绝对路径）', () => {
    const t = targetDir()
    expect(t).toBe(resolve(ROOT, 'public', REMOTE_DIR))
    expect(t.startsWith(sep) || /^[A-Za-z]:/.test(t)).toBe(true)
  })

  it('复用 REMOTE_DIR 常量：去注释后的源码里不出现 content-remote 字面量', () => {
    const src = readFileSync(join(ROOT, 'scripts/clean-content-remote.mjs'), 'utf-8')
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/['"`][^'"`]*content-remote/)
  })
})

describe('clean-content-remote · 路径守卫（反向验证）', () => {
  it('唯一合法目标 → 放行，不抛', () => {
    expect(() => assertSafeTarget(targetDir())).not.toThrow()
  })

  it('public 目录本身 → 抛错（反向锚）', () => {
    expect(() => assertSafeTarget(resolve(ROOT, 'public'))).toThrow(/路径守卫失败/)
  })

  it('仓库根 → 抛错（反向锚）', () => {
    expect(() => assertSafeTarget(resolve(ROOT))).toThrow(/路径守卫失败/)
  })

  it('仓库外的目录 → 抛错（反向锚）', () => {
    expect(() => assertSafeTarget(resolve(sep, 'tmp', 'content-remote'))).toThrow(/路径守卫失败/)
  })

  it('形似但不同名的目录（content-remote2）→ 抛错（防前缀/子串误判）', () => {
    expect(() => assertSafeTarget(resolve(ROOT, 'public', `${REMOTE_DIR}2`))).toThrow(/路径守卫失败/)
  })

  it('src 目录 → 抛错（防误删源码）', () => {
    expect(() => assertSafeTarget(resolve(ROOT, 'src'))).toThrow(/路径守卫失败/)
  })
})

describe('clean-content-remote · 幂等', () => {
  it('目录不存在 → removed=false 且不调用 remove（退出码 0 的语义）', () => {
    const remove = vi.fn(() => { throw new Error('不该执行删除') })
    const res = clean({ exists: () => false, remove })
    expect(res.removed).toBe(false)
    expect(res.target).toBe(targetDir())
    expect(remove).not.toHaveBeenCalled()
  })

  it('目录存在 → 调用 remove 且带 recursive + force', () => {
    const remove = vi.fn()
    const res = clean({ exists: () => true, remove })
    expect(res.removed).toBe(true)
    expect(remove).toHaveBeenCalledWith(targetDir(), { recursive: true, force: true })
  })
})
