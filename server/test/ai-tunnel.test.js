/**
 * AI 隧道：握手鉴权 / 心跳判死 / 多路复用（S1 + S2）
 *
 * 这份测试存在的理由：
 *   1. **多路复用一旦写错，症状是"响应串台"**——用户 A 的问题收到用户 B 的答案。
 *      这种故障在生产里极难归因（日志里两个请求都"成功"了），必须靠廉价单测钉住。
 *   2. 握手鉴权是**公网入口**，错一次等于把本机算力敞开给人用。
 *   3. 超时/断连必须真的释放槽位，否则并发槽位泄漏会把队列永久卡死——
 *      表现为"用一会儿就再也不响应了"，而重启就好，最难查。
 *
 * 驱动方式：用 FakeSocket 替身直接喂帧，不需要真起 WebSocket 服务。
 * 运行：node --test server/test/ai-tunnel.test.js
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createTunnelServer } from '../src/ai/tunnel.js'
import { parseAiConfig } from '../src/ai/config.js'
import { FRAME, CLOSE } from '../src/ai/protocol.js'

const TOKEN = 'test-token-0123456789abcdef'

/** 静默 logger：测试里不想看 info/warn 噪声，但错误要留痕 */
function makeLog() {
  const seen = { warn: [], error: [], info: [], debug: [] }
  const push = (level) => (...args) => seen[level].push(args)
  return {
    seen,
    info: push('info'),
    warn: push('warn'),
    error: push('error'),
    debug: push('debug')
  }
}

/**
 * 造配置。⚠️ 必须显式给 token：不给的话 `hasProviderToken` 为 false，
 * 生产入口会拒绝启动，而 S2 的回显链路也走不到。
 */
function makeConfig(overrides = {}) {
  return parseAiConfig({ AI_PROVIDER_TOKEN: TOKEN, ...overrides })
}

/**
 * ws 替身。只实现 tunnel.js 实际用到的那几个成员（send/close/on/readyState），
 * 并记录所有出站帧，便于断言"服务器到底发了什么"。
 */
class FakeSocket extends EventEmitter {
  constructor() {
    super()
    this.sent = []
    this.closed = null
    this.readyState = 1
  }

  send(data) {
    if (this.readyState !== 1) throw new Error('socket is not open')
    // 服务器出站一律走 encodeFrame → JSON 文本
    this.sent.push(JSON.parse(String(data)))
  }

  close(code, reason) {
    if (this.closed) return
    this.closed = { code, reason }
    this.readyState = 3
    this.emit('close', code, reason)
  }

  /** 模拟 Provider 主动发来一帧 */
  feed(frame) {
    this.emit('message', JSON.stringify(frame))
  }

  /** 取某一类出站帧（断言用） */
  framesOfType(type) {
    return this.sent.filter((f) => f?.type === type)
  }
}

function makeServer(envOverrides = {}) {
  return createTunnelServer({ config: makeConfig(envOverrides), log: makeLog() })
}

/** 建连（默认带合法 token） */
function connect(server, headers = { authorization: `Bearer ${TOKEN}` }) {
  const socket = new FakeSocket()
  const res = server.acceptConnection({ socket, headers, remoteAddress: '127.0.0.1' })
  return { socket, res }
}

/**
 * 建连并完成 hello，返回已 ready 的 socket。
 * @param {object} server
 * @param {string} providerId
 * @param {number} maxConcurrency Provider 声明的并发（与服务器上限取 min）
 */
function connectReady(server, providerId = 'p1', maxConcurrency = 1) {
  const { socket, res } = connect(server)
  assert.equal(res.ok, true, '默认 token 应当通过握手')
  socket.feed({
    type: FRAME.HELLO,
    providerId,
    models: ['qwen2.5:7b-instruct'],
    maxConcurrency,
    caps: { upstreamOk: true, stream: true }
  })
  return socket
}

// ---------------------------------------------------------------- 握手鉴权

test('握手：token 正确 → 接受连接', () => {
  const server = makeServer()
  const { socket, res } = connect(server)
  assert.equal(res.ok, true)
  assert.equal(socket.closed, null, '鉴权通过不应关闭连接')
  assert.equal(server.stats.accepted, 1)
})

test('握手：token 错误 → 关闭连接且不注册（4401）', () => {
  const server = makeServer()
  const { socket, res } = connect(server, { authorization: 'Bearer wrong-token' })

  assert.equal(res.ok, false)
  assert.equal(res.code, CLOSE.UNAUTHORIZED)
  assert.equal(socket.closed?.code, CLOSE.UNAUTHORIZED, '必须用应用层关闭码 4401')
  assert.equal(server.stats.accepted, 0, '鉴权失败的连接不得计入 accepted')
  assert.equal(server.registry.list().length, 0, '鉴权失败的连接不得进入注册表')
})

test('握手：完全缺失 Authorization → 拒绝', () => {
  const server = makeServer()
  const { socket, res } = connect(server, {})

  assert.equal(res.ok, false)
  assert.equal(res.code, CLOSE.UNAUTHORIZED)
  assert.equal(socket.closed?.code, CLOSE.UNAUTHORIZED)
})

