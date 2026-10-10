/**
 * 内容页面数据（content-schema 的实例）
 * 页面：模拟冲刺 · 真题模拟卷（三）（数学）
 * 说明：
 *  - 使用 exam 区块实现计时 + 计分 + 结果页 + 错题入本
 *  - 题型结构：选择题 8×5 + 填空题 7×5 + 解答题 5 道（共 75 分）= 150 分
 *  - 覆盖集合、不等式、函数、三角、数列、向量、概率、解析几何八大主干
 *  - 文本中的 LaTeX 公式由 MathJaxRender 组件渲染
 */
export default {
  blocks: [
    {
      type: "exam",
      title: "数学真题模拟卷（三）",
      duration: 120,
      totalScore: 150,
      passingScore: 90,
      items: [
        {
          type: "single", difficulty: "basic", score: 5,
          question: "已知集合 \\(A = \\{x \\mid x^2 - 4 \\le 0\\}\\)，\\(B = \\{x \\mid x > 1\\}\\)，则 \\(A \\cap B =\\)（　）",
          options: ["\\((1, 2]\\)", "\\([-2, 2]\\)", "\\((1, +\\infty)\\)", "\\([-2, 1)\\)"],
          correctIndex: 0,
          answer: "**A**。\\(A = [-2, 2]\\)，\\(B = (1, +\\infty)\\)，交集为 \\((1, 2]\\)。"
        },
        {
          type: "single", difficulty: "basic", score: 5,
          question: "不等式 \\(|x - 1| > 2\\) 的解集是（　）",
          options: ["\\((-\\infty, -1) \\cup (3, +\\infty)\\)", "\\((-1, 3)\\)", "\\((3, +\\infty)\\)", "\\((-\\infty, -1)\\)"],
          correctIndex: 0,
          answer: "**A**。\\(x - 1 > 2\\) 或 \\(x - 1 < -2\\)，即 \\(x > 3\\) 或 \\(x < -1\\)。"
        },
        {
          type: "single", difficulty: "basic", score: 5,
          question: "函数 \\(f(x) = \\log_2(x - 1)\\) 的定义域是（　）",
          options: ["\\((1, +\\infty)\\)", "\\([1, +\\infty)\\)", "\\((0, +\\infty)\\)", "\\((-\\infty, 1)\\)"],
          correctIndex: 0,
          answer: "**A**。真数须大于 0，即 \\(x - 1 > 0\\)，得 \\(x > 1\\)。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "已知 \\(\\cos\\alpha = \\frac{1}{3}\\)，且 \\(\\alpha\\) 为第四象限角，则 \\(\\sin\\alpha =\\)（　）",
          options: ["\\(-\\frac{2\\sqrt{2}}{3}\\)", "\\(\\frac{2\\sqrt{2}}{3}\\)", "\\(-\\frac{1}{3}\\)", "\\(\\frac{2\\sqrt{2}}{9}\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\sin\\alpha = -\\sqrt{1 - \\frac{1}{9}} = -\\frac{2\\sqrt{2}}{3}\\)（第四象限正弦为负）。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "等比数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 1\\)，\\(a_4 = 8\\)，则公比 \\(q =\\)（　）",
          options: ["2", "3", "4", "\\(\\frac{1}{2}\\)"],
          correctIndex: 0,
          answer: "**A**。\\(q^3 = \\frac{a_4}{a_1} = 8\\)，故 \\(q = 2\\)。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "已知向量 \\(\\vec{a} = (2, 1)\\)，\\(\\vec{b} = (1, -2)\\)，则 \\(\\vec{a}\\) 与 \\(\\vec{b}\\) 的位置关系是（　）",
          options: ["互相垂直", "互相平行", "夹角为 \\(60^\\circ\\)", "夹角为 \\(45^\\circ\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\vec{a} \\cdot \\vec{b} = 2 \\times 1 + 1 \\times (-2) = 0\\)，故互相垂直。"
        },
        {
          type: "single", difficulty: "medium", score: 5,
          question: "同时掷两枚均匀的骰子，两枚点数之和为 7 的概率是（　）",
          options: ["\\(\\frac{1}{6}\\)", "\\(\\frac{1}{12}\\)", "\\(\\frac{1}{9}\\)", "\\(\\frac{5}{36}\\)"],
          correctIndex: 0,
          answer: "**A**。共 \\(6 \\times 6 = 36\\) 种等可能结果，和为 7 的有 6 种，\\(P = \\frac{6}{36} = \\frac{1}{6}\\)。"
        },
        {
          type: "single", difficulty: "advanced", score: 5,
          question: "圆 \\(x^2 + y^2 - 2x + 4y - 4 = 0\\) 的圆心坐标是（　）",
          options: ["\\((1, -2)\\)", "\\((-1, 2)\\)", "\\((1, 2)\\)", "\\((-1, -2)\\)"],
          correctIndex: 0,
          answer: "**A**。配方得 \\((x - 1)^2 + (y + 2)^2 = 9\\)，圆心 \\((1, -2)\\)、半径 3。"
        },
        {
          type: "fill", difficulty: "basic", score: 5,
          question: "计算：\\(8^{\\frac{2}{3}} + \\log_3 9 =\\) ＿＿＿＿。",
          answer: "**6**。\\(8^{\\frac{2}{3}} = (2^3)^{\\frac{2}{3}} = 2^2 = 4\\)，\\(\\log_3 9 = 2\\)，和为 6。"
        },
        {
          type: "fill", difficulty: "basic", score: 5,
          question: "已知 \\(\\sin\\alpha = \\frac{3}{5}\\)，则 \\(\\cos 2\\alpha =\\) ＿＿＿＿。",
          answer: "**\\(\\frac{7}{25}\\)**。\\(\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - \\frac{18}{25} = \\frac{7}{25}\\)。"
        },
        {
          type: "fill", difficulty: "basic", score: 5,
          question: "等差数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 1\\)，\\(d = 2\\)，则前 10 项和 \\(S_{10} =\\) ＿＿＿＿。",
          answer: "**100**。\\(S_{10} = 10 \\times 1 + \\frac{10 \\times 9}{2} \\times 2 = 10 + 90 = 100\\)。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "\\(C_6^3 =\\) ＿＿＿＿。",
          answer: "**20**。\\(C_6^3 = \\frac{6 \\times 5 \\times 4}{3 \\times 2 \\times 1} = 20\\)。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "函数 \\(y = x^2 - 2x + 3\\) 的最小值是 ＿＿＿＿。",
          answer: "**2**。\\(y = (x - 1)^2 + 2\\)，当 \\(x = 1\\) 时取最小值 2。"
        },
        {
          type: "fill", difficulty: "medium", score: 5,
          question: "已知 \\(|\\vec{a}| = 2\\)，\\(|\\vec{b}| = 3\\)，夹角为 \\(60^\\circ\\)，则 \\(|\\vec{a} + \\vec{b}| =\\) ＿＿＿＿。",
          answer: "**\\(\\sqrt{19}\\)**。\\(|\\vec{a} + \\vec{b}|^2 = 4 + 9 + 2 \\times 2 \\times 3 \\times \\frac{1}{2} = 19\\)。"
        },
        {
          type: "fill", difficulty: "advanced", score: 5,
          question: "抛物线 \\(y^2 = 4x\\) 的焦点坐标是 ＿＿＿＿。",
          answer: "**\\((1, 0)\\)**。\\(2p = 4\\)，\\(p = 2\\)，焦点为 \\((\\frac{p}{2}, 0) = (1, 0)\\)。"
        },
        {
          type: "solve", difficulty: "medium", score: 12,
          question: "已知二次函数 \\(f(x) = x^2 - 4x + 3\\)。\n（1）求它的对称轴和顶点坐标；\n（2）求它在区间 \\([0, 3]\\) 上的最大值与最小值。",
          answer: "**解：**\n（1）\\(f(x) = (x - 2)^2 - 1\\)，对称轴为 \\(x = 2\\)，顶点坐标为 \\((2, -1)\\)。\n（2）在 \\([0, 3]\\) 上：\\(f(0) = 3\\)，\\(f(2) = -1\\)，\\(f(3) = 0\\)。故最大值为 3（\\(x = 0\\) 时），最小值为 -1（\\(x = 2\\) 时）。"
        },
        {
          type: "solve", difficulty: "medium", score: 13,
          question: "等差数列 \\(\\{a_n\\}\\) 中，\\(a_2 = 5\\)，\\(a_5 = 14\\)。\n（1）求首项 \\(a_1\\) 与公差 \\(d\\)；\n（2）求前 10 项和 \\(S_{10}\\)。",
          answer: "**解：**\n（1）\\(d = \\frac{a_5 - a_2}{5 - 2} = \\frac{14 - 5}{3} = 3\\)，\\(a_1 = a_2 - d = 5 - 3 = 2\\)。\n（2）\\(S_{10} = 10a_1 + \\frac{10 \\times 9}{2}d = 20 + 45 \\times 3 = 20 + 135 = 155\\)。"
        },
        {
          type: "solve", difficulty: "medium", score: 14,
          question: "已知 \\(\\sin\\alpha = \\frac{4}{5}\\)，且 \\(\\alpha \\in (\\frac{\\pi}{2}, \\pi)\\)。\n（1）求 \\(\\cos\\alpha\\)；\n（2）求 \\(\\sin(\\alpha + \\frac{\\pi}{3})\\) 的值。",
          answer: "**解：**\n（1）\\(\\alpha\\) 在第二象限，\\(\\cos\\alpha = -\\sqrt{1 - \\frac{16}{25}} = -\\frac{3}{5}\\)。\n（2）\\(\\sin(\\alpha + \\frac{\\pi}{3}) = \\sin\\alpha\\cos\\frac{\\pi}{3} + \\cos\\alpha\\sin\\frac{\\pi}{3} = \\frac{4}{5} \\times \\frac{1}{2} + (-\\frac{3}{5}) \\times \\frac{\\sqrt{3}}{2} = \\frac{4 - 3\\sqrt{3}}{10}\\)。"
        },
        {
          type: "solve", difficulty: "advanced", score: 16,
          question: "袋中有 3 个红球、2 个白球，从中任取 2 个球。\n（1）求恰好取到 1 个红球、1 个白球的概率；\n（2）求至少取到 1 个红球的概率。",
          answer: "**解：**\n从 5 个球中任取 2 个，共有 \\(C_5^2 = 10\\) 种等可能取法。\n（1）恰好 1 红 1 白：\\(C_3^1 \\times C_2^1 = 3 \\times 2 = 6\\) 种，\\(P = \\frac{6}{10} = \\frac{3}{5}\\)。\n（2）至少 1 个红球的对立事件是「两个都是白球」，\\(P = 1 - \\frac{C_2^2}{C_5^2} = 1 - \\frac{1}{10} = \\frac{9}{10}\\)。"
        },
        {
          type: "solve", difficulty: "sprint", score: 20,
          question: "已知椭圆 \\(\\frac{x^2}{4} + \\frac{y^2}{3} = 1\\)。\n（1）求它的长轴长、焦距和离心率；\n（2）判断直线 \\(y = x - 1\\) 与该椭圆的交点个数，并说明理由。",
          answer: "**解：**\n（1）\\(a^2 = 4\\)，\\(b^2 = 3\\)，故 \\(a = 2\\)，\\(b = \\sqrt{3}\\)，\\(c = \\sqrt{a^2 - b^2} = 1\\)。长轴长 \\(2a = 4\\)，焦距 \\(2c = 2\\)，离心率 \\(e = \\frac{c}{a} = \\frac{1}{2}\\)。\n（2）把 \\(y = x - 1\\) 代入椭圆方程得 \\(7x^2 - 8x - 8 = 0\\)，\\(\\Delta = 64 + 224 = 288 > 0\\)，故直线与椭圆有 2 个交点。"
        }
      ]
    }
  ]
}
