/**
 * AI Provider 入口（作者本机运行：`cd tools/ai-provider && node index.js`）
 *
 * 职责：读 .env → 校验配置 → 起隧道客户端 → 处理退出信号。
 *
 * ⚠️ 与服务器容器的「CMD node src/index.js」同样的纪律：
 *    本文件**不使用 `node --env-file`**（文件缺失会让 Node 致命报错退出），
 *    .env 由 config.js 自己读入，且**进程环境变量优先**于文件内容。
 */

import { loadProviderConfig } from './config.js'
import { createProviderClient } from './tunnel.js'

const log = console

let config
try {
  config = loadProviderConfig({ log })
} catch (err) {
  // 配置缺失属于"必须让人立刻看见"的失败：打印原因后以非 0 退出，
  // 避免做成 systemd/launchd 服务后陷入"启动即退出、看不出为什么"的循环
  log.error(`[ai-provider] ${err?.message ?? err}`)
  process.exit(2)
}

const client = createProviderClient({ config, log })
client.start()

const shutdown = (signal) => {
  log.info(`[ai-provider] 收到 ${signal}，正在断开隧道…`)
  client.stop('provider_shutdown')
  // 立刻退出：没有需要排空的本机上游调用（S3 接入真实模型后这里要等上游 abort 完成）
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
