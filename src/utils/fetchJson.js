/**
 * 极薄 JSON 取数原语（批 S2 · P-S15 a）
 *
 * 只做三件事：拼 URL → fetch（带超时）→ res.ok 检查 → JSON.parse。
 *
 * ⚠️ 适用范围（P-S15 a 裁定）：**仅新代码消费**，**不得**回头迁移
 *    `src/utils/practiceBankClient.js` 与 `src/components/SearchPanel.vue` —— 那两处
 *    既有语义（内存缓存、归一化、错误文案）与本原语不同，迁移会扩大回归面。
 *    迁移登记为备案：下次触碰那两处时再并入。
 *
 * ⚠️ CSP：本文件只用 fetch + JSON.parse，无 eval / 无动态 import()
 *    （`tests/csp-guard.test.js` L6 会扫 src/**，任何 import() 都会被拦下）。
 */

/** 默认超时（毫秒）—— 内容拉取是后台静默行为，不能无限挂着占连接 */
export const DEFAULT_TIMEOUT_MS = 8000

/**
 * 拼接 URL：容忍 base 带/不带尾斜杠、path 带/不带前导斜杠
 *
 * 不 new URL()：相对基址（'./content-remote'）在 jsdom/测试环境里没有 document 基准，
 * new URL 会抛；而 fetch 本身接受相对 URL，交给浏览器/调用方解析更稳。
 *
 * @param {string} base 基址（绝对或相对）
 * @param {string} path 相对路径
 * @returns {string} 拼好的 URL
 */
export function joinUrl(base, path) {
  const b = String(base ?? '').replace(/\/+$/, '')
  const p = String(path ?? '').replace(/^\/+/, '')
  return `${b}/${p}`
}

/**
 * 拉取一个 JSON 文件
 *
 * @param {string} base 基址（如 './content-remote' 或 'https://520305.top/content-remote'）
 * @param {string} path 相对 base 的路径（如 'manifest.json'、'math/01.json'）
 * @param {{timeout?: number}} [options] timeout 毫秒，默认 DEFAULT_TIMEOUT_MS
 * @returns {Promise<any>} 解析后的 JSON
 * @throws {Error} 网络失败 / 超时 / 非 2xx / 非法 JSON —— 调用方负责静默降级
 */
export async function fetchJson(base, path, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const url = joinUrl(base, path)
  // 超时：AbortController 不存在（极旧环境）时退化为「不设超时」，不因此失败
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    if (timer) clearTimeout(timer)
  }
}
