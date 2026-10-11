// @vitest-environment jsdom
/**
 * 批 F · Round 2 · 攻点[1] —— openExternal 回退（Fc6）
 *
 *  1. jsdom（无 Tauri）→ 必须回退 window.open(url,'_blank','noopener')，且不调 shell.open
 *  2. 反向锚：伪造 __TAURI_INTERNALS__ 令 shell.open 抛错 → try/catch 回退 window.open + warn，不炸
 *  3. Tauri 正常：shell.open 成功 → 不再 window.open
 *  4. 工具模块内零 URL 字面量
 *  5. plugin-shell 的 import 为静态字面量（L6 放行口径）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({ open: vi.fn() }))
vi.mock('@tauri-apps/plugin-shell', () => ({ open: mocks.open }))

import { openExternal } from '@/utils/openExternal'

const URL = 'https://example.org/x'

beforeEach(() => {
  mocks.open.mockReset()
  window.open = vi.fn()
  delete window.__TAURI_INTERNALS__
})
afterEach(() => {
  delete window.__TAURI_INTERNALS__
  vi.restoreAllMocks()
})

describe('R2 · 攻点[1] · openExternal 回退', () => {
  it('无 Tauri（jsdom）→ window.open(_blank,noopener)，不调 shell.open', async () => {
    await openExternal(URL)
    expect(mocks.open).not.toHaveBeenCalled()
    expect(window.open).toHaveBeenCalledTimes(1)
    expect(window.open).toHaveBeenCalledWith(URL, '_blank', 'noopener')
  })

  it('反向锚：有 Tauri 但 shell.open 抛错 → 回退 window.open + warn，不抛', async () => {
    window.__TAURI_INTERNALS__ = {}
    mocks.open.mockRejectedValueOnce(new Error('capability denied'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(openExternal(URL)).resolves.toBeUndefined() // 不炸
    expect(mocks.open).toHaveBeenCalledWith(URL)
    expect(warn).toHaveBeenCalled()
    expect(window.open).toHaveBeenCalledWith(URL, '_blank', 'noopener')
  })

  it('有 Tauri 且 shell.open 成功 → 不再 window.open', async () => {
    window.__TAURI_INTERNALS__ = {}
    mocks.open.mockResolvedValueOnce(undefined)
    await openExternal(URL)
    expect(mocks.open).toHaveBeenCalledWith(URL)
    expect(window.open).not.toHaveBeenCalled()
  })

  it('模块内零 URL 字面量', () => {
    const src = readFileSync(join(process.cwd(), 'src/utils/openExternal.js'), 'utf8')
    // 去掉注释后不得出现 http(s):// 字面量
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/https?:\/\//)
  })

  it('plugin-shell 为静态字面量 import（L6）', () => {
    const src = readFileSync(join(process.cwd(), 'src/utils/openExternal.js'), 'utf8')
    expect(src).toMatch(/import\s*\{\s*open as shellOpen\s*\}\s*from\s*'@tauri-apps\/plugin-shell'/)
    expect(src).not.toMatch(/import\(\s*[^'"`]/) // 无动态拼接 import
  })
})
