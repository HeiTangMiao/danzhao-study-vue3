/**
 * AI 隧道帧协议单测（纯函数层）
 *
 * 为什么先测协议：帧格式一旦错了，表现是"单向串台 / 静默丢帧"这类最难复现的故障，
 * 而它偏偏是可以用零依赖单测完全覆盖的一层。
 */
import { describe, it, expect } from 'vitest'
import {
  FRAME,
  CLOSE,
  DEFAULT_MAX_FRAME_BYTES,
  encodeFrame,
  decodeFrame,
  parseHello,
  frameDirection,
  frameId,
  isTerminalFrame,
  byteLength,
  truncateCloseReason
} from '../server/src/ai/protocol.js'

describe('protocol · 编解码', () => {
  it('正常帧往返：字段与字节数都保留', () => {
    const frame = { type: FRAME.CHUNK, id: '9f1c', seq: 7, delta: '设' }
    const text = encodeFrame(frame)
    const decoded = decodeFrame(text, { expectedDirection: 'provider' })
    expect(decoded.ok).toBe(true)
    expect(decoded.frame).toEqual(frame)
    expect(decoded.bytes).toBe(byteLength(text))
  })

  it('空载荷 → empty（不是 invalid_json，便于日志区分"心跳空帧"与"报文坏了"）', () => {
    expect(decodeFrame('').reason).toBe('empty')
  })

  it('非 JSON → invalid_json', () => {
    expect(decodeFrame('{not json').reason).toBe('invalid_json')
  })

  it('JSON 但不是对象（数组 / null / 数字）→ not_object', () => {
    expect(decodeFrame('[]').reason).toBe('not_object')
    expect(decodeFrame('null').reason).toBe('not_object')
    expect(decodeFrame('42').reason).toBe('not_object')
  })

  it('缺 type / type 不是非空字符串 → missing_type', () => {
    expect(decodeFrame('{"id":"x"}').reason).toBe('missing_type')
    expect(decodeFrame('{"type":""}').reason).toBe('missing_type')
    expect(decodeFrame('{"type":123}').reason).toBe('missing_type')
  })

  it('未知 type → unknown_type（调用方据此"忽略并 warn"，而不是关连接）', () => {
    const decoded = decodeFrame('{"type":"future_frame"}')
    expect(decoded.ok).toBe(false)
    expect(decoded.reason).toBe('unknown_type')
    expect(decoded.detail).toBe('future_frame')
  })

  it('方向错误：Provider 竟发服务器专用帧 → wrong_direction', () => {
    const decoded = decodeFrame(encodeFrame({ type: FRAME.REQ, id: 'x' }), { expectedDirection: 'provider' })
    expect(decoded.reason).toBe('wrong_direction')
    expect(decoded.detail).toContain('req')
  })

  it('超限按 **UTF-8 字节**判定，中文不会被少算（用 .length 才会少算）', () => {
    expect(byteLength('中')).toBe(3)
    expect('中'.length).toBe(1)
    const big = '中'.repeat(100) // 300 字节
    expect(decodeFrame(JSON.stringify({ type: FRAME.PING, ts: 1, pad: big }), { maxBytes: 200 }).reason).toBe('too_large')
    expect(decodeFrame(JSON.stringify({ type: FRAME.PING, ts: 1 }), { maxBytes: DEFAULT_MAX_FRAME_BYTES }).ok).toBe(true)
  })

  it('Buffer 载荷也能解（ws 给的是 Buffer，不是字符串）', () => {
    const decoded = decodeFrame(Buffer.from(encodeFrame({ type: FRAME.PING, ts: 5 }), 'utf8'))
    expect(decoded.ok).toBe(true)
    expect(decoded.frame.ts).toBe(5)
  })
})

describe('protocol · 方向与小工具', () => {
  it('frameDirection 三态', () => {
    expect(frameDirection(FRAME.HELLO)).toBe('provider')
    expect(frameDirection(FRAME.REQ)).toBe('server')
    expect(frameDirection('whatever')).toBe('unknown')
  })

  it('isTerminalFrame 只认 done / error', () => {
    expect(isTerminalFrame({ type: FRAME.DONE })).toBe(true)
    expect(isTerminalFrame({ type: FRAME.ERROR })).toBe(true)
    expect(isTerminalFrame({ type: FRAME.CHUNK })).toBe(false)
  })

  it('frameId 只接受非空字符串 id', () => {
    expect(frameId({ id: 'abc' })).toBe('abc')
    expect(frameId({})).toBe(null)
    expect(frameId({ id: '' })).toBe(null)
    expect(frameId({ id: 7 })).toBe(null)
  })

  it('close reason 裁剪到 123 字节（RFC 6455 上限，超了 ws 会抛错）', () => {
    expect(byteLength(truncateCloseReason('x'.repeat(500)))).toBe(123)
    // 中文按字节裁剪，不会出现被截成半个 UTF-8 序列之外的问题（这里只保证不超上限）
    expect(byteLength(truncateCloseReason('中'.repeat(100)))).toBeLessThanOrEqual(123)
  })

  it('CLOSE 码与设计文档 §3.3 一致（4401/4408/4409）', () => {
    expect(CLOSE.UNAUTHORIZED).toBe(4401)
    expect(CLOSE.PREEMPTED).toBe(4408)
    expect(CLOSE.CONFLICT).toBe(4409)
  })
})

describe('protocol · hello 校验', () => {
  it('合法 hello：缺字段按默认补齐', () => {
    const parsed = parseHello({ type: FRAME.HELLO, providerId: 'mac-studio' })
    expect(parsed.ok).toBe(true)
    expect(parsed.hello).toMatchObject({
      providerId: 'mac-studio',
      priority: 100,
      maxConcurrency: 1,
      upstreamOk: true,
      stream: true
    })
  })

  it('upstreamOk 显式 false 会被保留（"电脑开着但 Ollama 没起"必须能区分）', () => {
    const parsed = parseHello({ providerId: 'p', caps: { upstreamOk: false } })
    expect(parsed.hello.upstreamOk).toBe(false)
  })

  it('缺 providerId → 拒绝（单活判重依赖它，空 id 会让两台机器互踢）', () => {
    expect(parseHello({}).reason).toBe('bad_provider_id')
    expect(parseHello({ providerId: '   ' }).reason).toBe('bad_provider_id')
  })

  it('priority / maxConcurrency / models 非法 → 拒绝', () => {
    expect(parseHello({ providerId: 'p', priority: 'abc' }).reason).toBe('bad_priority')
    expect(parseHello({ providerId: 'p', maxConcurrency: 0 }).reason).toBe('bad_max_concurrency')
    expect(parseHello({ providerId: 'p', models: 'qwen' }).reason).toBe('bad_models')
  })

  it('models 里的非字符串被过滤掉', () => {
    const parsed = parseHello({ providerId: 'p', models: ['qwen2.5:7b', 42, '', null] })
    expect(parsed.hello.models).toEqual(['qwen2.5:7b'])
  })
})
