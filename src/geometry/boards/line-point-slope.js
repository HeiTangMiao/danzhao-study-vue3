/**
 * 几何画板：line-point-slope
 *
 * 由 scripts/codemod-initcode.mjs 从内容页提取（来源：src/content/math/11-平面解析几何/01-直线方程.js）。
 * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，
 * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。
 *
 * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例
 * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板
 * @param {object} _JXG jsxgraph 命名空间（本画板未用到，保留签名一致）
 */
export default function setup(board, colors, _JXG) {
  board.create('segment', [[-5,0],[5,0]], {strokeColor: colors.muted, strokeWidth:1});
  board.create('segment', [[0,-3],[0,3]], {strokeColor: colors.muted, strokeWidth:1});
  board.create('text', [4.8,-0.4, 'x'], {fontSize:14, color: colors.muted});
  board.create('text', [0.3,2.8, 'y'], {fontSize:14, color: colors.muted});
  const A = board.create('point', [1,2], {name:'A(1,2)', size:2, color: colors.accent, fixed:true});
  const B = board.create('point', [3,0], {name:'B', size:2, color: colors.primary});
  board.create('line', [A, B], {strokeColor: colors.primary, strokeWidth:2});
  board.create('text', [-4.5, 2.8, function(){
    const dx = B.X()-A.X(), dy = B.Y()-A.Y();
    if (Math.abs(dx) < 1e-6) return '斜率不存在';
    const k = dy/dx;
    const b = A.Y()-k*A.X();
    return 'k = ' + k.toFixed(2) + '，y = ' + k.toFixed(2) + 'x ' + (b>=0?'+ ':'- ') + Math.abs(b).toFixed(2);
  }], {fontSize:14, color: colors.text});
}
