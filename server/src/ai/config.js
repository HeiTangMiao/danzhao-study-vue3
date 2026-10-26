/**
 * AI 网关配置 —— 环境变量解析 + Provider token 校验（**纯函数层**，零 IO）
 *
 * 与 `rateLimit.js` 同一套取舍：解析逻辑不 import fastify、不读文件系统，
 * 只吃一个 env 对象 → 便于单测，也便于测试里塞假 env。
 *
 * ⚠️ 常量型配置（端点地址 / token）**一律走环境变量**，代码里不出现任何域名或密钥：
 *    生产是 Docker 容器（docker-compose.yml 用 network_mode: host，CMD `node src/index.js`），
 *    配置只能通过 `env_file: ./server/.env` 注入 —— 写死在代码里等于不可发布。
 */

import { createHash, timingSafeEqual } from 'node:crypto'
import { DEFAULT_MAX_FRAME_BYTES } from './protocol.js'

/** 空日志（测试与默认场景）：四个级别都是 no-op，调用方不用判空 */
export const NOOP_LOG = Object.freeze({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
})

/**
 * 把可能缺级别的 logger 补全为「四个级别都可用」。
 * @param {object|undefined} log
 * @returns {object}
 */
export function normalizeLog(log) {
  if (!log) return NOOP_LOG
  return {
    debug: typeof log.debug === 'function' ? log.debug.bind(log) : NOOP_LOG.debug,
    info: typeof log.info === 'function' ? log.info.bind(log) : NOOP_LOG.info,
    warn: typeof log.warn === 'function' ? log.warn.bind(log) : NOOP_LOG.warn,
    error: typeof log.error === 'function' ? log.error.bind(log) : NOOP_LOG.error
  }
}

/** `false` 字面量集合（与 rateLimit.js 的 RATE_LIMIT_OFF 同款宽松口径） */
const OFF_LITERALS = new Set(['0', 'false', 'no', 'off'])

/**
 * 解析布尔型开关。**未设置 → 默认开启**（AI_ENABLE 的默认就是 1）。
 * @param {unknown} raw
 * @param {boolean} [defaultValue=true]
 * @returns {boolean}
 */
export function parseBoolFlag(raw, defaultValue = true) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return defaultValue
  return !OFF_LITERALS.has(String(raw).trim().toLowerCase())
}

/**
 * 解析整数，非法值回退默认并可选 warn。
 *
 * ⚠️ 刻意**不抛异常**：一个环境变量写错就让整个后端起不来是"配置错了全站挂"，
 *    与 rateLimit.js「防御系统的故障不该变成用户的 500」是同一条原则。
 * @param {unknown} raw
 * @param {number} fallback
 * @param {{min?: number, max?: number, log?: object, name?: string}} [opts]
 * @returns {number}
 */
export function parseIntEnv(raw, fallback, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, log = NOOP_LOG, name = '' } = {}) {
  const n = Number(raw)
  if (raw === undefined || raw === null || String(raw).trim() === '' || !Number.isFinite(n)) {
    if (raw !== undefined && raw !== null && String(raw).trim() !== '' && name) {
      log.warn?.(`[ai-config] ${name} 不是数字（${String(raw)}），回退默认值 ${fallback}`)
    }
    return fallback
  }
  const clamped = Math.min(max, Math.max(min, Math.round(n)))
  if (clamped !== Math.round(n) && name) {
    log.warn?.(`[ai-config] ${name}=${n} 超出 [${min}, ${max}]，已钳制为 ${clamped}`)
  }
  return clamped
}

/** 四类用途的超时默认值（毫秒），对齐设计文档 §4.3 */
export const DEFAULT_TIMEOUT_MS = Object.freeze({
  default: 60000,
  qa: 45000,
  quiz: 90000,
  explain: 60000,
  analysis: 60000
})

/** 首 token 超时默认（毫秒） */
export const DEFAULT_FIRST_TOKEN_MS = 30000

/**
 * 解析 AI 网关配置（S1/S2 需要的全部字段）。
 *
 * 未列出的字段（配额 / 审计 / 灰度）属于后续步骤（设计文档 §12 的 S5），本轮**不解析**，
 * 避免"配置项先落地、行为没实现"的半成品 —— 那种配置最容易被误当成已生效。
 *
 * @param {Record<string, string|undefined>} [env=process.env]
 * @param {{log?: object}} [opts]
 * @returns {{enable: boolean, tunnelPath: string, statusPath: string,
 *   providerToken: string, providerTokenSha256: string, hasProviderToken: boolean,
 *   maxConcurrency: number, heartbeatSec: number, providerTimeoutSec: number,
 *   providerSingle: boolean, drainMs: number, maxFrameBytes: number,
 *   timeouts: object, firstTokenMs: number, defaultModel: string}}
 */
