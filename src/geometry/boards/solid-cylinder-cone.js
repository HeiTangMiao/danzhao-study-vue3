/**
 * 几何画板：solid-cylinder-cone
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
  function ellipse(cx, cy, rx, ry) {
    board.create('curve', [function(t){return cx + rx*Math.cos(t);}, function(t){return cy + ry*Math.sin(t);}, 0, 2*Math.PI], {strokeColor: colors.text, strokeWidth:1.5});
  }
  ellipse(-2.5, -1.2, 1.6, 0.6);
  ellipse(-2.5, 1.2, 1.6, 0.6);
  board.create('segment', [[-4.1,-1.2],[-4.1,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [[-0.9,-1.2],[-0.9,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [[-2.5,-1.2],[-2.5,1.2]], {strokeColor: colors.accent, strokeWidth:1.5, dash:2});
  board.create('text', [-2.5, 1.7, '圆柱'], {fontSize:14, color: colors.primary});
  ellipse(3, -1.2, 1.6, 0.6);
  board.create('segment', [[3,1.6],[1.4,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [[3,1.6],[4.6,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
  board.create('segment', [[3,-1.2],[3,1.6]], {strokeColor: colors.accent, strokeWidth:1.5, dash:2});
  board.create('point', [3,1.6], {name:'顶点', size:2, color: colors.accent});
  board.create('text', [3, 2.1, '圆锥'], {fontSize:14, color: colors.primary});
}
