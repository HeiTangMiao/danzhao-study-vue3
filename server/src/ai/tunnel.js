/**
 * AI 隧道服务端：握手接入、心跳存活、Provider 注册表、按 UUID 的多路复用分发
 *
 * ⚠️ 本文件**刻意不 import fastify / ws**：
 *     WebSocket 只是一个"能 send / close / 收消息"的对象，这里只依赖这个最小接口。
 *    好处有三：① 单测可以用假 socket 直接驱动，不必起 HTTP 服务；
 *    ② 将来换 WS 实现不用动核心逻辑；③ 与 `rateLimit.js` / `sync-core.js` 的
 *    「纯逻辑 + 注入依赖」风格一致。真实的 WS 端点在 ./index.js（Fastify 插件）里接进来。
 *
 * 职责边界（设计文档 §3）：
 *   - 握手 = 你是谁（token 校验，见 ./config.js 的 authorizeHandshake）
 *   - hello = 你能干什么（providerId / 模型 / 并发 / 上游自检）
 *   - 心跳 = 你还活着（ping → pong；超过 AI_PROVIDER_TIMEOUT_SEC 无任何帧即判死）
 */

import { randomUUID } from 'node:crypto'
import { FRAME, CLOSE, encodeFrame, decodeFrame, parseHello, byteLength, truncateCloseReason, frameId } from './protocol.js'
import { authorizeHandshake, normalizeLog, resolveTimeoutMs } from './config.js'

/** 心跳/超时扫描的默认告警节流：同一类 warn 最多每秒一条，避免刷爆日志 */
const WARN_THROTTLE_MS = 1000

/**
 * 一条 Provider 连接。
 *
 * `hello` 为 null 表示"握手已通过但还没收到首帧" —— 此时它不在注册表里，
 * 不参与可用性判定，也就不会有请求被派发过去。
 */
export class ProviderConn {
  /**
   * @param {object} opts
   * @param {object} opts.socket 最小接口：send(text) / close(code, reason) / on(event, cb)
   * @param {number} [opts.maxFrameBytes]
   * @param {string} [opts.remoteAddress]
   * @param {() => number} [opts.now]
   * @param {object} [opts.log]
   */
  constructor({ socket, maxFrameBytes = 262144, remoteAddress = '', now = () => Date.now(), log = undefined }) {
    /** @type {object} 底层 socket（ws 的 WebSocket 实例或测试替身） */
    this.socket = socket
    this.maxFrameBytes = maxFrameBytes
    this.remoteAddress = remoteAddress
    this.now = now
    this.log = normalizeLog(log)

    /** @type {null|{providerId: string, priority: number, models: string[], maxConcurrency: number, upstreamOk: boolean, stream: boolean}} */
    this.hello = null
    /** @type {string|null} 与 hello.providerId 同步；hello 之前为 null */
    this.id = null
    this.priority = Number.POSITIVE_INFINITY
    this.models = []
    this.maxConcurrency = 1
    this.upstreamOk = false
    this.stream = false

    /** 在途请求数（本连接上已派发未终结的 req 数） */
    this.inflight = 0
    /** Provider 自己上报的在途数（ping 帧带），仅可观测，不参与调度 */
    this.reportedInflight = 0
    this.lastSeenAt = now()
    this.createdAt = now()
    /** 已收到多少帧（可观测 + 排障） */
    this.framesReceived = 0
    /** 关闭原因：由服务器侧主动关闭时写入，决定在途请求的失败码 */
    this.closeReason = ''
  }

  /** 是否已通过 hello 注册 */
  get ready() {
    return this.hello !== null
  }

  /** 首选模型（服务端未指定模型时用 Provider 的第一个） */
  get model() {
    return this.models.length > 0 ? this.models[0] : ''
  }

  /** 刷新存活时间戳。**任何**入站帧都算存活依据（不只看 ping），见 §3.2 */
  touch() {
    this.lastSeenAt = this.now()
    return this
  }

  /**
   * 是否已被判死（超过 timeoutMs 没收到任何帧）。
   * @param {number} timeoutMs
   * @returns {boolean}
   */
  isStale(timeoutMs) {
    return this.now() - this.lastSeenAt > timeoutMs
  }

