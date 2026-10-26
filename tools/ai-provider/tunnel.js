/**
 * AI Provider 隧道客户端（作者本机侧）
 *
 * 方向是**本机主动外连**服务器：本机的 Ollama / LM Studio 只听 127.0.0.1、不开端口，
 * 服务器连不进来，只能本机出去。连上之后，服务器把前端请求经这条长连接送回来，
 * 本机按 `id`（UUID）逐帧回 —— 单条连接上多路复用多个请求。
 *
 * 本轮（S2）的职责边界：连上 + 通过鉴权 + 响应心跳 + 把 req 帧**回显**回去。
 * 接真实模型（S3）时只需把 `handleReq()` 换成 upstream.js 的流式调用，帧协议不变。
 *
 * ⚠️ 零第三方依赖：用 Node 22 内置的全局 `WebSocket` 与 `fetch`
 *    （Node 22.22 实测支持 `new WebSocket(url, { headers })` —— 握手 token 走
 *    Authorization 头，不进 nginx access log，故不用 query 参数）。
 */

import { FRAME, CLOSE, encodeFrame, decodeFrame, truncateCloseReason } from '../../server/src/ai/protocol.js'

/** 与服务器角色相反：这里收到的是服务器方向的帧 */
const EXPECTED_DIRECTION = 'server'

/**
 * 关闭码 → 重连策略（设计文档 §3.3）
 *
 * @param {number} code WebSocket 关闭码
 * @returns {{action: 'fatal'|'retry'|'standby', message: string}}
 */
export function classifyClose(code) {
  switch (code) {
    case CLOSE.UNAUTHORIZED: // 4401 token 无效：重试只会刷日志，直接退出让人去改 .env
      return { action: 'fatal', message: 'token 无效，请检查 .env 里的 AI_PROVIDER_TOKEN' }
    case CLOSE.CONFLICT: // 4409 有更高优先级实例在占坑：退避重连，等它让位
      return { action: 'retry', message: '已有更高优先级的 Provider 在线，稍后重试' }
    case CLOSE.PREEMPTED: // 4408 被抢占：进入 standby（不做指数退避，否则两台机器互踢成永动机）
      return { action: 'standby', message: '已被更高优先级实例抢占，进入待命' }
    default: // 1000 / 1001 / 1006 / 网络错误：一律退避重连
      return { action: 'retry', message: '连接断开，稍后重连' }
  }
}

/**
 * 指数退避 + ±20% 抖动（§3.3）。
 *
 * 抖动的目的：多 Provider 同时断线时不"惊群"一起重连。
 *
 * @param {number} attempt 第几次重连（从 1 开始）
 * @param {object} opts
 * @param {number} [opts.baseMs=1000]
 * @param {number} [opts.maxMs=30000]
 * @param {() => number} [opts.random=Math.random] 注入点，便于单测确定性化
 * @returns {number} 毫秒
 */
export function nextBackoffMs(attempt, { baseMs = 1000, maxMs = 30000, random = Math.random } = {}) {
  const step = Math.max(0, Number(attempt) - 1)
  const raw = Math.min(maxMs, baseMs * 2 ** step)
  const jitter = (random() * 2 - 1) * 0.2 // ±20%
  const value = Math.round(raw * (1 + jitter))
  return Math.max(1, Math.min(maxMs, value))
}

/**
 * S2 回显：把收到的 req 原样回一句话。
 *
 * ⚠️ 回显文本里**带上 id 与 kind**：这是"多路复用有没有串台"最直接的肉眼证据 ——
 *    服务器侧断言每个请求的回包里含自己的 id 即可。
 *
 * @param {object} config
 * @param {object} frame req 帧
 * @returns {string}
 */
export function buildEchoText(config, frame) {
  const messages = Array.isArray(frame.messages) ? frame.messages : []
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user')
  const input = String(lastUser?.content ?? '').slice(0, 200)
  return `[echo:${config.providerId}] id=${frame.id} kind=${frame.kind ?? 'qa'} says=${input}`
}

/**
 * 创建 Provider 客户端。
 *
 * @param {object} opts
 * @param {object} opts.config parseProviderConfig 的产出
 * @param {object} [opts.log] {debug,info,warn,error}
 * @param {typeof WebSocket} [opts.WebSocketImpl] 注入点（测试用假实现）
 * @param {() => number} [opts.now]
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 * @param {typeof setTimeout} [opts.setTimeoutFn]
 * @param {typeof clearTimeout} [opts.clearTimeoutFn]
 */
