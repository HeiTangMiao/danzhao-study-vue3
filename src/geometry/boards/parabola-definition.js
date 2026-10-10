/**
 * 几何画板：parabola-definition
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/11-平面解析几何/05-抛物线.js）。
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
  const F = board.create('point', [1,0], {name:'F', size:2, color: colors.accent, fixed:true});
  board.create('line', [[-1,-4],[-1,4]], {strokeColor: colors.muted, strokeWidth:1.5, dash:2});
  board.create('text', [-1.4, 3.8, '准线 x = -1'], {fontSize:12, color: colors.muted});
  const par = board.create('curve', [function(t){ return t*t/4; }, function(t){ return t; }, -4, 4], {strokeColor: colors.primary, strokeWidth:2});
  const P = board.create('glider', [1,2, par], {name:'P', size:2, color: colors.primary});
  board.create('segment', [F, P], {strokeColor: colors.primary, strokeWidth:1.5});
  board.create('segment', [[-1, P.Y()], P], {strokeColor: colors.accent, strokeWidth:1.5, dash:2});
  board.create('text', [-5.8, 3.6, function(){
    const d1 = Math.hypot(P.X()-F.X(), P.Y()-F.Y());
    const d2 = Math.abs(P.X()+1);
    return '|PF| = ' + Math.round(d1*100)/100 + '，d = ' + Math.round(d2*100)/100;
  }], {fontSize:13, color: colors.muted});
  board.create('text', [-5.8, 3.0, function(){
    const d1 = Math.hypot(P.X()-F.X(), P.Y()-F.Y());
    const d2 = Math.abs(P.X()+1);
    return '|PF| - d = ' + Math.round((d1-d2)*100)/100 + ' ≈ 0';
  }], {fontSize:14, color: colors.primary});
}
