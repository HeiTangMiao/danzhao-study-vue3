/**
 * AI 隧道帧协议 —— 常量、编解码与帧校验（**纯函数层**：零 IO、零第三方依赖）
 *
 * 之所以单独成一个文件（而不是塞进 tunnel.js）：
 *   服务端 websocket / Provider 客户端**两端共用同一套帧定义**，且这里全是纯函数，
 *   能脱离 HTTP / WebSocket 直接单测 —— 协议一旦出错，表现是"单向串台"这种最难查的故障，
 *   必须有廉价的单测兜底。
 *
 * ⚠️ 设计约定（docs/ai-gateway-design.md §2.3）：
 *   - 传输用 text 帧 + JSON；单帧上限 AI_MAX_FRAME_BYTES（默认 256KB），超限即关连接（防内存打爆）。
 *   - 未知 type → **忽略并 warn**，不要关连接（便于将来加帧类型向前兼容）。
 *   - 反向的帧（如 Provider 竟发 `req`）属于协议违规：opus 关闭连接，而不是静默忽略。
 */

/** 帧类型 */
export const FRAME = Object.freeze({
  // Provider → 服务器
  HELLO: 'hello',
  PING: 'ping',
  CHUNK: 'chunk',
  DONE: 'done',
  ERROR: 'error',
  PONG: 'pong',
  // 服务器 → Provider
  WELCOME: 'welcome',
  REQ: 'req',
  CANCEL: 'cancel',
  BYE: 'bye'
})

/** Provider → 服务器 方向的帧类型 */
const PROVIDER_FRAME_SET = new Set([FRAME.HELLO, FRAME.PING, FRAME.CHUNK, FRAME.DONE, FRAME.ERROR, FRAME.PONG])

/** 服务器 → Provider 方向的帧类型 */
const SERVER_FRAME_SET = new Set([FRAME.WELCOME, FRAME.REQ, FRAME.CANCEL, FRAME.BYE])

export const PROVIDER_FRAMES = Object.freeze(PROVIDER_FRAME_SET)
export const SERVER_FRAMES = Object.freeze(SERVER_FRAME_SET)

/** 单请求内的终结帧类型（收到后该 id 的多路复用槽位即可释放） */
export const TERMINAL_FRAMES = Object.freeze(new Set([FRAME.DONE, FRAME.ERROR]))

/**
 * WebSocket 关闭码
 *
 * ⚠️ 4401 / 4408 / 4409 属于**应用层自定义码**（RFC 6455 允许 4000-4999 段私有使用）。
 *    它们只能在"连接已升级"之后通过 close 帧送达 —— HTTP 握手阶段的错误响应（401）
 *    无法携带这些码。这是设计文档「校验失败直接 socket.close(4401)」得以成立的前提。
 */
export const CLOSE = Object.freeze({
  NORMAL: 1000,
  GOING_AWAY: 1001,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  /** token 无效或缺失 */
  UNAUTHORIZED: 4401,
  /** 被更高优先级实例抢占 */
  PREEMPTED: 4408,
  /** 已有更高优先级实例在占坑 */
  CONFLICT: 4409
})

/** 单帧默认上限（256 KB），对齐设计文档 AI_MAX_FRAME_BYTES */
export const DEFAULT_MAX_FRAME_BYTES = 262144

/** close 帧的 reason 上限是 123 字节（RFC 6455），超了 ws 会抛错 */
export const MAX_CLOSE_REASON_BYTES = 123

/**
 * 该帧类型属于哪个方向。
 * @param {unknown} type 帧的 type 字段
 * @returns {'provider'|'server'|'unknown'}
 */
export function frameDirection(type) {
  if (PROVIDER_FRAME_SET.has(type)) return 'provider'
  if (SERVER_FRAME_SET.has(type)) return 'server'
  return 'unknown'
}

/**
 * 是否为终结帧（done / error）。
 * @param {{type: string}} frame
 * @returns {boolean}
 */
export function isTerminalFrame(frame) {
  return Boolean(frame) && TERMINAL_FRAMES.has(frame.type)
}

/**
 * 计算字符串 UTF-8 字节长度。
 *
 * ⚠️ 不能用 `str.length`：那是 UTF-16 code unit 数，中文会**少算 2/3**，
 *    用它做帧上限校验等于"中文 prompt 可以把上限放大三倍"。
 * @param {string} text
 * @returns {number}
 */
export function byteLength(text) {
  return Buffer.byteLength(String(text), 'utf8')
}

/**
 * 关闭原因裁剪：close 帧 reason 超过 123 字节会被 ws 拒绝。
 * @param {unknown} reason
 * @returns {string}
 */
export function truncateCloseReason(reason) {
  let text = String(reason ?? '')
  while (byteLength(text) > MAX_CLOSE_REASON_BYTES) {
    text = text.slice(0, -1)
  }
  return text
}

/**
 * 序列化帧 → JSON 文本。
 * @param {object} frame
 * @returns {string}
 */
export function encodeFrame(frame) {
  return JSON.stringify(frame ?? {})
}

