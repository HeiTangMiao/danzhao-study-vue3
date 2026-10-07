/**
 * View Transitions API 渐进增强封装（P3-T2，system_design §5.2/§5.3）
 *
 * 为什么是独立工具而不是 composable：
 *  - 它被 router 守卫在**应用挂载流程内**调用，不依赖任何组件上下文；
 *    保持零 import（除类型），调用方只给一个「确认导航」的回调即可。
 *
 * 硬约束（§5.3 两档口径表）：
 *  - 本封装只服务「路由级转场」，时长 ≤300ms（R2）——时长在 main.css 的
 *    ::view-transition-* 规则里控制（--dur-3 = 240ms），这里不写任何时长。
 *  - 内容换页（P4-T5 的 380ms 并行档）**禁止**走这一层：它发生在同一路由记录内，
 *    D17 已定走 replace 且不触发路由级转场。
 *
 * 降级路径（三层，全部显式）：
 *  1. 浏览器不支持（Chrome<111 / Safari<18）→ 直接执行导航，无任何包装
 *  2. 用户系统开启「减弱动效」→ 直接执行导航（硬约束，优先级高于能力分级）
 *  3. 其余情况 → document.startViewTransition 包裹
 */

/** 当前环境是否支持 View Transitions（jsdom/老 WebView 返回 false） */
export function supportsViewTransitions() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

/** 系统是否要求减弱动效（独立检查：router 守卫可能早于 useMotionPrefs 挂载执行） */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * 把「触发 DOM 更新」的异步回调包进路由级转场。
 * @param {() => void | Promise<void>} update 由调用方提供：内部触发路由跳转，
 *        并 await Vue 的 nextTick() —— 因为 VT 在 update 回调的 Promise 结算时
 *        才拍「新快照」，若不等 Vue 补丁落盘，新旧快照可能是同一帧，转场就看不见了。
 */
export function withRouteTransition(update) {
  if (!supportsViewTransitions() || prefersReducedMotion()) {
    update()
    return
  }
  document.startViewTransition(update)
}
