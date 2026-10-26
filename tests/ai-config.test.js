/**
 * AI 网关配置与握手鉴权单测
 *
 * 重点：token 比较必须常量时间，且**长度不等时不能抛异常**
 *      （crypto.timingSafeEqual 在长度不等时会 throw —— 鉴权路径上抛异常 = 连接被莫名关闭，
 *       而不是"拒绝"，是必须堵住的失效模式）。
 */
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import {
  parseAiConfig,
  parseIntEnv,
  parseBoolFlag,
  safeEqual,
  extractBearerToken,
  getHeader,
  authorizeHandshake,
  resolveTimeoutMs,
  describeMissingCredential
} from '../server/src/ai/config.js'

const TOKEN = 's3cr3t-provider-token-value-0123456789'

describe('config · 环境变量解析', () => {
  it('默认值与设计文档 §8.1 一致', () => {
    const c = parseAiConfig({})
    expect(c.enable).toBe(true)
    expect(c.tunnelPath).toBe('/api/ai/tunnel')
    expect(c.statusPath).toBe('/api/ai/status')
    expect(c.maxConcurrency).toBe(1)
    expect(c.heartbeatSec).toBe(15)
    expect(c.providerTimeoutSec).toBe(45)
    expect(c.maxFrameBytes).toBe(262144)
    expect(c.hasProviderToken).toBe(false)
  })

  it('AI_ENABLE 的 false 字面量都要能关掉（0/false/no/off，大小写不敏感）', () => {
    expect(parseAiConfig({ AI_ENABLE: '0' }).enable).toBe(false)
    expect(parseAiConfig({ AI_ENABLE: 'false' }).enable).toBe(false)
    expect(parseAiConfig({ AI_ENABLE: 'no' }).enable).toBe(false)
    expect(parseAiConfig({ AI_ENABLE: 'OFF' }).enable).toBe(false)
    expect(parseAiConfig({ AI_ENABLE: '1' }).enable).toBe(true)
    expect(parseAiConfig({ AI_ENABLE: '' }).enable).toBe(true) // 留空 = 默认开启
  })

  it('数字项：非法值回退默认并 warn，不抛异常（一个变量写错不该让后端起不来）', () => {
    const warnings = []
    const c = parseAiConfig({ AI_HEARTBEAT_SEC: 'abc', AI_MAX_CONCURRENCY: '0' }, { log: { warn: (m) => warnings.push(m) } })
    expect(c.heartbeatSec).toBe(15)
    expect(c.maxConcurrency).toBe(1) // 下限钳制
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('parseIntEnv 钳制与 parseIntEnv/parseBoolFlag 的边界', () => {
    expect(parseIntEnv('999', 10, { min: 1, max: 5 })).toBe(5)
    expect(parseIntEnv(undefined, 7)).toBe(7)
    expect(parseIntEnv('2.6', 1)).toBe(3) // 四舍五入
    expect(parseBoolFlag('off', true)).toBe(false)
    expect(parseBoolFlag(undefined, false)).toBe(false)
  })

  it('按用途的超时：未知 kind 兜底到 AI_TIMEOUT_MS', () => {
    const c = parseAiConfig({ AI_TIMEOUT_MS: 11111 })
    expect(resolveTimeoutMs(c, 'qa')).toBe(45000)
    expect(resolveTimeoutMs(c, 'quiz')).toBe(90000)
    expect(resolveTimeoutMs(c, 'unknown-kind')).toBe(11111)
  })
})

describe('config · Bearer token 提取', () => {
  it('标准与小写 Bearer 都接受（RFC 7235 大小写不敏感）', () => {
    expect(extractBearerToken(`Bearer ${TOKEN}`)).toBe(TOKEN)
    expect(extractBearerToken(`bearer ${TOKEN}`)).toBe(TOKEN)
    expect(extractBearerToken(`  Bearer   ${TOKEN}  `)).toBe(TOKEN)
  })

  it('非 Bearer / 空 token / 非字符串 → null', () => {
    expect(extractBearerToken('Basic abc')).toBe(null)
    expect(extractBearerToken('Bearer ')).toBe(null)
    expect(extractBearerToken(undefined)).toBe(null)
    expect(extractBearerToken(123)).toBe(null)
  })

  it('getHeader 大小写不敏感（代理可能保留原样大小写）', () => {
    expect(getHeader({ authorization: 'Bearer x' }, 'authorization')).toBe('Bearer x')
    expect(getHeader({ Authorization: 'Bearer y' }, 'authorization')).toBe('Bearer y')
    expect(getHeader({}, 'authorization')).toBe(undefined)
  })
})

describe('config · 常量时间比较', () => {
  it('相等 / 不相等都返回正确结果', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
  })

  it('长度不等时不抛异常（timingSafeEqual 本身会 throw，这里必须挡住）', () => {
    expect(() => safeEqual('short', 'much-longer-token')).not.toThrow()
    expect(safeEqual('short', 'much-longer-token')).toBe(false)
    expect(() => safeEqual('', 'x')).not.toThrow()
    expect(safeEqual('', 'x')).toBe(false)
    expect(safeEqual('', '')).toBe(true)
  })

  it('中文等多字节内容也按字节比较', () => {
    expect(safeEqual('模型', '模型')).toBe(true)
    expect(safeEqual('模型', '模型2')).toBe(false)
  })
})

describe('config · 握手鉴权（成功 / token 错误 / token 缺失）', () => {
  const config = parseAiConfig({ AI_PROVIDER_TOKEN: TOKEN })

  it('① 正确 token → 通过', () => {
    expect(authorizeHandshake(config, { authorization: `Bearer ${TOKEN}` })).toEqual({ ok: true })
    expect(authorizeHandshake(config, { Authorization: `Bearer ${TOKEN}` }).ok).toBe(true)
  })

  it('② token 错误 → 4401 bad_token（等长与不等长都要走到，且都不能抛异常）', () => {
    const sameLen = 'x'.repeat(TOKEN.length)
    expect(() => authorizeHandshake(config, { authorization: `Bearer ${sameLen}` })).not.toThrow()
    expect(authorizeHandshake(config, { authorization: `Bearer ${sameLen}` })).toEqual({
      ok: false,
      code: 4401,
      reason: 'bad_token'
    })
    expect(() => authorizeHandshake(config, { authorization: 'Bearer x' })).not.toThrow()
    expect(authorizeHandshake(config, { authorization: 'Bearer x' }).reason).toBe('bad_token')
    // 空 token（"Bearer " 后啥也没有）也算缺失，而不是"空串碰巧等于空凭据"
    expect(authorizeHandshake(config, { authorization: 'Bearer ' }).reason).toBe('missing_token')
  })

  it('③ token 缺失（无 Authorization 头 / 非 Bearer）→ 4401 missing_token', () => {
    expect(authorizeHandshake(config, {})).toEqual({ ok: false, code: 4401, reason: 'missing_token' })
    expect(authorizeHandshake(config, undefined).reason).toBe('missing_token')
    expect(authorizeHandshake(config, { authorization: 'Basic zzz' }).reason).toBe('missing_token')
  })

  it('服务器未配凭据时**恒拒绝**（宁可隧道不可用，也不能免鉴权开放公网入口）', () => {
    const noCred = parseAiConfig({})
    expect(authorizeHandshake(noCred, { authorization: `Bearer ${TOKEN}` }).reason).toBe('no_credential')
    expect(authorizeHandshake(noCred, {}).reason).toBe('no_credential')
  })

  it('AI_PROVIDER_TOKEN_SHA256 摘要模式：正确通过 / 错误拒绝', () => {
    const sha = createHash('sha256').update(TOKEN, 'utf8').digest('hex')
    const cfg = parseAiConfig({ AI_PROVIDER_TOKEN_SHA256: sha })
    expect(cfg.hasProviderToken).toBe(true)
    expect(authorizeHandshake(cfg, { authorization: `Bearer ${TOKEN}` }).ok).toBe(true)
    expect(authorizeHandshake(cfg, { authorization: 'Bearer wrong' }).reason).toBe('bad_token')
  })

  it('非 64 位十六进制的摘要被忽略（避免"以为配了其实没配"）', () => {
    const cfg = parseAiConfig({ AI_PROVIDER_TOKEN_SHA256: 'not-a-sha' })
    expect(cfg.hasProviderToken).toBe(false)
    expect(authorizeHandshake(cfg, { authorization: 'Bearer x' }).reason).toBe('no_credential')
  })
})

describe('config · 启动期护栏', () => {
  it('生产 + 开启 + 无凭据 → 返回错误说明', () => {
    const msg = describeMissingCredential(parseAiConfig({}), 'production')
    expect(msg).toBeTruthy()
    expect(msg).toContain('AI_PROVIDER_TOKEN')
  })

  it('生产 + 有凭据 / 非生产 / 已关闭 → 通过（null）', () => {
    expect(describeMissingCredential(parseAiConfig({ AI_PROVIDER_TOKEN: TOKEN }), 'production')).toBe(null)
    expect(describeMissingCredential(parseAiConfig({}), 'development')).toBe(null)
    expect(describeMissingCredential(parseAiConfig({ AI_ENABLE: '0' }), 'production')).toBe(null)
  })
})
