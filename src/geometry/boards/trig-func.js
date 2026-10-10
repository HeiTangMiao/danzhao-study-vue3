/**
 * 几何画板：trig-func
 *
 * 由一次性 codemod 从内容页提取（脚本已删除；来源：src/content/math/04-三角函数/05-三角函数图像与性质.js）。
 * 原先这段是内容数据里的 initCode 字符串、运行期用 new Function 编译，
 * 会被生产 CSP 的 script-src 'self' 拦下；现在是真实 ES 模块，由 Vite 编译、按 boardId 惰性加载。
 *
 * @param {object} board JXG.JSXGraph.initBoard() 返回的画板实例
 * @param {{bg:string, primary:string, accent:string, text:string, muted:string}} colors 按当前主题现算的调色板
 * @param {object} _JXG jsxgraph 命名空间（本画板未用到，保留签名一致）
 */
export default function setup(board, colors, _JXG) {
  board.create('segment', [[-6.5,0],[6.5,0]], {strokeColor: colors.muted, strokeWidth:1});
  board.create('segment', [[0,-2],[0,2]], {strokeColor: colors.muted, strokeWidth:1});
  board.create('text', [6.3,-0.3, 'x'], {fontSize:14, color: colors.muted});
  board.create('text', [0.2,1.9, 'y'], {fontSize:14, color: colors.muted});
  // 注意：curve 的父节点直接给真函数，绕开 JSXGraph 内部的 JessieCode eval 编译；
  // 那种编译会被生产 CSP 的 script-src 'self' 拦下并静默丢曲线。curve 会随父函数变化实时重采样。
  board.create('curve', [function(t){ return t; }, function(t){ return Math.sin(t); }, -6.5, 6.5], {strokeColor: colors.primary, strokeWidth:2});
  board.create('curve', [function(t){ return t; }, function(t){ return Math.cos(t); }, -6.5, 6.5], {strokeColor: colors.accent, strokeWidth:2});
  board.create('text', [-6.3, 1.8, 'y = sin x（蓝）'], {fontSize:13, color: colors.text});
  board.create('text', [-6.3, 1.5, 'y = cos x（橙）'], {fontSize:13, color: colors.muted});
}
