/**
 * 内容页面数据（content-schema 的实例）
 * 页面：平面向量 · 复习测验
 * 说明：
 *  - 本页为单元综合测验，主要由选择题 / 填空题 / 解答题三个 quiz/example 区块构成
 *  - 文本中的 LaTeX 公式（\(...\)）由 MathJaxRender 组件渲染
 */
export default {
  id: "math-07-05",
  unitNum: "07",
  subject: "math",
  title: "平面向量 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题（每题5分，共40分） ----------
    {
      type: "quiz",
      title: "一、选择题（每题 5 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          question: "已知向量 \\(\\boldsymbol{a} = (2, 3)\\)，\\(\\boldsymbol{b} = (-1, 4)\\)，则 \\(\\boldsymbol{a} + \\boldsymbol{b} =\\)（　）\nA. \\((-1, 7)\\)　　B. \\((1, 7)\\)　　C. \\((3, -1)\\)　　D. \\((3, 1)\\)",
          answer: "**B**。\\(\\boldsymbol{a} + \\boldsymbol{b} = (2 + (-1), 3 + 4) = (1, 7)\\)。"
        },
        {
          difficulty: "basic",
          question: "已知向量 \\(\\boldsymbol{a} = (3, 4)\\)，则 \\(|\\boldsymbol{a}| =\\)（　）\nA. 5　　B. 7　　C. 25　　D. 12",
          answer: "**A**。\\(|\\boldsymbol{a}| = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5\\)。"
        },
        {
          difficulty: "medium",
          question: "已知向量 \\(\\boldsymbol{a} = (2, 1)\\)，\\(\\boldsymbol{b} = (m, 3)\\)，若 \\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)，则 \\(m =\\)（　）\nA. 6　　B. 3　　C. 4　　D. -6",
          answer: "**A**。由共线条件 \\(x_1 y_2 - x_2 y_1 = 0\\)，即 \\(2\\times 3 - m\\times 1 = 0\\)，解得 \\(m = 6\\)。"
        },
        {
          difficulty: "basic",
          question: "已知向量 \\(\\boldsymbol{a} = (3, -2)\\)，\\(\\boldsymbol{b} = (1, 4)\\)，则 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} =\\)（　）\nA. 5　　B. -5　　C. 11　　D. -11",
          answer: "**B**。\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 3\\times 1 + (-2)\\times 4 = 3 - 8 = -5\\)。"
        },
        {
          difficulty: "medium",
          question: "已知向量 \\(\\boldsymbol{a} = (1, 2)\\)，\\(\\boldsymbol{b} = (m, -1)\\)，若 \\(\\boldsymbol{a} \\perp \\boldsymbol{b}\\)，则 \\(m =\\)（　）\nA. -2　　B. 2　　C. 1　　D. -1",
          answer: "**B**。由垂直条件 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\)，即 \\(m - 2 = 0\\)，解得 \\(m = 2\\)。"
        },
        {
          difficulty: "medium",
          question: "已知向量 \\(\\boldsymbol{a} = (1, \\sqrt{3})\\)，\\(\\boldsymbol{b} = (\\sqrt{3}, 1)\\)，则 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角为（　）\nA. \\(\\frac{\\pi}{3}\\)　　B. \\(\\frac{\\pi}{4}\\)　　C. \\(\\frac{\\pi}{6}\\)　　D. \\(\\frac{\\pi}{2}\\)",
          answer: "**C**。\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = \\sqrt{3} + \\sqrt{3} = 2\\sqrt{3}\\)，\\(|\\boldsymbol{a}| = 2\\)，\\(|\\boldsymbol{b}| = 2\\)，\\(\\cos\\theta = \\frac{2\\sqrt{3}}{4} = \\frac{\\sqrt{3}}{2}\\)，故 \\(\\theta = \\frac{\\pi}{6}\\)。"
        },
        {
          difficulty: "medium",
          question: "化简 \\(2(\\boldsymbol{a} + \\boldsymbol{b}) - 3(\\boldsymbol{a} - \\boldsymbol{b}) =\\)（　）\nA. \\(-\\boldsymbol{a} + 5\\boldsymbol{b}\\)　　B. \\(5\\boldsymbol{a} - \\boldsymbol{b}\\)　　C. \\(-\\boldsymbol{a} - 5\\boldsymbol{b}\\)　　D. \\(5\\boldsymbol{a} + \\boldsymbol{b}\\)",
          answer: "**A**。\\(2\\boldsymbol{a} + 2\\boldsymbol{b} - 3\\boldsymbol{a} + 3\\boldsymbol{b} = -\\boldsymbol{a} + 5\\boldsymbol{b}\\)。"
        },
        {
          difficulty: "advanced",
          question: "已知 \\(|\\boldsymbol{a}| = 2\\)，\\(|\\boldsymbol{b}| = 3\\)，\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = -3\\)，则 \\(|\\boldsymbol{a} + \\boldsymbol{b}| =\\)（　）\nA. \\(\\sqrt{7}\\)　　B. 7　　C. \\(\\sqrt{13}\\)　　D. 1",
          answer: "**A**。\\(|\\boldsymbol{a} + \\boldsymbol{b}|^2 = |\\boldsymbol{a}|^2 + |\\boldsymbol{b}|^2 + 2\\boldsymbol{a} \\cdot \\boldsymbol{b} = 4 + 9 + 2\\times (-3) = 7\\)，所以 \\(|\\boldsymbol{a} + \\boldsymbol{b}| = \\sqrt{7}\\)。"
        }
      ]
    },
    // ---------- 二、填空题（每题5分，共20分） ----------
    {
      type: "quiz",
      title: "二、填空题（每题 5 分，共 20 分）",
      items: [
        {
          difficulty: "medium",
          question: "已知点 \\(A(-2, 3)\\)，\\(B(4, -1)\\)，则线段 \\(AB\\) 的中点 \\(M\\) 的坐标是 ______。",
          answer: "\\((1, 1)\\)。中点坐标 \\(M = \\left(\\frac{-2 + 4}{2}, \\frac{3 + (-1)}{2}\\right) = (1, 1)\\)。"
        },
        {
          difficulty: "medium",
          question: "已知向量 \\(\\boldsymbol{a} = (1, -2)\\)，\\(\\boldsymbol{b} = (3, 5)\\)，则 \\(\\boldsymbol{a} + 2\\boldsymbol{b} =\\) ______。",
          answer: "\\((7, 8)\\)。\\(\\boldsymbol{a} + 2\\boldsymbol{b} = (1, -2) + (6, 10) = (7, 8)\\)。"
        },
        {
          difficulty: "medium",
          question: "化简：\\(\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{CD} + \\overrightarrow{DA} =\\) ______。",
          answer: "\\(\\boldsymbol{0}\\)（零向量）。原式 \\(= \\overrightarrow{AD} + \\overrightarrow{DA} = \\overrightarrow{AD} - \\overrightarrow{AD} = \\boldsymbol{0}\\)。"
        },
        {
          difficulty: "advanced",
          question: "已知 \\(|\\boldsymbol{a}| = 2\\)，\\(|\\boldsymbol{b}| = 3\\)，\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = -3\\)，则 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角 \\(\\theta =\\) ______。",
          answer: "\\(\\theta = \\frac{2\\pi}{3}\\)（\\(120°\\)）。\\(\\cos\\theta = \\frac{\\boldsymbol{a}\\cdot\\boldsymbol{b}}{|\\boldsymbol{a}||\\boldsymbol{b}|} = \\frac{-3}{2\\times 3} = -\\frac{1}{2}\\)，故 \\(\\theta = 120°\\)。"
        }
      ]
    },
    // ---------- 三、解答题（共40分） ----------
    {
      type: "example",
      title: "三、解答题（共 40 分）",
      items: [
        {
          title: "第1题（12分）",
          question: "已知向量 \\(\\boldsymbol{a} = (2, 3)\\)，\\(\\boldsymbol{b} = (-1, 4)\\)。\n（1）求 \\(\\boldsymbol{a} + \\boldsymbol{b}\\)、\\(\\boldsymbol{a} - \\boldsymbol{b}\\) 和 \\(2\\boldsymbol{a} - 3\\boldsymbol{b}\\)；\n（2）求 \\(|\\boldsymbol{a}|\\) 与 \\(|\\boldsymbol{b}|\\)。",
          solution: "**解：**\n（1）\\(\\boldsymbol{a} + \\boldsymbol{b} = (2 + (-1), 3 + 4) = (1, 7)\\)。\n\\(\\boldsymbol{a} - \\boldsymbol{b} = (2 - (-1), 3 - 4) = (3, -1)\\)。\n\\(2\\boldsymbol{a} - 3\\boldsymbol{b} = 2(2, 3) - 3(-1, 4) = (4, 6) - (-3, 12) = (7, -6)\\)。\n（2）\\(|\\boldsymbol{a}| = \\sqrt{2^2 + 3^2} = \\sqrt{13}\\)，\\(|\\boldsymbol{b}| = \\sqrt{(-1)^2 + 4^2} = \\sqrt{17}\\)。",
          answer: "（1）\\(\\boldsymbol{a} + \\boldsymbol{b} = (1, 7)\\)，\\(\\boldsymbol{a} - \\boldsymbol{b} = (3, -1)\\)，\\(2\\boldsymbol{a} - 3\\boldsymbol{b} = (7, -6)\\)；（2）\\(|\\boldsymbol{a}| = \\sqrt{13}\\)，\\(|\\boldsymbol{b}| = \\sqrt{17}\\)。"
        },
        {
          title: "第2题（13分）",
          question: "已知向量 \\(\\boldsymbol{a} = (2, 1)\\)，\\(\\boldsymbol{b} = (m, 3)\\)。\n（1）若 \\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)，求 \\(m\\) 的值；\n（2）若 \\(\\boldsymbol{a} \\perp (\\boldsymbol{a} - 2\\boldsymbol{b})\\)，求 \\(m\\) 的值。",
          solution: "**解：**\n（1）由共线条件 \\(x_1 y_2 - x_2 y_1 = 0\\)，即 \\(2\\times 3 - m\\times 1 = 0\\)，解得 \\(m = 6\\)。\n（2）\\(\\boldsymbol{a} - 2\\boldsymbol{b} = (2, 1) - (2m, 6) = (2 - 2m, -5)\\)。\n由 \\(\\boldsymbol{a} \\perp (\\boldsymbol{a} - 2\\boldsymbol{b})\\)，得 \\(\\boldsymbol{a} \\cdot (\\boldsymbol{a} - 2\\boldsymbol{b}) = 0\\)，即\n\\(2\\times (2 - 2m) + 1\\times (-5) = 4 - 4m - 5 = -4m - 1 = 0\\)，解得 \\(m = -\\frac{1}{4}\\)。",
          answer: "（1）\\(m = 6\\)；（2）\\(m = -\\frac{1}{4}\\)。"
        },
        {
          title: "第3题（15分）",
          question: "已知 \\(|\\boldsymbol{a}| = 2\\)，\\(|\\boldsymbol{b}| = 3\\)，\\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 的夹角为 \\(60°\\)。\n（1）求 \\(\\boldsymbol{a} \\cdot \\boldsymbol{b}\\)；\n（2）求 \\(|\\boldsymbol{a} + \\boldsymbol{b}|\\)；\n（3）求 \\((\\boldsymbol{a} + 2\\boldsymbol{b}) \\cdot (\\boldsymbol{a} - \\boldsymbol{b})\\)。",
          solution: "**解：**\n（1）由数量积定义：\n\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos 60° = 2\\times 3\\times \\frac{1}{2} = 3\\)。\n（2）\\(|\\boldsymbol{a} + \\boldsymbol{b}|^2 = |\\boldsymbol{a}|^2 + |\\boldsymbol{b}|^2 + 2\\boldsymbol{a} \\cdot \\boldsymbol{b} = 4 + 9 + 2\\times 3 = 19\\)，故 \\(|\\boldsymbol{a} + \\boldsymbol{b}| = \\sqrt{19}\\)。\n（3）\\((\\boldsymbol{a} + 2\\boldsymbol{b}) \\cdot (\\boldsymbol{a} - \\boldsymbol{b}) = \\boldsymbol{a} \\cdot \\boldsymbol{a} - \\boldsymbol{a} \\cdot \\boldsymbol{b} + 2\\boldsymbol{b} \\cdot \\boldsymbol{a} - 2\\boldsymbol{b} \\cdot \\boldsymbol{b}\\)\n\\(= |\\boldsymbol{a}|^2 + \\boldsymbol{a} \\cdot \\boldsymbol{b} - 2|\\boldsymbol{b}|^2 = 4 + 3 - 2\\times 9 = -11\\)。",
          answer: "（1）\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 3\\)；（2）\\(|\\boldsymbol{a} + \\boldsymbol{b}| = \\sqrt{19}\\)；（3）\\((\\boldsymbol{a} + 2\\boldsymbol{b}) \\cdot (\\boldsymbol{a} - \\boldsymbol{b}) = -11\\)。"
        }
      ]
    }
  ]
}