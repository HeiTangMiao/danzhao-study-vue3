/**
 * 构建期剥离 expr-eval 中唯一会用到 new Function 的 toJSFunction。
 *
 * 背景：expr-eval 的 Expression.prototype.toJSFunction() 用 new Function 把表达式编译成原生函数。
 *      本项目只用 parser.parse(...).evaluate()（走它自带的 token-stack 解释器，不依赖 eval），
 *      toJSFunction 永不会被调用。但打包器摇不掉原型方法，new Function 会进入产物 —— 与
 *      「构建产物不得新增 new Function」这条 CSP 硬约束冲突。
 *
 * 做法：构建期把该方法体里的 `new Function(` 换成「调用即抛错」的桩：
 *      - 产物里不再出现 new Function；
 *      - 一旦有人真的调用它，会立刻抛错（而不是被生产 CSP 静默拦下后留下空白图）。
 *
 * @returns {import('vite').Plugin}
 */
export function stripExprEvalEval() {
  return {
    name: 'strip-expr-eval-eval',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('expr-eval')) return null
      if (!code.includes('new Function')) return null
      const stub =
        '(function () { throw new Error("toJSFunction 已被构建期禁用（CSP：禁止动态编译表达式）"); })('
      return { code: code.replace(/new Function\(/g, stub), map: null }
    }
  }
}