test('握手：未配置 token 时任何请求都不放行（不可 fail-open）', () => {
  // 这条是防"忘了配 token 就变成免鉴权公网入口"这个事故形态
  const server = createTunnelServer({ config: makeConfig({ AI_PROVIDER_TOKEN: '' }), log: makeLog() })
  const { socket, res } = connect(server, { authorization: 'Bearer anything' })

  assert.equal(res.ok, false)
  assert.equal(socket.closed?.code, CLOSE.UNAUTHORIZED)
})

// ---------------------------------------------------------------- hello 与状态

test('hello 后连接 ready 并进入注册表', () => {
  const server = makeServer()
  const socket = connectReady(server, 'p1', 2)

  const conns = server.registry.list()
  assert.equal(conns.length, 1)
  assert.equal(conns[0].id, 'p1')
  assert.equal(conns[0].ready, true)
  assert.ok(socket.framesOfType(FRAME.WELCOME).length >= 1, 'hello 后应回 welcome')
})

test('statusSnapshot 反映在线与并发', () => {
  const server = makeServer()
  connectReady(server, 'p1', 2)

  // 字段口径以 tunnel.js 的 statusSnapshot() 为准：三态在 state，
  // 且 available 是 state !== 'offline' 的派生值（前端置灰用前者、文案用后者）
  const snap = server.statusSnapshot()
  assert.equal(snap.available, true)
  assert.equal(snap.state, 'ready')
  assert.equal(snap.connections, 1)
  assert.equal(snap.providerId, 'p1')
  assert.equal(snap.maxConcurrency, 1, '服务器上限默认 1（与 Provider 声明取 min）')
  assert.equal(snap.queueDepth, 0, 'S4 之前排队器未实现，字段恒为 0（刻意保留以让前端契约一次成型）')
})

// ---------------------------------------------------------------- 心跳判死

test('心跳：刚活动过的连接不判死；超过阈值才判死', () => {
  const server = makeServer()
  const { res } = connect(server)
  const conn = res.conn

  conn.touch()
  assert.equal(conn.isStale(1000), false)

  // 直接把"上次活跃时间"往前拨，避免测试真的等
  conn.lastSeenAt = Date.now() - 5000
  assert.equal(conn.isStale(1000), true)
})

test('心跳：任何合法帧都算存活信号（chunk 也续命）', () => {
  const server = makeServer()
  const socket = connectReady(server)
  const conn = server.registry.get('p1')

  conn.lastSeenAt = Date.now() - 5000
  assert.equal(conn.isStale(1000), true)

  // 灌一个**未知 id** 的 chunk：它虽不匹配任何在途请求，但仍是合法帧
  socket.feed({ type: FRAME.CHUNK, id: 'no-such-request', delta: 'x' })
  assert.equal(conn.isStale(1000), false, '合法帧必须续命，否则长时间生成会被误判死')
})

// ---------------------------------------------------------------- 多路复用（S2 核心）

test('★ 多路复用：并发请求的响应不会串台', async () => {
  const server = makeServer({ AI_MAX_CONCURRENCY: '4' })
  const socket = connectReady(server, 'p1', 4)

  const a = server.dispatch({ id: 'req-a', kind: 'qa', messages: [{ role: 'user', content: 'A' }] })
  const b = server.dispatch({ id: 'req-b', kind: 'qa', messages: [{ role: 'user', content: 'B' }] })

  assert.equal(a.providerId, 'p1')
  assert.equal(b.providerId, 'p1')
  assert.notEqual(a.id, b.id)

  // 交错回帧：先给 b、再给 a、再给 b —— 顺序故意打乱
  socket.feed({ type: FRAME.CHUNK, id: 'req-b', delta: 'BBB1' })
  socket.feed({ type: FRAME.CHUNK, id: 'req-a', delta: 'AAA1' })
  socket.feed({ type: FRAME.CHUNK, id: 'req-b', delta: 'BBB2' })
  socket.feed({ type: FRAME.CHUNK, id: 'req-a', delta: 'AAA2' })

  socket.feed({ type: FRAME.DONE, id: 'req-b' })
  socket.feed({ type: FRAME.DONE, id: 'req-a' })

  const ra = await a.result
  const rb = await b.result

  assert.equal(ra.ok, true)
  assert.equal(rb.ok, true)
  // 这是本测试的全部意义：各自的内容只能含自己的
  // ⚠️ 成功响应用的是 text（失败才是 partial），两者别混
  assert.equal(ra.text, 'AAA1AAA2')
  assert.equal(rb.text, 'BBB1BBB2')
})

test('多路复用：未知 id 的 chunk 被忽略，不影响在途请求', async () => {
  const server = makeServer({ AI_MAX_CONCURRENCY: '4' })
  const socket = connectReady(server, 'p1', 4)

  const a = server.dispatch({ id: 'req-a', messages: [] })
  socket.feed({ type: FRAME.CHUNK, id: 'ghost-id', delta: '幽灵' })
  socket.feed({ type: FRAME.CHUNK, id: 'req-a', delta: '正常' })
  socket.feed({ type: FRAME.DONE, id: 'req-a' })

  const ra = await a.result
  assert.equal(ra.ok, true)
  assert.equal(ra.text, '正常')
})

