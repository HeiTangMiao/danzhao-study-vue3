/**
 * 内容页面数据（content-schema 的实例）
 * 页面：模拟冲刺 · 真题模拟卷（一）（数学）
 * 说明：
 *  - 使用 exam 区块实现计时 + 计分 + 结果页 + 错题入本
 *  - 题型结构：选择题 8×5 + 填空题 7×5 + 解答题 5 道（共 75 分）= 150 分
 *  - 文本中的 LaTeX 公式（\(...\)）由 MathJaxRender 组件渲染
 */
export default {
  id: "math-12-02",
  unitNum: "12",
  subject: "math",
  title: "真题模拟卷（一）",
  subtitle: "全真模拟 · 限时 120 分钟 · 满分 150 分",
  blocks: [
    {
      type: "exam",
      title: "数学真题模拟卷（一）",
      duration: 120,
      totalScore: 150,
      passingScore: 90,
      items: [
        // ===== 一、选择题（每题 5 分，共 40 分） =====
        {
          type: "single", difficulty: "basic", score: 5,
          question: "已知集合 \\(A = \\{1, 2, 3\\}\\)，\\(B = \\{2, 3, 4\\}\\)，则 \\(A \\cup B =\\)（　）",
          options: ["\\(\\{1, 2, 3, 4\\}\\)", "\\(\\{2, 3\\}\\)", "\\(\\{1, 4\\}\\)", "\\(\\{1, 2, 3\\}\\)"],
          correctIndex: 0,
          answer: "**A**。\\(A \\cup B = \\{1,2,3\\} \\cup \\{2,3,4\\} = \\{1,2,3,4\\}\\)。"
        },
        {
          type: "single", difficulty: "basic", score: 5,
          question: "不等式 \\(x^2 - x - 6 \\le 0\\) 的解集为（　）",
          options: ["\\([-2, 3]\\)", "\\((-\\infty, -2] \\cup [3, +\\infty)\\)", "\\([-3, 2]\\)", "\\((-\\infty, -3] \\cup [2, +\\infty)\\)"],
          correctIndex: 0,
          answer: "**A**。\\((x-3)(x+2) \\le 0\\)，解得 \\(-2 \\le x \\le 3\\)。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "函数 \\(f(x) = \\frac{1}{\\sqrt{x-1}}\\) 的定义域为（　）",
          options: ["\\((1, +\\infty)\\)", "\\([1, +\\infty)\\)", "\\((0, +\\infty)\\)", "\\((-\\infty, 1)\\)"],
          correctIndex: 0,
          answer: "**A**。根号下 \\(x-1 > 0\\)（分母不能为 0），即 \\(x > 1\\)。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "已知 \\(\\sin\\alpha = \\frac{3}{5}\\)，且 \\(\\alpha\\) 为第二象限角，则 \\(\\cos\\alpha =\\)（　）",
          options: ["\\(-\\frac{4}{5}\\)", "\\(\\frac{4}{5}\\)", "\\(-\\frac{3}{4}\\)", "\\(\\frac{3}{4}\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = \\frac{16}{25}\\)，第二象限 \\(\\cos\\alpha < 0\\)，故 \\(\\cos\\alpha = -\\frac{4}{5}\\)。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "等差数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 2\\)，\\(a_3 = 8\\)，则公差 \\(d =\\)（　）",
          options: ["3", "2", "4", "6"],
          correctIndex: 0,
          answer: "**A**。\\(a_3 = a_1 + 2d\\)，即 \\(8 = 2 + 2d\\)，解得 \\(d = 3\\)。"
        },
        {
          type: "single", difficulty: "advanced", score: 5,
          question: "已知向量 \\(\\vec{a} = (1, 2)\\)，\\(\\vec{b} = (x, 4)\\)，若 \\(\\vec{a} \\perp \\vec{b}\\)，则 \\(x =\\)（　）",
          options: ["\\(-8\\)", "8", "\\(-2\\)", "2"],
          correctIndex: 0,
          answer: "**A**。\\(\\vec{a} \\cdot \\vec{b} = x + 8 = 0\\)，解得 \\(x = -8\\)。"
        },
        {
          type: "single", difficulty: "advanced", score: 5,
          question: "从 5 名同学中选出 2 名参加比赛，不同的选法共有（　）种",
          options: ["10", "20", "5", "25"],
          correctIndex: 0,
          answer: "**A**。\\(C_5^2 = \\frac{5 \\times 4}{2} = 10\\) 种。"
        },
        {
          type: "single", difficulty: "sprint", score: 5,
          question: "椭圆 \\(\\frac{x^2}{16} + \\frac{y^2}{9} = 1\\) 的焦距为（　）",
          options: ["\\(2\\sqrt{7}\\)", "\\(\\sqrt{7}\\)", "7", "14"],
          correctIndex: 0,
          answer: "**A**。\\(a^2 = 16\\)，\\(b^2 = 9\\)，\\(c^2 = a^2 - b^2 = 7\\)，焦距 \\(2c = 2\\sqrt{7}\\)。"
        },
        // ===== 二、填空题（每题 5 分，共 35 分） =====
        {
          type: "fill", difficulty: "basic", score: 5,
          question: "计算：\\(2^3 \\times 2^{-1} =\\) ______。",
          answer: "\\(2^{3-1} = 2^2 = 4\\)。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "已知 \\(\\log_2 8 = a\\)，则 \\(a =\\) ______。",
          answer: "\\(a = 3\\)（因为 \\(2^3 = 8\\)）。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "等比数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 1\\)，公比 \\(q = 2\\)，则前 5 项和 \\(S_5 =\\) ______。",
          answer: "\\(S_5 = \\frac{1 \\times (1 - 2^5)}{1 - 2} = 31\\)。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "函数 \\(y = \\sin 2x\\) 的最小正周期为 ______。",
          answer: "\\(T = \\frac{2\\pi}{2} = \\pi\\)。"
        },
        {
          type: "fill", difficulty: "advanced", score: 5,
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 3\\)，\\(b = 4\\)，\\(\\angle C = 90^\\circ\\)，则 \\(c =\\) ______。",
          answer: "由勾股定理 \\(c = \\sqrt{3^2 + 4^2} = 5\\)。"
        },
        {
          type: "fill", difficulty: "advanced", score: 5,
          question: "圆 \\(x^2 + y^2 = 4\\) 的圆心到直线 \\(x + y = 2\\) 的距离为 ______。",
          answer: "圆心 \\((0,0)\\)，距离 \\(d = \\frac{|0+0-2|}{\\sqrt{1^2+1^2}} = \\frac{2}{\\sqrt{2}} = \\sqrt{2}\\)。"
        },
        {
          type: "fill", difficulty: "sprint", score: 5,
          question: "已知 \\((1 + x)^5\\) 的展开式中 \\(x^2\\) 项的系数为 ______。",
          answer: "\\(C_5^2 = 10\\)。"
        },
        // ===== 三、解答题（共 75 分） =====
        {
          type: "solve", difficulty: "medium", score: 15,
          question: "已知集合 \\(A = \\{x \\mid x^2 - 3x + 2 \\le 0\\}\\)，\\(B = \\{x \\mid x > 1\\}\\)。\n（1）求集合 \\(A\\)；\n（2）求 \\(A \\cap B\\) 与 \\(A \\cup B\\)。",
          answer: "**解：**\n（1）\\(x^2 - 3x + 2 = (x-1)(x-2) \\le 0\\)，解得 \\(1 \\le x \\le 2\\)，即 \\(A = [1, 2]\\)。\n（2）\\(A \\cap B = [1, 2] \\cap (1, +\\infty) = (1, 2]\\)；\\(A \\cup B = [1, 2] \\cup (1, +\\infty) = [1, +\\infty)\\)。"
        },
        {
          type: "solve", difficulty: "medium", score: 15,
          question: "已知函数 \\(f(x) = 2x^2 - 4x + 1\\)。\n（1）求 \\(f(x)\\) 的对称轴与顶点坐标；\n（2）求 \\(f(x)\\) 在区间 \\([0, 3]\\) 上的最大值与最小值。",
          answer: "**解：**\n（1）\\(f(x) = 2(x^2 - 2x) + 1 = 2(x-1)^2 - 1\\)，对称轴 \\(x = 1\\)，顶点 \\((1, -1)\\)。\n（2）对称轴 \\(x = 1 \\in [0, 3]\\)，最小值 \\(f(1) = -1\\)。\\(f(0) = 1\\)，\\(f(3) = 18 - 12 + 1 = 7\\)，最大值 \\(f(3) = 7\\)。所以最大值为 7，最小值为 -1。"
        },
        {
          type: "solve", difficulty: "advanced", score: 15,
          question: "已知数列 \\(\\{a_n\\}\\) 满足 \\(a_1 = 1\\)，\\(a_{n+1} = 2a_n + 1\\)。\n（1）求 \\(a_2\\)，\\(a_3\\)；\n（2）证明数列 \\(\\{a_n + 1\\}\\) 是等比数列，并求 \\(a_n\\) 的通项公式。",
          answer: "**解：**\n（1）\\(a_2 = 2 \\times 1 + 1 = 3\\)，\\(a_3 = 2 \\times 3 + 1 = 7\\)。\n（2）\\(a_{n+1} + 1 = 2a_n + 2 = 2(a_n + 1)\\)，所以 \\(\\{a_n + 1\\}\\) 是以 \\(a_1 + 1 = 2\\) 为首项、2 为公比的等比数列。\n故 \\(a_n + 1 = 2 \\times 2^{n-1} = 2^n\\)，即 \\(a_n = 2^n - 1\\)。"
        },
        {
          type: "solve", difficulty: "advanced", score: 15,
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 7\\)，\\(b = 8\\)，\\(\\cos C = \\frac{1}{7}\\)。\n（1）求边 \\(c\\)；\n（2）求 \\(\\triangle ABC\\) 的面积。",
          answer: "**解：**\n（1）由余弦定理 \\(c^2 = a^2 + b^2 - 2ab\\cos C = 49 + 64 - 2 \\times 7 \\times 8 \\times \\frac{1}{7} = 113 - 16 = 97\\)，故 \\(c = \\sqrt{97}\\)。\n（2）\\(\\sin C = \\sqrt{1 - \\cos^2 C} = \\sqrt{1 - \\frac{1}{49}} = \\frac{4\\sqrt{3}}{7}\\)，面积 \\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2} \\times 7 \\times 8 \\times \\frac{4\\sqrt{3}}{7} = 16\\sqrt{3}\\)。"
        },
        {
          type: "solve", difficulty: "sprint", score: 15,
          question: "已知椭圆 \\(\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1\\)（\\(a > b > 0\\)）过点 \\((2, 0)\\)，且离心率 \\(e = \\frac{\\sqrt{3}}{2}\\)。\n（1）求椭圆的标准方程；\n（2）求椭圆的长轴长与焦距。",
          answer: "**解：**\n（1）椭圆过 \\((2, 0)\\)，故 \\(a = 2\\)。离心率 \\(e = \\frac{c}{a} = \\frac{\\sqrt{3}}{2}\\)，得 \\(c = \\sqrt{3}\\)。\n\\(b^2 = a^2 - c^2 = 4 - 3 = 1\\)，所以椭圆方程为 \\(\\frac{x^2}{4} + y^2 = 1\\)。\n（2）长轴长 \\(2a = 4\\)，焦距 \\(2c = 2\\sqrt{3}\\)。"
        }
      ]
    }
  ]
}