  /**
   * 是否还有空槽位。有效并发 = min(Provider 声明, 服务器上限)。
   * @param {number} serverMaxConcurrency
   * @returns {boolean}
   */
  hasFreeSlot(serverMaxConcurrency) {
    const effective = Math.max(1, Math.min(this.maxConcurrency, serverMaxConcurrency))
    return this.inflight < effective
  }

  /**
   * 套用 hello 内容（只调一次）。
   * @param {object} hello parseHello 的产出
   */
  applyHello(hello) {
    this.hello = hello
    this.id = hello.providerId
    this.priority = hello.priority
    this.models = hello.models
    this.maxConcurrency = hello.maxConcurrency
    this.upstreamOk = hello.upstreamOk
    this.stream = hello.stream
    return this
  }

  /**
   * 发送一帧。超过单帧上限时**拒绝发送**并返回 false（调用方负责把请求判失败），
   * 而不是发出去让对端炸 —— 帧上限是"防内存打爆"的护栏，护栏自己先拦住最稳。
   * @param {object} frame
   * @returns {boolean} 是否真的写出去了
   */
  send(frame) {
    const text = encodeFrame(frame)
    const bytes = byteLength(text)
    if (bytes > this.maxFrameBytes) {
      this.log.error(`[ai-tunnel] 出站帧超过 ${this.maxFrameBytes} 字节（${bytes}），丢弃：type=${frame?.type}`)
      return false
    }
    try {
      this.socket.send(text)
      return true
    } catch (err) {
      // 连接已断但 'close' 事件还没到：记一条 warn 即可，清理交给 onClose
      this.log.warn({ err, providerId: this.id }, '[ai-tunnel] 发送帧失败')
      return false
    }
  }

  /**
   * 关闭连接。
   * @param {number} [code]
   * @param {string} [reason] 会裁剪到 123 字节（RFC 6455 的 close reason 上限）
   */
  close(code = CLOSE.NORMAL, reason = '') {
    try {
      this.socket.close(code, truncateCloseReason(reason))
    } catch (err) {
      this.log.warn({ err, providerId: this.id }, '[ai-tunnel] 关闭连接失败')
    }
  }
}

/**
 * Provider 注册表 —— 维护在线连接，并对外给出**三态**可用性。
 *
 * 单活策略（§5 的简化版，本轮只落地"同 id 重连替换"与"异 id 拒绝"）：
 *   - 同 providerId 再次接入 → 视为同一台机器网络闪断重连：旧连接发 bye{duplicate} 后关闭，新连接接管；
 *   - 不同 providerId 且已有存活实例 → 4409 provider_conflict 拒绝（按优先级抢占 + 排空属于后续步骤）。
 * ⚠️ 不做替换的后果：闪断重连后注册表里留下僵尸连接，"AI 可用"永远为真但请求派发到死连接上。
 */
export class ProviderRegistry {
  /**
   * @param {object} [opts]
   * @param {number} [opts.maxConcurrency=1] 服务器侧并发上限（与 Provider 声明取 min）
   * @param {boolean} [opts.single=true] 是否单活
   * @param {number} [opts.providerTimeoutMs=45000]
   * @param {number} [opts.heartbeatSec=15]
   * @param {() => number} [opts.now]
   * @param {object} [opts.log]
   */
  constructor({
    maxConcurrency = 1,
    single = true,
    providerTimeoutMs = 45000,
    heartbeatSec = 15,
    now = () => Date.now(),
    log = undefined
  } = {}) {
    /** @type {Map<string, ProviderConn>} providerId → 连接 */
    this.byId = new Map()
    this.maxConcurrency = maxConcurrency
    this.single = single
    this.providerTimeoutMs = providerTimeoutMs
    this.heartbeatSec = heartbeatSec
    this.now = now
    this.log = normalizeLog(log)
  }

  /** 连接数（含已判死但还没被 sweep 掉的） */
  get size() {
    return this.byId.size
  }

  /** @returns {ProviderConn[]} */
  list() {
    return [...this.byId.values()]
  }

  /**
   * @param {string} providerId
   * @returns {ProviderConn|undefined}
   */
  get(providerId) {
    return this.byId.get(providerId)
  }

  /** 未判死的连接 */
  freshConns() {
    return this.list().filter((conn) => !conn.isStale(this.providerTimeoutMs))
  }

  /** 未判死 + 上游自检通过的连接 */
  readyConns() {
    return this.freshConns().filter((conn) => conn.upstreamOk)
  }

