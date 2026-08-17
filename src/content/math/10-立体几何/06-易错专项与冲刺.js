/**
 * 内容页面数据（content-schema 的实例）
 * 页面：立体几何 · 易错专项与冲刺
 * 说明：
 *  - errorfocus 区块：高频易错场景对比（常见错误 vs 正确思路）
 *  - quiz 区块：冲刺拔高题（可点击作答 + 即时反馈 + 错题入本）
 */
export default {
  id: "math-10-06",
  unitNum: "10",
  subject: "math",
  title: "立体几何 · 易错专项与冲刺",
  subtitle: "高频易错点 + 冲刺拔高题",
  blocks: [
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "圆柱、圆锥、球的表面积与体积公式混淆",
          commonMistake: "把侧面积与全面积混淆，或把圆柱、圆锥、球的体积公式记混（如漏掉 \\(\\frac{1}{3}\\) 或 \\(\\frac{4}{3}\\)）。",
          correctApproach: "圆柱侧面积 \\(S = 2\\pi rh\\)，体积 \\(V = \\pi r^2 h\\)；圆锥侧面积 \\(S = \\pi rl\\)（\\(l\\) 为母线），体积 \\(V = \\frac{1}{3}\\pi r^2 h\\)；球表面积 \\(S = 4\\pi r^2\\)，体积 \\(V = \\frac{4}{3}\\pi r^3\\)。",
          tip: "口诀：『柱体底乘高，锥体三分一，球表四派方，球体三分四』。"
        },
        {
          scenario: "线面平行判定定理中『线在面外』条件遗漏",
          commonMistake: "只看到线线平行就下结论线面平行，忽略判定定理要求该直线**不在平面内**，导致对『线在面内』的情形判断错误。",
          correctApproach: "线面平行判定定理：\\(a \\nsubseteq \\alpha\\)，\\(b \\subseteq \\alpha\\)，且 \\(a \\parallel b\\)，则 \\(a \\parallel \\alpha\\)。三个条件缺一不可，尤其要检查 \\(a\\) 是否在面内。",
          tip: "用判定定理前先确认：直线在平面外、面内有一条直线与它平行，缺一不可。"
        },
        {
          scenario: "线面垂直与面面垂直的判定混淆",
          commonMistake: "误以为『线垂直于面内一条直线』就线面垂直，或『一个平面内一条线垂直于另一个平面』就面面垂直，忽略条件要求。",
          correctApproach: "**线面垂直**：直线垂直于面内**两条相交**直线；**面面垂直**：一个平面内有一条直线垂直于另一个平面（线面垂直 \\(\\Rightarrow\\) 面面垂直）。",
          tip: "口诀：『线面垂直找两条相交线，面面垂直找一条垂线在面内』。"
        },
        {
          scenario: "三视图还原几何体错误",
          commonMistake: "只凭一个视图猜测几何体形状，忽略三视图的对应关系，或把虚线（被遮挡的棱）当成实线，导致还原出错。",
          correctApproach: "三视图遵循『**长对正、高平齐、宽相等**』。正视图与俯视图长对正，正视图与侧视图高平齐，俯视图与侧视图宽相等；虚线表示被遮挡的棱，必须纳入还原。",
          tip: "先看俯视图确定底面形状，再看正视图、侧视图确定高度与棱的位置，虚线不可忽略。"
        }
      ]
    },
    {
      type: "quiz",
      title: "冲刺拔高题",
      items: [
        {
          type: "single", difficulty: "sprint",
          question: "已知球的表面积为 \\(16\\pi\\)，则球的体积为（　）",
          options: ["\\(\\frac{16\\pi}{3}\\)", "\\(\\frac{32\\pi}{3}\\)", "\\(\\frac{64\\pi}{3}\\)", "\\(\\frac{8\\pi}{3}\\)"],
          correctIndex: 1,
          answer: "**B**。由 \\(S = 4\\pi r^2 = 16\\pi\\)，得 \\(r^2 = 4\\)，\\(r = 2\\)。体积 \\(V = \\frac{4}{3}\\pi r^3 = \\frac{4}{3}\\pi \\times 8 = \\frac{32\\pi}{3}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "正四棱锥的底面边长为 2，侧棱长为 \\(\\sqrt{3}\\)，则该正四棱锥的体积为（　）",
          options: ["\\(\\frac{4}{3}\\)", "\\(4\\)", "\\(\\frac{2}{3}\\)", "\\(\\frac{8}{3}\\)"],
          correctIndex: 0,
          answer: "**A**。底面正方形边长为 2，底面中心到顶点的距离（对角线一半）为 \\(\\sqrt{2}\\)。高 \\(h = \\sqrt{(\\sqrt{3})^2 - (\\sqrt{2})^2} = \\sqrt{3 - 2} = 1\\)。体积 \\(V = \\frac{1}{3} \\times 2^2 \\times 1 = \\frac{4}{3}\\)。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "已知直线 \\(l\\)、\\(m\\) 与平面 \\(\\alpha\\)、\\(\\beta\\)，则下列命题正确的是（　）",
          options: ["若 \\(l \\perp \\alpha\\)，\\(\\alpha \\perp \\beta\\)，则 \\(l \\perp \\beta\\)", "若 \\(l \\perp \\alpha\\)，\\(m \\subset \\alpha\\)，则 \\(l \\perp m\\)", "若 \\(l \\parallel m\\)，\\(m \\subset \\alpha\\)，则 \\(l \\parallel \\alpha\\)", "若 \\(l \\parallel \\alpha\\)，\\(m \\subset \\alpha\\)，则 \\(l \\parallel m\\)"],
          correctIndex: 1,
          answer: "**B**。由线面垂直定义，\\(l \\perp \\alpha\\) 时 \\(l\\) 垂直于面内任意一条直线，故 \\(l \\perp m\\) 正确。A：\\(l \\perp \\alpha\\) 且 \\(\\alpha \\perp \\beta\\) 时 \\(l\\) 可能在 \\(\\beta\\) 内或与 \\(\\beta\\) 平行，不一定垂直；C：\\(l\\) 可能在面 \\(\\alpha\\) 内，不能推出平行；D：\\(l \\parallel \\alpha\\) 时 \\(l\\) 与面内直线不一定平行（可能异面）。"
        },
        {
          type: "single", difficulty: "sprint",
          question: "圆锥的底面半径为 3，母线长为 5，则该圆锥的体积为（　）",
          options: ["\\(15\\pi\\)", "\\(12\\pi\\)", "\\(36\\pi\\)", "\\(20\\pi\\)"],
          correctIndex: 1,
          answer: "**B**。高 \\(h = \\sqrt{l^2 - r^2} = \\sqrt{5^2 - 3^2} = \\sqrt{25 - 9} = 4\\)。体积 \\(V = \\frac{1}{3}\\pi r^2 h = \\frac{1}{3}\\pi \\times 9 \\times 4 = 12\\pi\\)。"
        }
      ]
    }
  ]
}
