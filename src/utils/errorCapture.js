/**
 * 前端可观测性：全局错误采集
 *  - 捕获 window.onerror / unhandledrejection / Vue errorHandler
 *  - 以环形缓冲写入 localStorage（上限 50 条，含时间戳/路由/版本）
 *  - 提供 getErrorLogs() / clearErrorLogs() 供调试与后续上报
 * 注意：不引入网络上报（无后端），仅本地留痕 + 控制台
 */
const STORAGE_KEY = 'app_error_log'
const MAX = 50

function getLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function push(entry) {
  const logs = getLogs()
  logs.push(entry)
  // 环形缓冲：只保留最近 MAX 条
  if (logs.length > MAX) logs.splice(0, logs.length - MAX)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch (e) { /* 存储满/不可用时忽略 */ }
  // 控制台保留原始错误输出，便于实时排查
  console.error('[AppError]', entry.message || entry.reason || entry)
}

/** 初始化全局错误监听（在应用启动时调用一次） */
export function initErrorCapture() {
  // 未捕获的 JS 异常
  window.addEventListener('error', (event) => {
    push({
      type: 'error',
      time: new Date().toISOString(),
      message: event.message,
      source: event.filename,
      line: event.lineno,
      col: event.colno
    })
  })

  // 未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    push({
      type: 'unhandledrejection',
      time: new Date().toISOString(),
      message: reason && (reason.message || reason.stack || String(reason))
    })
  })
}

/** Vue 应用 errorHandler（在 createApp 上挂载） */
export function vueErrorHandler(err, instance, info) {
  push({
    type: 'vue',
    time: new Date().toISOString(),
    message: err && (err.message || String(err)),
    stack: err && err.stack,
    info: info || ''
  })
}

/** 读取已采集的错误日志 */
export function getErrorLogs() {
  return getLogs()
}

/** 清空错误日志 */
export function clearErrorLogs() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* 忽略 */ }
}

export default initErrorCapture