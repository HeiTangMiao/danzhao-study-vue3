/**
 * 内容页面数据（content-schema 的实例）
 * 页面：三角函数 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比（常见错误 vs 正确思路）
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-04-07",
  unitNum: "04",
  subject: "math",
  title: "三角函数 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "弧度制下弧长与扇形面积公式",
          commonMistake: "在公式 \\(l = \\alpha r\\)、\\(S = \\frac{1}{2}\\alpha r^2\\) 中直接代入**角度制**数值（如 \\(60°\\)），导致结果错误。",
          correctApproach: "弧长公式 \\(l = \\alpha r\\) 与扇形面积公式 \\(S = \\frac{1}{2}\\alpha r^2 = \\frac{1}{2}lr\\) 中，圆心角 \\(\\alpha\\) **必须用弧度制**。如圆心角 \\(60°\\) 应化为 \\(\\frac{\\pi}{3}\\) 再代入。",
          tip: "公式中带 \\(\\alpha\\) 一律先换算成弧度：\\(180° = \\pi\\)，\\(1° = \\frac{\\pi}{180}\\)。"
        },
        {
          scenario: "由 \\(\\sin\\alpha\\) 求 \\(\\cos\\alpha\\) 的符号判断",
          commonMistake: "已知 \\(\\sin\\alpha = \\frac{3}{5}\\)，直接由 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\) 得 \\(\\cos\\alpha = \\frac{4}{5}\\)，忽略了**象限决定正负**。",
          correctApproach: "由 \\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = \\frac{16}{25}\\) 得 \\(\\cos\\alpha = \\pm\\frac{4}{5}\\)。若 \\(\\alpha\\) 在第二象限（\\(\\frac{\\pi}{2} < \\alpha < \\pi\\)），则 \\(\\cos\\alpha = -\\frac{4}{5}\\)。",
          tip: "平方关系开方后**必须由角的象限定符号**：一四象限 \\(\\cos\\) 正，二三象限 \\(\\cos\\) 负。"
        },
        {
          scenario: "诱导公式的『奇变偶不变，符号看象限』",
          commonMistake: "计算 \\(\\cos(\\pi - \\alpha)\\) 时忘记变号，或把 \\(\\sin(\\frac{\\pi}{2} - \\alpha)\\) 仍写成 \\(\\cos\\alpha\\) 之外的形式，符号与函数名处理混乱。",
          correctApproach: "\\(\\cos(\\pi - \\alpha) = -\\cos\\alpha\\)（把 \\(\\alpha\\) 视为锐角，\\(\\pi - \\alpha\\) 在第二象限，余弦为负）；\\(\\sin(\\frac{\\pi}{2} - \\alpha) = \\cos\\alpha\\)（\\(\\frac{\\pi}{2}\\) 的奇数倍，函数名改变，第一象限正弦为正）。",
          tip: "口诀：**奇变偶不变，符号看象限**。先把 \\(\\alpha\\) 看成锐角，再判断原函数在该象限的符号。"
        },
        {
          scenario: "辅助角公式中 \\(\\varphi\\) 的象限确定",
          commonMistake: "将 \\(f(x) = \\sin x - \\sqrt{3}\\cos x\\) 化为 \\(A\\sin(x + \\varphi)\\) 时，由 \\(\\tan\\varphi = \\frac{b}{a} = -\\sqrt{3}\\) 直接取 \\(\\varphi = -\\frac{\\pi}{3}\\) 或 \\(\\frac{2\\pi}{3}\\) 判断失误，导致相位错误。",
          correctApproach: "\\(a = 1\\)，\\(b = -\\sqrt{3}\\)，振幅 \\(A = \\sqrt{a^2 + b^2} = 2\\)。点 \\((a, b) = (1, -\\sqrt{3})\\) 在**第四象限**，故 \\(\\varphi = -\\frac{\\pi}{3}\\)，即 \\(f(x) = 2\\sin\\left(x - \\frac{\\pi}{3}\\right)\\)。",
          tip: "辅助角 \\(\\varphi\\) 由点 \\((a, b)\\) 所在象限确定，不能只由 \\(\\tan\\varphi\\) 取值，需结合象限修正。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "已知扇形的圆心角为 \\(\\frac{\\pi}{3}\\)，半径为 6，则该扇形的弧长为（　）",
          options: ["\\(2\\pi\\)", "\\(\\pi\\)", "\\(\\frac{\\pi}{2}\\)", "\\(3\\pi\\)"],
          correctIndex: 0,
          answer: "**A**。由弧长公式 \\(l = \\alpha r\\)（\\(\\alpha\\) 用弧度制）：\\(l = \\frac{\\pi}{3} \\times 6 = 2\\pi\\)。易错点：若误用角度制 \\(l = 60° \\times 6 = 360\\) 则完全错误，弧度制下公式才成立。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知 \\(\\sin\\alpha = \\frac{3}{5}\\)，且 \\(\\alpha \\in \\left(\\frac{\\pi}{2}, \\pi\\right)\\)，则 \\(\\tan\\alpha\\) 的值为（　）",
          options: ["\\(\\frac{3}{4}\\)", "\\(-\\frac{3}{4}\\)", "\\(\\frac{4}{3}\\)", "\\(-\\frac{4}{3}\\)"],
          correctIndex: 1,
          answer: "**B**。\\(\\alpha\\) 在第二象限，\\(\\cos\\alpha < 0\\)。由 \\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = 1 - \\frac{9}{25} = \\frac{16}{25}\\)，得 \\(\\cos\\alpha = -\\frac{4}{5}\\)。故 \\(\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{\\frac{3}{5}}{-\\frac{4}{5}} = -\\frac{3}{4}\\)。易错点：忘记由象限确定 \\(\\cos\\alpha\\) 为负。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "\\(\\sin 210°\\) 的值为（　）",
          options: ["\\(\\frac{1}{2}\\)", "\\(-\\frac{1}{2}\\)", "\\(\\frac{\\sqrt{3}}{2}\\)", "\\(-\\frac{\\sqrt{3}}{2}\\)"],
          correctIndex: 1,
          answer: "**B**。利用诱导公式：\\(\\sin 210° = \\sin(180° + 30°) = -\\sin 30° = -\\frac{1}{2}\\)。把 \\(30°\\) 视为锐角，\\(180° + 30°\\) 在第三象限，正弦为负，故结果为 \\(-\\frac{1}{2}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "函数 \\(f(x) = \\sin x + \\sqrt{3}\\cos x\\) 的最大值为（　）",
          options: ["\\(1\\)", "\\(2\\)", "\\(\\sqrt{3}\\)", "\\(4\\)"],
          correctIndex: 1,
          answer: "**B**。用辅助角公式：\\(a = 1\\)，\\(b = \\sqrt{3}\\)，振幅 \\(A = \\sqrt{a^2 + b^2} = \\sqrt{1 + 3} = 2\\)，点 \\((1, \\sqrt{3})\\) 在第一象限，\\(\\tan\\varphi = \\sqrt{3}\\)，故 \\(\\varphi = \\frac{\\pi}{3}\\)，即 \\(f(x) = 2\\sin\\left(x + \\frac{\\pi}{3}\\right)\\)。因为 \\(\\sin\\left(x + \\frac{\\pi}{3}\\right) \\le 1\\)，所以最大值为 2。"
        }
      ]
    }
  ]
}
