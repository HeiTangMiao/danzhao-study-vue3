/**
 * 内容页面数据（content-schema 的实例）
 * 页面：函数与基本初等函数 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-03-08",
  unitNum: "03",
  subject: "math",
  title: "函数与基本初等函数 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "求函数定义域时忽略限制条件",
          commonMistake: "只考虑根号或分母，忘记对数真数大于 0、偶次根号下非负、分式分母不为 0 等所有限制条件。",
          correctApproach: "求定义域要**同时满足所有限制**：① 分式分母 \\(\\ne 0\\)；② 偶次根号下 \\(\\ge 0\\)；③ 对数真数 \\(> 0\\)；④ 正切 \\(x \\ne \\frac{\\pi}{2} + k\\pi\\)。取各条件的交集。",
          tip: "口诀：『分母不为零，根号非负，真数正』，逐个条件列不等式再取交集。"
        },
        {
          scenario: "奇偶性判断错误",
          commonMistake: "只验证 \\(f(-x)\\) 与 \\(f(x)\\) 的关系，忘记先判断定义域是否关于原点对称。",
          correctApproach: "判断奇偶性**第一步看定义域**是否关于原点对称；不对称则既不是奇函数也不是偶函数。对称后再验证 \\(f(-x) = f(x)\\)（偶）或 \\(f(-x) = -f(x)\\)（奇）。",
          tip: "定义域不对称 → 直接判『非奇非偶』，无需继续验证。"
        },
        {
          scenario: "指数与对数运算混淆",
          commonMistake: "把 \\(a^m \\cdot a^n = a^{m+n}\\) 写成 \\(a^{mn}\\)；把 \\(\\log_a M + \\log_a N = \\log_a(MN)\\) 写成 \\(\\log_a(M+N)\\)。",
          correctApproach: "同底数幂相乘**指数相加**：\\(a^m \\cdot a^n = a^{m+n}\\)；同底对数相加**真数相乘**：\\(\\log_a M + \\log_a N = \\log_a(MN)\\)。注意 \\(\\log_a(M+N)\\) 无法化简。",
          tip: "指数运算『乘→加』，对数运算『加→乘』，两者互为逆运算。"
        },
        {
          scenario: "二次函数闭区间最值忽略对称轴位置",
          commonMistake: "直接代入区间端点求最值，没有考虑对称轴是否落在区间内。",
          correctApproach: "求 \\(f(x) = ax^2 + bx + c\\) 在闭区间 \\([m, n]\\) 上的最值，先求对称轴 \\(x = -\\frac{b}{2a}\\)，再分三种情况：对称轴在区间左侧、内部、右侧，分别讨论。",
          tip: "口诀：『先对称轴，后分三类』，对称轴在区间内时顶点值参与比较。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "函数 \\(f(x) = \\sqrt{x - 1} + \\frac{1}{x - 3}\\) 的定义域为（　）",
          options: ["\\([1, 3) \\cup (3, +\\infty)\\)", "\\((1, +\\infty)\\)", "\\([1, +\\infty)\\)", "\\((1, 3) \\cup (3, +\\infty)\\)"],
          correctIndex: 0,
          answer: "**A**。\\(x - 1 \\ge 0\\) 得 \\(x \\ge 1\\)；\\(x - 3 \\ne 0\\) 得 \\(x \\ne 3\\)。交集为 \\([1, 3) \\cup (3, +\\infty)\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知函数 \\(f(x)\\) 是定义在 \\(\\mathbb{R}\\) 上的奇函数，且 \\(f(2) = 5\\)，则 \\(f(-2) =\\)（　）",
          options: ["\\(-5\\)", "5", "0", "无法确定"],
          correctIndex: 0,
          answer: "**A**。奇函数满足 \\(f(-x) = -f(x)\\)，故 \\(f(-2) = -f(2) = -5\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "计算 \\(\\log_2 6 - \\log_2 3 =\\)（　）",
          options: ["1", "2", "\\(\\log_2 3\\)", "0"],
          correctIndex: 0,
          answer: "**A**。\\(\\log_2 6 - \\log_2 3 = \\log_2 \\frac{6}{3} = \\log_2 2 = 1\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "函数 \\(f(x) = x^2 - 2x + 3\\) 在区间 \\([0, 3]\\) 上的最小值为（　）",
          options: ["2", "3", "6", "1"],
          correctIndex: 0,
          answer: "**A**。\\(f(x) = (x-1)^2 + 2\\)，对称轴 \\(x = 1 \\in [0, 3]\\)，最小值 \\(f(1) = 2\\)。"
        }
      ]
    }
  ]
}
