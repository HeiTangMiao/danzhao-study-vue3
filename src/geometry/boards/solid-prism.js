/**
 * 几何画板：solid-prism
 *
 * 由 scripts/codemod-initcode.mjs 从内容页提取（来源：src/content/math/10-立体几何/01-空间几何体.js）。
 * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，
 * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。
 *
 * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例
 * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板
 * @param {object} _JXG jsxgraph 命名空间（本画板未用到，保留签名一致）
 */
export default function setup(board, colors, _JXG) {
  board.create('polygon', [[1.2,1.2],[5.2,1.2],[3.2,3.7]], {fillColor: colors.accent, fillOpacity:0.08, borders:{strokeColor: colors.muted, strokeWidth:1.5, dash:2}});
  board.create('segment', [[0,0],[1.2,1.2]], {strokeColor: colors.text, strokeWidth:1.5, dash:1});
  board.create('segment', [[4,0],[5.2,1.2]], {strokeColor: colors.text, strokeWidth:1.5, dash:1});
  board.create('segment', [[2,2.5],[3.2,3.7]], {strokeColor: colors.text, strokeWidth:1.5, dash:1});
  board.create('polygon', [[0,0],[4,0],[2,2.5]], {fillColor: colors.primary, fillOpacity:0.15, borders:{strokeColor: colors.primary, strokeWidth:2}});
  board.create('text', [2, -0.8, '底面（三角形）'], {fontSize:13, color: colors.muted});
  board.create('text', [3.4, 4.2, '顶面（全等三角形）'], {fontSize:13, color: colors.muted});
  board.create('text', [5.6, 0.6, '侧棱平行且相等'], {fontSize:13, color: colors.muted});
}
