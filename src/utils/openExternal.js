/**
 * 最小外链工具（批 F · F-1 / Fc6）—— 打开「系统外部链接」的唯一落点（H7）
 *
 * 为什么需要它：
 *  - 桌面端（Tauri）在 webview 里直接打开外链既受 CSP/权限约束、行为又不可控；
 *    正确做法是经 `@tauri-apps/plugin-shell` 的 open() 交**系统默认浏览器**打开。
 *    该调用走 Tauri IPC（connect-src 已含 ipc: / http://ipc.localhost），**不产生 webview 网络请求**，
 *    因此与 connect-src / script-src 无关，也不触碰「代码执行」红线。
 *  - 网页 / dev 环境无 Tauri 运行时时，退化为 window.open 新标签页，保证同一入口两端可用。
 *
 * 红线（务必保持）：
 *  1. 本工具**不硬编码任何 URL** —— URL 属于数据，归页面数据文件（如 src/content/guide/*.js）。
 *  2. import 必须是**静态字面量**（H1 / L6：禁止运行时拼接 import）。
 *  3. shell.open 抛错**不静默吞错**：记录告警后回退 window.open，保证桌面端失败时入口仍可达。
 */
import { open as shellOpen } from '@tauri-apps/plugin-shell'

/**
 * 是否运行在 Tauri 运行时。
 * Tauri 2.x 在 window 上注入 `__TAURI_INTERNALS__`；浏览器 / dev / 网页版不存在。
 * @returns {boolean}
 */
function isTauri() {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
}

/**
 * 浏览器兜底：新标签页打开。`noopener` 断开来路引用，防 tab-nabbing。
 * @param {string} url 目标链接
 */
function openInBrowser(url) {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener')
}

/**
 * 打开外部链接：Tauri 交系统浏览器，其余环境走 window.open。
 * @param {string} url 目标链接（http / https）
 * @returns {Promise<void>}
 */
export async function openExternal(url) {
  if (isTauri()) {
    try {
      await shellOpen(url)
      return
    } catch (e) {
      // 不静默吞错：桌面端 shell.open 失败（如能力未授权）时告警并回退，
      // 宁可落到浏览器打开，也不让「官方入口」点了没反应。
      console.warn('[openExternal] shell.open 失败，回退 window.open:', e)
    }
  }
  openInBrowser(url)
}