test('多路复用：done 之后到达的迟到 chunk 不会污染已结束的请求', async () => {
  const server = makeServer({ AI_MAX_CONCURRENCY: '4' })
  const socket = connectReady(server, 'p1', 4)

  const a = server.dispatch({ id: 'req-a', messages: [] })
  socket.feed({ type: FRAME.CHUNK, id: 'req-a', delta: '正文' })
  socket.feed({ type: FRAME.DONE, id: 'req-a' })
  const ra = await a.result

  // done 之后槽位已释放，此时再来的 chunk 必须无害
  socket.feed({ type: FRAME.CHUNK, id: 'req-a', delta: '迟到' })

  assert.equal(ra.text, '正文')
  assert.equal(server.pending.has('req-a'), false, '结束的请求必须移出在途表')
})

// ---------------------------------------------------------------- 超时与槽位

test('★ 超时：发 cancel 帧、释放槽位、并保留已出文本', async () => {
  const server = makeServer()
  const socket = connectReady(server, 'p1', 1)
  const conn = server.registry.get('p1')

  const job = server.dispatch({ id: 'req-timeout', kind: 'qa', timeoutMs: 40, messages: [] })
  socket.feed({ type: FRAME.CHUNK, id: 'req-timeout', delta: '已完成一半' })

  // ⚠️ 测试写法要点：dispatch 内部对超时定时器调了 `unref()`
  //    （线上正确——不该因为"还有请求在途"阻止进程退出）。
  //    但这里若只 await result，事件循环会因无任何存活句柄而直接收尾，
  //    node --test 会报 "Promise resolution is still pending" 并把用例判为 cancelled。
  //    故用一个**不 unref** 的真定时器把事件循环撑过超时触发点。
  await new Promise((resolve) => setTimeout(resolve, 80))

  const r = await job.result

  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'ai_timeout')
  assert.equal(r.partial, '已完成一半', '超时也要把已出文本带回，前端才能保留')
  assert.equal(socket.framesOfType(FRAME.CANCEL).length, 1, '必须先通知 Provider 停生成')
  assert.equal(conn.inflight, 0, '★ 槽位必须释放，否则并发会被永久占死')
  assert.equal(server.pending.has('req-timeout'), false)
})

test('★ 断连：在途请求全部收敛为失败，且槽位归零', async () => {
  const server = makeServer({ AI_MAX_CONCURRENCY: '4' })
  const socket = connectReady(server, 'p1', 4)
  const conn = server.registry.get('p1')

  const a = server.dispatch({ id: 'req-a', messages: [] })
  const b = server.dispatch({ id: 'req-b', messages: [] })
  socket.feed({ type: FRAME.CHUNK, id: 'req-a', delta: '半截' })

  // Provider 掉线（网络断开 / 进程被杀）
  socket.emit('close', 1006, 'abnormal')

  const [ra, rb] = await Promise.all([a.result, b.result])

  assert.equal(ra.ok, false)
  assert.equal(rb.ok, false)
  assert.equal(ra.partial, '半截', '断连同样要保留已出文本')
  assert.equal(conn.inflight, 0, '★ 断连后槽位必须归零')
  assert.equal(server.pending.size, 0, '不得残留悬挂的在途请求')
})

// ---------------------------------------------------------------- 离线与忙

test('无连接时 dispatch → ai_offline（而不是挂住）', async () => {
  const server = makeServer()
  const job = server.dispatch({ id: 'req-x', messages: [] })
  const r = await job.result

  assert.equal(job.providerId, null)
  assert.equal(r.ok, false)
  assert.equal(r.error.code, 'ai_offline')
})

test('并发占满时 dispatch → ai_busy，且不发出 req 帧', async () => {
  const server = makeServer({ AI_MAX_CONCURRENCY: '1' })
  const socket = connectReady(server, 'p1', 1)

  const first = server.dispatch({ id: 'req-1', messages: [] })
  const second = server.dispatch({ id: 'req-2', messages: [] })

  const r2 = await second.result
  assert.equal(r2.ok, false)
  assert.equal(r2.error.code, 'ai_busy')
  assert.equal(
    socket.framesOfType(FRAME.REQ).filter((f) => f.id === 'req-2').length,
    0,
    '被拒的请求不该占用 Provider'
  )

  // 收尾：让第一个请求结束，避免 timer 残留
  socket.feed({ type: FRAME.DONE, id: 'req-1' })
  await first.result
})

test('重复 id → ai_duplicate_id（防止两个请求抢同一个多路复用槽位）', async () => {
  const server = makeServer({ AI_MAX_CONCURRENCY: '4' })
  const socket = connectReady(server, 'p1', 4)

  const first = server.dispatch({ id: 'same', messages: [] })
  const dup = server.dispatch({ id: 'same', messages: [] })
  const rd = await dup.result

  assert.equal(rd.ok, false)
  assert.equal(rd.error.code, 'ai_duplicate_id')

  socket.feed({ type: FRAME.DONE, id: 'same' })
  await first.result
})