export function createProviderClient({
  config,
  log = console,
  WebSocketImpl = null,
  now = () => Date.now(),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
} = {}) {
  const logger = {
    debug: typeof log.debug === 'function' ? log.debug.bind(log) : () => {},
    info: typeof log.info === 'function' ? log.info.bind(log) : () => {},
    warn: typeof log.warn === 'function' ? log.warn.bind(log) : () => {},
    error: typeof log.error === 'function' ? log.error.bind(log) : () => {}
  }

  /** @type {'idle'|'connecting'|'online'|'waiting'|'stopped'} */
  let state = 'idle'
  let socket = null
  let attempt = 0
  let heartbeatTimer = null
  let heartbeatSec = config.heartbeatSecDefault
  let standby = false
  let stopping = false
  /** @type {Set<string>} 本机在途请求 id（ping 帧上报给服务器，纯可观测） */
  const inflight = new Set()
  let lastPongAt = 0

  function setState(next) {
    state = next
    logger.debug?.(`[ai-provider] state=${next}`)
  }

  /**
   * 发送一帧。
   * @param {object} frame
   * @returns {boolean}
   */
  function send(frame) {
    if (!socket || socket.readyState !== 1) {
      logger.warn(`[ai-provider] 连接未就绪，丢弃帧 type=${frame?.type}`)
      return false
    }
    try {
      socket.send(encodeFrame(frame))
      return true
    } catch (err) {
      logger.warn({ err }, '[ai-provider] 发送帧失败')
      return false
    }
  }

  /** 重启心跳定时器（welcome 会给出权威间隔） */
  function restartHeartbeat() {
    if (heartbeatTimer) {
      clearTimeoutFn(heartbeatTimer)
      heartbeatTimer = null
    }
    if (stopping) return
    const periodMs = Math.max(1000, Math.floor(heartbeatSec * 1000))
    heartbeatTimer = setTimeoutFn(() => {
      heartbeatTimer = null
      send({ type: FRAME.PING, ts: now(), inflight: inflight.size })
      restartHeartbeat()
    }, periodMs)
    heartbeatTimer?.unref?.()
  }

  /** 首帧：hello（能力 + 上游自检结果） */
  function sendHello() {
    send({
      type: FRAME.HELLO,
      providerId: config.providerId,
      priority: config.priority,
      models: config.upstreamModel ? [config.upstreamModel] : [],
      maxConcurrency: config.maxConcurrency,
      // S2 回显阶段不做上游自检：显式 true，让服务器侧 status 判 ready（否则会被判离线）。
      // S3 接真实上游时这里要换成对 {AI_UPSTREAM_BASE}/models 的探测结果。
      caps: { stream: true, upstreamOk: true, echo: config.echo }
    })
  }

  /**
   * 处理一个 req 帧。
   * @param {object} frame
   */
  function handleReq(frame) {
    const id = typeof frame.id === 'string' ? frame.id : ''
    if (!id) {
      logger.warn('[ai-provider] 收到无 id 的 req 帧，忽略')
      return
    }
    inflight.add(id)
    try {
      if (config.echo) {
        const startedAt = now()
        send({ type: FRAME.CHUNK, id, seq: 1, delta: buildEchoText(config, frame) })
        send({
          type: FRAME.DONE,
          id,
          usage: { promptTokens: 0, completionTokens: 0 },
          finishReason: 'stop',
          latencyMs: now() - startedAt
        })
      } else {
        // S3 会替换这里：调本机 /v1/chat/completions 并把 SSE 增量逐条转成 chunk 帧
        send({
          type: FRAME.ERROR,
          id,
          code: 'upstream_unavailable',
          message: '真实上游尚未接入（当前为 S2 回显阶段）',
          retryable: false
        })
      }
    } finally {
      inflight.delete(id)
    }
  }

  /**
   * 处理一个服务器方向的帧。
   * @param {object} frame
   */
  function handleFrame(frame) {
    switch (frame.type) {
      case FRAME.WELCOME: {
        heartbeatSec = Number(frame.heartbeatSec) > 0 ? Number(frame.heartbeatSec) : heartbeatSec
        logger.info(`[ai-provider] 已接入服务器（心跳 ${heartbeatSec}s）`)
        setState('online')
        restartHeartbeat()
        return
      }
      case FRAME.PONG:
        lastPongAt = now()
        return
      case FRAME.REQ:
        handleReq(frame)
        return
      case FRAME.CANCEL: {
        // S3 起会 AbortController.abort() 中断上游生成；当前无在途上游调用，只记账
        if (frame.id) inflight.delete(frame.id)
        logger.info(`[ai-provider] 收到 cancel：id=${frame.id}`)
        return
      }
      case FRAME.BYE: {
        standby = frame.reason === 'preempted'
        logger.warn(`[ai-provider] 服务器要求下线：reason=${frame.reason ?? 'unknown'}`)
        return
      }
      default:
        logger.warn(`[ai-provider] 忽略未知帧：type=${frame.type}`)
        return
    }
  }

  /**
   * 建立一次连接；返回本次连接最终采用的关闭码（供调用方决定后续动作）。
   * @returns {Promise<number>} 关闭码（1006 = 连不上 / 异常）
   */
  function connectOnce() {
    return new Promise((resolveCloseCode) => {
      const Impl = WebSocketImpl ?? globalThis.WebSocket
      if (!Impl) {
        logger.error('[ai-provider] 当前 Node 版本没有全局 WebSocket（需要 Node 22+），无法连接')
        resolveCloseCode(1006)
        return
      }
      let ws
      try {
        ws = new Impl(config.serverUrl, { headers: { Authorization: `Bearer ${config.token}` } })
      } catch (err) {
        logger.error({ err }, '[ai-provider] 建立连接失败')
        resolveCloseCode(1006)
        return
      }
      socket = ws
      setState('connecting')

      ws.addEventListener?.('open', () => {
        attempt = 0
        standby = false
        sendHello()
        // 未收到 welcome 前也先按默认间隔心跳，避免"连上了但服务器没回 welcome"时把自己饿死
        restartHeartbeat()
      })

      ws.addEventListener?.('message', (event) => {
        const decoded = decodeFrame(event?.data, { expectedDirection: EXPECTED_DIRECTION })
        if (!decoded.ok) {
          // 服务器发了方向不对的帧（如 echo 回了自己的 req）：记 warn，不关连接（向前兼容）
          logger.warn(`[ai-provider] 忽略非法帧：${decoded.reason}${decoded.detail ? ` (${decoded.detail})` : ''}`)
          return
        }
        handleFrame(decoded.frame)
      })

      ws.addEventListener?.('error', (event) => {
        logger.warn({ message: event?.message ?? String(event) }, '[ai-provider] 连接错误')
      })

      ws.addEventListener?.('close', (event) => {
        const code = Number(event?.code ?? 1006)
        cleanup()
        resolveCloseCode(code)
      })
    })
  }

  /** 清理一次连接的现场（心跳定时器 / socket 引用） */
  function cleanup() {
    if (heartbeatTimer) {
      clearTimeoutFn(heartbeatTimer)
      heartbeatTimer = null
    }
    socket = null
    inflight.clear()
    setState('stopped')
  }

  /** 重连主循环（含指数退避与 standby） */
  async function loop() {
    while (!stopping) {
      const closeCode = await connectOnce()
      if (stopping) return
      const policy = classifyClose(closeCode)
      if (policy.action === 'fatal') {
        logger.error(`[ai-provider] ${policy.message}（关闭码 ${closeCode}）。不再重连，退出。`)
        return
      }
      if (policy.action === 'standby' || standby) {
        setState('waiting')
        logger.warn(`[ai-provider] ${policy.message}，${config.standbyRetrySec}s 后再试`)
        await sleep(config.standbyRetrySec * 1000)
        continue
      }
      attempt += 1
      const delay = nextBackoffMs(attempt, { baseMs: config.reconnectBaseMs, maxMs: config.reconnectMaxMs })
      setState('waiting')
      logger.warn(`[ai-provider] ${policy.message}（关闭码 ${closeCode}），${delay}ms 后第 ${attempt} 次重连`)
      await sleep(delay)
    }
  }

  return {
    /** 启动（异步跑重连循环，不阻塞调用方） */
    start() {
      if (state !== 'idle') return
      stopping = false
      logger.info(`[ai-provider] 连接 ${config.serverUrl}（providerId=${config.providerId}）`)
      // 刻意不 await：调用方要能同时处理 SIGINT
      loop().catch((err) => logger.error({ err }, '[ai-provider] 重连循环异常退出'))
      return this
    },
    /** 优雅停止：不再重连 */
    stop(reason = 'shutdown') {
      stopping = true
      // 先关 socket 再清现场：否则 cleanup 把引用置空，close 帧根本发不出去
      try {
        socket?.close?.(CLOSE.NORMAL, truncateCloseReason(reason))
      } catch {
        /* 关闭失败无需处理：进程即将退出 */
      }
      cleanup()
      logger.info('[ai-provider] 已停止')
      return this
    },
    /** 当前状态快照（可观测 / 自测用） */
    snapshot() {
      return {
        state,
        attempt,
        standby,
        heartbeatSec,
        inflight: inflight.size,
        lastPongAt: lastPongAt || null,
        providerId: config.providerId
      }
    },
    /** 内部方法暴露给测试：直接喂一个已解码的帧 */
    _handleFrame: handleFrame,
    _send: send
  }
}
