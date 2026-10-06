/**
 * 几何画板：vector-triangle-law
 *
 * 由 scripts/codemod-initcode.mjs 从内容页提取（来源：src/content/math/07-平面向量/01-向量的概念与线性运算.js）。
 * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，
 * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。
 *
 * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例
 * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板
 * @param {object} _JXG jsxgraph 命名空间（本画板未用到，保留签名一致）
 */
export default function setup(board, colors, _JXG) {
  const A = board.create('point', [-4,-1], {name:'A', size:2, color: colors.text, fixed:true});
  const B = board.create('point', [-1,2], {name:'B', size:2, color: colors.text});
  const C = board.create('point', [2,-1], {name:'C', size:2, color: colors.text});
  board.create('arrow', [A, B], {color: colors.primary, strokeWidth:3, firstArrow:false, lastArrow:true});
  board.create('arrow', [B, C], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
  board.create('arrow', [A, C], {color: colors.text, strokeWidth:2, firstArrow:false, lastArrow:true, dash:1});
  board.create('text', [-2.8, 1.0, 'a'], {fontSize:16, color: colors.primary});
  board.create('text', [0.8, 1.0, 'b'], {fontSize:16, color: colors.accent});
  board.create('text', [-1.4, -1.6, 'a + b'], {fontSize:16, color: colors.text});
}
