/**
 * API 基地址 —— 全站唯一来源
 *
 * 背景：原先 src/sync/api.js 与 src/stores/auth.js 各自写死相对路径 '/api'。
 * 这在两种环境下能正常工作：
 *   - dev：vite.config.js 的 proxy 把 /api 转发到 127.0.0.1:3000
 *   - Web 生产：nginx 同源反代 /api
 * 但 Tauri 打包后前端运行在 tauri://localhost 下，**没有转发层**，
 * 相对路径会被解析成 tauri://localhost/api —— 该协议下不存在后端，请求必然失败。
 *
 * 因此改为集中配置，让地址随环境变化：
 *   - dev / Web：不设 VITE_API_BASE，仍用 '/api'，保持原有代理逻辑不变
 *   - Tauri 桌面端：构建时通过 .env.tauri 注入绝对地址（见 package.json 的 build:tauri）
 *
 * ⚠️ 改动此地址时必须同步修改 src-tauri/tauri.conf.json 的 CSP `connect-src`，
 *    否则 WebView 会直接拦截请求（表现为控制台 CSP violation，而非网络错误）。
 */
const RAW = import.meta.env.VITE_API_BASE || '/api'

// 去掉结尾斜杠，避免与 path 拼接时出现 //api
export const API_BASE = RAW.replace(/\/+$/, '')

/** 当前是否为「绝对地址」模式（即运行在 Tauri 等无代理环境） */
export const IS_ABSOLUTE_API = /^https?:\/\//i.test(API_BASE)
