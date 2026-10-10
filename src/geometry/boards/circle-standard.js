/**
 * 几何画板：circle-standard
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/11-平面解析几何/02-圆的方程.js）。
 * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，
 * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。
 *
 * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例
 * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板
 * @param {object} _JXG jsxgraph 命名空间（本画板未用到，保留签名一致）
 */
export default function setup(board, colors, _JXG) {
  board.create('segment', [[-6,0],[6,0]], {strokeColor: colors.muted, strokeWidth:1});
  board.create('segment', [[0,-4],[0,4]], {strokeColor: colors.muted, strokeWidth:1});
  board.create('text', [5.8,-0.4, 'x'], {fontSize:14, color: colors.muted});
  board.create('text', [0.3,3.8, 'y'], {fontSize:14, color: colors.muted});
  const C = board.create('point', [0,0], {name:'C', size:2, color: colors.accent});
  const P = board.create('point', [2,0], {name:'P', size:2, color: colors.primary});
  board.create('circle', [C, P], {strokeColor: colors.primary, strokeWidth:2});
  board.create('segment', [C, P], {strokeColor: colors.accent, strokeWidth:1, dash:2});
  board.create('text', [-5.8, 3.6, function(){
    const a = Math.round(C.X()*100)/100, b = Math.round(C.Y()*100)/100;
    const r = Math.round(Math.hypot(P.X()-C.X(), P.Y()-C.Y())*100)/100;
    const sa = a >= 0 ? '-' : '+', sb = b >= 0 ? '-' : '+';
    return '(x' + sa + Math.abs(a) + ')² + (y' + sb + Math.abs(b) + ')² = ' + Math.round(r*r*100)/100;
  }], {fontSize:14, color: colors.text});
  board.create('text', [-5.8, 3.0, function(){
    const r = Math.round(Math.hypot(P.X()-C.X(), P.Y()-C.Y())*100)/100;
    return '圆心 (' + Math.round(C.X()*100)/100 + ', ' + Math.round(C.Y()*100)/100 + ')，半径 r = ' + r;
  }], {fontSize:13, color: colors.muted});
}
