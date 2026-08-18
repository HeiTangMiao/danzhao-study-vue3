/**
 * 内容页面数据（content-schema 的实例）
 * 页面：绝对值不等式与分式不等式
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-02-03",
  "unitNum": "02",
  "subject": "math",
  "title": "绝对值不等式与分式不等式",
  "subtitle": "绝对值不等式解法与分式不等式转化",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"绝对值不等式与分式不等式\"]\n  N1[\"绝对值不等式\"]\n  N0 --> N1\n  N2[\"|x| < a 型\"]\n  N1 --> N2\n  N3[\"|x| > a 型\"]\n  N1 --> N3\n  N4[\"|ax+b| 形式\"]\n  N1 --> N4\n  N5[\"分式不等式\"]\n  N0 --> N5\n  N6[\"转化为整式\"]\n  N5 --> N6\n  N7[\"注意分母不为零\"]\n  N5 --> N7\n  N8[\"解法规律\"]\n  N0 --> N8\n  N9[\"去绝对值符号\"]\n  N8 --> N9\n  N10[\"等价转化\"]\n  N8 --> N10\n  N11[\"取交集并集\"]\n  N8 --> N11"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握 \\(|ax+b| \\ge c\\) 和 \\(|ax+b| \\le c\\) 型不等式的解法",
        "理解绝对值的几何意义",
        "掌握分式不等式转化为整式不等式的方法",
        "注意分母不为零的隐含条件"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、绝对值的意义",
      "paragraphs": [
        "几何意义：\\(|x|\\) 表示数轴上点 \\(x\\) 到原点的距离；\\(|x-a|\\) 表示点 \\(x\\) 到点 \\(a\\) 的距离。"
      ]
    },
    {
      "type": "formula",
      "title": "绝对值定义",
      "formulas": [
        "|x| = \\begin{cases} x, & x \\ge 0 \\\\ -x, & x < 0 \\end{cases}"
      ]
    },
    {
      "type": "formula",
      "title": "|ax+b| ≥ c 的解法",
      "formulas": [
        "c > 0",
        "|ax+b| \\ge c \\iff ax+b \\ge c \\text{ 或 } ax+b \\le -c",
        "当 \\(c < 0\\) 时：解集为 \\(\\mathbb{R}\\)（绝对值非负，恒大于负数）",
        "c = 0",
        "\\mathbb{R}"
      ]
    },
    {
      "type": "formula",
      "title": "|ax+b| ≤ c 的解法",
      "formulas": [
        "c > 0",
        "|ax+b| \\le c \\iff -c \\le ax+b \\le c",
        "当 \\(c < 0\\) 时：解集为 \\(\\varnothing\\)（绝对值非负，不可能小于负数）",
        "c = 0",
        "\\{x \\mid ax+b = 0\\}"
      ]
    },
    {
      "type": "tip",
      "text": "口诀：\"大于取两边，小于取中间\"——\\(|x| \\ge c\\)（\\(c>0\\)）取两边，\\(|x| \\le c\\)（\\(c>0\\)）取中间。"
    },
    {
      "type": "warning",
      "text": "解 \\(|ax+b| \\le c\\) 时，必须先判断 \\(c\\) 的正负！若 \\(c < 0\\)，解集直接为空集。"
    },
    {
      "type": "knowledge",
      "title": "三、分式不等式的解法",
      "paragraphs": [
        "分式不等式通过转化为整式不等式来求解，核心思想是\"移项通分，化为标准形式\"。"
      ]
    },
    {
      "type": "formula",
      "title": "分式不等式转化",
      "formulas": [
        "\\frac{f(x)}{g(x)} > 0 \\iff f(x) \\cdot g(x) > 0",
        "\\frac{f(x)}{g(x)} < 0 \\iff f(x) \\cdot g(x) < 0",
        "\\frac{f(x)}{g(x)} \\ge 0 \\iff \\begin{cases} f(x) \\cdot g(x) \\ge 0 \\\\ g(x) \\ne 0 \\end{cases}",
        "\\frac{f(x)}{g(x)} \\le 0 \\iff \\begin{cases} f(x) \\cdot g(x) \\le 0 \\\\ g(x) \\ne 0 \\end{cases}"
      ]
    },
    {
      "type": "warning",
      "text": "分式不等式含\"\\(\\ge\\)\"或\"\\(\\le\\)\"时，转化为整式不等式后，必须额外加上分母不为零的条件 \\(g(x) \\ne 0\\)！"
    },
    {
      "type": "formula",
      "title": "三角不等式",
      "formulas": [
        "|a + b| \\le |a| + |b|",
        "|a - b| \\ge ||a| - |b||",
        "（当且仅当 \\(a, b\\) 同号时，\\(|a+b| = |a|+|b|\\)）"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：解绝对值不等式",
          "question": "解不等式：\\(|2x - 3| \\le 5\\)。",
          "solution": "解：\n\n        因为 \\(c = 5 > 0\\)，所以 \\(-5 \\le 2x - 3 \\le 5\\)。\n\n        分别解两个不等式：\n\n        左边：\\(2x - 3 \\ge -5 \\Rightarrow 2x \\ge -2 \\Rightarrow x \\ge -1\\)\n\n        右边：\\(2x - 3 \\le 5 \\Rightarrow 2x \\le 8 \\Rightarrow x \\le 4\\)\n\n        取交集：\\(-1 \\le x \\le 4\\)。\n\n        所以解集为 \\(\\{x \\mid -1 \\le x \\le 4\\}\\)，即 \\([-1, 4]\\)。",
          "answer": "答案：解集为 \\([-1, 4]\\)。"
        },
        {
          "title": "例题2：解分式不等式",
          "question": "解不等式：\\(\\frac{x-1}{x+2} \\le 0\\)。",
          "solution": "解：\n\n        转化为：\\(\\begin{cases} (x-1)(x+2) \\le 0 \\\\ x+2 \\ne 0 \\end{cases}\\)\n\n        解 \\((x-1)(x+2) \\le 0\\)：两根为 \\(x = -2\\) 和 \\(x = 1\\)，\"小于取中间\"，解为 \\(-2 \\le x \\le 1\\)。\n\n        再加上 \\(x \\ne -2\\)（分母不为零）的条件。\n\n        所以解集为 \\(-2 < x \\le 1\\)，即 \\((-2, 1]\\)。",
          "answer": "答案：解集为 \\((-2, 1]\\)。"
        },
        {
          "title": "例题3：综合应用",
          "question": "解不等式：\\(|x - 2| > 3\\)。",
          "solution": "解：\n\n        因为 \\(c = 3 > 0\\)，所以 \\(x - 2 > 3\\) 或 \\(x - 2 < -3\\)。\n\n        ① \\(x - 2 > 3 \\Rightarrow x > 5\\)\n\n        ② \\(x - 2 < -3 \\Rightarrow x < -1\\)\n\n        取并集：\\(x > 5\\) 或 \\(x < -1\\)。\n\n        所以解集为 \\(\\{x \\mid x > 5 \\text{ 或 } x < -1\\}\\)，即 \\((-\\infty, -1) \\cup (5, +\\infty)\\)。",
          "answer": "答案：解集为 \\((-\\infty, -1) \\cup (5, +\\infty)\\)。"
        },
        {
          "title": "例题4：右边为负数的绝对值不等式（易错型）",
          "question": "解不等式：\\(|3x - 1| \\le -2\\)。",
          "solution": "解：\n\n        分析右边的常数：\\(c = -2 < 0\\)。根据绝对值的定义，对任意实数 \\(x\\)，都有 \\(|3x - 1| \\ge 0\\)（绝对值非负）。\n\n        一个非负数不可能小于负数 \\(-2\\)，因此该不等式无解。\n\n        所以解集为 \\(\\varnothing\\)。\n\n        易错提醒：解绝对值不等式时，必须先判断右边常数 \\(c\\) 的正负：\n\n        • 当 \\(c < 0\\) 时，该不等式无解\n        • 切勿机械地套用\"\\(-c \\le ax+b \\le c\\)\"公式，否则会得到错误结论。",
          "answer": "答案：解集为 \\(\\varnothing\\)。"
        },
        {
          "title": "例题5：分式不等式移项通分（综合应用型）",
          "question": "解不等式：\\(\\frac{x+1}{x-1} \\le 2\\)。",
          "solution": "解：\n\n        分式不等式不能直接去分母（因为不确定分母 \\(x-1\\) 的正负），需先移项通分：\n\n        $$\\frac{x+1}{x-1} - 2 \\le 0$$\n\n        通分：\\(\\frac{x+1 - 2(x-1)}{x-1} \\le 0\\)，化简分子：\n\n        $$\\frac{-x + 3}{x - 1} \\le 0$$\n\n        转化为整式不等式（注意分母不为零）：\n\n        $$\\begin{cases} (-x+3)(x-1) \\le 0 \\\\ x - 1 \\ne 0 \\end{cases}$$\n\n        将 \\((-x+3)(x-1) \\le 0\\) 化简为 \\((x-3)(x-1) \\ge 0\\)（两边乘 \\(-1\\) 变号）。\n\n        两根为 \\(x = 1\\) 和 \\(x = 3\\)，开口向上，\"\\(\\ge 0\\) 取两边\"：\\(x \\le 1\\) 或 \\(x \\ge 3\\)。\n\n        再排除 \\(x = 1\\)（分母为零），得解集为 \\(x \\le 1\\) 或 \\(x \\ge 3\\)，且 \\(x \\ne 1\\)。\n\n        所以解集为 \\((-\\infty, 1) \\cup [3, +\\infty)\\)。",
          "answer": "答案：解集为 \\((-\\infty, 1) \\cup [3, +\\infty)\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "不等式 \\(|x - 3| < 2\\) 的解集是______。",
          "answer": "答案：\\((1, 5)\\)。即 \\(-2 < x-3 < 2\\)，解得 \\(1 < x < 5\\)。"
        },
        {
          "difficulty": "basic",
          "question": "不等式 \\(\\frac{2x-1}{x+1} \\ge 0\\) 的解集是______。",
          "answer": "答案：\\(x < -1\\) 或 \\(x \\ge \\frac{1}{2}\\)，即 \\((-\\infty, -1) \\cup [\\frac{1}{2}, +\\infty)\\)。转化为 \\((2x-1)(x+1) \\ge 0\\) 且 \\(x \\ne -1\\)。两根为 \\(x=-1\\) 和 \\(x=\\frac{1}{2}\\)，大于取两边，再排除 \\(x=-1\\)。"
        },
        {
          "difficulty": "medium",
          "question": "不等式 \\(|3x + 1| \\ge 4\\) 的解集是（　）\nA. \\(\\{x \\mid -\\frac{5}{3} \\le x \\le 1\\}\\)\nB. \\(\\{x \\mid x \\le -\\frac{5}{3} \\text{ 或 } x \\ge 1\\}\\)\nC. \\(\\{x \\mid x \\le 1\\}\\)\nD. \\(\\{x \\mid x \\ge -\\frac{5}{3}\\}\\)",
          "answer": "答案：B。\\(3x+1 \\ge 4\\) 或 \\(3x+1 \\le -4\\)，即 \\(x \\ge 1\\) 或 \\(x \\le -\\frac{5}{3}\\)。"
        },
        {
          "difficulty": "medium",
          "question": "不等式 \\(\\frac{x}{x-1} < 1\\) 的解集是______。",
          "answer": "答案：\\(x < 1\\)，即 \\((-\\infty, 1)\\)。移项通分：\\(\\frac{x}{x-1} - 1 < 0 \\Rightarrow \\frac{x-(x-1)}{x-1} < 0 \\Rightarrow \\frac{1}{x-1} < 0\\)，即 \\(x-1 < 0\\)，得 \\(x < 1\\)。"
        },
        {
          "difficulty": "advanced",
          "question": "若 \\(|x - a| < b\\) 的解集为 \\(\\{x \\mid -1 < x < 5\\}\\)，求 \\(a\\) 和 \\(b\\) 的值。",
          "answer": "答案：\\(a = 2\\)，\\(b = 3\\)。\\(|x-a| < b\\) 的解集为 \\(a-b < x < a+b\\)，所以 \\(a-b = -1\\)，\\(a+b = 5\\)，解得 \\(a = 2\\)，\\(b = 3\\)。"
        }
      ]
    }
  ]
}
