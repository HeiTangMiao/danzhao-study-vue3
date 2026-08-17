/**
 * 内容页面数据（content-schema 的实例）
 * 页面：双曲线
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-11-04",
  "unitNum": "11",
  "subject": "math",
  "title": "双曲线",
  "subtitle": "定义、标准方程与渐近线",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解双曲线的定义，掌握双曲线的标准方程",
        "掌握双曲线中 \\(a, b, c\\) 的关系及渐近线方程",
        "能根据条件求双曲线的标准方程和离心率"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"双曲线\"]\n  N1[\"定义\"]\n  N0 --> N1\n  N2[\"到两焦点距离之差的绝对值等于2a\"]\n  N1 --> N2\n  N3[\"常数小于焦距\"]\n  N1 --> N3\n  N4[\"标准方程\"]\n  N0 --> N4\n  N5[\"焦点在x轴\"]\n  N4 --> N5\n  N6[\"焦点在y轴\"]\n  N4 --> N6\n  N7[\"a b无大小限制\"]\n  N4 --> N7\n  N8[\"abc关系\"]\n  N0 --> N8\n  N9[\"c方等于a方加b方\"]\n  N8 --> N9\n  N10[\"c最大\"]\n  N8 --> N10\n  N11[\"渐近线\"]\n  N0 --> N11\n  N12[\"y等于正负b比a的x\"]\n  N11 --> N12\n  N13[\"等轴双曲线\"]\n  N11 --> N13\n  N14[\"几何性质\"]\n  N0 --> N14\n  N15[\"范围 绝对值x大于等于a\"]\n  N14 --> N15\n  N16[\"对称性\"]\n  N14 --> N16\n  N17[\"顶点\"]\n  N14 --> N17\n  N18[\"离心率 e大于1\"]\n  N14 --> N18"
    },
    {
      "type": "knowledge",
      "title": "一、双曲线的定义",
      "paragraphs": [
        "平面内与两个定点 \\(F_1, F_2\\) 的距离之差的绝对值等于常数（小于 \\(|F_1F_2|\\)）的点的轨迹叫做双曲线。\n\n      两个定点叫做焦点，两焦点间的距离叫做焦距（记为 \\(2c\\)）。"
      ]
    },
    {
      "type": "diagram",
      "title": "双曲线定义演示",
      "boardId": "hyperbola-definition",
      "caption": "拖动点 P 沿双曲线移动，观察 ||PF₁| - |PF₂|| 恒等于 2a，虚线为渐近线。",
      "initCode": `board.create('segment', [[-6,0],[6,0]], {strokeColor: colors.muted, strokeWidth:1});
board.create('segment', [[0,-4],[0,4]], {strokeColor: colors.muted, strokeWidth:1});
board.create('text', [5.8,-0.4, 'x'], {fontSize:14, color: colors.muted});
board.create('text', [0.3,3.8, 'y'], {fontSize:14, color: colors.muted});
const F1 = board.create('point', [-3,0], {name:'F₁', size:2, color: colors.accent, fixed:true});
const F2 = board.create('point', [3,0], {name:'F₂', size:2, color: colors.accent, fixed:true});
const hyp = board.create('hyperbola', [F1, F2, 2], {strokeColor: colors.primary, strokeWidth:2});
const P = board.create('glider', [4,1.5, hyp], {name:'P', size:2, color: colors.primary});
board.create('segment', [F1, P], {strokeColor: colors.primary, strokeWidth:1.5});
board.create('segment', [F2, P], {strokeColor: colors.primary, strokeWidth:1.5});
board.create('line', [[0,0], [1, 1.118]], {strokeColor: colors.muted, strokeWidth:1, dash:2});
board.create('line', [[0,0], [1, -1.118]], {strokeColor: colors.muted, strokeWidth:1, dash:2});
board.create('text', [-5.8, 3.6, function(){
  const d1 = Math.hypot(P.X()-F1.X(), P.Y()-F1.Y());
  const d2 = Math.hypot(P.X()-F2.X(), P.Y()-F2.Y());
  return '|PF₁| = ' + Math.round(d1*100)/100 + '，|PF₂| = ' + Math.round(d2*100)/100;
}], {fontSize:13, color: colors.muted});
board.create('text', [-5.8, 3.0, function(){
  const d1 = Math.hypot(P.X()-F1.X(), P.Y()-F1.Y());
  const d2 = Math.hypot(P.X()-F2.X(), P.Y()-F2.Y());
  return '||PF₁| - |PF₂|| = ' + Math.round(Math.abs(d1-d2)*100)/100 + ' = 2a（常数）';
}], {fontSize:14, color: colors.primary});`
    },
    {
      "type": "warning",
      "text": "注意：常数（记为 \\(2a\\)）必须小于 \\(|F_1F_2| = 2c\\)，即 \\(2a < 2c\\)。若等于则轨迹为两条射线。"
    },
    {
      "type": "formula",
      "title": "焦点在 x 轴上",
      "formulas": [
        "F_1(-c, 0",
        "F_2(c, 0"
      ]
    },
    {
      "type": "formula",
      "title": "焦点在 y 轴上",
      "formulas": [
        "F_1(0, -c",
        "F_2(0, c"
      ]
    },
    {
      "type": "tip",
      "text": "与椭圆不同，双曲线中 \\(a, b\\) 无大小关系限制。判断焦点位置：看哪一项为正，正项的分母对应 \\(a^2\\)。"
    },
    {
      "type": "formula",
      "title": "核心关系式",
      "formulas": [
        "注意：双曲线中 \\(c\\) 最大，\\(c^2 = a^2 + b^2\\)（与椭圆 \\(a^2 = b^2 + c^2\\) 区分）。"
      ]
    },
    {
      "type": "tip",
      "text": "焦点在 \\(y\\) 轴时，渐近线为 \\(y = \\pm \\dfrac{a}{b} x\\)。等轴双曲线（\\(a = b\\)）的渐近线为 \\(y = \\pm x\\)，互相垂直。"
    },
    {
      "type": "table",
      "title": "五、双曲线的几何性质",
      "headers": [
        "性质",
        "内容（焦点在 x 轴）"
      ],
      "rows": [
        [
          "范围",
          "\\(|x| \\geq a\\)（两支，在顶点外侧）"
        ],
        [
          "对称性",
          "关于 \\(x\\) 轴、\\(y\\) 轴、原点对称"
        ],
        [
          "顶点",
          "\\((\\pm a, 0)\\)"
        ],
        [
          "焦点",
          "\\((\\pm c, 0)\\)"
        ],
        [
          "渐近线",
          "\\(y = \\pm \\dfrac{b}{a} x\\)"
        ],
        [
          "离心率",
          "\\(e = \\dfrac{c}{a}\\)，\\(e > 1\\)（越大开口越宽）"
        ]
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求标准方程",
          "question": "已知双曲线焦点为 \\(F_1(-5, 0)\\)、\\(F_2(5, 0)\\)，双曲线上一点到两焦点距离之差的绝对值为 6，求双曲线的标准方程。",
          "solution": "解：由题意：\\(2c = 10\\)，所以 \\(c = 5\\)；\\(2a = 6\\)，所以 \\(a = 3\\)。\n\n        由 \\(c^2 = a^2 + b^2\\)：\\(b^2 = c^2 - a^2 = 25 - 9 = 16\\)，所以 \\(b = 4\\)。\n\n        焦点在 \\(x\\) 轴上，标准方程为：\\(\\dfrac{x^2}{9} - \\dfrac{y^2}{16} = 1\\)。",
          "answer": "答：双曲线标准方程为 \\(\\dfrac{x^2}{9} - \\dfrac{y^2}{16} = 1\\)。"
        },
        {
          "title": "例题2：求渐近线",
          "question": "求双曲线 \\(\\dfrac{x^2}{4} - \\dfrac{y^2}{9} = 1\\) 的渐近线方程和离心率。",
          "solution": "解：由方程知 \\(a^2 = 4\\)，\\(b^2 = 9\\)，所以 \\(a = 2\\)，\\(b = 3\\)。\n\n        \\(c = \\sqrt{a^2 + b^2} = \\sqrt{4 + 9} = \\sqrt{13}\\)。\n\n        渐近线方程：\\(y = \\pm \\dfrac{b}{a} x = \\pm \\dfrac{3}{2} x\\)。\n\n        离心率：\\(e = \\dfrac{c}{a} = \\dfrac{\\sqrt{13}}{2}\\)。",
          "answer": "答：渐近线为 \\(y = \\pm \\dfrac{3}{2} x\\)，离心率为 \\(\\dfrac{\\sqrt{13}}{2}\\)。"
        },
        {
          "title": "例题3：根据条件求双曲线方程",
          "question": "已知双曲线焦点在 \\(x\\) 轴上，渐近线方程为 \\(y = \\pm \\dfrac{1}{2} x\\)，且过点 \\(P(4, \\sqrt{3})\\)，求双曲线方程。",
          "solution": "解：焦点在 \\(x\\) 轴，设方程为 \\(\\dfrac{x^2}{a^2} - \\dfrac{y^2}{b^2} = 1\\)。\n\n        渐近线 \\(y = \\pm \\dfrac{b}{a} x = \\pm \\dfrac{1}{2} x\\)，所以 \\(\\dfrac{b}{a} = \\dfrac{1}{2}\\)，即 \\(b = \\dfrac{a}{2}\\)，\\(b^2 = \\dfrac{a^2}{4}\\)。\n\n        过点 \\(P(4, \\sqrt{3})\\)：\\(\\dfrac{16}{a^2} - \\dfrac{3}{\\frac{a^2}{4}} = 1\\)，即 \\(\\dfrac{16}{a^2} - \\dfrac{12}{a^2} = 1\\)，\\(\\dfrac{4}{a^2} = 1\\)，\\(a^2 = 4\\)，\\(b^2 = 1\\)。\n\n        双曲线方程：\\(\\dfrac{x^2}{4} - y^2 = 1\\)。",
          "answer": "答：双曲线方程为 \\(\\dfrac{x^2}{4} - y^2 = 1\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "双曲线 \\(\\dfrac{x^2}{9} - \\dfrac{y^2}{16} = 1\\) 的 \\(a, b, c\\) 分别是多少？",
          "answer": "解：\\(a=3\\)，\\(b=4\\)，\\(c=\\sqrt{9+16}=5\\)。"
        },
        {
          "difficulty": "basic",
          "question": "求双曲线 \\(\\dfrac{x^2}{16} - \\dfrac{y^2}{9} = 1\\) 的渐近线方程。",
          "answer": "解：\\(y = \\pm \\dfrac{b}{a} x = \\pm \\dfrac{3}{4} x\\)。"
        },
        {
          "difficulty": "medium",
          "question": "双曲线 \\(a = 2\\)，\\(b = 3\\)，焦点在 \\(x\\) 轴，写出标准方程和离心率。",
          "answer": "解：\\(\\dfrac{x^2}{4} - \\dfrac{y^2}{9} = 1\\)，\\(c=\\sqrt{4+9}=\\sqrt{13}\\)，\\(e=\\dfrac{\\sqrt{13}}{2}\\)。"
        },
        {
          "difficulty": "medium",
          "question": "双曲线的渐近线为 \\(y = \\pm x\\)，则该双曲线是什么类型？",
          "answer": "解：\\(a=b\\)，是等轴双曲线，渐近线互相垂直。"
        },
        {
          "difficulty": "advanced",
          "question": "已知双曲线 \\(\\dfrac{x^2}{a^2} - \\dfrac{y^2}{3} = 1\\) 的离心率 \\(e = 2\\)，求 \\(a\\)。",
          "answer": "解：\\(b^2=3\\)，\\(c^2=a^2+3\\)，\\(e=\\dfrac{c}{a}=2 \\Rightarrow c=2a \\Rightarrow c^2=4a^2=a^2+3 \\Rightarrow 3a^2=3 \\Rightarrow a=1\\)。"
        }
      ]
    }
  ]
}