/**
 * 反序列化并校验一个入站帧。
 *
 * 设计取舍：**不抛异常**（例外环绕 dichloromethane 每一帧都会走这里，抛异常会让 single-string
 * 的错误变成"连接被突然断开"，排查时看不到原始报文）。统一返回 `{ok:false, reason}`。
 *
 * @param {string|Buffer|ArrayBuffer|unknown} raw socket 收到的原始载荷
 * @param {object} [opts]
 * @param {number} [opts.maxBytes=DEFAULT_MAX_FRAME_BYTES] 单帧字节上限
 * @param {'provider'|'server'|null} [opts.expectedDirection=null] 期望的方向；不匹配 → wrong_direction
 * @returns {{ok: true, frame: object, bytes: number} | {ok: false, reason: string, detail?: string}}
 */
export function decodeFrame(raw, { maxBytes = DEFAULT_MAX_FRAME_BYTES, expectedDirection = null } = {}) {
  let text
  if (typeof raw === 'string') {
    text = raw
  } else if (Buffer.isBuffer(raw)) {
    text = raw.toString('utf8')
  } else if (Array.isArray(raw) || (raw && typeof raw === 'object' && !(raw instanceof ArrayBuffer))) {
    // ws 在极端分片场景下可能给 Buffer[]，拼起来再解；对象直接判定为非法载荷
    if (Array.isArray(raw) && raw.every(Buffer.isBuffer)) {
      text = Buffer.concat(raw).toString('utf8')
    } else {
      return { ok: false, reason: 'not_text', detail: 'payload is not a text frame' }
    }
  } else if (raw instanceof ArrayBuffer) {
    text = Buffer.from(raw).toString('utf8')
  } else {
    return { ok: false, reason: 'not_text', detail: `unsupported payload type: ${typeof raw}` }
  }

  const bytes = byteLength(text)
  if (bytes === 0) return { ok: false, reason: 'empty' }
  if (bytes > maxBytes) {
    return { ok: false, reason: 'too_large', detail: `${bytes} > ${maxBytes}` }
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { ok: false, reason: 'invalid_json', detail: err.message }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'not_object' }
  }
  const type = parsed.type
  if (typeof type !== 'string' || type === '') {
    return { ok: false, reason: 'missing_type' }
  }
  const direction = frameDirection(type)
  if (direction === 'unknown') {
    return { ok: false, reason: 'unknown_type', detail: type }
  }
  if (expectedDirection && direction !== expectedDirection) {
    return { ok: false, reason: 'wrong_direction', detail: `${type} belongs to ${direction}` }
  }
  return { ok: true, frame: parsed, bytes }
}

/**
 * 提取请求 UUID（多路复用键）。
 * @param {object} frame
 * @returns {string|null}
 */
export function frameId(frame) {
  const id = frame && frame.id
  return typeof id === 'string' && id !== '' ? id : null
}

const DEFAULT_HELLO = Object.freeze({
  priority: 100,
  models: [],
  maxConcurrency: 1,
  upstreamOk: true,
  stream: true
})

/**
 * 校验并规范化 Provider 的 hello 首帧（职责：hello = 你能干什么）。
 *
 * @param {object} frame
 * @returns {{ok: true, hello: {providerId: string, priority: number, models: string[],
 *   maxConcurrency: number, upstreamOk: boolean, stream: boolean}}
 *   | {ok: false, reason: 'bad_provider_id'|'bad_priority'|'bad_max_concurrency'|'bad_models'}}
 */
export function parseHello(frame) {
  const providerId = typeof frame.providerId === 'string' ? frame.providerId.trim() : ''
  // providerId 缺失**必须报错**：单活策略按它判重 / 抢占，空 id 会让两台机器互踢或同时存活。
  if (!providerId) return { ok: false, reason: 'bad_provider_id' }

  let priority = DEFAULT_HELLO.priority
  if (frame.priority !== undefined) {
    priority = Number(frame.priority)
    if (!Number.isFinite(priority)) return { ok: false, reason: 'bad_priority' }
  }

  let maxConcurrency = DEFAULT_HELLO.maxConcurrency
  if (frame.maxConcurrency !== undefined) {
    maxConcurrency = Math.floor(Number(frame.maxConcurrency))
    if (!Number.isFinite(maxConcurrency) || maxConcurrency < 1) {
      return { ok: false, reason: 'bad_max_concurrency' }
    }
  }

  let models = DEFAULT_HELLO.models
  if (frame.models !== undefined) {
    if (!Array.isArray(frame.models)) return { ok: false, reason: 'bad_models' }
    models = frame.models.filter((m) => typeof m === 'string' && m !== '')
  }

  const caps = frame.caps && typeof frame.caps === 'object' ? frame.caps : {}
  return {
    ok: true,
    hello: {
      providerId,
      priority,
      models,
      maxConcurrency,
      // upstreamOk 缺省按 true：Provider 没做上游自检（S2 回显阶段就是如此）时，
      // 不该因为缺字段被判离线。真正 Ollama 没起时 Provider 会**显式**上报 false。
      upstreamOk: caps.upstreamOk === undefined ? DEFAULT_HELLO.upstreamOk : Boolean(caps.upstreamOk),
      stream: caps.stream === undefined ? DEFAULT_HELLO.stream : Boolean(caps.stream)
    }
  }
}
