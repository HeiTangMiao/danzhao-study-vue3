/**
 * 几何画板：solid-pyramid
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
  board.create('polygon', [[-2.5,-1.2],[2.5,-1.2],[2,1.2],[-2,1.2]], {fillColor: colors.primary, fillOpacity:0.15, borders:{strokeColor: colors.primary, strokeWidth:2}});
  const S = board.create('point', [0,3.4], {name:'S', size:2, color: colors.accent});
  board.create('segment', [S, [-2.5,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [S, [2.5,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [S, [2,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [S, [-2,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('text', [0, 3.9, '顶点 S'], {fontSize:13, color: colors.accent});
  board.create('text', [0, -1.8, '底面（四边形）'], {fontSize:13, color: colors.muted});
}
