/**
 * AI Provider 客户端配置（作者本机侧）
 *
 * 与 `server/src/ai/config.js` 同一条纪律：**配置只走环境变量**，代码里不出现任何
 * 服务器地址 / token。`.env` 由 .gitignore 忽略（根 .gitignore 的 `.env` 规则已覆盖
 * `tools/ai-provider/.env`），只提交 `.env.example`。
 *
 * ⚠️ 缺失必填项时**抛错退出**，不静默用默认值：
 *    本机的 tunnel 进程一旦"看似在跑其实连错服务器"，排查成本远高于启动失败。
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * 极简 .env 解析（只支持 KEY=VALUE，忽略 # 注释与空行，支持 '...' / "..." 包裹）。
 *
 * 为什么不用 `node --env-file`：
 *   ① 缺失文件会让 Node **致命报错退出**，而本工具要求"没配 .env 也能靠环境变量跑"；
 *   ② 需要「进程环境变量优先」的语义（CI / 临时覆盖场景）。
 *
 * @param {string} path 文件路径；不存在时返回空对象（**不抛错**）
 * @returns {Record<string, string>}
 */
export function readEnvFileSync(path) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'EISDIR')) return {}
    throw err
  }
  const out = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) out[key] = value
  }
  return out
}

/** 「进程环境变量优先」地合并：fileEnv 只补 process.env 里没有的键 */
function mergeEnv(fileEnv, processEnv) {
  return { ...fileEnv, ...processEnv }
}

/**
 * 解析整数（非法值 → 默认 + 告警）。
 * @param {unknown} raw
 * @param {number} fallback
 * @param {{min?: number, max?: number, name?: string, warn?: (msg: string) => void}} [opts]
 * @returns {number}
 */
export function parseIntEnv(raw, fallback, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, name = '', warn = () => {} } = {}) {
  const n = Number(raw)
  if (raw === undefined || raw === null || String(raw).trim() === '' || !Number.isFinite(n)) {
    if (raw !== undefined && raw !== null && String(raw).trim() !== '' && name) {
      warn(`${name} 不是数字（${String(raw)}），回退默认值 ${fallback}`)
    }
    return fallback
  }
  const clamped = Math.min(max, Math.max(min, Math.round(n)))
  if (clamped !== Math.round(n) && name) warn(`${name}=${n} 超出 [${min}, ${max}]，已钳制为 ${clamped}`)
  return clamped
}

/**
 * 从 env 解析 Provider 配置。
 *
 * @param {Record<string, string|undefined>} env 已合并的 env（.env + process.env）
 * @param {{warn?: (msg: string) => void}} [opts]
 * @returns {{serverUrl: string, token: string, providerId: string, priority: number,
 *   maxConcurrency: number, upstreamModel: string, upstreamBase: string, upstreamApiKey: string,
 *   reconnectBaseMs: number, reconnectMaxMs: number, standbyRetrySec: number,
 *   heartbeatSecDefault: number, echo: boolean}}
 * @throws {Error} 必填项缺失或 serverUrl 协议非法
 */
export function parseProviderConfig(env, { warn = () => {} } = {}) {
  const missing = []
  const serverUrl = String(env.AI_SERVER_URL ?? '').trim()
  const token = String(env.AI_PROVIDER_TOKEN ?? '').trim()
  if (!serverUrl) missing.push('AI_SERVER_URL')
  if (!token) missing.push('AI_PROVIDER_TOKEN')
  if (missing.length > 0) {
    throw new Error(
      `[ai-provider] 缺少必填配置：${missing.join('、')}。\n` +
        `  请复制 ${resolve(HERE, '.env.example')} 为 .env 并填写；\n` +
        `  AI_SERVER_URL 形如 wss://你的域名/api/ai/tunnel（本地联调用 ws://127.0.0.1:3000/api/ai/tunnel）。`
    )
  }
  // 只允许 ws / wss：写成 http 会在握手阶段才失败，且报错信息（"Unexpected server response"）极具误导性
  if (!/^wss?:\/\//i.test(serverUrl)) {
    throw new Error(`[ai-provider] AI_SERVER_URL 必须以 ws:// 或 wss:// 开头，当前为：${serverUrl}`)
  }
  return {
    serverUrl,
    token,
    providerId: String(env.AI_PROVIDER_ID ?? '').trim() || 'local-machine',
    priority: parseIntEnv(env.AI_PROVIDER_PRIORITY, 100, { min: 0, max: 1000000, name: 'AI_PROVIDER_PRIORITY', warn }),
    maxConcurrency: parseIntEnv(env.AI_PROVIDER_MAX_CONCURRENCY, 1, { min: 1, max: 64, name: 'AI_PROVIDER_MAX_CONCURRENCY', warn }),
    upstreamModel: String(env.AI_UPSTREAM_MODEL ?? '').trim(),
    upstreamBase: String(env.AI_UPSTREAM_BASE ?? '').trim(),
    upstreamApiKey: String(env.AI_UPSTREAM_API_KEY ?? '').trim(),
    reconnectBaseMs: parseIntEnv(env.AI_RECONNECT_BASE_MS, 1000, { min: 100, max: 60000, name: 'AI_RECONNECT_BASE_MS', warn }),
    reconnectMaxMs: parseIntEnv(env.AI_RECONNECT_MAX_MS, 30000, { min: 1000, max: 600000, name: 'AI_RECONNECT_MAX_MS', warn }),
    standbyRetrySec: parseIntEnv(env.AI_STANDBY_RETRY_SEC, 60, { min: 5, max: 3600, name: 'AI_STANDBY_RETRY_SEC', warn }),
    // welcome 帧到达前的临时心跳间隔；welcome 里服务器会给权威值（设计文档 §3.2）
    heartbeatSecDefault: parseIntEnv(env.AI_HEARTBEAT_SEC, 15, { min: 1, max: 3600, name: 'AI_HEARTBEAT_SEC', warn }),
    // S2 回显开关：S3 接真实上游后改为 false（handleReq 换成 upstream.js）
    echo: String(env.AI_PROVIDER_ECHO ?? '1').trim().toLowerCase() !== '0'
  }
}

/**
 * 读取配置（.env + process.env，后者优先）并解析。
 *
 * @param {object} [opts]
 * @param {string} [opts.envFile] .env 路径，默认与 config.js 同目录
 * @param {Record<string, string|undefined>} [opts.env] 覆盖 process.env（测试用）
 * @param {{warn?: (msg: string) => void}} [opts.log]
 * @returns {ReturnType<typeof parseProviderConfig>}
 */
export function loadProviderConfig({ envFile = resolve(HERE, '.env'), env = process.env, log = {} } = {}) {
  const warn = typeof log.warn === 'function' ? log.warn : () => {}
  const merged = mergeEnv(readEnvFileSync(envFile), env)
  return parseProviderConfig(merged, { warn })
}

export { HERE as PROVIDER_DIR }
