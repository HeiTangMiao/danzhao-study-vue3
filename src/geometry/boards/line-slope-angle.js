/**
 * 几何画板：line-slope-angle
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/11-平面解析几何/01-直线方程.js）。
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
  const O = board.create('point', [0,0], {name:'O', size:2, color: colors.text, fixed:true});
  const P = board.create('point', [2,2], {name:'P', size:2, color: colors.accent});
  board.create('line', [O, P], {strokeColor: colors.primary, strokeWidth:2});
  board.create('angle', [[4,0], O, P], {radius:0.7, fillColor: colors.accent, fillOpacity:0.3});
  board.create('text', [1.2, 3.2, function(){
    const dx = P.X()-O.X(), dy = P.Y()-O.Y();
    if (Math.abs(dx) < 1e-6) return 'α = 90°，斜率不存在';
    const k = dy/dx;
    let alpha = Math.atan2(dy, dx)*180/Math.PI;
    if (alpha < 0) alpha += 180;
    return '斜率 k = ' + k.toFixed(2) + '，倾斜角 α = ' + alpha.toFixed(1) + '°';
  }], {fontSize:14, color: colors.text});
}
