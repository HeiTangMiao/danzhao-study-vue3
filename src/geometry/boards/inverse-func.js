/**
 * 几何画板：inverse-func
 *
 * 由 scripts/codemod-initcode.mjs 从内容页提取（来源：src/content/math/03-函数与基本初等函数/02-一次函数与反比例函数.js）。
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
  const k = board.create('slider', [[-5.6, 3.0], [-2.6, 3.0], [-5, 2, 5]], {name:'k', snapWidth:0.1, strokeColor: colors.accent, fillColor: colors.accent, highlight:false});
  board.create('curve', [function(t){ return t; }, function(t){ return k.Value()/t; }, -6, -0.05], {strokeColor: colors.primary, strokeWidth:2});
  board.create('curve', [function(t){ return t; }, function(t){ return k.Value()/t; }, 0.05, 6], {strokeColor: colors.primary, strokeWidth:2});
  board.create('text', [-5.6, 3.8, function(){ return 'y = ' + k.Value().toFixed(1) + ' / x'; }], {fontSize:14, color: colors.text});
  board.create('text', [-5.6, 3.5, function(){
    const kv = k.Value();
    return 'k = ' + kv.toFixed(1) + '，' + (kv > 0 ? '一、三象限' : '二、四象限');
  }], {fontSize:13, color: colors.muted});
}
