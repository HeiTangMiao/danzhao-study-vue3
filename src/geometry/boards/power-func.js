/**
 * 几何画板：power-func
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/03-函数与基本初等函数/06-幂函数.js）。
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
  const n = board.create('slider', [[-5.6, 3.0], [-2.6, 3.0], [-2, 1, 3]], {name:'α', snapWidth:1, strokeColor: colors.accent, fillColor: colors.accent, highlight:false});
  // 注意：curve 的父节点直接给真函数，绕开 JSXGraph 内部的 JessieCode eval 编译；
  // 那种编译会被生产 CSP 的 script-src 'self' 拦下并静默丢曲线。curve 会随父函数变化实时重采样。
  board.create('curve', [function(t){ return t; }, function(t){ return Math.pow(t, n.Value()); }, -6, 6], {strokeColor: colors.primary, strokeWidth:2});
  board.create('point', [1, 1], {name:'(1,1)', size:2, color: colors.accent, fixed:true});
  board.create('text', [-5.6, 3.8, function(){ return 'y = x^' + n.Value().toFixed(0); }], {fontSize:14, color: colors.text});
  board.create('text', [-5.6, 3.5, function(){
    const nv = n.Value();
    return 'α = ' + nv.toFixed(0) + '，' + (nv > 0 ? '过原点，单调递增' : '双曲线，单调递减') + '；过定点 (1,1)';
  }], {fontSize:13, color: colors.muted});
}