  /**
   * 注册一条连接。
   * @param {ProviderConn} conn 必须先 applyHello
   * @returns {{ok: true, replaced: ProviderConn|null}
   *   | {ok: false, code: number, reason: 'provider_conflict'}}
   */
  attach(conn) {
    const providerId = conn.id
    if (!providerId) {
      return { ok: false, code: CLOSE.POLICY_VIOLATION, reason: 'provider_conflict' }
    }
    const existing = this.byId.get(providerId)
    if (existing) {
      // 同一台机器重连：旧连接上的在途请求会被判 provider_gone（由 onClose 统一处理）
      this.byId.delete(providerId)
      return { ok: true, replaced: existing }
    }
    if (this.single && this.freshConns().length > 0) {
      return { ok: false, code: CLOSE.CONFLICT, reason: 'provider_conflict' }
    }
    this.byId.set(providerId, conn)
    return { ok: true, replaced: null }
  }

  /**
   * 摘除连接（幂等：重复调用无害 —— close 事件与 sweep 可能同时触发）。
   * @param {ProviderConn} conn
   * @returns {boolean} 是否真的摘掉了
   */
  detach(conn) {
    if (!conn || !conn.id) return false
    const current = this.byId.get(conn.id)
    if (current !== conn) return false
    this.byId.delete(conn.id)
    return true
  }

  /**
   * 挑一条可派发的连接：未判死 + 上游 OK + 有空槽。
   * 多条时按 priority 升序（值小者优先）、心跳最新者优先取第一条 —— 单活模式下恒为唯一那条。
   * @returns {ProviderConn|null}
   */
  pick() {
    const candidates = this.readyConns().filter((conn) => conn.hasFreeSlot(this.maxConcurrency))
    if (candidates.length === 0) return null
    candidates.sort((a, b) => a.priority - b.priority || b.lastSeenAt - a.lastSeenAt)
    return candidates[0]
  }

  /**
   * 扫描并关闭所有已判死的连接。
   * ⚠️ 判死必须**连在途请求一起清**（在 TunnelServer.onClose 里做），
   *    否则并发上限会被僵尸连接永久吃掉（§3.2 明确点出的坑）。
   * @returns {ProviderConn[]} 被关闭的连接
   */
  sweep() {
    const dead = this.list().filter((conn) => conn.isStale(this.providerTimeoutMs))
    for (const conn of dead) {
      this.log.warn(
        { providerId: conn.id, silentMs: this.now() - conn.lastSeenAt },
        '[ai-tunnel] Provider 心跳超时，判死并关闭连接'
      )
      conn.closeReason = 'heartbeat_timeout'
      conn.close(CLOSE.GOING_AWAY, 'heartbeat_timeout')
    }
    return dead
  }

  /**
   * 三态可用性（§3.4）：offline / busy / ready。
   * @returns {'offline'|'busy'|'ready'}
   */
  state() {
    const usable = this.readyConns()
    if (usable.length === 0) return 'offline'
    if (usable.some((conn) => conn.hasFreeSlot(this.maxConcurrency))) return 'ready'
    return 'busy'
  }

  /**
   * 状态快照（供 /api/ai/status 与排障使用）。
   * @returns {object}
   */
  statusSnapshot() {
    const state = this.state()
    const fresh = this.freshConns()
    const primary = this.readyConns()[0] ?? fresh[0] ?? null
    let reason = 'no_provider'
    if (fresh.length > 0 && this.readyConns().length === 0) reason = 'upstream_unavailable'
    else if (state === 'busy') reason = 'no_free_slot'
    else if (state === 'ready') reason = 'ok'
    return {
      available: state !== 'offline',
      state,
      reason,
      providerId: primary?.id ?? null,
      model: primary?.model ?? '',
      connections: fresh.length,
      inflight: fresh.reduce((sum, c) => sum + c.inflight, 0),
      // 排队器（scheduler.js）属于后续步骤（§12 的 S4），在此之前恒为 0 ——
      // 刻意保留字段，让前端契约一次成型，避免 S4 落地时改前端。
      queueDepth: 0,
      maxConcurrency: Math.max(1, this.maxConcurrency),
      heartbeatSec: this.heartbeatSec,
      lastSeenAt: primary ? new Date(primary.lastSeenAt).toISOString() : null,
      updatedAt: new Date(this.now()).toISOString()
    }
  }
}