export function parseAiConfig(env = process.env, { log = NOOP_LOG } = {}) {
  const logger = normalizeLog(log)
  const rawToken = String(env.AI_PROVIDER_TOKEN ?? '').trim()
  const rawSha = String(env.AI_PROVIDER_TOKEN_SHA256 ?? '').trim().toLowerCase()
  if (rawToken && rawSha) {
    // 二者同时配置时，摘要项不参与校验（明文必然命中），显式提示避免"以为生效了双保险"
    logger.warn?.('[ai-config] AI_PROVIDER_TOKEN 与 AI_PROVIDER_TOKEN_SHA256 同时配置，将只按明文比对')
  }
  if (rawSha && !/^[0-9a-f]{64}$/.test(rawSha)) {
    logger.warn?.('[ai-config] AI_PROVIDER_TOKEN_SHA256 不是 64 位小写十六进制，将被忽略')
  }

  const maxFrameBytes = parseIntEnv(env.AI_MAX_FRAME_BYTES, DEFAULT_MAX_FRAME_BYTES, {
    min: 1024,
    max: 8 * 1024 * 1024,
    log: logger,
    name: 'AI_MAX_FRAME_BYTES'
  })

  return {
    enable: parseBoolFlag(env.AI_ENABLE, true),
    tunnelPath: String(env.AI_TUNNEL_PATH ?? '/api/ai/tunnel').trim() || '/api/ai/tunnel',
    statusPath: String(env.AI_STATUS_PATH ?? '/api/ai/status').trim() || '/api/ai/status',
    providerToken: rawToken,
    providerTokenSha256: /^[0-9a-f]{64}$/.test(rawSha) ? rawSha : '',
    hasProviderToken: Boolean(rawToken || /^[0-9a-f]{64}$/.test(rawSha)),
    maxConcurrency: parseIntEnv(env.AI_MAX_CONCURRENCY, 1, { min: 1, max: 64, log: logger, name: 'AI_MAX_CONCURRENCY' }),
    heartbeatSec: parseIntEnv(env.AI_HEARTBEAT_SEC, 15, { min: 1, max: 3600, log: logger, name: 'AI_HEARTBEAT_SEC' }),
    providerTimeoutSec: parseIntEnv(env.AI_PROVIDER_TIMEOUT_SEC, 45, {
      min: 1,
      max: 86400,
      log: logger,
      name: 'AI_PROVIDER_TIMEOUT_SEC'
    }),
    providerSingle: parseBoolFlag(env.AI_PROVIDER_SINGLE, true),
    drainMs: parseIntEnv(env.AI_DRAIN_MS, 10000, { min: 0, max: 600000, log: logger, name: 'AI_DRAIN_MS' }),
    maxFrameBytes,
    timeouts: {
      default: parseIntEnv(env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS.default, { min: 1000, max: 600000, log: logger, name: 'AI_TIMEOUT_MS' }),
      qa: parseIntEnv(env.AI_TIMEOUT_QA_MS, DEFAULT_TIMEOUT_MS.qa, { min: 1000, max: 600000, log: logger, name: 'AI_TIMEOUT_QA_MS' }),
      quiz: parseIntEnv(env.AI_TIMEOUT_QUIZ_MS, DEFAULT_TIMEOUT_MS.quiz, { min: 1000, max: 600000, log: logger, name: 'AI_TIMEOUT_QUIZ_MS' }),
      explain: parseIntEnv(env.AI_TIMEOUT_EXPLAIN_MS, DEFAULT_TIMEOUT_MS.explain, { min: 1000, max: 600000, log: logger, name: 'AI_TIMEOUT_EXPLAIN_MS' }),
      analysis: parseIntEnv(env.AI_TIMEOUT_ANALYSIS_MS, DEFAULT_TIMEOUT_MS.analysis, { min: 1000, max: 600000, log: logger, name: 'AI_TIMEOUT_ANALYSIS_MS' })
    },
    firstTokenMs: parseIntEnv(env.AI_FIRST_TOKEN_MS, DEFAULT_FIRST_TOKEN_MS, { min: 1000, max: 600000, log: logger, name: 'AI_FIRST_TOKEN_MS' }),
    defaultModel: String(env.AI_UPSTREAM_MODEL ?? '').trim()
  }
}

/**
 * 按用途取超时（毫秒）。未知 kind 兜底到 default。
 * @param {object} config parseAiConfig 的产出
 * @param {string} [kind] 'qa' | 'quiz' | 'explain' | 'analysis'
 * @returns {number}
 */
