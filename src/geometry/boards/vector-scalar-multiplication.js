/**
 * 几何画板：vector-scalar-multiplication
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/07-平面向量/01-向量的概念与线性运算.js）。
 * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，
 * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。
 *
 * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例
 * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板
 * @param {object} _JXG jsxgraph 命名空间（本画板未用到，保留签名一致）
 */
export default function setup(board, colors, _JXG) {
  const O = board.create('point', [-3,0], {name:'O', size:2, color: colors.text, fixed:true});
  const A = board.create('point', [1,1.2], {name:'A', size:2, color: colors.primary});
  board.create('arrow', [O, A], {color: colors.primary, strokeWidth:3, firstArrow:false, lastArrow:true});
  const B = board.create('point', [function(){return O.X()+2*(A.X()-O.X());}, function(){return O.Y()+2*(A.Y()-O.Y());}], {name:'2a', size:2, color: colors.accent});
  board.create('arrow', [O, B], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
  const C = board.create('point', [function(){return O.X()-0.5*(A.X()-O.X());}, function(){return O.Y()-0.5*(A.Y()-O.Y());}], {name:'-0.5a', size:2, color: colors.accent});
  board.create('arrow', [O, C], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
  board.create('text', [-0.6, 1.2, 'a'], {fontSize:16, color: colors.primary});
  board.create('text', [1.4, 1.8, '2a'], {fontSize:16, color: colors.accent});
  board.create('text', [-5.2, -1.0, '-0.5a'], {fontSize:16, color: colors.accent});
}
