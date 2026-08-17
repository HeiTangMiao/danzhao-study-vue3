/**
 * 内容页面数据（content-schema 的实例）
 * 页面：模拟冲刺 · 真题模拟卷（二）（数学）
 * 说明：
 *  - 使用 exam 区块实现计时 + 计分 + 结果页 + 错题入本
 *  - 题型结构：选择题 8×5 + 填空题 7×5 + 解答题 5 道（共 75 分）= 150 分
 *  - 文本中的 LaTeX 公式（\(...\)）由 MathJaxRender 组件渲染
 */
export default {
  id: "math-12-03",
  unitNum: "12",
  subject: "math",
  title: "真题模拟卷（二）",
  subtitle: "全真模拟 · 限时 120 分钟 · 满分 150 分",
  blocks: [
    {
      type: "exam",
      title: "数学真题模拟卷（二）",
      duration: 120,
      totalScore: 150,
      passingScore: 90,
      items: [
        // ===== 一、选择题（每题 5 分，共 40 分） =====
        {
          type: "single", difficulty: "basic", score: 5,
          question: "已知集合 \\(A = \\{x \\mid -1 < x < 3\\}\\)，\\(B = \\{x \\mid x \\ge 0\\}\\)，则 \\(A \\cap B =\\)（　）",
          options: ["\\([0, 3)\\)", "\\((-1, 3)\\)", "\\([0, +\\infty)\\)", "\\((-1, 0)\\)"],
          correctIndex: 0,
          answer: "**A**。\\(A = (-1, 3)\\)，\\(B = [0, +\\infty)\\)，交集 \\([0, 3)\\)。"
        },
        {
          type: "single", difficulty: "basic", score: 5,
          question: "设 \\(a > b\\)，则下列不等式一定成立的是（　）",
          options: ["\\(a^2 > b^2\\)", "\\(a + 1 > b + 1\\)", "\\(\\frac{1}{a} < \\frac{1}{b}\\)", "\\(ac > bc\\)"],
          correctIndex: 1,
          answer: "**B**。不等式两边同加 1 不等号方向不变。其余选项需附加条件（如 \\(a, b\\) 正负、\\(c\\) 符号）。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "函数 \\(f(x) = x^3\\) 在定义域 \\(\\mathbb{R}\\) 上是（　）",
          options: ["奇函数且增函数", "偶函数且增函数", "奇函数且减函数", "偶函数且减函数"],
          correctIndex: 0,
          answer: "**A**。\\(f(-x) = (-x)^3 = -x^3 = -f(x)\\) 为奇函数；\\(x^3\\) 在 \\(\\mathbb{R}\\) 上单调递增。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "\\(\\sin 120^\\circ =\\)（　）",
          options: ["\\(\\frac{\\sqrt{3}}{2}\\)", "\\(\\frac{1}{2}\\)", "\\(-\\frac{\\sqrt{3}}{2}\\)", "\\(-\\frac{1}{2}\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\sin 120^\\circ = \\sin(180^\\circ - 60^\\circ) = \\sin 60^\\circ = \\frac{\\sqrt{3}}{2}\\)。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "等比数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 2\\)，\\(q = 3\\)，则 \\(a_4 =\\)（　）",
          options: ["54", "18", "27", "162"],
          correctIndex: 0,
          answer: "**A**。\\(a_4 = a_1 q^3 = 2 \\times 27 = 54\\)。"
        },
        {
          type: "single", difficulty: "advanced", score: 5,
          question: "已知向量 \\(\\vec{a} = (2, -1)\\)，\\(\\vec{b} = (1, 3)\\)，则 \\(\\vec{a} \\cdot \\vec{b} =\\)（　）",
          options: ["\\(-1\\)", "1", "5", "\\(-5\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\vec{a} \\cdot \\vec{b} = 2 \\times 1 + (-1) \\times 3 = 2 - 3 = -1\\)。"
        },
        {
          type: "single", difficulty: "advanced", score: 5,
          question: "从 0, 1, 2, 3 四个数字中任取两个组成两位数（数字不重复），共有（　）个",
          options: ["9", "12", "6", "16"],
          correctIndex: 0,
          answer: "**A**。十位不能为 0，有 3 种选择；个位从剩余 3 个数字中选，有 3 种。共 \\(3 \\times 3 = 9\\) 个。"
        },
        {
          type: "single", difficulty: "sprint", score: 5,
          question: "双曲线 \\(\\frac{x^2}{9} - \\frac{y^2}{16} = 1\\) 的渐近线方程为（　）",
          options: ["\\(y = \\pm \\frac{4}{3}x\\)", "\\(y = \\pm \\frac{3}{4}x\\)", "\\(y = \\pm \\frac{16}{9}x\\)", "\\(y = \\pm \\frac{9}{16}x\\)"],
          correctIndex: 0,
          answer: "**A**。\\(a^2 = 9\\)，\\(b^2 = 16\\)，渐近线 \\(y = \\pm \\frac{b}{a}x = \\pm \\frac{4}{3}x\\)。"
        },
        // ===== 二、填空题（每题 5 分，共 35 分） =====
        {
          type: "fill", difficulty: "basic", score: 5,
          question: "计算：\\(\\log_3 9 =\\) ______。",
          answer: "\\(\\log_3 9 = 2\\)（因为 \\(3^2 = 9\\)）。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "已知 \\(f(x) = 3x - 1\\)，则 \\(f(2) =\\) ______。",
          answer: "\\(f(2) = 3 \\times 2 - 1 = 5\\)。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "等差数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 1\\)，\\(d = 2\\)，则前 5 项和 \\(S_5 =\\) ______。",
          answer: "\\(S_5 = 5 \\times 1 + \\frac{5 \\times 4}{2} \\times 2 = 5 + 20 = 25\\)。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "函数 \\(y = \\cos 3x\\) 的最小正周期为 ______。",
          answer: "\\(T = \\frac{2\\pi}{3}\\)。"
        },
        {
          type: "fill", difficulty: "advanced", score: 5,
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 5\\)，\\(b = 7\\)，\\(\\angle C = 60^\\circ\\)，则边 \\(c =\\) ______。",
          answer: "由余弦定理 \\(c^2 = 25 + 49 - 2 \\times 5 \\times 7 \\times \\frac{1}{2} = 74 - 35 = 39\\)，故 \\(c = \\sqrt{39}\\)。"
        },
        {
          type: "fill", difficulty: "advanced", score: 5,
          question: "直线 \\(2x - y + 1 = 0\\) 的斜率为 ______。",
          answer: "化为 \\(y = 2x + 1\\)，斜率 \\(k = 2\\)。"
        },
        {
          type: "fill", difficulty: "sprint", score: 5,
          question: "已知 \\((2x - 1)^4\\) 的展开式中常数项为 ______。",
          answer: "通项 \\(T_{r+1} = C_4^r (2x)^{4-r} (-1)^r\\)，常数项需 \\(4 - r = 0\\) 即 \\(r = 4\\)，\\(T_5 = C_4^4 (2x)^0 (-1)^4 = 1\\)。"
        },
        // ===== 三、解答题（共 75 分） =====
        {
          type: "solve", difficulty: "medium", score: 15,
          question: "已知集合 \\(A = \\{x \\mid x^2 - 4x + 3 > 0\\}\\)，\\(B = \\{x \\mid -1 \\le x \\le 2\\}\\)。\n（1）求集合 \\(A\\)；\n（2）求 \\(A \\cap B\\)。",
          answer: "**解：**\n（1）\\(x^2 - 4x + 3 = (x-1)(x-3) > 0\\)，解得 \\(x < 1\\) 或 \\(x > 3\\)，即 \\(A = (-\\infty, 1) \\cup (3, +\\infty)\\)。\n（2）\\(A \\cap B = [(-\\infty, 1) \\cup (3, +\\infty)] \\cap [-1, 2] = [-1, 1)\\)。"
        },
        {
          type: "solve", difficulty: "medium", score: 15,
          question: "已知函数 \\(f(x) = \\frac{2x - 1}{x + 1}\\)。\n（1）求 \\(f(x)\\) 的定义域；\n（2）证明 \\(f(x)\\) 在 \\((0, +\\infty)\\) 上单调递增。",
          answer: "**解：**\n（1）分母 \\(x + 1 \\ne 0\\)，定义域为 \\(\\{x \\mid x \\ne -1\\}\\)。\n（2）任取 \\(0 < x_1 < x_2\\)，\\(f(x_2) - f(x_1) = \\frac{2x_2 - 1}{x_2 + 1} - \\frac{2x_1 - 1}{x_1 + 1} = \\frac{3(x_2 - x_1)}{(x_2 + 1)(x_1 + 1)}\\)。\n因 \\(x_2 - x_1 > 0\\) 且 \\((x_2 + 1)(x_1 + 1) > 0\\)，故 \\(f(x_2) - f(x_1) > 0\\)，即 \\(f(x)\\) 在 \\((0, +\\infty)\\) 上单调递增。"
        },
        {
          type: "solve", difficulty: "advanced", score: 15,
          question: "已知数列 \\(\\{a_n\\}\\) 是等差数列，\\(a_1 = 3\\)，\\(a_3 = 7\\)。\n（1）求通项公式 \\(a_n\\)；\n（2）求前 \\(n\\) 项和 \\(S_n\\)，并求 \\(S_{10}\\)。",
          answer: "**解：**\n（1）\\(a_3 = a_1 + 2d\\)，即 \\(7 = 3 + 2d\\)，得 \\(d = 2\\)。\\(a_n = 3 + (n-1) \\times 2 = 2n + 1\\)。\n（2）\\(S_n = \\frac{n(a_1 + a_n)}{2} = \\frac{n(3 + 2n + 1)}{2} = n(n + 2)\\)。\n\\(S_{10} = 10 \\times 12 = 120\\)。"
        },
        {
          type: "solve", difficulty: "advanced", score: 15,
          question: "已知函数 \\(f(x) = 2\\sin x\\cos x + \\cos 2x\\)。\n（1）化简 \\(f(x)\\) 为 \\(A\\sin(\\omega x + \\varphi)\\) 的形式；\n（2）求 \\(f(x)\\) 的最大值及取得最大值时 \\(x\\) 的取值集合。",
          answer: "**解：**\n（1）\\(2\\sin x\\cos x = \\sin 2x\\)，故 \\(f(x) = \\sin 2x + \\cos 2x = \\sqrt{2}\\sin(2x + \\frac{\\pi}{4})\\)。\n（2）最大值为 \\(\\sqrt{2}\\)。当 \\(2x + \\frac{\\pi}{4} = \\frac{\\pi}{2} + 2k\\pi\\)，即 \\(x = \\frac{\\pi}{8} + k\\pi\\)（\\(k \\in \\mathbb{Z}\\)）时取得最大值。"
        },
        {
          type: "solve", difficulty: "sprint", score: 15,
          question: "已知直线 \\(l: y = kx + 1\\) 与圆 \\(x^2 + y^2 = 4\\)。\n（1）当 \\(k = 1\\) 时，判断直线与圆的位置关系；\n（2）若直线与圆相切，求 \\(k\\) 的值。",
          answer: "**解：**\n（1）圆心 \\((0,0)\\)，半径 \\(r = 2\\)。\\(k = 1\\) 时直线 \\(x - y + 1 = 0\\)，圆心到直线距离 \\(d = \\frac{|0-0+1|}{\\sqrt{1^2+1^2}} = \\frac{1}{\\sqrt{2}} < 2\\)，故直线与圆相交。\n（2）相切条件 \\(d = r\\)：\\(\\frac{|0 - 0 + 1|}{\\sqrt{k^2 + 1}} = 2\\)，即 \\(\\frac{1}{\\sqrt{k^2+1}} = 2\\)，\\(k^2 + 1 = \\frac{1}{4}\\)，\\(k^2 = -\\frac{3}{4}\\) 无实数解。\n故不存在实数 \\(k\\) 使直线与圆相切（直线恒过点 \\((0,1)\\) 在圆内）。"
        }
      ]
    }
  ]
}
