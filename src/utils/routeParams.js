/**
 * 路由参数归一化（纯函数，零 import —— 浏览器与任意消费端可复用，见 H7 单一真相源）
 *
 * 背景：外部深链（手输 / 粘贴 / 分享）里的单元号可能**不带零填充**（`#/study/computer/5/4`），
 *      而 `src/content/site.js` 的单元号是零填充字符串（`"01"…"12"`），`UnitView.vue` 与
 *      `ContentSidebar.vue` 都按**字符串相等**匹配 `u.num === unitNum` —— 不归一化就直接匹配失败、
 *      渲染出空白页。归一化放在**路由层单一落点**，一处覆盖全部消费点，避免散落改各视图组件。
 */

/**
 * 单元号零填充归一化：`'5' → '05'`、`'05' → '05'`、`'12' → '12'`（不截断）。
 * 空值（`null` / `undefined` / `''`）原样返回，不抛错 —— 交由下游按既有缺省逻辑处理。
 * @param {string|number|null|undefined} v 原始单元号
 * @returns {string|null|undefined} 两位零填充的规范形，或原样空值
 */
export function normalizeUnitNum(v) {
  if (v == null || v === '') return v
  return String(v).padStart(2, '0')
}
