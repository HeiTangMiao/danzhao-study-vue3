// @vitest-environment jsdom
/**
 * copyText 测试（阶段 6）
 * 背景：代码块与编辑器都要复制，而非安全上下文（Tauri WebView）里
 *      navigator.clipboard 可能不可用 —— 必须有兜底，且失败要如实返回 false。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { copyText } from '@/utils/copyText'

/** 覆盖 navigator.clipboard（jsdom 默认没有） */
function stubClipboard(impl) {
  Object.defineProperty(navigator, 'clipboard', { value: impl, configurable: true })
}

afterEach(() => {
  document.execCommand = undefined
})

describe('copyText', () => {
  it('优先用 Clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })
    expect(await copyText('print(1)')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('print(1)')
  })

  it('Clipboard API 抛错时退回 execCommand，且不残留临时 textarea', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('not allowed')) })
    document.execCommand = vi.fn(() => true)
    expect(await copyText('x = 1')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelectorAll('textarea')).toHaveLength(0)
  })

  it('完全没有可用的复制能力时返回 false（调用方据此提示失败）', async () => {
    stubClipboard(undefined)
    document.execCommand = undefined
    expect(await copyText('x')).toBe(false)
  })
})