export function resolveTimeoutMs(config, kind = '') {
  const table = config?.timeouts ?? DEFAULT_TIMEOUT_MS
  return Number(table[kind]) > 0 ? Number(table[kind]) : Number(table.default)
}

/**
 * 常量时间字符串比较。
 *
 * ⚠️ 为什么不能直接 `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`：
 *    两边长度不等时它会**抛 TypeError**（"Input buffers must have the same length"），
 *    在鉴权路径上抛异常 = 500 / 连接被莫名关闭，而不是"拒绝"。所以必须先比长度。
 * ⚠️ 长度不等时也要做一次同长度比对再返回 false：否则"长度不同"会比"长度相同"
 *    快一截，把长度本身变成可测量的时间侧信道。
 * @param {string|Buffer} a
 * @param {string|Buffer} b
 * @returns {boolean}
 */
export function safeEqual(a, b) {
  const ab = Buffer.isBuffer(a) ? a : Buffer.from(String(a), 'utf8')
  const bb = Buffer.isBuffer(b) ? b : Buffer.from(String(b), 'utf8')
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab)
    return false
  }
  return timingSafeEqual(ab, bb)
}

/**
 * 从 Authorization 头里取出 Bearer token。
 *
 * @param {unknown} headerValue 原始头值（node 会小写 header 名，值不变）
 * @returns {string|null} 非 Bearer 形式 / 空串 → null
 */
export function extractBearerToken(headerValue) {
  if (typeof headerValue !== 'string') return null
  const match = /^Bearer[ \t]+(.+)$/i.exec(headerValue.trim())
  if (!match) return null
  const token = match[1].trim()
  return token === '' ? null : token
}

/**
 * 大小写不敏感地取一个 HTTP 头（WS 握手的 req.headers 正常是小写的，
 * 但 `app.inject` 与某些代理可能保留原样 —— 取头这件事不该成为鉴权的变量）。
 * @param {Record<string, unknown>} headers
 * @param {string} name
 * @returns {unknown}
 */
export function getHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return undefined
  if (headers[name] !== undefined) return headers[name]
  const target = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) return headers[key]
  }
  return undefined
}

/**
 * 校验握手 token。
 *
 * 两种服务端凭据形态都支持（设计文档 §3.1）：
 *   - `AI_PROVIDER_TOKEN`：明文，直接常量时间比对；
 *   - `AI_PROVIDER_TOKEN_SHA256`：只存摘要，先把候选 token 做 sha256 再比对 ——
 *     既不在服务器上落明文，也避免长度泄露。
 *
 * ⚠️ 未配置任何凭据时**恒返回 false**（不是放行）：宁可隧道整体不可用，
 *    也不能让"忘了配 token"变成"公网隧道免鉴权"。
 *
 * @param {object} config parseAiConfig 的产出
 * @param {Record<string, unknown>|undefined} headers WS 握手请求头
 * @returns {{ok: true} | {ok: false, code: 4401, reason: 'missing_token'|'bad_token'|'no_credential'}}
 */
export function authorizeHandshake(config, headers) {
  if (!config || !config.hasProviderToken) {
    return { ok: false, code: 4401, reason: 'no_credential' }
  }
  const token = extractBearerToken(getHeader(headers ?? {}, 'authorization'))
  if (token === null) return { ok: false, code: 4401, reason: 'missing_token' }

  if (config.providerToken && safeEqual(token, config.providerToken)) return { ok: true }
  if (config.providerTokenSha256) {
    const digest = createHash('sha256').update(token, 'utf8').digest('hex')
    if (safeEqual(digest, config.providerTokenSha256)) return { ok: true }
  }
  return { ok: false, code: 4401, reason: 'bad_token' }
}

/**
 * 启动期护栏：生产 + AI 开启 + 无凭据 → 返回一段可直接打印的错误说明。
 *
 * 与 `index.js` 里 JWT_SECRET 的护栏同款（拒绝启动而不是带病运行）。
 * 之所以返回字符串而不是直接 process.exit：入口文件负责退出码，这里保持纯函数可测。
 *
 * @param {object} config
 * @param {string} nodeEnv
 * @returns {string|null} null = 通过
 */
export function describeMissingCredential(config, nodeEnv = 'development') {
  if (!config || !config.enable) return null
  if (config.hasProviderToken) return null
  if (nodeEnv !== 'production') return null
  return (
    '[ai] NODE_ENV=production 且 AI 已启用，但未配置 AI_PROVIDER_TOKEN（或 AI_PROVIDER_TOKEN_SHA256），拒绝启动。\n' +
    '     隧道端点是公网入口，缺凭据等于任何人都能把本机模型当免费代理用。\n' +
    '     生成方式：openssl rand -hex 32，填入 server/.env；AI_ENABLE=0 也可临时关闭 AI。'
  )
}
