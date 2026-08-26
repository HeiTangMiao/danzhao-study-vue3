/**
 * 内容页面数据（content-schema 的实例）
 * 页面：二次函数
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-03-03",
  "unitNum": "03",
  "subject": "math",
  "title": "二次函数",
  "subtitle": "三种解析式、图像性质、闭区间最值",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握二次函数的三种解析式（一般式、顶点式、零点式）",
        "理解二次函数的图像性质（开口、对称轴、顶点）",
        "掌握闭区间上二次函数的最值求法",
        "理解二次函数与一元二次方程、不等式的关系"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"二次函数\"]\n  N1[\"三种形式\"]\n  N0 --> N1\n  N2[\"一般式\"]\n  N1 --> N2\n  N3[\"顶点式\"]\n  N1 --> N3\n  N4[\"交点式\"]\n  N1 --> N4\n  N5[\"开口方向\"]\n  N0 --> N5\n  N6[\"a>0 开口向上\"]\n  N5 --> N6\n  N7[\"a<0 开口向下\"]\n  N5 --> N7\n  N8[\"顶点与对称轴\"]\n  N0 --> N8\n  N9[\"顶点 -b/2a\"]\n  N8 --> N9\n  N10[\"对称轴 x=-b/2a\"]\n  N8 --> N10\n  N11[\"判别式\"]\n  N0 --> N11\n  N12[\"Δ>0 两交点\"]\n  N11 --> N12\n  N13[\"Δ=0 一交点\"]\n  N11 --> N13\n  N14[\"Δ<0 无交点\"]\n  N11 --> N14"
    },
    {
      "type": "formula",
      "title": "一般式",
      "formulas": [
        "y = ax^2 + bx + c \\quad (a \\ne 0)",
        "a",
        "c",
        "y"
      ]
    },
    {
      "type": "formula",
      "title": "顶点式",
      "formulas": [
        "y = a(x - h)^2 + k \\quad (a \\ne 0)",
        "(h, k)",
        "x = h"
      ]
    },
    {
      "type": "formula",
      "title": "零点式（交点式）",
      "formulas": [
        "y = a(x - x_1)(x - x_2) \\quad (a \\ne 0)",
        "其中 \\(x_1, x_2\\) 为函数图像与 \\(x\\) 轴的交点横坐标（即方程 \\(ax^2+bx+c=0\\) 的两根）。"
      ]
    },
    {
      "type": "tip",
      "text": "三种形式的转化：一般式通过配方可化为顶点式；若方程有解，一般式可因式分解为零点式。"
    },
    {
      "type": "table",
      "title": "二、图像性质",
      "headers": [
        "性质",
        "公式"
      ],
      "rows": [
        [
          "开口方向",
          "\\(a > 0\\)：开口向上；\\(a < 0\\)"
        ],
        [
          "对称轴",
          "$$x = -\\frac{b}{2a}$$"
        ],
        [
          "顶点坐标",
          "$$\\left(-\\frac{b}{2a}, \\frac{4ac-b^2}{4a}\\right)$$"
        ],
        [
          "与 \\(y\\) 轴交点",
          "\\((0, c)\\)"
        ],
        [
          "与 \\(x\\) 轴交点",
          "\\(\\Delta > 0\\)：两个交点；\\(\\Delta = 0\\)：一个交点；\\(\\Delta < 0\\)：无交点"
        ]
      ]
    },
    {
      "type": "diagram",
      "title": "二次函数图像演示",
      "boardId": "quadratic-func",
      "caption": "拖动滑块改变 a、b、c，观察抛物线开口方向、对称轴与顶点变化。",
      "initCode": "board.create('segment', [[-6,0],[6,0]], {strokeColor: colors.muted, strokeWidth:1});\nboard.create('segment', [[0,-4],[0,4]], {strokeColor: colors.muted, strokeWidth:1});\nboard.create('text', [5.8,-0.4, 'x'], {fontSize:14, color: colors.muted});\nboard.create('text', [0.3,3.8, 'y'], {fontSize:14, color: colors.muted});\nconst a = board.create('slider', [[-5.6, 3.0], [-2.6, 3.0], [-2, 1, 2]], {name:'a', snapWidth:0.1, strokeColor: colors.accent, fillColor: colors.accent, highlight:false});\nconst b = board.create('slider', [[-5.6, 2.2], [-2.6, 2.2], [-3, 0, 3]], {name:'b', snapWidth:0.1, strokeColor: colors.accent, fillColor: colors.accent, highlight:false});\nconst c = board.create('slider', [[-5.6, 1.4], [-2.6, 1.4], [-3, 0, 3]], {name:'c', snapWidth:0.1, strokeColor: colors.accent, fillColor: colors.accent, highlight:false});\nboard.create('functiongraph', [function(x){ return a.Value()*x*x + b.Value()*x + c.Value(); }, -6, 6], {strokeColor: colors.primary, strokeWidth:2});\nboard.create('text', [-5.6, 3.8, function(){\n  const av = a.Value(), bv = b.Value(), cv = c.Value();\n  return 'y = ' + av.toFixed(1) + 'x² ' + (bv>=0?'+ ':'- ') + Math.abs(bv).toFixed(1) + 'x ' + (cv>=0?'+ ':'- ') + Math.abs(cv).toFixed(1);\n}], {fontSize:14, color: colors.text});\nboard.create('text', [-5.6, 3.5, function(){\n  const av = a.Value();\n  return 'a = ' + av.toFixed(1) + '，开口' + (av>0?'向上':'向下') + '；对称轴 x = ' + (-b.Value()/(2*av)).toFixed(2);\n}], {fontSize:13, color: colors.muted});"
    },
    {
      "type": "desmos",
      "title": "🖊 动手演练：二次函数（Desmos）",
      "initialExpressions": ["y = x^2 - 2x - 3", "y = -(x+1)^2 + 4"]
    },
    {
      "type": "knowledge",
      "title": "三、最值问题",
      "paragraphs": [
        "闭区间 \\([m, n]\\) 上二次函数最值的求法（\\(a > 0\\)）：\n\n      设对称轴 \\(x = -\\frac{b}{2a}\\)：\n\n      ① 若对称轴在区间左侧（\\(-\\frac{b}{2a} \\le m\\)）：最小值在 \\(x = m\\) 处，最大值在 \\(x = n\\) 处\n\n      ② 若对称轴在区间内（\\(m < -\\frac{b}{2a} < n\\)）：最小值在 \\(x = -\\frac{b}{2a}\\) 处。③ 若对称轴在区间右侧（\\(-\\frac{b}{2a} \\ge n\\)）：最小值在 \\(x = n\\) 处，最大值在 \\(x = m\\) 处"
      ]
    },
    {
      "type": "formula",
      "title": "二次函数的最值",
      "formulas": [
        "当 \\(a > 0\\)（开口向上）时：",
        "y_{\\min} = \\frac{4ac-b^2}{4a}",
        "x = -\\frac{b}{2a}",
        "当 \\(a < 0\\)（开口向下）时：",
        "y_{\\max} = \\frac{4ac-b^2}{4a}",
        "x = -\\frac{b}{2a}"
      ]
    },
    {
      "type": "warning",
      "text": "闭区间上的最值问题需要讨论对称轴与区间的位置关系！\"轴定区间动\"或\"轴动区间定\"都要分类讨论。"
    },
    {
      "type": "formula",
      "title": "判别式",
      "formulas": [
        "\\Delta = b^2 - 4ac",
        "\\Delta > 0",
        "x",
        "\\(\\Delta = 0\\)：与 \\(x\\) 轴有一个交点（相切）",
        "\\Delta < 0",
        "x"
      ]
    },
    {
      "type": "knowledge",
      "title": "五、\"三个二次\"的关系",
      "paragraphs": [
        "二次函数 \\(y = ax^2+bx+c\\)、一元二次方程 \\(ax^2+bx+c=0\\)、一元二次不等式 \\(ax^2+bx+c > 0\\)（或 \\(ax^2+bx+c < 0\\)）。\n\n      • 方程的解 \\(\\Leftrightarrow\\) 函数图像与 \\(x\\) 轴交点的横坐标\n\n      • 不等式的解集 \\(\\Leftrightarrow\\) 函数图像在 \\(x\\) 轴上方（或下方）对应的 \\(x\\) 范围"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求二次函数解析式",
          "question": "已知二次函数图像过点 \\((0, 3)\\)，顶点为 \\((1, 2)\\)，求其解析式。",
          "solution": "解：\n\n        已知顶点为 \\((1, 2)\\)，设顶点式：\n\n        $$y = a(x - 1)^2 + 2$$\n\n        代入点 \\((0, 3)\\)：\n\n        $$3 = a(0-1)^2 + 2 \\Rightarrow 3 = a + 2 \\Rightarrow a = 1$$\n\n        所以解析式为 \\(y = (x-1)^2 + 2 = x^2 - 2x + 3\\)。\n\n        验证：\\(a = 1 > 0\\)，开口向上，顶点 \\((1, 2)\\)，\\(y\\) 轴截距 \\(c = 3\\)，符合条件。",
          "answer": "答案：\\(y = (x-1)^2 + 2\\)，即 \\(y = x^2 - 2x + 3\\)。"
        },
        {
          "title": "例题2：求闭区间最值",
          "question": "求函数 \\(f(x) = x^2 - 4x + 3\\) 在区间 \\([0, 3]\\) 上的最大值和最小值。",
          "solution": "解：\n\n        函数 \\(f(x) = x^2 - 4x + 3\\)，\\(a = 1 > 0\\)，开口向上。\n\n        对称轴：\\(x = -\\frac{-4}{2 \\times 1} = 2\\)。\n\n        顶点在 \\(x = 2\\) 处，\\(2 \\in [0, 3]\\)，所以最小值在顶点处：\n\n        $$f(2) = 4 - 8 + 3 = -1$$\n\n        最大值在区间端点处，比较 \\(f(0)\\) 和 \\(f(3)\\)：\n\n        \\(f(0) = 0 - 0 + 3 = 3\\)\n\n        \\(f(3) = 9 - 12 + 3 = 0\\)\n\n        因为 \\(f(0) > f(3)\\)，所以最大值在 \\(x = 0\\) 处，最大值为 3。\n\n        （也可判断：\\(x=0\\) 离对称轴 \\(x=2\\) 的距离为2，\\(x=3\\) 离对称轴距离为1，距离远的端点函数值更大）",
          "answer": "答案：最小值为 \\(-1\\)（在 \\(x=2\\) 处），最大值为 3（在 \\(x=0\\) 处）。"
        },
        {
          "title": "例题3：含参数最值讨论",
          "question": "求函数 \\(f(x) = x^2 - 2ax + 1\\) 在 \\([0, 2]\\) 上的最小值。",
          "solution": "解：\n\n        \\(f(x) = x^2 - 2ax + 1\\)，\\(a = 1 > 0\\)，开口向上。\n\n        对称轴：\\(x = -\\frac{-2a}{2} = a\\)。\n\n        需分三种情况讨论对称轴与区间 \\([0, 2]\\) 的关系：\n\n        情况1：当 \\(a < 0\\)（对称轴在区间左侧）时：\n\n        函数在 \\([0, 2]\\) 上单调递增，最小值在 \\(x = 0\\) 处：\\(f(0) = 1\\)。\n\n        情况2：当 \\(0 \\le a \\le 2\\)（对称轴在区间内）时：\n\n        最小值在顶点处：\\(f(a) = a^2 - 2a \\cdot a + 1 = 1 - a^2\\)。\n\n        情况3：当 \\(a > 2\\)（对称轴在区间右侧）时：\n\n        函数在 \\([0, 2]\\) 上单调递减，最小值在 \\(x = 2\\) 处：\\(f(2) = 4 - 4a + 1 = 5 - 4a\\)。",
          "answer": "答案：最小值 \\(g(a) = \\begin{cases} 1, & a < 2\\\\1 - a^2, & 0 \\le a \\le 2\\\\5 - 4a, & a > 2 \\end{cases}\\)。"
        },
        {
          "title": "例题4：用零点式求二次函数解析式（基础计算型）",
          "question": "已知二次函数图像与 \\(x\\) 轴交于 \\((-1, 0)\\) 和 \\((3, 0)\\) 两点，且过点 \\((1, 4)\\)，求其解析式。",
          "solution": "解：\n\n        已知函数图像与 \\(x\\) 轴的两个交点，设零点式（交点式）：\n\n        $$y = a(x + 1)(x - 3)$$\n\n        代入点 \\((1, 4)\\)：\n\n        $$4 = a(1 + 1)(1 - 3) = a \\times 2 \\times (-2) = -4a$$\n\n        解得 \\(a = -1\\)。\n\n        所以解析式为 \\(y = -(x+1)(x-3)\\)。\n\n        展开为一般式：\\(y = -(x^2 - 2x - 3) = -x^2 + 2x + 3\\)。\n\n        验证：\\(a = -1 < 0\\) 开口向下，对称轴 \\(x = 1\\)，顶点 \\((1, 4)\\)，过 \\((-1,0)\\) 和 \\((3,0)\\)，符合条件。",
          "answer": "答案：\\(y = -(x+1)(x-3)\\)，即 \\(y = -x^2 + 2x + 3\\)。"
        },
        {
          "title": "例题5：含参数二次函数与不等式（综合应用型）",
          "question": "已知二次函数 \\(f(x) = x^2 - (a-1)x - a\\)（\\(a \\in \\mathbb{R}\\)）。\n\n      （1）若方程 \\(f(x) = 0\\) 的两根之和为 2，求 \\(a\\) 的值；\n\n      （2）求不等式 \\(f(x) < 0\\) 的解集。",
          "solution": "解：\n\n        （1）将 \\(f(x)\\) 因式分解：\n\n        $$f(x) = x^2 - (a-1)x - a = (x - a)(x + 1)$$\n\n        所以方程 \\(f(x) = 0\\) 的两根为 \\(x_1 = a\\)，\\(x_2 = -1\\)。\n\n        由韦达定理，两根之和 \\(x_1 + x_2 = a - 1\\)。\n\n        由题意 \\(a - 1 = 2\\)，解得 \\(a = 3\\)。\n\n        （2）不等式 \\(f(x) < 0\\)，即 \\((x - a)(x + 1) < 0\\)。\n\n        因为二次项系数为 1（开口向上），\\(a\\) 与 \\(-1\\) 需分类讨论：\n\n        ① 当 \\(a > -1\\) 时，解集为 \\((-1, a)\\)；\n\n        ② 当 \\(a = -1\\) 时，\\(f(x) = (x+1)^2 \\ge 0\\) 恒成立，解集为 \\(\\varnothing\\)；\n\n        ③ 当 \\(a < -1\\) 时，解集为 \\((a, -1)\\)。",
          "answer": "答案：（1）\\(a = 3\\)；（2）当 \\(a > -1\\) 时解集为 \\((-1, a)\\)；当 \\(a = -1\\) 时解集为 \\(\\varnothing\\)；当 \\(a < -1\\) 时解集为 \\((a, -1)\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "二次函数 \\(y = -x^2 + 4x - 1\\) 的顶点坐标是______。",
          "answer": "答案：\\((2, 3)\\)。对称轴 \\(x = -\\frac{4}{2 \\times (-1)} = 2\\)，顶点纵坐标 \\(y = \\frac{4 \\times (-1) \\times (-1) - 16}{4 \\times (-1)} = \\frac{4-16}{-4} = 3\\)。所以顶点为 \\((2, 3)\\)。"
        },
        {
          "difficulty": "basic",
          "question": "已知二次函数 \\(y = ax^2 + bx + c\\) 的图像如图所示（开口向下，对称轴 \\(x=1\\)，过原点），则下列正确的是（　）\nA. \\(a > 0, b > 0, c = 0\\)\nB. \\(a < 0, b > 0, c = 0\\)\nC. \\(a < 0, b < 0, c = 0\\)\nD. \\(a < 0, b = 0, c = 0\\)",
          "answer": "答案：B。开口向下 \\(\\Rightarrow a < 0\\)，对称轴 \\(x = -\\frac{b}{2a} = 1 \\Rightarrow b > 0\\)，过原点 \\(\\Rightarrow c = 0\\)。"
        },
        {
          "difficulty": "medium",
          "question": "函数 \\(f(x) = x^2 - 2x + 2\\) 在区间 \\([0, 3]\\) 上的值域是______。",
          "answer": "答案：\\([1, 5]\\)。对称轴 \\(x = 1 \\in [0,3]\\)，最小值 \\(f(1) = 1-2+2 = 1\\)。比较端点：\\(f(0) = 2\\)，\\(f(3) = 9-6+2 = 5\\)。最大值为5。值域 \\([1, 5]\\)。"
        },
        {
          "difficulty": "medium",
          "question": "已知二次函数 \\(f(x) = x^2 + bx + c\\) 的对称轴为 \\(x = 1\\)，且过点 \\((2, 3)\\)，求 \\(b\\) 和 \\(c\\)。",
          "answer": "答案：\\(b = -2\\)，\\(c = 3\\)。对称轴 \\(x = -\\frac{b}{2} = 1 \\Rightarrow b = -2\\)。代入点 \\((2,3)\\)：\\(4 + (-2)(2) + c = 3 \\Rightarrow 4-4+c=3 \\Rightarrow c=3\\)。"
        },
        {
          "difficulty": "advanced",
          "question": "若函数 \\(f(x) = x^2 - 2ax + 2\\) 在 \\((-\\infty, 1]\\) 上单调递减，求 \\(a\\) 的取值范围。",
          "answer": "答案：\\(a \\ge 1\\)。开口向上，对称轴 \\(x = a\\)。函数在 \\((-\\infty, a]\\) 上递减。要使在 \\((-\\infty, 1]\\) 上递减，需要 \\((-\\infty, 1] \\subseteq (-\\infty, a]\\)，即 \\(a \\ge 1\\)。"
        }
      ]
    }
  ]
}
