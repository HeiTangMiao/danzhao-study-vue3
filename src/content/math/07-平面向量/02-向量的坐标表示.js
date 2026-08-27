/**
 * 内容页面数据（content-schema 的实例）
 * 页面：向量的坐标表示
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-07-02",
  "unitNum": "07",
  "subject": "math",
  "title": "向量的坐标表示",
  "subtitle": "坐标运算、模公式与共线条件",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解平面向量基本定理，掌握向量的坐标表示",
        "熟练掌握向量的坐标运算（加法、减法、数乘）",
        "掌握向量模的坐标公式和中点坐标公式",
        "掌握共线向量的坐标条件，能判断两向量是否共线"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"向量的坐标表示\"]\n  N1[\"平面向量基本定理\"]\n  N0 --> N1\n  N2[\"基底 e1 e2 不共线\"]\n  N1 --> N2\n  N3[\"a = lambda1 e1 + lambda2 e2\"]\n  N1 --> N3\n  N4[\"坐标表示\"]\n  N0 --> N4\n  N5[\"a = xi + yj\"]\n  N4 --> N5\n  N6[\"a = x y\"]\n  N4 --> N6\n  N7[\"AB = x2-x1 y2-y1\"]\n  N4 --> N7\n  N8[\"坐标运算\"]\n  N0 --> N8\n  N9[\"加法 x1+x2 y1+y2\"]\n  N8 --> N9\n  N10[\"减法 x1-x2 y1-y2\"]\n  N8 --> N10\n  N11[\"数乘 lambda x lambda y\"]\n  N8 --> N11\n  N12[\"模公式\"]\n  N0 --> N12\n  N13[\"a = sqrt x2+y2\"]\n  N12 --> N13\n  N14[\"AB 距离公式\"]\n  N12 --> N14\n  N15[\"中点坐标公式\"]\n  N0 --> N15\n  N16[\"x1+x2 2 y1+y2 2\"]\n  N15 --> N16\n  N17[\"共线条件\"]\n  N0 --> N17\n  N18[\"x1 y2 - x2 y1 = 0\"]\n  N17 --> N18"
    },
    {
      "type": "knowledge",
      "title": "一、平面向量基本定理",
      "paragraphs": [
        "如果 \\(\\boldsymbol{e_1}\\)、\\(\\boldsymbol{e_2}\\) 是同一平面内两个不共线的向量，那么对于这一平面内的任一向量 \\(\\boldsymbol{a}\\)，有且只有一对实数 \\(\\lambda_1\\)、\\(\\lambda_2\\)，使："
      ]
    },
    {
      "type": "formula",
      "title": "平面向量基本定理",
      "formulas": [
        "\\boldsymbol{e_1}",
        "\\boldsymbol{e_2}"
      ]
    },
    {
      "type": "knowledge",
      "title": "二、向量的坐标表示",
      "paragraphs": [
        "在平面直角坐标系中，取与 \\(x\\) 轴、\\(y\\) 轴方向相同的两个单位向量 \\(\\boldsymbol{i}\\)、\\(\\boldsymbol{j}\\) 作为基底，则平面内任一向量 \\(\\boldsymbol{a}\\) 可表示为："
      ]
    },
    {
      "type": "formula",
      "title": "坐标表示",
      "formulas": [
        "(x, y)",
        "\\boldsymbol{a}"
      ]
    },
    {
      "type": "tip",
      "text": "若 \\(A(x_1, y_1)\\)，\\(B(x_2, y_2)\\)，则 \\(\\overrightarrow{AB} = (x_2 - x_1, y_2 - y_1)\\)。"
    },
    {
      "type": "formula",
      "title": "坐标运算公式",
      "formulas": [
        "\\boldsymbol{a} = (x_1, y_1)",
        "\\boldsymbol{b} = (x_2, y_2)",
        "\\lambda \\in \\mathbb{R}",
        "\\boldsymbol{a} + \\boldsymbol{b} = (x_1 + x_2, y_1 + y_2)",
        "\\boldsymbol{a} - \\boldsymbol{b} = (x_1 - x_2, y_1 - y_2)",
        "\\lambda\\boldsymbol{a} = (\\lambda x_1, \\lambda y_1)"
      ]
    },
    {
      "type": "formula",
      "title": "模的公式",
      "formulas": [
        "\\boldsymbol{a} = (x, y)",
        "A(x_1, y_1)",
        "B(x_2, y_2)"
      ]
    },
    {
      "type": "formula",
      "title": "中点坐标公式",
      "formulas": [
        "A(x_1, y_1)",
        "B(x_2, y_2)",
        "AB",
        "M"
      ]
    },
    {
      "type": "knowledge",
      "title": "六、共线向量定理（坐标形式）",
      "paragraphs": [
        "推导过程（共线条件 \\(x_1 y_2 - x_2 y_1 = 0\\)）：\n\n      设 \\(\\boldsymbol{a} = (x_1, y_1)\\)，\\(\\boldsymbol{b} = (x_2, y_2) \\neq \\boldsymbol{0}\\)。\n\n      ① 必要性（\\(\\boldsymbol{a} \\parallel \\boldsymbol{b} \\Rightarrow x_1 y_2 - x_2 y_1 = 0\\)）：若 \\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)，则存在实数 \\(\\lambda\\) 使 \\(\\boldsymbol{a} = \\lambda\\boldsymbol{b}\\)，即 \\((x_1, y_1) = (\\lambda x_2, \\lambda y_2)\\)。所以 \\(x_1 = \\lambda x_2\\)，\\(y_1 = \\lambda y_2\\)，两式分别乘以 \\(y_2\\)、\\(x_2\\) 后相减：\n\n      $$x_1 y_2 - x_2 y_1 = \\lambda x_2 y_2 - \\lambda x_2 y_2 = 0$$\n\n      ② 充分性（\\(x_1 y_2 - x_2 y_1 = 0 \\Rightarrow \\boldsymbol{a} \\parallel \\boldsymbol{b}\\)）：因 \\(\\boldsymbol{b} \\neq \\boldsymbol{0}\\)，不妨设 \\(x_2 \\neq 0\\)（若 \\(x_2 = 0\\) 则 \\(y_2 \\neq 0\\)，同理可证）。取 \\(\\lambda = \\dfrac{x_1}{x_2}\\)，则 \\(x_1 = \\lambda x_2\\)；由 \\(x_1 y_2 - x_2 y_1 = 0\\) 得 \\(y_1 = \\dfrac{x_1 y_2}{x_2} = \\lambda y_2\\)，故 \\(\\boldsymbol{a} = \\lambda\\boldsymbol{b}\\)，即 \\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)。\n\n      关键思想：把\"向量共线\"翻译为\"坐标成比例 \\(\\dfrac{x_1}{x_2} = \\dfrac{y_1}{y_2}\\)\"。为避免分母为零的讨论，交叉相乘改写为 \\(x_1 y_2 - x_2 y_1 = 0\\)，这正是二维叉积（行列式）为零的几何意义——两向量张成的平行四边形面积为零。"
      ]
    },
    {
      "type": "formula",
      "title": "共线条件",
      "formulas": [
        "设 \\(\\boldsymbol{a} = (x_1, y_1)\\)，\\(\\boldsymbol{b} = (x_2, y_2)\\)（\\(\\boldsymbol{b} \\neq \\boldsymbol{0}\\)），则："
      ]
    },
    {
      "type": "warning",
      "text": "共线条件 \\(x_1 y_2 - x_2 y_1 = 0\\) 是充要条件。注意此条件也包含了 \\(\\boldsymbol{a} = \\boldsymbol{0}\\) 的情况。"
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：坐标运算",
          "question": "已知 \\(\\boldsymbol{a} = (2, 3)\\)，\\(\\boldsymbol{b} = (-1, 4)\\)，求 \\(\\boldsymbol{a} + \\boldsymbol{b}\\)、\\(\\boldsymbol{a} - \\boldsymbol{b}\\) 和 \\(2\\boldsymbol{a} - 3\\boldsymbol{b}\\)。",
          "solution": "解：\n\n        \\(\\boldsymbol{a} + \\boldsymbol{b} = (2 + (-1), 3 + 4) = (1, 7)\\)\n\n        \\(\\boldsymbol{a} - \\boldsymbol{b} = (2 - (-1), 3 - 4) = (3, -1)\\)\n\n        \\(2\\boldsymbol{a} - 3\\boldsymbol{b} = 2(2, 3) - 3(-1, 4) = (4, 6) - (-3, 12) = (4+3, 6-12) = (7, -6)\\)",
          "answer": "\\(\\boldsymbol{a}+\\boldsymbol{b}=(1,7)\\)，\\(\\boldsymbol{a}-\\boldsymbol{b}=(3,-1)\\)，\\(2\\boldsymbol{a}-3\\boldsymbol{b}=(7,-6)\\)"
        },
        {
          "title": "例题2：判断共线",
          "question": "已知 \\(\\boldsymbol{a} = (3, 6)\\)，\\(\\boldsymbol{b} = (1, 2)\\)，判断 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 是否共线。若共线，求 \\(\\boldsymbol{a} = \\lambda\\boldsymbol{b}\\) 中的 \\(\\lambda\\)。",
          "solution": "解：\n\n        由共线条件：\\(x_1 y_2 - x_2 y_1 = 3 \\times 2 - 1 \\times 6 = 6 - 6 = 0\\)\n\n        所以 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 共线。\n\n        设 \\(\\boldsymbol{a} = \\lambda\\boldsymbol{b}\\)，即 \\((3, 6) = \\lambda(1, 2) = (\\lambda, 2\\lambda)\\)\n\n        所以 \\(\\lambda = 3\\)（且 \\(2\\lambda = 6\\)，一致）",
          "answer": "\\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 共线，\\(\\lambda = 3\\)"
        },
        {
          "title": "例题3：求坐标",
          "question": "已知点 \\(A(1, 2)\\)，\\(B(3, -2)\\)，点 \\(P\\) 满足 \\(\\overrightarrow{AP} = 2\\overrightarrow{PB}\\)，求点 \\(P\\) 的坐标。",
          "solution": "解：\n\n        设 \\(P(x, y)\\)，则 \\(\\overrightarrow{AP} = (x - 1, y - 2)\\)，\\(\\overrightarrow{PB} = (3 - x, -2 - y)\\)\n\n        由 \\(\\overrightarrow{AP} = 2\\overrightarrow{PB}\\)：\n\n        \\((x - 1, y - 2) = 2(3 - x, -2 - y)\\)\n\n        即：\\(x - 1 = 2(3 - x) = 6 - 2x\\)，解得 \\(3x = 7\\)，\\(x = \\frac{7}{3}\\)\n\n        \\(y - 2 = 2(-2 - y) = -4 - 2y\\)，解得 \\(3y = -2\\)，\\(y = -\\frac{2}{3}\\)\n\n        所以 \\(P\\left(\\frac{7}{3}, -\\frac{2}{3}\\right)\\)",
          "answer": "\\(P\\left(\\frac{7}{3}, -\\frac{2}{3}\\right)\\)"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "已知 \\(\\boldsymbol{a} = (1, -2)\\)，\\(\\boldsymbol{b} = (3, 5)\\)，求 \\(\\boldsymbol{a} + 2\\boldsymbol{b}\\)。",
          "answer": "\\(\\boldsymbol{a} + 2\\boldsymbol{b} = (1, -2) + 2(3, 5) = (1, -2) + (6, 10) = (7, 8)\\)"
        },
        {
          "difficulty": "basic",
          "question": "已知 \\(A(2, 1)\\)，\\(B(-1, 3)\\)，求 \\(\\overrightarrow{AB}\\) 和 \\(|\\overrightarrow{AB}|\\)。",
          "answer": "\\(\\overrightarrow{AB} = (-1-2, 3-1) = (-3, 2)\\)，\\(|\\overrightarrow{AB}| = \\sqrt{(-3)^2+2^2} = \\sqrt{9+4} = \\sqrt{13}\\)"
        },
        {
          "difficulty": "medium",
          "question": "判断向量 \\(\\boldsymbol{a} = (2, 4)\\) 与 \\(\\boldsymbol{b} = (-1, -2)\\) 是否共线。",
          "answer": "\\(x_1 y_2 - x_2 y_1 = 2 \\times (-2) - (-1) \\times 4 = -4 + 4 = 0\\)，所以 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 共线。"
        },
        {
          "difficulty": "medium",
          "question": "已知点 \\(A(-2, 3)\\)，\\(B(4, -1)\\)，求线段 \\(AB\\) 的中点 \\(M\\) 的坐标。",
          "answer": "\\(M = \\left(\\frac{-2+4}{2}, \\frac{3+(-1)}{2}\\right) = (1, 1)\\)"
        },
        {
          "difficulty": "advanced",
          "question": "已知 \\(\\boldsymbol{a} = (2, 1)\\)，\\(\\boldsymbol{b} = (m, 3)\\)，若 \\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)，求 \\(m\\) 的值。",
          "answer": "由共线条件：\\(2 \\times 3 - m \\times 1 = 0\\)，\\(6 - m = 0\\)，\\(m = 6\\)。"
        }
      ]
    }
  ]
}