/**
 * 隧道服务端核心。
 *
 * 多路复用：每个 `req` 帧带一个 UUID（id），服务器侧 `pending: Map<id, Job>`；
 * Provider 的 chunk / done / error 帧凭 id 归位。**id 是唯一的关联键** ——
 * 这也是 S2 必须先做回显的原因：在接真实模型之前先把这条映射验证对。
 */
export class TunnelServer {
  /**
   * @param {object} opts
   * @param {object} opts.config parseAiConfig 的产出
   * @param {object} [opts.log]
   * @param {() => number} [opts.now]
   * @param {() => string} [opts.randomId]
   * @param {typeof setTimeout} [opts.setTimeoutFn]
   * @param {typeof clearTimeout} [opts.clearTimeoutFn]
   * @param {typeof setInterval} [opts.setIntervalFn]
   * @param {typeof clearInterval} [opts.clearIntervalFn]
   * @param {(config: object, headers: object) => ({ok: true}|{ok: false, code: number, reason: string})} [opts.authorize]
   */
  constructor({
    config,
    log = undefined,
    now = () => Date.now(),
    randomId = randomUUID,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    authorize = authorizeHandshake
  } = {}) {
    if (!config) throw new Error('[ai-tunnel] 缺少 config')
    this.config = config
    this.log = normalizeLog(log)
    this.now = now
    this.randomId = randomId
    this.setTimeoutFn = setTimeoutFn
    this.clearTimeoutFn = clearTimeoutFn
    this.setIntervalFn = setIntervalFn
    this.clearIntervalFn = clearIntervalFn
    this.authorize = authorize

    this.registry = new ProviderRegistry({
      maxConcurrency: config.maxConcurrency,
      single: config.providerSingle,
      providerTimeoutMs: config.providerTimeoutSec * 1000,
      heartbeatSec: config.heartbeatSec,
      now,
      log
    })

    /** @type {Map<string, object>} 请求 id → Job（在途请求表，多路复用的核心） */
    this.pending = new Map()
    /** @type {Map<string, number>} 未知帧类型的告警节流表 */
    this.unknownTypeWarnedAt = new Map()
    /** @type {ReturnType<typeof setInterval>|null} 判死扫描定时器 */
    this.sweeper = null
    /** 累计统计（可观测 / 排障） */
    this.stats = { accepted: 0, rejected: 0, dispatched: 0, completed: 0, failed: 0, mismatched: 0 }
  }

