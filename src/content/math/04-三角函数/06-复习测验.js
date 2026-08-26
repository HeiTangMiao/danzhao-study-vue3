/**
 * 内容页面数据（content-schema 的实例）
 * 页面：三角函数 · 复习测验
 * 说明：
 *  - 本页为单元综合测验，主要由选择题 / 填空题 / 解答题三个 quiz/example 区块构成
 *  - 文本中的 LaTeX 公式（\(...\)）由 MathJaxRender 组件渲染
 */
export default {
  id: "math-04-06",
  unitNum: "04",
  subject: "math",
  title: "三角函数 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。考查任意角与弧度制、同角关系、诱导公式、三角恒等变换及函数图像性质，请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题（每题5分，共40分） ----------
    {
      type: "quiz",
      title: "一、选择题（每题 5 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          question: "\\(\\frac{7\\pi}{6}\\) 化为角度为（　）\nA. 150°　　B. 210°　　C. 240°　　D. 330°",
          answer: "**B**。\\(\\frac{7\\pi}{6} \\times \\frac{180°}{\\pi} = \\frac{7}{6} \\times 180° = 210°\\)。"
        },
        {
          difficulty: "basic",
          question: "已知角 \\(\\alpha\\) 的终边经过点 \\(P(-4, 3)\\)，则 \\(\\sin\\alpha =\\)（　）\nA. \\(\\frac{3}{5}\\)　　B. \\(-\\frac{4}{5}\\)　　C. \\(-\\frac{3}{4}\\)　　D. \\(\\frac{4}{5}\\)",
          answer: "**A**。\\(r = \\sqrt{(-4)^2 + 3^2} = \\sqrt{25} = 5\\)，\\(\\sin\\alpha = \\frac{y}{r} = \\frac{3}{5}\\)。"
        },
        {
          difficulty: "basic",
          question: "若 \\(\\sin\\alpha > 0\\) 且 \\(\\cos\\alpha < 0\\)，则角 \\(\\alpha\\) 所在象限为（　）\nA. 第一象限　　B. 第二象限　　C. 第三象限　　D. 第四象限",
          answer: "**B**。口诀\"一全正、二正弦、三正切、四余弦\"，正弦为正、余弦为负，即第二象限（二正弦）。"
        },
        {
          difficulty: "medium",
          question: "已知 \\(\\sin\\alpha = \\frac{4}{5}\\)，且 \\(\\alpha\\) 为第二象限角，则 \\(\\tan\\alpha =\\)（　）\nA. \\(\\frac{4}{3}\\)　　B. \\(-\\frac{4}{3}\\)　　C. \\(\\frac{3}{4}\\)　　D. \\(-\\frac{3}{4}\\)",
          answer: "**B**。第二象限 \\(\\cos\\alpha < 0\\)，\\(\\cos\\alpha = -\\sqrt{1 - \\sin^2\\alpha} = -\\sqrt{1 - \\frac{16}{25}} = -\\frac{3}{5}\\)，故 \\(\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{\\frac{4}{5}}{-\\frac{3}{5}} = -\\frac{4}{3}\\)。"
        },
        {
          difficulty: "medium",
          question: "化简 \\(\\sin\\left(\\frac{\\pi}{2} + \\alpha\\right)\\) 的结果为（　）\nA. \\(\\sin\\alpha\\)　　B. \\(-\\sin\\alpha\\)　　C. \\(\\cos\\alpha\\)　　D. \\(-\\cos\\alpha\\)",
          answer: "**C**。\\(k = 1\\) 为奇数，函数名改变（正弦变余弦）；将 \\(\\alpha\\) 视为锐角，\\(\\frac{\\pi}{2} + \\alpha\\) 在第二象限，\\(\\sin\\) 为正，故 \\(\\sin\\left(\\frac{\\pi}{2} + \\alpha\\right) = \\cos\\alpha\\)。"
        },
        {
          difficulty: "medium",
          question: "已知 \\(\\sin\\alpha = \\frac{5}{13}\\)，\\(\\alpha \\in \\left(\\frac{\\pi}{2}, \\pi\\right)\\)，则 \\(\\cos 2\\alpha =\\)（　）\nA. \\(\\frac{10}{13}\\)　　B. \\(\\frac{119}{169}\\)　　C. \\(-\\frac{119}{169}\\)　　D. \\(-\\frac{10}{13}\\)",
          answer: "**B**。\\(\\cos 2\\alpha = 1 - 2\\sin^2\\alpha = 1 - 2 \\times \\frac{25}{169} = 1 - \\frac{50}{169} = \\frac{119}{169}\\)。"
        },
        {
          difficulty: "medium",
          question: "函数 \\(f(x) = 3\\sin\\left(2x + \\frac{\\pi}{3}\\right)\\) 的最小正周期为（　）\nA. \\(\\pi\\)　　B. \\(2\\pi\\)　　C. \\(\\frac{\\pi}{2}\\)　　D. \\(4\\pi\\)",
          answer: "**A**。\\(\\omega = 2\\)，周期 \\(T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{2} = \\pi\\)。"
        },
        {
          difficulty: "advanced",
          question: "将函数 \\(f(x) = \\sin x - \\sqrt{3}\\cos x\\) 化为 \\(A\\sin(x + \\varphi)\\) 的形式，结果为（　）\nA. \\(2\\sin\\left(x - \\frac{\\pi}{3}\\right)\\)　　B. \\(2\\sin\\left(x + \\frac{\\pi}{3}\\right)\\)\nC. \\(\\sqrt{2}\\sin\\left(x - \\frac{\\pi}{3}\\right)\\)　　D. \\(\\sqrt{2}\\sin\\left(x + \\frac{\\pi}{3}\\right)\\)",
          answer: "**A**。\\(A = \\sqrt{1^2 + (-\\sqrt{3})^2} = 2\\)，\\(\\tan\\varphi = \\frac{b}{a} = -\\sqrt{3}\\)，点 \\((1, -\\sqrt{3})\\) 在第四象限，故 \\(\\varphi = -\\frac{\\pi}{3}\\)，即 \\(f(x) = 2\\sin\\left(x - \\frac{\\pi}{3}\\right)\\)。"
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
          question: "已知扇形的半径为 \\(6\\) cm，圆心角为 \\(\\frac{\\pi}{3}\\) rad，则该扇形的弧长为 ______ cm。",
          answer: "\\(l = |\\alpha|\\cdot r = \\frac{\\pi}{3} \\times 6 = 2\\pi\\) cm。"
        },
        {
          difficulty: "medium",
          question: "求值：\\(\\sin\\frac{7\\pi}{6} =\\) ______。",
          answer: "\\(\\sin\\frac{7\\pi}{6} = \\sin\\left(\\pi + \\frac{\\pi}{6}\\right) = -\\sin\\frac{\\pi}{6} = -\\frac{1}{2}\\)。"
        },
        {
          difficulty: "medium",
          question: "已知 \\(\\tan\\alpha = 2\\)，则 \\(\\frac{\\sin\\alpha + \\cos\\alpha}{\\sin\\alpha - \\cos\\alpha} =\\) ______。",
          answer: "分子分母同除以 \\(\\cos\\alpha\\)：\\(\\frac{\\tan\\alpha + 1}{\\tan\\alpha - 1} = \\frac{2 + 1}{2 - 1} = 3\\)。"
        },
        {
          difficulty: "advanced",
          question: "函数 \\(y = \\tan\\left(2x + \\frac{\\pi}{3}\\right)\\) 的最小正周期为 ______。",
          answer: "正切函数周期 \\(T = \\frac{\\pi}{|\\omega|} = \\frac{\\pi}{2}\\)。"
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
          question: "已知 \\(\\sin\\alpha = \\frac{5}{13}\\)，且 \\(\\alpha\\) 为第二象限角，求 \\(\\cos\\alpha\\) 与 \\(\\tan\\alpha\\) 的值。",
          solution: "**解：**\n因为 \\(\\alpha\\) 为第二象限角，\\(\\cos\\alpha < 0\\)。\n由平方关系 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\)：\n\\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = 1 - \\frac{25}{169} = \\frac{144}{169}\\)\n所以 \\(\\cos\\alpha = -\\sqrt{\\frac{144}{169}} = -\\frac{12}{13}\\)。\n由商数关系 \\(\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{\\frac{5}{13}}{-\\frac{12}{13}} = -\\frac{5}{12}\\)。",
          answer: "\\(\\cos\\alpha = -\\frac{12}{13}\\)，\\(\\tan\\alpha = -\\frac{5}{12}\\)。"
        },
        {
          title: "第2题（13分）",
          question: "化简求值：\\(\\sin(\\pi - \\alpha)\\cos(-\\alpha)\\)，其中 \\(\\alpha = \\frac{\\pi}{3}\\)。",
          solution: "**解：**\n由诱导公式：\\(\\sin(\\pi - \\alpha) = \\sin\\alpha\\)，\\(\\cos(-\\alpha) = \\cos\\alpha\\)。\n原式 \\(= \\sin\\alpha \\cdot \\cos\\alpha\\)。\n当 \\(\\alpha = \\frac{\\pi}{3}\\) 时，\\(\\sin\\frac{\\pi}{3} = \\frac{\\sqrt{3}}{2}\\)，\\(\\cos\\frac{\\pi}{3} = \\frac{1}{2}\\)。\n原式 \\(= \\frac{\\sqrt{3}}{2} \\times \\frac{1}{2} = \\frac{\\sqrt{3}}{4}\\)。",
          answer: "原式 \\(= \\sin\\alpha\\cos\\alpha = \\frac{\\sqrt{3}}{4}\\)。"
        },
        {
          title: "第3题（15分）",
          question: "已知函数 \\(f(x) = 2\\sin\\left(2x - \\frac{\\pi}{6}\\right)\\)。\n（1）求函数的最小正周期、最大值和最小值；\n（2）求函数取得最大值时 \\(x\\) 的集合。",
          solution: "**解：**\n（1）\\(\\omega = 2\\)，所以最小正周期 \\(T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{2} = \\pi\\)。\n振幅 \\(A = 2\\)，所以最大值为 \\(2\\)，最小值为 \\(-2\\)。\n（2）令 \\(\\sin\\left(2x - \\frac{\\pi}{6}\\right) = 1\\)，即 \\(2x - \\frac{\\pi}{6} = \\frac{\\pi}{2} + 2k\\pi\\)（\\(k \\in \\mathbb{Z}\\)）。\n解得 \\(2x = \\frac{\\pi}{6} + \\frac{\\pi}{2} + 2k\\pi = \\frac{2\\pi}{3} + 2k\\pi\\)，即 \\(x = \\frac{\\pi}{3} + k\\pi\\)（\\(k \\in \\mathbb{Z}\\)）。\n所以取得最大值时 \\(x\\) 的集合为 \\(\\left\\{x \\mid x = \\frac{\\pi}{3} + k\\pi, k \\in \\mathbb{Z}\\right\\}\\)。",
          answer: "（1）周期 \\(\\pi\\)，最大值 \\(2\\)，最小值 \\(-2\\)；（2）\\(x = \\frac{\\pi}{3} + k\\pi\\)，\\(k \\in \\mathbb{Z}\\)。"
        }
      ]
    }
  ]
}