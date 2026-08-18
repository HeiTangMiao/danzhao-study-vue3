/**
 * 内容页面数据（content-schema 的实例）
 * 页面：抛物线
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-11-05",
  "unitNum": "11",
  "subject": "math",
  "title": "抛物线",
  "subtitle": "定义、四种标准方程与焦点准线",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解抛物线的定义，掌握四种标准方程",
        "能根据方程确定焦点和准线，反之亦然",
        "能根据条件求抛物线的标准方程"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"抛物线\"]\n  N1[\"定义\"]\n  N0 --> N1\n  N2[\"到焦点距离=到准线距离\"]\n  N1 --> N2\n  N3[\"焦点不在准线上\"]\n  N1 --> N3\n  N4[\"四种标准方程\"]\n  N0 --> N4\n  N5[\"y²=2px 向右\"]\n  N4 --> N5\n  N6[\"y²=-2px 向左\"]\n  N4 --> N6\n  N7[\"x²=2py 向上\"]\n  N4 --> N7\n  N8[\"x²=-2py 向下\"]\n  N4 --> N8\n  N9[\"焦点与准线\"]\n  N0 --> N9\n  N10[\"焦点到准线距离为p\"]\n  N9 --> N10\n  N11[\"p>0\"]\n  N9 --> N11\n  N12[\"几何性质\"]\n  N0 --> N12\n  N13[\"范围\"]\n  N12 --> N13\n  N14[\"对称性\"]\n  N12 --> N14\n  N15[\"顶点 原点\"]\n  N12 --> N15\n  N16[\"离心率 e=1\"]\n  N12 --> N16"
    },
    {
      "type": "knowledge",
      "title": "一、抛物线的定义",
      "paragraphs": [
        "平面内与一个定点 \\(F\\) 和一条定直线 \\(l\\)（\\(F \\notin l\\)）距离相等的点的轨迹叫做抛物线。\n\n      定点 \\(F\\) 叫做焦点，定直线 \\(l\\) 叫做准线。"
      ]
    },
    {
      "type": "diagram",
      "title": "抛物线定义演示",
      "boardId": "parabola-definition",
      "caption": "拖动点 P 沿抛物线移动，观察 |PF| 恒等于点 P 到准线的距离 d。",
      "initCode": `board.create('segment', [[-6,0],[6,0]], {strokeColor: colors.muted, strokeWidth:1});
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
}], {fontSize:14, color: colors.primary});`
    },
    {
      "type": "warning",
      "text": "其中 \\(p > 0\\)，表示焦点到准线的距离。判断开口方向：一次项为正则沿该轴正方向，为负则沿负方向。"
    },
    {
      "type": "table",
      "title": "二、抛物线的四种标准方程",
      "headers": [
        "标准方程",
        "焦点",
        "准线",
        "开口方向"
      ],
      "rows": [
        [
          "\\(y^2 = 2px\\)",
          "\\(\\left(\\dfrac{p}{2}, 0\\right)\\)",
          "\\(x = -\\dfrac{p}{2}\\)",
          "向右"
        ],
        [
          "\\(y^2 = -2px\\)",
          "\\(\\left(-\\dfrac{p}{2}, 0\\right)\\)",
          "\\(x = \\dfrac{p}{2}\\)",
          "向左"
        ],
        [
          "\\(x^2 = 2py\\)",
          "\\(\\left(0, \\dfrac{p}{2}\\right)\\)",
          "\\(y = -\\dfrac{p}{2}\\)",
          "向上"
        ],
        [
          "\\(x^2 = -2py\\)",
          "\\(\\left(0, -\\dfrac{p}{2}\\right)\\)",
          "\\(y = \\dfrac{p}{2}\\)",
          "向下"
        ]
      ]
    },
    {
      "type": "tip",
      "text": "抛物线、椭圆、双曲线统称为圆锥曲线，离心率 \\(e\\) 的取值：椭圆 \\(0 < e < 1\\)，双曲线 \\(e > 1\\)。"
    },
    {
      "type": "table",
      "title": "三、抛物线的几何性质",
      "headers": [
        "性质",
        "内容（以 \\(y^2 = 2px\\) 为例）"
      ],
      "rows": [
        [
          "范围",
          "\\(x \\geq 0\\)（向右无限延伸）"
        ],
        [
          "对称性",
          "关于 \\(x\\) 轴对称"
        ],
        [
          "顶点",
          "\\((0, 0)\\)"
        ],
        [
          "焦点",
          "\\(\\left(\\dfrac{p}{2}, 0\\right)\\)"
        ],
        [
          "准线",
          "\\(x = -\\dfrac{p}{2}\\)"
        ],
        [
          "离心率",
          "\\(e = 1\\)（抛物线的离心率恒为 1）"
        ]
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求标准方程",
          "question": "已知抛物线的焦点为 \\((2, 0)\\)，求抛物线的标准方程。",
          "solution": "解：焦点 \\(\\left(\\dfrac{p}{2}, 0\\right) = (2, 0)\\)，所以 \\(\\dfrac{p}{2} = 2\\)，\\(p = 4\\)。\n\n        焦点在 \\(x\\) 轴正半轴，方程为 \\(y^2 = 2px = 2 \\times 4 \\times x = 8x\\)。\n\n        即 \\(y^2 = 8x\\)。",
          "answer": "答：抛物线方程为 \\(y^2 = 8x\\)。"
        },
        {
          "title": "例题2：求焦点和准线",
          "question": "求抛物线 \\(x^2 = -6y\\) 的焦点坐标和准线方程。",
          "solution": "解：方程 \\(x^2 = -6y\\) 对应标准形式 \\(x^2 = -2py\\)。\n\n        所以 \\(2p = 6\\)，\\(p = 3\\)。\n\n        焦点：\\(\\left(0, -\\dfrac{p}{2}\\right) = \\left(0, -\\dfrac{3}{2}\\right)\\)。\n\n        准线：\\(y = \\dfrac{p}{2} = \\dfrac{3}{2}\\)。",
          "answer": "答：焦点为 \\(\\left(0, -\\dfrac{3}{2}\\right)\\)，准线为 \\(y = \\dfrac{3}{2}\\)。"
        },
        {
          "title": "例题3：根据条件求抛物线方程",
          "question": "已知抛物线的准线方程为 \\(x = -1\\)，求抛物线的标准方程及焦点。",
          "solution": "解：准线 \\(x = -\\dfrac{p}{2} = -1\\)，所以 \\(\\dfrac{p}{2} = 1\\)，\\(p = 2\\)。\n\n        开口向右，标准方程为 \\(y^2 = 2px = 4x\\)。\n\n        焦点为 \\(\\left(\\dfrac{p}{2}, 0\\right) = (1, 0)\\)。",
          "answer": "答：抛物线方程为 \\(y^2 = 4x\\)，焦点为 \\((1, 0)\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "抛物线 \\(y^2 = 12x\\) 的焦点坐标和准线方程是什么？",
          "answer": "解：\\(2p=12\\)，\\(p=6\\)。焦点 \\((3, 0)\\)，准线 \\(x = -3\\)。"
        },
        {
          "difficulty": "basic",
          "question": "抛物线的焦点为 \\((0, 1)\\)，求标准方程。",
          "answer": "解：焦点在 \\(y\\) 轴正半轴，\\(\\dfrac{p}{2}=1\\)，\\(p=2\\)，方程 \\(x^2 = 4y\\)。"
        },
        {
          "difficulty": "medium",
          "question": "抛物线 \\(y^2 = -4x\\) 的开口方向、焦点、准线分别是什么？",
          "answer": "解：开口向左，\\(p=2\\)，焦点 \\((-1, 0)\\)，准线 \\(x = 1\\)。"
        },
        {
          "difficulty": "medium",
          "question": "抛物线 \\(x^2 = 8y\\) 上一点到焦点的距离为 5，求该点的纵坐标。",
          "answer": "解：\\(\\dfrac{p}{2}=2\\)，准线 \\(y=-2\\)。点到焦点距离等于到准线距离 \\(= y+2 = 5\\)，\\(y=3\\)。"
        },
        {
          "difficulty": "advanced",
          "question": "抛物线的离心率是多少？",
          "answer": "解：抛物线离心率恒为 \\(e = 1\\)。"
        }
      ]
    }
  ]
}