  /**
   * 处理一次 WS 握手接入。
   *
   * @param {object} opts
   * @param {object} opts.socket ws 的 WebSocket（或同接口替身）
   * @param {Record<string, unknown>} [opts.headers] 握手请求头
   * @param {string} [opts.remoteAddress]
   * @returns {{ok: true, conn: ProviderConn} | {ok: false, code: number, reason: string}}
   */
  acceptConnection({ socket, headers = {}, remoteAddress = '' }) {
    const decision = this.authorize(this.config, headers)
    if (!decision.ok) {
      this.stats.rejected += 1
      // ⚠️ 关闭码 4401 只能在协议升级之后送达（HTTP 握手响应带不了自定义 close 码）。
      //    此时连接已被升级但**不注册、不收帧**：调用方（index.js）不会为它挂任何业务处理。
      this.log.warn({ remoteAddress, reason: decision.reason }, '[ai-tunnel] 握手鉴权失败，关闭连接')
      this.#closeRaw(socket, decision.code ?? CLOSE.UNAUTHORIZED, 'unauthorized')
      return { ok: false, code: decision.code ?? CLOSE.UNAUTHORIZED, reason: decision.reason ?? 'unauthorized' }
    }

    const conn = new ProviderConn({
      socket,
      maxFrameBytes: this.config.maxFrameBytes,
      remoteAddress,
      now: this.now,
      log: this.log
    })
    conn.touch()

    socket.on?.('message', (data) => this.#onMessage(conn, data))
    socket.on?.('close', (code, reason) => this.#onClose(conn, code, reason))
    socket.on?.('error', (err) => {
      this.log.warn({ err, providerId: conn.id }, '[ai-tunnel] socket error')
    })

    this.stats.accepted += 1
    this.log.info({ remoteAddress }, '[ai-tunnel] 握手通过，等待 hello 帧')
    return { ok: true, conn }
  }

  /**
   * 入站原始消息 → 解码 → 分发。
   * @param {ProviderConn} conn
   * @param {string|Buffer|unknown} data
   */
  #onMessage(conn, data) {
    conn.framesReceived += 1
    const decoded = decodeFrame(data, { maxBytes: this.config.maxFrameBytes, expectedDirection: 'provider' })
    if (!decoded.ok) {
      if (decoded.reason === 'too_large') {
        this.log.error({ providerId: conn.id, detail: decoded.detail }, '[ai-tunnel] 入站帧超限，关闭连接')
        conn.closeReason = 'frame_too_large'
        conn.close(CLOSE.MESSAGE_TOO_BIG, 'frame_too_large')
        return
      }
      if (decoded.reason === 'wrong_direction') {
        // Provider 发了只有服务器才该发的帧（req / cancel / bye / welcome）：协议违规，不留活口
        this.log.error({ providerId: conn.id, detail: decoded.detail }, '[ai-tunnel] 帧方向违规，关闭连接')
        conn.closeReason = 'protocol_violation'
        conn.close(CLOSE.POLICY_VIOLATION, 'protocol_violation')
        return
      }
      this.#warnUnknown(decoded.reason, decoded.detail)
      return
    }
    // 任何合法帧都算存活信号（§3.2：超过 3 个心跳周期没收**任何**帧才判死）
    conn.touch()
    this.handleFrame(conn, decoded.frame)
  }

  /**
   * 分发一个已解码的 Provider → 服务器 帧（对外暴露，便于单测直接驱动）。
   * @param {ProviderConn} conn
   * @param {object} frame
   * @returns {void}
   */
  handleFrame(conn, frame) {
    switch (frame.type) {
      case FRAME.HELLO:
        this.#onHello(conn, frame)
        return
      case FRAME.PING:
        this.#onPing(conn, frame)
        return
      case FRAME.PONG:
        // Provider 主动 pong（正常是服务器回 pong）：只当心跳，不额外处理
        this.log.debug?.({ providerId: conn.id }, '[ai-tunnel] 收到 pong')
        return
      case FRAME.CHUNK:
        this.#onChunk(conn, frame)
        return
      case FRAME.DONE:
        this.#onTerminal(conn, frame, true)
        return
      case FRAME.ERROR:
        this.#onTerminal(conn, frame, false)
        return
      default:
        this.#warnUnknown(`unhandled:${frame.type}`, frame.type)
        return
    }
  }

  /** hello：登记能力 + 回 welcome */
  #onHello(conn, frame) {
    if (conn.ready) {
      this.log.warn({ providerId: conn.id }, '[ai-tunnel] 重复 hello，忽略')
      return
    }
    const parsed = parseHello(frame)
    if (!parsed.ok) {
      this.log.error({ reason: parsed.reason }, '[ai-tunnel] hello 帧非法，关闭连接')
      conn.closeReason = 'bad_hello'
      conn.close(CLOSE.POLICY_VIOLATION, `bad_hello:${parsed.reason}`)
      return
    }
    conn.applyHello(parsed.hello)

    const verdict = this.registry.attach(conn)
    if (!verdict.ok) {
      conn.send({ type: FRAME.BYE, reason: verdict.reason })
      conn.closeReason = verdict.reason
      conn.close(verdict.code, verdict.reason)
      return
    }
    if (verdict.replaced) {
      // 旧连接（同一台机器闪断重连）：发 bye 后关闭，其上的在途请求按 provider_gone 失败
      const old = verdict.replaced
      this.log.warn(
        { providerId: old.id },
        '[ai-tunnel] 同一 providerId 重复接入，旧连接按 duplicate 关闭（在途请求判 provider_gone）'
      )
      old.closeReason = 'duplicate'
      old.send({ type: FRAME.BYE, reason: 'duplicate' })
      old.close(CLOSE.NORMAL, 'duplicate')
    }

    conn.send({
      type: FRAME.WELCOME,
      serverTime: this.now(),
      heartbeatSec: this.config.heartbeatSec,
      maxFrameBytes: this.config.maxFrameBytes
    })
    this.log.info(
      { providerId: conn.id, models: conn.models, maxConcurrency: conn.maxConcurrency, upstreamOk: conn.upstreamOk },
      '[ai-tunnel] Provider 上线'
    )
  }

