/**
 * 内容页面数据（content-schema 的实例）
 * 页面：直线方程
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-11-01",
  "unitNum": "11",
  "subject": "math",
  "title": "直线方程",
  "subtitle": "倾斜角斜率、五种方程与距离公式",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解倾斜角与斜率的概念，掌握斜率公式",
        "掌握直线方程的五种形式及适用条件",
        "能判断两直线平行与垂直，掌握点到直线距离公式"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"直线方程\"]\n  N1[\"倾斜角与斜率\"]\n  N0 --> N1\n  N2[\"倾斜角范围 0到180度\"]\n  N1 --> N2\n  N3[\"斜率 k=tanα\"]\n  N1 --> N3\n  N4[\"两点斜率公式\"]\n  N1 --> N4\n  N5[\"五种方程形式\"]\n  N0 --> N5\n  N6[\"点斜式\"]\n  N5 --> N6\n  N7[\"斜截式\"]\n  N5 --> N7\n  N8[\"两点式\"]\n  N5 --> N8\n  N9[\"截距式\"]\n  N5 --> N9\n  N10[\"一般式\"]\n  N5 --> N10\n  N11[\"距离公式\"]\n  N0 --> N11\n  N12[\"两点间距离\"]\n  N11 --> N12\n  N13[\"点到直线距离\"]\n  N11 --> N13\n  N14[\"平行线间距离\"]\n  N11 --> N14\n  N15[\"位置关系\"]\n  N0 --> N15\n  N16[\"平行判定\"]\n  N15 --> N16\n  N17[\"垂直判定\"]\n  N15 --> N17"
    },
    {
      "type": "knowledge",
      "title": "一、倾斜角与斜率",
      "paragraphs": [
        "倾斜角 \\(\\alpha\\)：直线向上的方向与 \\(x\\) 轴正方向所成的最小正角，范围 \\(0^\\circ \\leq \\alpha < 180^\\circ\\)。斜率 \\(k\\)：当 \\(\\alpha \\neq 90^\\circ\\) 时，\\(k = \\tan\\alpha\\)。当 \\(\\alpha = 90^\\circ\\) 时，斜率不存在（直线垂直于 \\(x\\) 轴）。"
      ]
    },
    {
      "type": "diagram",
      "title": "倾斜角与斜率演示",
      "boardId": "line-slope-angle",
      "caption": "拖动点 P 改变直线方向，实时显示斜率 k 与倾斜角 α。",
      "initCode": "board.create('segment', [[-5,0],[5,0]], {strokeColor: colors.muted, strokeWidth:1});\nboard.create('segment', [[0,-3],[0,3]], {strokeColor: colors.muted, strokeWidth:1});\nboard.create('text', [4.8,-0.4, 'x'], {fontSize:14, color: colors.muted});\nboard.create('text', [0.3,2.8, 'y'], {fontSize:14, color: colors.muted});\nconst O = board.create('point', [0,0], {name:'O', size:2, color: colors.text, fixed:true});\nconst P = board.create('point', [2,2], {name:'P', size:2, color: colors.accent});\nboard.create('line', [O, P], {strokeColor: colors.primary, strokeWidth:2});\nboard.create('angle', [[4,0], O, P], {radius:0.7, fillColor: colors.accent, fillOpacity:0.3});\nboard.create('text', [1.2, 3.2, function(){\n  const dx = P.X()-O.X(), dy = P.Y()-O.Y();\n  if (Math.abs(dx) < 1e-6) return 'α = 90°，斜率不存在';\n  const k = dy/dx;\n  let alpha = Math.atan2(dy, dx)*180/Math.PI;\n  if (alpha < 0) alpha += 180;\n  return '斜率 k = ' + k.toFixed(2) + '，倾斜角 α = ' + alpha.toFixed(1) + '°';\n}], {fontSize:14, color: colors.text});"
    },
    {
      "type": "warning",
      "text": "注意各形式的局限性：斜率不存在的直线（垂直 \\(x\\) 轴）不能用点斜式、斜截式；过原点的直线不能用截距式。"
    },
    {
      "type": "table",
      "title": "二、直线方程的五种形式",
      "headers": [
        "名称",
        "方程",
        "适用条件"
      ],
      "rows": [
        [
          "点斜式",
          "\\(y - y_0 = k(x - x_0)\\)",
          "斜率 \\(k\\) 存在"
        ],
        [
          "斜截式",
          "\\(y = kx + b\\)",
          "斜率 \\(k\\) 存在（b 为纵截距）"
        ],
        [
          "两点式",
          "\\(\\dfrac{y - y_1}{y_2 - y_1} = \\dfrac{x - x_1}{x_2 - x_1}\\)",
          "\\(x_1 \\neq x_2\\) 且 \\(y_1 \\neq y_2\\)"
        ],
        [
          "截距式",
          "\\(\\dfrac{x}{a} + \\dfrac{y}{b} = 1\\)",
          "横纵截距 \\(a, b\\) 均不为 0"
        ],
        [
          "一般式",
          "\\(Ax + By + C = 0\\)",
          "所有直线（\\(A, B\\) 不全为 0）"
        ]
      ]
    },
    {
      "type": "diagram",
      "title": "点斜式演示",
      "boardId": "line-point-slope",
      "caption": "过定点 A(1,2) 的直线，拖动点 B 改变斜率，实时显示直线方程。",
      "initCode": "board.create('segment', [[-5,0],[5,0]], {strokeColor: colors.muted, strokeWidth:1});\nboard.create('segment', [[0,-3],[0,3]], {strokeColor: colors.muted, strokeWidth:1});\nboard.create('text', [4.8,-0.4, 'x'], {fontSize:14, color: colors.muted});\nboard.create('text', [0.3,2.8, 'y'], {fontSize:14, color: colors.muted});\nconst A = board.create('point', [1,2], {name:'A(1,2)', size:2, color: colors.accent, fixed:true});\nconst B = board.create('point', [3,0], {name:'B', size:2, color: colors.primary});\nboard.create('line', [A, B], {strokeColor: colors.primary, strokeWidth:2});\nboard.create('text', [-4.5, 2.8, function(){\n  const dx = B.X()-A.X(), dy = B.Y()-A.Y();\n  if (Math.abs(dx) < 1e-6) return '斜率不存在';\n  const k = dy/dx;\n  const b = A.Y()-k*A.X();\n  return 'k = ' + k.toFixed(2) + '，y = ' + k.toFixed(2) + 'x ' + (b>=0?'+ ':'- ') + Math.abs(b).toFixed(2);\n}], {fontSize:14, color: colors.text});"
    },
    {
      "type": "knowledge",
      "title": "四、距离公式",
      "paragraphs": [
        "推导过程：\n\n      设点 \\(P(x_0, y_0)\\)，直线 \\(l: Ax + By + C = 0\\)（\\(A, B\\) 不全为 0）。直线 \\(l\\) 的法向量为 \\(\\boldsymbol{n} = (A, B)\\)。\n\n      ① 在直线 \\(l\\) 上任取一点 \\(M(x_1, y_1)\\)（满足 \\(Ax_1 + By_1 + C = 0\\)），则向量 \\(\\overrightarrow{MP} = (x_0 - x_1, y_0 - y_1)\\)。\n\n      ② 距离 = \\(\\overrightarrow{MP}\\) 在法向量 \\(\\boldsymbol{n}\\) 方向上的投影长：\n\n      $$d = \\frac{|\\overrightarrow{MP} \\cdot \\boldsymbol{n}|}{|\\boldsymbol{n}|} = \\frac{|A(x_0 - x_1) + B(y_0 - y_1)|}{\\sqrt{A^2 + B^2}}$$\n\n      ③ 化简：展开分子 \\(A(x_0 - x_1) + B(y_0 - y_1) = (Ax_0 + By_0) - (Ax_1 + By_1)\\)。\n\n      因为 \\(M\\) 在直线 \\(l\\) 上，\\(Ax_1 + By_1 + C = 0\\)，即 \\(Ax_1 + By_1 = -C\\)，代入：\n\n      $$d = \\frac{|(Ax_0 + By_0) - (-C)|}{\\sqrt{A^2 + B^2}} = \\frac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}}$$\n\n      关键思想：把\"点到直线的距离\"转化为\"向量在法向量上的投影\"，利用点在直线上满足方程消去辅助点坐标，得到只含 \\(P\\) 与直线系数的简洁公式。"
      ]
    },
    {
      "type": "formula",
      "title": "点到直线的距离",
      "formulas": [
        "P(x_0, y_0)",
        "Ax + By + C = 0"
      ]
    },
    {
      "type": "formula",
      "title": "两平行线间的距离",
      "formulas": [
        "两平行线 \\(Ax + By + C_1 = 0\\) 与 \\(Ax + By + C_2 = 0\\) 间的距离（要求 \\(A, B\\) 系数相同）。"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求直线方程",
          "question": "求过点 \\(A(1, 2)\\) 且斜率为 \\(-1\\) 的直线方程，并化为一般式。",
          "solution": "解：用点斜式：\\(y - 2 = -1(x - 1)\\)，即 \\(y = -x + 3\\)。\n\n        化为一般式：\\(x + y - 3 = 0\\)。",
          "answer": "答：直线方程为 \\(x + y - 3 = 0\\)。"
        },
        {
          "title": "例题2：判断位置关系",
          "question": "判断直线 \\(l_1: 2x - y + 1 = 0\\) 与 \\(l_2: 4x - 2y + 3 = 0\\) 的位置关系。",
          "solution": "解：化为斜截式：\\(l_1: y = 2x + 1\\)，\\(l_2: y = 2x + \\dfrac{3}{2}\\)。\n\n        斜率 \\(k_1 = k_2 = 2\\)，纵截距 \\(b_1 = 1 \\neq \\dfrac{3}{2} = b_2\\)。\n\n        所以 \\(l_1 \\parallel l_2\\)。",
          "answer": "答：\\(l_1 \\parallel l_2\\)。"
        },
        {
          "title": "例题3：求距离",
          "question": "求点 \\(P(1, -1)\\) 到直线 \\(3x - 4y + 5 = 0\\) 的距离。",
          "solution": "解：由点到直线距离公式：\n\n        $$d = \\frac{|3 \\times 1 - 4 \\times (-1) + 5|}{\\sqrt{3^2 + (-4)^2}} = \\frac{|3 + 4 + 5|}{\\sqrt{9 + 16}} = \\frac{12}{5}$$",
          "answer": "答：距离为 \\(\\dfrac{12}{5}\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "求过两点 \\(A(1, 1)\\)、\\(B(3, 5)\\) 的直线的斜率。",
          "answer": "解：\\(k=\\dfrac{5-1}{3-1}=\\dfrac{4}{2}=2\\)。"
        },
        {
          "difficulty": "basic",
          "question": "写出过点 \\((2, 3)\\) 且斜率为 \\(\\dfrac{1}{2}\\) 的直线方程。",
          "answer": "解：点斜式 \\(y-3=\\dfrac{1}{2}(x-2)\\)，即 \\(x - 2y + 4 = 0\\)。"
        },
        {
          "difficulty": "medium",
          "question": "已知直线 \\(l_1: y = 3x + 2\\)，求过点 \\((1, 1)\\) 且与 \\(l_1\\) 平行的直线方程。",
          "answer": "解：平行则斜率相同 \\(k=3\\)，方程 \\(y-1=3(x-1)\\)，即 \\(3x - y - 2 = 0\\)。"
        },
        {
          "difficulty": "medium",
          "question": "求点 \\((0, 0)\\) 到直线 \\(x + y - 4 = 0\\) 的距离。",
          "answer": "解：\\(d=\\dfrac{|0+0-4|}{\\sqrt{1+1}}=\\dfrac{4}{\\sqrt{2}}=2\\sqrt{2}\\)。"
        },
        {
          "difficulty": "advanced",
          "question": "求两条平行线 \\(2x + 3y - 1 = 0\\) 与 \\(2x + 3y + 5 = 0\\) 间的距离。",
          "answer": "解：\\(d=\\dfrac{|-1-5|}{\\sqrt{4+9}}=\\dfrac{6}{\\sqrt{13}}=\\dfrac{6\\sqrt{13}}{13}\\)。"
        }
      ]
    }
  ]
}
