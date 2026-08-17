/**
 * 内容页面数据（content-schema 的实例）
 * 页面：数列 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-06-06",
  unitNum: "06",
  subject: "math",
  title: "数列 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "\\(a_n\\) 与 \\(S_n\\) 的关系转化",
          commonMistake: "直接用 \\(a_n = S_n - S_{n-1}\\) 求通项，忘记 \\(n = 1\\) 时 \\(S_0\\) 无意义，导致首项错误。",
          correctApproach: "通项公式：\\(a_n = \\begin{cases} S_1, & n = 1 \\\\ S_n - S_{n-1}, & n \\ge 2 \\end{cases}\\)。求出 \\(n \\ge 2\\) 的表达式后，**必须验证 \\(n = 1\\) 是否满足**，不满足则写成分段形式。",
          tip: "口诀：『先求 S_n - S_{n-1}，再验 n=1』，这是数列大题必考步骤。"
        },
        {
          scenario: "等差与等比求和公式混淆",
          commonMistake: "把等差求和公式 \\(S_n = \\frac{n(a_1 + a_n)}{2}\\) 误用于等比数列，或忘记等比求和 \\(q \\ne 1\\) 的条件。",
          correctApproach: "等差：\\(S_n = \\frac{n(a_1 + a_n)}{2} = na_1 + \\frac{n(n-1)}{2}d\\)。等比：\\(q \\ne 1\\) 时 \\(S_n = \\frac{a_1(1 - q^n)}{1 - q}\\)；\\(q = 1\\) 时 \\(S_n = na_1\\)。",
          tip: "等比求和**先判断公比是否为 1**，再套公式。"
        },
        {
          scenario: "裂项相消的项写错",
          commonMistake: "把 \\(\\frac{1}{n(n+1)} = \\frac{1}{n} - \\frac{1}{n+1}\\) 写成 \\(\\frac{1}{n(n+1)} = \\frac{1}{n+1} - \\frac{1}{n}\\)，或系数 \\(\\frac{1}{k}\\) 漏写。",
          correctApproach: "一般形式：\\(\\frac{1}{n(n+k)} = \\frac{1}{k}\\left(\\frac{1}{n} - \\frac{1}{n+k}\\right)\\)。裂项后注意**中间项全部抵消**，只留首尾。",
          tip: "裂项后『首尾相减』，中间项成对抵消，检查是否只剩两项。"
        },
        {
          scenario: "错位相减的相减方向",
          commonMistake: "错位相减时两式相减方向搞反，或忘记最后除以 \\((1 - q)\\)。",
          correctApproach: "\\(S_n = a_1 + a_2 + \\cdots + a_n\\) 与 \\(qS_n\\) 错位对齐后，用 \\(S_n - qS_n\\)（或 \\(qS_n - S_n\\)）消去中间项，最后解出 \\(S_n = \\frac{\\text{分子}}{1 - q}\\)。",
          tip: "错位相减只适用于『等差 × 等比』型，相减后中间项成等比数列求和。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "已知数列 \\(\\{a_n\\}\\) 的前 \\(n\\) 项和 \\(S_n = n^2\\)，则 \\(a_5 =\\)（　）",
          options: ["9", "25", "16", "11"],
          correctIndex: 0,
          answer: "**A**。\\(a_5 = S_5 - S_4 = 25 - 16 = 9\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "在等差数列 \\(\\{a_n\\}\\) 中，\\(a_2 + a_8 = 10\\)，则 \\(a_5 =\\)（　）",
          options: ["5", "10", "4", "6"],
          correctIndex: 0,
          answer: "**A**。等差中项性质：\\(a_2 + a_8 = 2a_5\\)，故 \\(a_5 = 5\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "数列 \\(\\frac{1}{1 \\times 2}, \\frac{1}{2 \\times 3}, \\frac{1}{3 \\times 4}, \\cdots\\) 的前 \\(n\\) 项和 \\(S_n =\\)（　）",
          options: ["\\(\\frac{n}{n+1}\\)", "\\(\\frac{n-1}{n}\\)", "\\(\\frac{1}{n+1}\\)", "\\(\\frac{n}{n-1}\\)"],
          correctIndex: 0,
          answer: "**A**。裂项：\\(\\frac{1}{k(k+1)} = \\frac{1}{k} - \\frac{1}{k+1}\\)，\\(S_n = 1 - \\frac{1}{n+1} = \\frac{n}{n+1}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "等比数列 \\(\\{a_n\\}\\) 中，\\(a_1 = 1\\)，\\(a_4 = 8\\)，则公比 \\(q =\\)（　）",
          options: ["2", "\\(\\sqrt[3]{8}\\)", "4", "8"],
          correctIndex: 0,
          answer: "**A**。\\(a_4 = a_1 q^3\\)，即 \\(8 = q^3\\)，\\(q = 2\\)。"
        }
      ]
    }
  ]
}
