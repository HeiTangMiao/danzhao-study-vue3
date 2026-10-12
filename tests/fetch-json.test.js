/**
 * fetchJson 极薄取数原语测试（批 S2 · 提交① · P-S15 a）
 *
 * 只验三件事：URL 拼接口径、!res.ok 抛错、JSON 解析；超时走 AbortController。
 * 全部用 mock fetch —— 本文件**不得**发真实网络请求，也不读盘产物。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchJson, joinUrl, DEFAULT_TIMEOUT_MS } from '@/utils/fetchJson'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

/** 装一个可控的 fetch 替身；handler 可拿到 {url, init} */
function mockFetch(handler) {
  const calls = []
  globalThis.fetch = vi.fn((url, init) => {
    calls.push({ url, init })
    return handler(url, init)
  })
  return calls
}

const okJson = (data) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })

describe('joinUrl · 拼接口径', () => {
  it('容忍 base 尾斜杠与 path 前导斜杠', () => {
    expect(joinUrl('./content-remote/', '/manifest.json')).toBe('./content-remote/manifest.json')
    expect(joinUrl('./content-remote', 'math/01.json')).toBe('./content-remote/math/01.json')
  })

  it('绝对基址同样适用', () => {
    expect(joinUrl('https://520305.top/content-remote', 'manifest.json'))
      .toBe('https://520305.top/content-remote/manifest.json')
  })

  it('畸形输入不抛（返回字符串，由 fetch 侧失败）', () => {
    expect(joinUrl(null, null)).toBe('/')
  })
})

describe('fetchJson · 取数', () => {
  it('默认超时是正数（毫秒）', () => {
    expect(DEFAULT_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it('2xx → 返回解析后的 JSON，并传 signal', async () => {
    const calls = mockFetch(() => okJson({ contentVersion: 3 }))
    const data = await fetchJson('./content-remote', 'manifest.json')
    expect(data).toEqual({ contentVersion: 3 })
    expect(calls[0].url).toBe('./content-remote/manifest.json')
    expect(calls[0].init.signal).toBeDefined()
  })

  it('非 2xx → 抛错并带上状态码', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }))
    await expect(fetchJson('./content-remote', 'manifest.json')).rejects.toThrow(/404/)
  })

  it('非法 JSON → 抛错（调用方静默降级）', async () => {
    mockFetch(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token'))
    }))
    await expect(fetchJson('./content-remote', 'math/01.json')).rejects.toThrow(SyntaxError)
  })

  it('网络失败（fetch reject）→ 原样抛', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(fetchJson('./content-remote', 'manifest.json')).rejects.toThrow(TypeError)
  })

  it('超时 → abort 生效并抛错（不无限挂着占连接）', async () => {
    mockFetch((url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')))
    }))
    await expect(fetchJson('./content-remote', 'manifest.json', { timeout: 10 }))
      .rejects.toThrow('aborted')
  })

  it('可覆盖 timeout', async () => {
    const calls = mockFetch(() => okJson({ ok: 1 }))
    await fetchJson('./content-remote', 'manifest.json', { timeout: 1234 })
    expect(calls).toHaveLength(1)
  })
})
