// @vitest-environment jsdom
/**
 * openExternal —— 最小外链工具单测（批 F · F-1 / Fc6）
 *
 * 攻击点（对应任务卡测试要点 1）：
 *  A. 无 Tauri 运行时 → 调 window.open(url,'_blank','noopener')，**不**调 shell.open
 *  B. 有 Tauri 运行时 → 调 shell.open(url)，**不**调 window.open
 *  C. shell.open 抛错 → **回退** window.open 且不静默吞错（打告警）
 *  D. 工具本身**不硬编码 URL**（URL 来自调用方；源码级断言）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { openExternal } from '@/utils/openExternal'

// mock Tauri 插件（hoisted，供 vi.mock 工厂安全引用）
const { shellOpenMock } = vi.hoisted(() => ({ shellOpenMock: vi.fn() }))
vi.mock('@tauri-apps/plugin-shell', () => ({ open: shellOpenMock }))

const URL = 'https://www.zjzs.net'

describe('openExternal · 无 Tauri（浏览器 / dev 兜底）', () => {
  let openSpy
  beforeEach(() => {
    shellOpenMock.mockReset()
    delete window.__TAURI_INTERNALS__
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })
  afterEach(() => {
    openSpy.mockRestore()
    delete window.__TAURI_INTERNALS__
  })

  it('无 Tauri 运行时 → window.open(url, _blank, noopener)，不调 shell.open', async () => {
    await openExternal(URL)
    expect(shellOpenMock).not.toHaveBeenCalled()
    expect(openSpy).toHaveBeenCalledWith(URL, '_blank', 'noopener')
  })
})

describe('openExternal · 有 Tauri（交系统浏览器）', () => {
  let openSpy
  beforeEach(() => {
    shellOpenMock.mockReset()
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    window.__TAURI_INTERNALS__ = {}
  })
  afterEach(() => {
    openSpy.mockRestore()
    delete window.__TAURI_INTERNALS__
  })

  it('有 Tauri 运行时 → 调 shell.open(url)，不调 window.open', async () => {
    shellOpenMock.mockResolvedValue(undefined)
    await openExternal(URL)
    expect(shellOpenMock).toHaveBeenCalledWith(URL)
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('shell.open 抛错 → 回退 window.open，且打告警（不静默吞错）', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    shellOpenMock.mockRejectedValue(new Error('capability denied'))
    await openExternal(URL)
    expect(shellOpenMock).toHaveBeenCalledWith(URL)
    expect(warnSpy).toHaveBeenCalled()
    expect(openSpy).toHaveBeenCalledWith(URL, '_blank', 'noopener')
    warnSpy.mockRestore()
  })
})

describe('openExternal · 工具不硬编码 URL（H7 / 数据归数据）', () => {
  /** 去注释（块注释 + 行注释）：注释里提到 ipc.localhost 等属说明，不是用法 */
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')

  it('源码（去注释后）不含任何 http(s) 字面量（URL 只能来自调用方）', () => {
    const src = stripComments(readFileSync(join(process.cwd(), 'src/utils/openExternal.js'), 'utf-8'))
    expect(src).not.toMatch(/https?:\/\//)
  })

  it('import 为静态字面量（H1 / L6 合规）', () => {
    const src = readFileSync(join(process.cwd(), 'src/utils/openExternal.js'), 'utf-8')
    expect(src).toContain("from '@tauri-apps/plugin-shell'")
    // 不得出现运行时拼接的 import()
    expect(src).not.toMatch(/\bimport\s*\(/)
  })
})
