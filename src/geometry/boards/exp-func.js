/**
 * 几何画板：exp-func
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/03-函数与基本初等函数/04-指数与指数函数.js）。
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
  const a = board.create('slider', [[-5.6, 3.0], [-2.6, 3.0], [0.1, 2, 4]], {name:'a', snapWidth:0.1, strokeColor: colors.accent, fillColor: colors.accent, highlight:false});
  // 注意：curve 的父节点直接给真函数，绕开 JSXGraph 内部的 JessieCode eval 编译；
  // 那种编译会被生产 CSP 的 script-src 'self' 拦下并静默丢曲线。curve 会随父函数变化实时重采样。
  board.create('curve', [function(t){ return t; }, function(t){ return Math.pow(a.Value(), t); }, -6, 6], {strokeColor: colors.primary, strokeWidth:2});
  board.create('point', [0, 1], {name:'(0,1)', size:2, color: colors.accent, fixed:true});
  board.create('text', [-5.6, 3.8, function(){ return 'y = ' + a.Value().toFixed(1) + '^x'; }], {fontSize:14, color: colors.text});
  board.create('text', [-5.6, 3.5, function(){
    const av = a.Value();
    return 'a = ' + av.toFixed(1) + '，' + (av > 1 ? '单调递增' : '单调递减') + '；过定点 (0,1)';
  }], {fontSize:13, color: colors.muted});
}
