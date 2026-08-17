/**
 * 内容页面数据（content-schema 的实例）
 * 页面：向量的数量积
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-07-03",
  "unitNum": "07",
  "subject": "math",
  "title": "向量的数量积",
  "subtitle": "数量积定义、坐标运算与夹角公式",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解向量数量积的定义及其几何意义",
        "掌握数量积的坐标运算公式",
        "能利用数量积判断两向量垂直，求向量的模和夹角",
        "掌握数量积的运算性质，能灵活运用解题"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"向量的数量积\"]\n  N1[\"数量积定义\"]\n  N0 --> N1\n  N2[\"a b = a b cos theta\"]\n  N1 --> N2\n  N3[\"结果为实数\"]\n  N1 --> N3\n  N4[\"夹角范围 0 到 pi\"]\n  N1 --> N4\n  N5[\"几何意义\"]\n  N0 --> N5\n  N6[\"b 在 a 上的投影\"]\n  N5 --> N6\n  N7[\"a 在 b 上的投影\"]\n  N5 --> N7\n  N8[\"坐标运算\"]\n  N0 --> N8\n  N9[\"a b = x1 x2 + y1 y2\"]\n  N8 --> N9\n  N10[\"重要性质\"]\n  N0 --> N10\n  N11[\"垂直条件 a b = 0\"]\n  N10 --> N11\n  N12[\"模公式 a a = a 2\"]\n  N10 --> N12\n  N13[\"夹角符号判断\"]\n  N10 --> N13\n  N14[\"夹角公式\"]\n  N0 --> N14\n  N15[\"cos theta = a b a b\"]\n  N14 --> N15\n  N16[\"运算律\"]\n  N0 --> N16\n  N17[\"交换律\"]\n  N16 --> N17\n  N18[\"数乘结合律\"]\n  N16 --> N18\n  N19[\"分配律\"]\n  N16 --> N19\n  N20[\"不满足结合律\"]\n  N16 --> N20"
    },
    {
      "type": "knowledge",
      "title": "一、数量积的定义",
      "paragraphs": [
        "已知两个非零向量 \\(\\boldsymbol{a}\\) 和 \\(\\boldsymbol{b}\\)，它们的夹角为 \\(\\theta\\)（\\(0 \\leq \\theta \\leq \\pi\\)），则数量积定义为："
      ]
    },
    {
      "type": "warning",
      "text": "数量积是一个实数（标量），不是向量。规定 \\(\\boldsymbol{0}\\) 与任何向量的数量积为 \\(0\\)。"
    },
    {
      "type": "knowledge",
      "title": "二、数量积的几何意义",
      "paragraphs": [
        "\\(\\boldsymbol{a} \\cdot \\boldsymbol{b}\\) 等于 \\(\\boldsymbol{a}\\) 的模与 \\(\\boldsymbol{b}\\) 在 \\(\\boldsymbol{a}\\) 方向上投影 \\(|\\boldsymbol{b}|\\cos\\theta\\) 的乘积。\n\n      • \\(\\boldsymbol{b}\\) 在 \\(\\boldsymbol{a}\\) 方向上的投影为 \\(|\\boldsymbol{b}|\\cos\\theta\\)\n\n      • \\(\\boldsymbol{a}\\) 在 \\(\\boldsymbol{b}\\) 方向上的投影为 \\(|\\boldsymbol{a}|\\cos\\theta\\)"
      ]
    },
    {
      "type": "knowledge",
      "title": "三、数量积的坐标运算",
      "paragraphs": [
        "推导过程（坐标运算公式 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = x_1 x_2 + y_1 y_2\\)）：\n\n      设 \\(\\boldsymbol{a} = (x_1, y_1) = x_1\\boldsymbol{i} + y_1\\boldsymbol{j}\\)，\\(\\boldsymbol{b} = (x_2, y_2) = x_2\\boldsymbol{i} + y_2\\boldsymbol{j}\\)，其中 \\(\\boldsymbol{i}, \\boldsymbol{j}\\) 是互相垂直的单位向量。\n\n      ① 利用分配律展开：\n\n      $$\\boldsymbol{a} \\cdot \\boldsymbol{b} = (x_1\\boldsymbol{i} + y_1\\boldsymbol{j}) \\cdot (x_2\\boldsymbol{i} + y_2\\boldsymbol{j})$$\n\n      $$= x_1 x_2 (\\boldsymbol{i} \\cdot \\boldsymbol{i}) + x_1 y_2 (\\boldsymbol{i} \\cdot \\boldsymbol{j}) + y_1 x_2 (\\boldsymbol{j} \\cdot \\boldsymbol{i}) + y_1 y_2 (\\boldsymbol{j} \\cdot \\boldsymbol{j})$$\n\n      ② 计算基底的数量积：因 \\(\\boldsymbol{i} \\perp \\boldsymbol{j}\\)，夹角为 \\(90°\\)，故 \\(\\boldsymbol{i} \\cdot \\boldsymbol{j} = |\\boldsymbol{i}||\\boldsymbol{j}|\\cos 90° = 1 \\times 1 \\times 0 = 0\\)；而 \\(\\boldsymbol{i} \\cdot \\boldsymbol{i} = |\\boldsymbol{i}|^2 \\cos 0° = 1\\)，同理 \\(\\boldsymbol{j} \\cdot \\boldsymbol{j} = 1\\)。\n\n      ③ 代入化简：交叉项为零，只剩：\n\n      $$\\boldsymbol{a} \\cdot \\boldsymbol{b} = x_1 x_2 \\cdot 1 + 0 + 0 + y_1 y_2 \\cdot 1 = x_1 x_2 + y_1 y_2$$\n\n      关键思想：利用正交基底\"垂直则数量积为零\"的特性，将几何定义转化为纯代数运算，避免了夹角的计算。"
      ]
    },
    {
      "type": "formula",
      "title": "坐标运算公式",
      "formulas": [
        "\\boldsymbol{a} = (x_1, y_1",
        "\\boldsymbol{b} = (x_2, y_2"
      ]
    },
    {
      "type": "knowledge",
      "title": "四、数量积的重要性质",
      "paragraphs": [
        "推导过程（垂直条件 \\(\\boldsymbol{a} \\perp \\boldsymbol{b} \\iff \\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\)）：\n\n      设 \\(\\boldsymbol{a}, \\boldsymbol{b}\\) 为非零向量，夹角为 \\(\\theta\\)。由数量积定义：\n\n      $$\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos\\theta$$\n\n      ① 必要性：若 \\(\\boldsymbol{a} \\perp \\boldsymbol{b}\\)，则 \\(\\theta = 90° = \\dfrac{\\pi}{2}\\)，\\(\\cos\\theta = 0\\)，故 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}| \\cdot 0 = 0\\)。\n\n      ② 充分性：若 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\)，即 \\(|\\boldsymbol{a}||\\boldsymbol{b}|\\cos\\theta = 0\\)。因 \\(\\boldsymbol{a}, \\boldsymbol{b}\\) 非零，\\(|\\boldsymbol{a}| \\neq 0\\)，\\(|\\boldsymbol{b}| \\neq 0\\)，故 \\(\\cos\\theta = 0\\)。又 \\(0 \\leq \\theta \\leq \\pi\\)，所以 \\(\\theta = \\dfrac{\\pi}{2}\\)，即 \\(\\boldsymbol{a} \\perp \\boldsymbol{b}\\)。\n\n      结合坐标公式 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = x_1 x_2 + y_1 y_2\\)，垂直条件即 \\(x_1 x_2 + y_1 y_2 = 0\\)。\n\n      关键思想：垂直 \\(\\Leftrightarrow\\) 夹角为 \\(90°\\) \\(\\Leftrightarrow\\) \\(\\cos\\theta = 0\\) \\(\\Leftrightarrow\\) 数量积为零，把\"几何垂直\"转化为\"代数归零\"，是解析几何判断垂直的核心工具。"
      ]
    },
    {
      "type": "formula",
      "title": "重要性质",
      "formulas": [
        "\\boldsymbol{a} \\perp \\boldsymbol{b} \\iff \\boldsymbol{a} \\cdot \\boldsymbol{b} = 0 \\iff x_1 x_2 + y_1 y_2 = 0\\",
        "\\boldsymbol{a} \\cdot \\boldsymbol{a} = |\\boldsymbol{a}|^2\\",
        "|\\boldsymbol{a}| = \\sqrt{\\boldsymbol{a} \\cdot \\boldsymbol{a}} = \\sqrt{x_1^2 + y_1^2}\\",
        "\\theta\\",
        "\\boldsymbol{a} \\cdot \\boldsymbol{b} > 0\\",
        "\\boldsymbol{a} \\cdot \\boldsymbol{b} < 0\\",
        "\\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\"
      ]
    },
    {
      "type": "formula",
      "title": "夹角公式",
      "formulas": [
        "\\boldsymbol{a}\\",
        "\\boldsymbol{b}\\",
        "\\theta\\"
      ]
    },
    {
      "type": "formula",
      "title": "运算律",
      "formulas": [
        "\\boldsymbol{a} \\cdot \\boldsymbol{b} = \\boldsymbol{b} \\cdot \\boldsymbol{a}\\",
        "(\\lambda\\boldsymbol{a}",
        "\\boldsymbol{a} \\cdot \\boldsymbol{b}",
        "\\lambda\\boldsymbol{b}",
        "(\\boldsymbol{a} + \\boldsymbol{b}"
      ]
    },
    {
      "type": "warning",
      "text": "数量积不满足结合律，即 \\((\\boldsymbol{a} \\cdot \\boldsymbol{b}) \\cdot \\boldsymbol{c} \\neq \\boldsymbol{a} \\cdot (\\boldsymbol{b} \\cdot \\boldsymbol{c})\\)。消去律也不成立。"
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求数量积",
          "question": "已知 \\(\\boldsymbol{a} = (2, 1)\\)，\\(\\boldsymbol{b} = (3, -4)\\)，求 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b}\\) 和 \\(|\\boldsymbol{a}|\\)、\\(|\\boldsymbol{b}|\\)。",
          "solution": "解：\n\n        \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 2 \\times 3 + 1 \\times (-4) = 6 - 4 = 2\\)\n\n        \\(|\\boldsymbol{a}| = \\sqrt{2^2 + 1^2} = \\sqrt{5}\\)\n\n        \\(|\\boldsymbol{b}| = \\sqrt{3^2 + (-4)^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5\\)",
          "answer": ""
        },
        {
          "title": "例题2：判断垂直",
          "question": "已知 \\(\\boldsymbol{a} = (1, 2)\\)，\\(\\boldsymbol{b} = (m, -1)\\)，若 \\(\\boldsymbol{a} \\perp \\boldsymbol{b}\\)，求 \\(m\\) 的值。",
          "solution": "解：\n\n        由垂直条件 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\)：\n\n        \\(1 \\times m + 2 \\times (-1) = 0\\)\n\n        \\(m - 2 = 0\\)\n\n        \\(m = 2\\)",
          "answer": ""
        },
        {
          "title": "例题3：求夹角",
          "question": "已知 \\(\\boldsymbol{a} = (1, \\sqrt{3})\\)，\\(\\boldsymbol{b} = (\\sqrt{3}, 1)\\)，求 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角 \\(\\theta\\)。",
          "solution": "解：\n\n        \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 1 \\times \\sqrt{3} + \\sqrt{3} \\times 1 = 2\\sqrt{3}\\)\n\n        \\(|\\boldsymbol{a}| = \\sqrt{1 + 3} = 2\\)\n\n        \\(|\\boldsymbol{b}| = \\sqrt{3 + 1} = 2\\)\n\n        \\(\\cos\\theta = \\frac{\\boldsymbol{a} \\cdot \\boldsymbol{b}}{|\\boldsymbol{a}||\\boldsymbol{b}|} = \\frac{2\\sqrt{3}}{2 \\times 2} = \\frac{2\\sqrt{3}}{4} = \\frac{\\sqrt{3}}{2}\\)\n\n        因为 \\(0 \\leq \\theta \\leq \\pi\\)，所以 \\(\\theta = \\frac{\\pi}{6}\\)（即 \\(30°\\)）",
          "answer": ""
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "已知 \\(\\boldsymbol{a} = (3, -2)\\)，\\(\\boldsymbol{b} = (1, 4)\\)，求 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b}\\)。",
          "answer": "\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 3 \\times 1 + (-2) \\times 4 = 3 - 8 = -5\\)"
        },
        {
          "difficulty": "basic",
          "question": "已知 \\(|\\boldsymbol{a}| = 3\\)，\\(|\\boldsymbol{b}| = 4\\)，\\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角为 \\(60°\\)，求 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b}\\)。",
          "answer": "\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos 60° = 3 \\times 4 \\times \\frac{1}{2} = 6\\)"
        },
        {
          "difficulty": "medium",
          "question": "已知 \\(\\boldsymbol{a} = (2, -1)\\)，\\(\\boldsymbol{b} = (1, k)\\)，若 \\(\\boldsymbol{a} \\perp \\boldsymbol{b}\\)，求 \\(k\\)。",
          "answer": "\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 2 \\times 1 + (-1) \\times k = 2 - k = 0\\)，\\(k = 2\\)。"
        },
        {
          "difficulty": "medium",
          "question": "已知 \\(\\boldsymbol{a} = (1, 2)\\)，\\(\\boldsymbol{b} = (-2, 1)\\)，求 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角。",
          "answer": "\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 1 \\times (-2) + 2 \\times 1 = 0\\)。因为 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\)，所以 \\(\\boldsymbol{a} \\perp \\boldsymbol{b}\\)，夹角为 \\(\\frac{\\pi}{2}\\)（\\(90°\\)）。"
        },
        {
          "difficulty": "advanced",
          "question": "已知 \\(|\\boldsymbol{a}| = 2\\)，\\(|\\boldsymbol{b}| = 3\\)，\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = -3\\)，求 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角。",
          "answer": "\\(\\cos\\theta = \\frac{\\boldsymbol{a}\\cdot\\boldsymbol{b}}{|\\boldsymbol{a}||\\boldsymbol{b}|} = \\frac{-3}{2\\times 3} = -\\frac{1}{2}\\)，\\(\\theta = \\frac{2\\pi}{3}\\)（\\(120°\\)）。"
        }
      ]
    }
  ]
}
