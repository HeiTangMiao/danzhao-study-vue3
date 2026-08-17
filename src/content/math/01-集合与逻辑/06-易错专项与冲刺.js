/**
 * 内容页面数据（content-schema 的实例）
 * 页面：集合与逻辑 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比（常见错误 vs 正确思路）
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-01-06",
  unitNum: "01",
  subject: "math",
  title: "集合与逻辑 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "空集 \\(\\varnothing\\) 与集合 \\(\\{0\\}\\) 的关系",
          commonMistake: "误认为 \\(\\varnothing \\in \\{0\\}\\) 或 \\(\\varnothing = \\{0\\}\\)，混淆『属于』与『包含于』。",
          correctApproach: "\\(\\varnothing\\) 是**不含任何元素**的集合，\\(\\{0\\}\\) 含一个元素 0。正确关系是 \\(\\varnothing \\subseteq \\{0\\}\\)（空集是任何集合的子集），但 \\(\\varnothing \\notin \\{0\\}\\)（0 不是 \\(\\varnothing\\) 的元素）。",
          tip: "见到 \\(\\varnothing\\) 先想：它是『没有元素的集合』，与 \\(\\{0\\}\\)、\\(\\{\\varnothing\\}\\) 都不同。"
        },
        {
          scenario: "子集个数公式 \\(2^n\\) 的运用",
          commonMistake: "求『非空真子集』时忘记减 2，或把 \\(2^n - 1\\)（非空子集）与 \\(2^n - 2\\)（非空真子集）混淆。",
          correctApproach: "含 \\(n\\) 个元素的集合：子集 \\(2^n\\) 个，真子集 \\(2^n - 1\\) 个，非空子集 \\(2^n - 1\\) 个，非空真子集 \\(2^n - 2\\) 个。",
          tip: "口诀：『全子集减空集，再减自身是真子集』。"
        },
        {
          scenario: "充分条件与必要条件的方向判断",
          commonMistake: "把『\\(p\\) 是 \\(q\\) 的充分条件』与『\\(q\\) 是 \\(p\\) 的充分条件』搞反，方向判断错误。",
          correctApproach: "\\(p \\Rightarrow q\\) 则 \\(p\\) 是 \\(q\\) 的充分条件，\\(q\\) 是 \\(p\\) 的必要条件。用集合理解：\\(p\\) 对应集合 \\(P\\)，\\(q\\) 对应集合 \\(Q\\)，\\(P \\subseteq Q\\) 则 \\(p\\) 是 \\(q\\) 的充分条件（小范围推出大范围）。",
          tip: "口诀：『小充分，大必要』——范围小的是充分条件。"
        },
        {
          scenario: "补集的运算范围",
          commonMistake: "求补集时忘记补集是相对于**全集**而言的，直接对实数集求补导致错误。",
          correctApproach: "\\(\\complement_U A\\) 表示在**全集 \\(U\\)** 中不属于 \\(A\\) 的元素集合。必须先明确全集 \\(U\\)，再求补集。",
          tip: "做题先圈出『全集 U = …』，补集永远在全集内。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "已知集合 \\(A = \\{x \\mid x^2 - 3x + 2 = 0\\}\\)，\\(B = \\{x \\mid ax - 1 = 0\\}\\)，若 \\(B \\subseteq A\\)，则实数 \\(a\\) 的取值集合为（　）",
          options: ["\\(\\{1, \\frac{1}{2}\\}\\)", "\\(\\{0, 1, \\frac{1}{2}\\}\\)", "\\(\\{1, 2\\}\\)", "\\(\\{0, 1, 2\\}\\)"],
          correctIndex: 1,
          answer: "**B**。\\(A = \\{1, 2\\}\\)。\\(B \\subseteq A\\) 分情况：① \\(a = 0\\) 时 \\(B = \\varnothing \\subseteq A\\)；② \\(a \\ne 0\\) 时 \\(x = \\frac{1}{a}\\)，令 \\(\\frac{1}{a} = 1\\) 得 \\(a = 1\\)，令 \\(\\frac{1}{a} = 2\\) 得 \\(a = \\frac{1}{2}\\)。故 \\(a \\in \\{0, 1, \\frac{1}{2}\\}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "设全集 \\(U = \\{1, 2, 3, 4, 5\\}\\)，集合 \\(A = \\{1, 3, 5\\}\\)，\\(B = \\{2, 3\\}\\)，则 \\((\\complement_U A) \\cap B =\\)（　）",
          options: ["\\(\\{2\\}\\)", "\\(\\{3\\}\\)", "\\(\\{2, 3\\}\\)", "\\(\\{1, 5\\}\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\complement_U A = \\{2, 4\\}\\)，\\((\\complement_U A) \\cap B = \\{2, 4\\} \\cap \\{2, 3\\} = \\{2\\}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知 \\(p: x > 2\\)，\\(q: x^2 > 4\\)，则 \\(p\\) 是 \\(q\\) 的（　）",
          options: ["充分不必要条件", "必要不充分条件", "充要条件", "既不充分也不必要条件"],
          correctIndex: 0,
          answer: "**A**。\\(x > 2 \\Rightarrow x^2 > 4\\) 成立（充分）；但 \\(x^2 > 4\\) 时 \\(x > 2\\) 或 \\(x < -2\\)，不一定 \\(x > 2\\)（不必要）。集合 \\((2, +\\infty) \\subsetneq (-\\infty, -2) \\cup (2, +\\infty)\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知集合 \\(A = \\{x \\mid x^2 - ax + 4 = 0\\}\\) 中至多有一个元素，则实数 \\(a\\) 的取值范围是（　）",
          options: ["\\([-4, 4]\\)", "\\((-\\infty, -4] \\cup [4, +\\infty)\\)", "\\((-4, 4)\\)", "\\(\\mathbb{R}\\)"],
          correctIndex: 0,
          answer: "**A**。方程至多有一个解（含无解与两相等实根），即判别式 \\(\\Delta = a^2 - 16 \\le 0\\)，解得 \\(-4 \\le a \\le 4\\)，即 \\(a \\in [-4, 4]\\)。"
        }
      ]
    }
  ]
}