  /** ping → pong（顺带记录 Provider 自报的在途数，仅供可观测） */
  #onPing(conn, frame) {
    if (typeof frame.inflight === 'number' && Number.isFinite(frame.inflight)) {
      conn.reportedInflight = Math.max(0, Math.round(frame.inflight))
    }
    conn.send({ type: FRAME.PONG, ts: Number.isFinite(Number(frame.ts)) ? Number(frame.ts) : this.now() })
  }

  /** chunk：按 id 归位给对应的在途请求 */
  #onChunk(conn, frame) {
    const id = frameId(frame)
    const job = id ? this.pending.get(id) : undefined
    if (!job) {
      this.stats.mismatched += 1
      this.log.warn({ providerId: conn.id, id }, '[ai-tunnel] 收到未知 id 的 chunk 帧，忽略')
      return
    }
    if (job.conn !== conn) {
      // 同一 id 出现在另一条连接上：绝不能"就近处理"，否则正是要防的串台
      this.stats.mismatched += 1
      this.log.error({ id, owner: job.conn?.id, from: conn.id }, '[ai-tunnel] chunk 帧来自非持有连接，忽略')
      return
    }
    const delta = typeof frame.delta === 'string' ? frame.delta : String(frame.delta ?? '')
    job.chunks.push(delta)
    job.chars += delta.length
    if (typeof job.onChunk === 'function') {
      job.onChunk(delta, Number.isFinite(Number(frame.seq)) ? Number(frame.seq) : job.chunks.length, frame)
    }
    if (typeof job.onFirstToken === 'function' && !job.firstTokenAt) {
      job.firstTokenAt = this.now()
      job.onFirstToken(job.firstTokenAt - job.createdAt)
    }
  }

  /** done / error：终结帧，释放多路复用槽位 */
  #onTerminal(conn, frame, ok) {
    const id = frameId(frame)
    const job = id ? this.pending.get(id) : undefined
    if (!job) {
      this.stats.mismatched += 1
      this.log.warn({ providerId: conn.id, id, type: frame.type }, '[ai-tunnel] 收到未知 id 的终结帧，忽略')
      return
    }
    if (job.conn !== conn) {
      this.stats.mismatched += 1
      this.log.error({ id, owner: job.conn?.id, from: conn.id }, '[ai-tunnel] 终结帧来自非持有连接，忽略')
      return
    }
    if (ok) {
      this.stats.completed += 1
      this.#settle(job, {
        ok: true,
        done: {
          usage: frame.usage ?? null,
          finishReason: frame.finishReason ?? 'stop'
        },
        text: job.chunks.join(''),
        latencyMs: this.now() - job.createdAt
      })
      return
    }
    this.stats.failed += 1
    this.#settle(job, {
      ok: false,
      error: {
        code: typeof frame.code === 'string' && frame.code ? frame.code : 'ai_upstream_error',
        message: typeof frame.message === 'string' ? frame.message : '',
        retryable: Boolean(frame.retryable)
      },
      partial: job.chunks.join('')
    })
  }

  /**
   * 派发一个请求到隧道（S2 的核心入口）。
   *
   * @param {object} req
   * @param {string} [req.id] 不传则生成 UUID
   * @param {string} [req.kind='qa']
   * @param {object[]} [req.messages=[]]
   * @param {string} [req.model] 不传则取 Provider 的第一个模型
   * @param {number} [req.maxTokens]
   * @param {number} [req.timeoutMs] 不传则按 kind 取配置
   * @param {string} [req.providerId] 指定连接（默认按 registry.pick()）
   * @param {(delta: string, seq: number, frame: object) => void} [req.onChunk] 流式回调（S3 起用）
   * @param {(firstTokenMs: number) => void} [req.onFirstToken]
   * @returns {{id: string, providerId: string|null, result: Promise<object>, cancel: (reason?: string) => boolean}}
   *   result **永不 reject**（失败以 {ok:false, error} 表达），避免调用方漏 catch 造成 unhandled rejection。
   */
  dispatch(req = {}) {
    const id = typeof req.id === 'string' && req.id ? req.id : this.randomId()
    if (this.pending.has(id)) {
      this.log.error({ id }, '[ai-tunnel] 请求 id 重复，拒绝派发')
      return {
        id,
        providerId: null,
        result: Promise.resolve({
          ok: false,
          error: { code: 'ai_duplicate_id', message: '请求 id 重复', retryable: false },
          partial: ''
        }),
        cancel: () => false
      }
    }

    const conn = req.providerId ? this.registry.get(req.providerId) : this.registry.pick()
    const kind = typeof req.kind === 'string' && req.kind ? req.kind : 'qa'
    const timeoutMs = Number(req.timeoutMs) > 0 ? Number(req.timeoutMs) : resolveTimeoutMs(this.config, kind)

    if (!conn) {
      // ⚠️ registry.pick() 只返回**有空槽**的连接，因此"在线但已被占满"也会走到这里。
      //    必须按 registry.state() 把二者分开：offline 与 busy 在用户侧的处置完全不同——
      //    "服务不可用"会让人直接放弃，"正忙，请稍后再试"才会等一会儿再来。
      //    这正是 §3.4 四态里 offline / busy 必须区分的原因。
      const busy = this.registry.state() === 'busy'
      this.stats.failed += 1
      return {
        id,
        providerId: null,
        result: Promise.resolve({
          ok: false,
          error: busy
            ? { code: 'ai_busy', message: '本机模型正忙，请稍后再试', retryable: true }
            : { code: 'ai_offline', message: 'AI 服务当前不可用', retryable: true },
          partial: ''
        }),
        cancel: () => false
      }
    }
    if (!conn.hasFreeSlot(this.config.maxConcurrency)) {
      this.stats.failed += 1
      return {
        id,
        providerId: conn.id,
        result: Promise.resolve({
          ok: false,
          error: { code: 'ai_busy', message: '本机模型正忙，请稍后再试', retryable: true },
          partial: ''
        }),
        cancel: () => false
      }
    }

    /** @type {object} */
    const job = {
      id,
      kind,
      conn,
      createdAt: this.now(),
      firstTokenAt: 0,
      timeoutMs,
      chunks: [],
      chars: 0,
      timer: null,
      settled: false,
      onChunk: typeof req.onChunk === 'function' ? req.onChunk : null,
      onFirstToken: typeof req.onFirstToken === 'function' ? req.onFirstToken : null,
      resolve: null
    }
    const result = new Promise((resolve) => {
      job.resolve = resolve
    })

    this.pending.set(id, job)
    conn.inflight += 1
    this.stats.dispatched += 1

    const sent = conn.send({
      type: FRAME.REQ,
      id,
      kind,
      messages: Array.isArray(req.messages) ? req.messages : [],
      model: typeof req.model === 'string' && req.model ? req.model : conn.model || this.config.defaultModel || '',
      maxTokens: Number(req.maxTokens) > 0 ? Number(req.maxTokens) : undefined,
      timeoutMs
    })
    if (!sent) {
      this.#settle(job, {
        ok: false,
        error: { code: 'ai_request_too_large', message: '请求体超过单帧上限', retryable: false },
        partial: ''
      })
      return { id, providerId: conn.id, result, cancel: () => false }
    }

    // 超时：先发 cancel 帧（让 Provider 中断上游生成、立刻释放本机算力），再释放槽位
    job.timer = this.setTimeoutFn(() => {
      this.log.warn({ id, timeoutMs, providerId: job.conn?.id }, '[ai-tunnel] 请求超时，发送 cancel')
      job.conn?.send({ type: FRAME.CANCEL, id })
      this.#settle(job, {
        ok: false,
        error: { code: 'ai_timeout', message: '生成超时，已中断', retryable: true },
        partial: job.chunks.join('')
      })
    }, timeoutMs)
    // 不该因为"还有请求在途"而阻止进程退出 / 测试结束
    job.timer?.unref?.()

    return {
      id,
      providerId: conn.id,
      result,
      cancel: (reason = 'client_cancel') => {
        if (job.settled) return false
        job.conn?.send({ type: FRAME.CANCEL, id })
        this.#settle(job, {
          ok: false,
          error: { code: 'ai_cancelled', message: reason, retryable: true },
          partial: job.chunks.join('')
        })
        return true
      }
    }
  }

  /**
   * 终结一个在途请求（幂等：重复调用返回 false）。
   *
   * ⚠️ 槽位释放**只在这里做一次**，覆盖正常完成 / 超时 / 取消 / 连接断开四条路径 ——
   *    漏一条就泄漏一个槽，直到重启才能恢复（§4.1 明确点名的坑）。
   * @param {object} job
   * @param {object} outcome
   * @returns {boolean}
   */
  #settle(job, outcome) {
    if (!job || job.settled) return false
    job.settled = true
    if (job.timer) {
      this.clearTimeoutFn(job.timer)
      job.timer = null
    }
    this.pending.delete(job.id)
    if (job.conn) {
      job.conn.inflight = Math.max(0, job.conn.inflight - 1)
    }
    job.resolve(outcome)
    return true
  }

  /** socket close：摘除连接并把该连接上的在途请求全部判失败 */
  #onClose(conn, code, reason) {
    const detached = this.registry.detach(conn)
    const reasonText = Buffer.isBuffer(reason) ? reason.toString('utf8') : String(reason ?? '')
    this.log.info(
      { providerId: conn.id, code, reason: reasonText, detached },
      '[ai-tunnel] Provider 连接关闭'
    )
    const errorCode = conn.closeReason === 'duplicate' ? 'provider_gone' : 'ai_disconnected'
    for (const job of [...this.pending.values()]) {
      if (job.conn !== conn) continue
      this.#settle(job, {
        ok: false,
        error: { code: errorCode, message: '隧道连接已断开', retryable: true },
        partial: job.chunks.join('')
      })
    }
  }

  /** 未知帧类型的告警节流（同一类最多每秒一条，避免被刷屏） */
  #warnUnknown(key, detail) {
    const last = this.unknownTypeWarnedAt.get(key) ?? 0
    const now = this.now()
    if (now - last < WARN_THROTTLE_MS) return
    this.unknownTypeWarnedAt.set(key, now)
    this.log.warn({ key, detail }, '[ai-tunnel] 忽略无法识别的入站帧')
  }

  /** 直接关一个还没包装成 ProviderConn 的 socket（握手失败路径） */
  #closeRaw(socket, code, reason) {
    try {
      socket.close(code, truncateCloseReason(reason))
    } catch (err) {
      this.log.warn({ err }, '[ai-tunnel] 关闭未授权连接失败')
    }
  }

  /** 扫描并判死（供定时器与单测调用） */
  sweep() {
    return this.registry.sweep()
  }

  /** 启动判死扫描定时器（心跳周期扫一次即可，无需更密） */
  startSweeper() {
    if (this.sweeper) return this.sweeper
    const periodMs = Math.max(1000, Math.floor(this.config.heartbeatSec * 1000))
    this.sweeper = this.setIntervalFn(() => {
      try {
        this.sweep()
      } catch (err) {
        this.log.error({ err }, '[ai-tunnel] 判死扫描异常')
      }
    }, periodMs)
    this.sweeper?.unref?.()
    return this.sweeper
  }

  /**
   * 停止扫描定时器并关闭所有连接（进程退出 / 插件卸载）。
   * @param {number} [code]
   * @param {string} [reason]
   */
  closeAll(code = CLOSE.GOING_AWAY, reason = 'server_shutdown') {
    if (this.sweeper) {
      this.clearIntervalFn(this.sweeper)
      this.sweeper = null
    }
    for (const conn of this.registry.list()) {
      conn.closeReason = reason
      conn.close(code, reason)
      this.registry.detach(conn)
    }
    // 兜底：万一某条连接没走 close 事件，也要把在途请求放掉，不能让调用方永久挂起
    for (const job of [...this.pending.values()]) {
      this.#settle(job, {
        ok: false,
        error: { code: 'ai_disconnected', message: '服务端关闭隧道', retryable: true },
        partial: job.chunks.join('')
      })
    }
  }

  /** 状态快照（/api/ai/status 的数据源） */
  statusSnapshot() {
    return {
      ...this.registry.statusSnapshot(),
      // 在途请求数比 registry.inflight 更权威（registry 只统计已注册连接）
      inflight: this.pending.size,
      stats: { ...this.stats }
    }
  }
}

/**
 * 工厂（保持与项目中其它模块的「createXxx」命名一致）。
 * @param {object} opts 同 TunnelServer 构造参数
 * @returns {TunnelServer}
 */
export function createTunnelServer(opts) {
  return new TunnelServer(opts)
}
