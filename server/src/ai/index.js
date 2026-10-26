/**
 * AI 网关 Fastify 插件 —— 注册隧道 WebSocket 端点与 AI 状态接口
 *
 * 这里只做"接入"，不含业务逻辑：
 *   - `/api/ai/tunnel`（可配）：Provider 主动外连的反向隧道，握手期校验 Bearer token；
 *   - `/api/ai/status`（可配）：给前端做入口置灰 / 离线徽标（设计文档 §3.4）。
 *
 * ⚠️ 注册时机由 `app.js` 控制：**只有显式传入 aiConfig 且 enable 时才注册**。
 *    这样既有的 `createApp()` 调用（含全部既有测试）行为零变化 —— 不引新依赖路径、
 *    不多一条路由、不占位端口。
 *
 * ⚠️ 生产是 Docker 容器（CMD `node src/index.js`，配置来自 env_file），本文件不读任何文件、
 *    不含任何域名或密钥常量。
 */
import websocketPlugin from '@fastify/websocket'
import { createTunnelServer } from './tunnel.js'
import { CLOSE } from './protocol.js'

/**
 * 生成 AI 插件。
 *
 * 用工厂而不是直接导出插件函数：调用方（app.js / index.js / 测试）能拿到**同一个**
 * TunnelServer 实例，便于断言内部状态，也便于将来 gateway.js 直接复用。
 *
 * @param {object} opts
 * @param {object} opts.aiConfig parseAiConfig 的产出
 * @param {(opts: object) => object} [opts.createTunnel] 注入点（测试可替换）
 * @returns {(app: object, opts?: object) => Promise<void>} Fastify 插件
 */
export function createAiPlugin({ aiConfig, createTunnel = createTunnelServer } = {}) {
  return async function aiRoutes(app) {
    const tunnel = createTunnel({
      config: aiConfig,
      log: app.log,
      // 由上层（app.js / index.js）注入的随机 id 生成器缺省用 crypto.randomUUID
      randomId: aiConfig.randomId ?? undefined
    })
    tunnel.startSweeper()

    // 单帧上限交给 ws 自己在协议层拦一道（兜住"分片前的整体大小"），
    // 业务层的 maxFrameBytes 检查在 tunnel.js 里另有一道。
    await app.register(websocketPlugin, { options: { maxPayload: aiConfig.maxFrameBytes } })

    app.get(aiConfig.tunnelPath, { websocket: true }, (socket, req) => {
      tunnel.acceptConnection({
        socket,
        headers: req.headers,
        remoteAddress: typeof req.ip === 'string' ? req.ip : ''
      })
    })

    app.get(aiConfig.statusPath, { preHandler: app.authenticate }, async () => tunnel.statusSnapshot())

    app.addHook('onClose', async () => {
      tunnel.closeAll(CLOSE.GOING_AWAY, 'server_shutdown')
    })

    // 装饰在本插件作用域内可见；将来 gateway.js 可以直接 app.aiTunnel.dispatch(...)
    app.decorate('aiTunnel', tunnel)
    return tunnel
  }
}

export { createTunnelServer } from './tunnel.js'
export { parseAiConfig, authorizeHandshake, describeMissingCredential } from './config.js'
export { FRAME, CLOSE } from './protocol.js'
