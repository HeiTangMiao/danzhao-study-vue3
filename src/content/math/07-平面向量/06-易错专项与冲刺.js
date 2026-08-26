/**
 * 内容页面数据（content-schema 的实例）
 * 页面：平面向量 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比（常见错误 vs 正确思路）
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-07-06",
  unitNum: "07",
  subject: "math",
  title: "平面向量 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "向量加法与减法的法则混淆",
          commonMistake: "把三角形法则与平行四边形法则记混，做减法 \\(\\boldsymbol{a} - \\boldsymbol{b}\\) 时方向画反，误以为 \\(\\boldsymbol{a} - \\boldsymbol{b} = \\boldsymbol{b} - \\boldsymbol{a}\\)。",
          correctApproach: "加法用『首尾相连』（\\(\\boldsymbol{a} + \\boldsymbol{b}\\) 从 \\(\\boldsymbol{a}\\) 起点指向 \\(\\boldsymbol{b}\\) 终点）；减法 \\(\\boldsymbol{a} - \\boldsymbol{b}\\) 是**从 \\(\\boldsymbol{b}\\) 的终点指向 \\(\\boldsymbol{a}\\) 的终点**。注意 \\(\\boldsymbol{a} - \\boldsymbol{b} = \\boldsymbol{a} + (-\\boldsymbol{b})\\)，\\(\\boldsymbol{a} - \\boldsymbol{b} \\neq \\boldsymbol{b} - \\boldsymbol{a}\\)。",
          tip: "口诀：『减法箭头指向被减向量』，即 \\(\\boldsymbol{a} - \\boldsymbol{b}\\) 的箭头指向 \\(\\boldsymbol{a}\\)。"
        },
        {
          scenario: "共线与垂直的坐标判定混淆",
          commonMistake: "把共线条件 \\(x_1 y_2 - x_2 y_1 = 0\\) 与垂直条件 \\(x_1 x_2 + y_1 y_2 = 0\\) 记反，或用错公式导致判断错误。",
          correctApproach: "设 \\(\\boldsymbol{a} = (x_1, y_1)\\)，\\(\\boldsymbol{b} = (x_2, y_2)\\)：**共线**（平行）\\(\\iff x_1 y_2 - x_2 y_1 = 0\\)（交叉相乘相等）；**垂直** \\(\\iff x_1 x_2 + y_1 y_2 = 0\\)（对应相乘相加为零）。",
          tip: "口诀：『平行叉乘减，垂直点乘和』。"
        },
        {
          scenario: "数量积符号与夹角范围判断",
          commonMistake: "误以为 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} > 0\\) 就是锐角，忘记夹角为 \\(0\\)（同向）时数量积也为正，导致范围漏掉『排除共线同向』。",
          correctApproach: "对非零向量，\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos\\theta\\)。\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} > 0\\) 时 \\(\\theta \\in [0, \\frac{\\pi}{2})\\)（含同向 \\(\\theta = 0\\)）；夹角为**锐角**需 \\(\\theta \\in (0, \\frac{\\pi}{2})\\)，即数量积为正**且不共线同向**。",
          tip: "求锐角范围时，先由数量积大于 0 得范围，再**排除共线同向**的情形。"
        },
        {
          scenario: "夹角公式中模的计算错误",
          commonMistake: "求夹角时忘记 \\(|\\boldsymbol{a}| = \\sqrt{x_1^2 + y_1^2}\\)，或把 \\(\\boldsymbol{a} \\cdot \\boldsymbol{a}\\) 当成 \\(|\\boldsymbol{a}|\\) 而非 \\(|\\boldsymbol{a}|^2\\)。",
          correctApproach: "夹角公式 \\(\\cos\\theta = \\dfrac{\\boldsymbol{a} \\cdot \\boldsymbol{b}}{|\\boldsymbol{a}||\\boldsymbol{b}|}\\)，其中 \\(|\\boldsymbol{a}| = \\sqrt{\\boldsymbol{a} \\cdot \\boldsymbol{a}} = \\sqrt{x_1^2 + y_1^2}\\)。\\(\\theta \\in [0, \\pi]\\)，\\(\\cos\\theta\\) 为负时夹角为钝角。",
          tip: "先分别算好模再代入公式，最后根据 \\(\\cos\\theta\\) 的符号确定角是锐角还是钝角。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "已知向量 \\(\\boldsymbol{a} = (2, 1)\\)，\\(\\boldsymbol{b} = (1, k)\\)，若 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角为锐角，则实数 \\(k\\) 的取值范围是（　）",
          options: ["\\(k > -2\\)", "\\(k > -2\\) 且 \\(k \\ne \\frac{1}{2}\\)", "\\(k < -2\\)", "\\(-2 < k < \\frac{1}{2}\\)"],
          correctIndex: 1,
          answer: "**B**。夹角为锐角需 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} > 0\\) 且不共线同向。\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 2 \\times 1 + 1 \\times k = k + 2 > 0\\)，得 \\(k > -2\\)；共线时 \\(2 \\times k - 1 \\times 1 = 0\\)，得 \\(k = \\frac{1}{2}\\)（此时 \\(\\boldsymbol{b} = \\frac{1}{2}\\boldsymbol{a}\\) 同向，夹角为 \\(0\\)）。故 \\(k > -2\\) 且 \\(k \\ne \\frac{1}{2}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知 \\(|\\boldsymbol{a}| = 2\\)，\\(|\\boldsymbol{b}| = 3\\)，\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = -3\\)，则 \\(|\\boldsymbol{a} + \\boldsymbol{b}|\\) 等于（　）",
          options: ["\\(\\sqrt{7}\\)", "\\(7\\)", "\\(\\sqrt{13}\\)", "\\(1\\)"],
          correctIndex: 0,
          answer: "**A**。\\(|\\boldsymbol{a} + \\boldsymbol{b}|^2 = |\\boldsymbol{a}|^2 + |\\boldsymbol{b}|^2 + 2\\boldsymbol{a} \\cdot \\boldsymbol{b} = 4 + 9 + 2 \\times (-3) = 7\\)，所以 \\(|\\boldsymbol{a} + \\boldsymbol{b}| = \\sqrt{7}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知向量 \\(\\boldsymbol{a} = (1, 2)\\)，\\(\\boldsymbol{b} = (-2, m)\\)，若 \\((\\boldsymbol{a} + \\boldsymbol{b}) \\perp \\boldsymbol{a}\\)，则 \\(m\\) 的值为（　）",
          options: ["\\(-\\frac{3}{2}\\)", "\\(\\frac{3}{2}\\)", "\\(-1\\)", "\\(1\\)"],
          correctIndex: 0,
          answer: "**A**。\\(\\boldsymbol{a} + \\boldsymbol{b} = (-1, 2 + m)\\)。由垂直条件 \\((\\boldsymbol{a} + \\boldsymbol{b}) \\cdot \\boldsymbol{a} = 0\\)：\\((-1) \\times 1 + (2 + m) \\times 2 = -1 + 4 + 2m = 3 + 2m = 0\\)，解得 \\(m = -\\frac{3}{2}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知向量 \\(\\boldsymbol{a} = (3, 4)\\)，\\(\\boldsymbol{b}\\) 为单位向量且 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 5\\)，则 \\(\\boldsymbol{b}\\) 的坐标为（　）",
          options: ["\\((\\frac{3}{5}, \\frac{4}{5})\\)", "\\((\\frac{4}{5}, \\frac{3}{5})\\)", "\\((1, 0)\\)", "\\((0, 1)\\)"],
          correctIndex: 0,
          answer: "**A**。\\(|\\boldsymbol{a}| = \\sqrt{3^2 + 4^2} = 5\\)。\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos\\theta = 5 \\times 1 \\times \\cos\\theta = 5\\)，得 \\(\\cos\\theta = 1\\)，即 \\(\\boldsymbol{b}\\) 与 \\(\\boldsymbol{a}\\) 同向，故 \\(\\boldsymbol{b} = \\dfrac{\\boldsymbol{a}}{|\\boldsymbol{a}|} = (\\frac{3}{5}, \\frac{4}{5})\\)。"
        }
      ]
    }
  ]
}
