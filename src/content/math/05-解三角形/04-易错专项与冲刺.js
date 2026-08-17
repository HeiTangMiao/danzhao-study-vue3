/**
 * 内容页面数据（content-schema 的实例）
 * 页面：解三角形 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比（常见错误 vs 正确思路）
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-05-04",
  unitNum: "05",
  subject: "math",
  title: "解三角形 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "正弦定理 SSA 情形漏解（两解问题）",
          commonMistake: "在 \\(\\triangle ABC\\) 中，\\(a = 4\\)，\\(b = 4\\sqrt{2}\\)，\\(A = 30°\\)，由 \\(\\sin B = \\frac{b\\sin A}{a} = \\frac{\\sqrt{2}}{2}\\) 直接得 \\(B = 45°\\)，漏掉 \\(B = 135°\\)。",
          correctApproach: "\\(\\sin B = \\frac{\\sqrt{2}}{2}\\) 时，\\(B = 45°\\) 或 \\(B = 135°\\)。因为 \\(b > a\\)，所以 \\(B > A\\)，两种情况均满足 \\(A + B < 180°\\)，故 \\(B = 45°\\) 或 \\(135°\\)。",
          tip: "已知两边及一边对角（SSA）时，**先由正弦值判断两解**，再用『大边对大角』和 \\(A + B < 180°\\) 检验取舍。"
        },
        {
          scenario: "余弦定理求角时余弦值为负表示钝角",
          commonMistake: "用余弦定理求角时，算出 \\(\\cos A = -\\frac{1}{2}\\) 后，误以为角 \\(A\\) 不存在或直接取 \\(A = 60°\\)，忽略了余弦为负对应钝角。",
          correctApproach: "在 \\(\\triangle ABC\\) 中，\\(\\cos A = -\\frac{1}{2}\\) 时，\\(A = 120°\\)（\\(A \\in (0, \\pi)\\)）。**余弦值为负，角为钝角**。",
          tip: "余弦定理求角时，\\(\\cos A > 0\\) 角为锐角，\\(\\cos A = 0\\) 为直角，\\(\\cos A < 0\\) 为钝角，直接由 \\(\\cos A\\) 的值确定 \\(A\\)，无需讨论。"
        },
        {
          scenario: "面积公式中夹角选取错误",
          commonMistake: "用 \\(S = \\frac{1}{2}ab\\sin C\\) 求面积时，把 \\(a\\)、\\(b\\) 的夹角选错（如用 \\(A\\) 或 \\(B\\)），或忘记乘 \\(\\frac{1}{2}\\)。",
          correctApproach: "面积公式 \\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2}bc\\sin A = \\frac{1}{2}ca\\sin B\\) 中，**两边及其夹角**必须对应：\\(a\\)、\\(b\\) 的夹角是 \\(C\\)。",
          tip: "写面积公式时，先标出两边，再看它们的**夹角**是哪个角，三者一一对应，且别忘了 \\(\\frac{1}{2}\\)。"
        },
        {
          scenario: "解三角形应用中的方位角与仰角",
          commonMistake: "在测量问题中，把方位角、仰角、俯角理解错误，或在三角形中把已知角标错位置，导致用错定理。",
          correctApproach: "先**画出示意图**，标注已知边角。仰角是视线与水平线的夹角（视线在水平线上方），方位角是从正北方向顺时针转过的角度。再根据已知条件选择正弦定理或余弦定理。",
          tip: "应用题先画图、标角，把实际问题转化为 \\(\\triangle ABC\\) 中的边角关系，再套定理求解。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "在 \\(\\triangle ABC\\) 中，已知 \\(a = 4\\)，\\(b = 4\\sqrt{2}\\)，\\(A = 30°\\)，则角 \\(B\\) 的值为（　）",
          options: ["\\(45°\\)", "\\(135°\\)", "\\(45°\\) 或 \\(135°\\)", "\\(60°\\)"],
          correctIndex: 2,
          answer: "**C**。由正弦定理 \\(\\sin B = \\frac{b\\sin A}{a} = \\frac{4\\sqrt{2} \\times \\frac{1}{2}}{4} = \\frac{\\sqrt{2}}{2}\\)，得 \\(B = 45°\\) 或 \\(135°\\)。因为 \\(b > a\\)，\\(B > A = 30°\\)，且 \\(A + B = 165° < 180°\\) 成立，故两解均满足。易错点：只取锐角 \\(45°\\) 漏解。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 2\\)，\\(b = 3\\)，\\(c = 4\\)，则最大角的余弦值为（　）",
          options: ["\\(\\frac{1}{4}\\)", "\\(-\\frac{1}{4}\\)", "\\(\\frac{3}{4}\\)", "\\(-\\frac{3}{4}\\)"],
          correctIndex: 1,
          answer: "**B**。最大边为 \\(c = 4\\)，故最大角为 \\(C\\)。由余弦定理：\\(\\cos C = \\frac{a^2 + b^2 - c^2}{2ab} = \\frac{4 + 9 - 16}{2 \\times 2 \\times 3} = \\frac{-3}{12} = -\\frac{1}{4}\\)。余弦值为负，说明角 \\(C\\) 为钝角，三角形为钝角三角形。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 3\\)，\\(b = 4\\)，\\(C = 60°\\)，则 \\(\\triangle ABC\\) 的面积为（　）",
          options: ["\\(3\\sqrt{3}\\)", "\\(6\\)", "\\(6\\sqrt{3}\\)", "\\(3\\)"],
          correctIndex: 0,
          answer: "**A**。\\(a\\)、\\(b\\) 的夹角为 \\(C\\)，由面积公式：\\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2} \\times 3 \\times 4 \\times \\sin 60° = 6 \\times \\frac{\\sqrt{3}}{2} = 3\\sqrt{3}\\)。易错点：忘记乘 \\(\\frac{1}{2}\\) 会误选 \\(6\\sqrt{3}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "在 \\(\\triangle ABC\\) 中，\\(A = 60°\\)，\\(b = 2\\)，\\(c = 3\\)，则边 \\(a\\) 的值为（　）",
          options: ["\\(\\sqrt{7}\\)", "\\(\\sqrt{13}\\)", "\\(7\\)", "\\(\\sqrt{19}\\)"],
          correctIndex: 0,
          answer: "**A**。已知两边及夹角，用余弦定理：\\(a^2 = b^2 + c^2 - 2bc\\cos A = 2^2 + 3^2 - 2 \\times 2 \\times 3 \\times \\cos 60° = 4 + 9 - 12 \\times \\frac{1}{2} = 13 - 6 = 7\\)，故 \\(a = \\sqrt{7}\\)。易错点：若误用正弦定理或把夹角代入错误会得到 \\(\\sqrt{13}\\) 等错误结果。"
        }
      ]
    }
  ]
}
