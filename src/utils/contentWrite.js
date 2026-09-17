/**
 * 开发期内容写回端点（浏览器与 Node 共用同一份定义）
 *
 * 编辑器（src/views/editor/EditorView.vue）向它 POST，Vite 插件
 * （scripts/vite-plugin-content-write.mjs）在 dev server 上挂载它。
 * 常量只有一份，避免两边各写一个字面量后悄悄漂移。
 *
 * 注意：该端点在**生产构建里不存在** —— 插件是 `apply: 'serve'`，
 *      编辑器里的写回按钮也用 import.meta.env.DEV 关掉。
 */
export const WRITE_ENDPOINT = '/__content-write'

export default { WRITE_ENDPOINT }