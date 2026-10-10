/**
 * csp-lock —— L5：在「CSP 已封锁字符串转代码」的模拟环境下执行 fn（P1-T5）
 *
 * 用途：证明关键路径靠解释器 / 真实 ES 模块工作，而非 eval / new Function。
 *   生产 CSP 为 script-src 'self'（无 'unsafe-eval'），任何「字符串转代码」都会抛
 *   EvalError；本 helper 在运行期把全局 Function / eval 换成抛 EvalError 的桩，
 *   让「依赖 eval」的代码在单测里就炸出来，而不是等到打包成 .app。
 *
 * 定位：按需复用的可选增强，**非** P1-T5 的验收项（见 docs/csp-guard-plan.md §3.2）。
 *   画板类测试（tests/geometry-board.test.js）已有等价桩执行，可一行接入本 helper。
 *
 * 契约：无论 fn 抛不抛，finally 必须复原全局 Function / eval（防污染后续用例）。
 *
 * @param {() => any} fn 待执行函数
 * @returns {any} fn 的返回值
 */
export function withCspLocked(fn) {
  const realFunction = globalThis.Function
  const realEval = globalThis.eval

  globalThis.Function = function () {
    throw new EvalError("Refused to evaluate a string as JavaScript ('unsafe-eval' not allowed)")
  }
  globalThis.eval = function () {
    throw new EvalError("Refused to evaluate a string as JavaScript ('unsafe-eval' not allowed)")
  }

  try {
    return fn()
  } finally {
    globalThis.Function = realFunction
    globalThis.eval = realEval
  }
}
