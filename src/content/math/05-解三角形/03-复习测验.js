/**
 * 内容页面数据（content-schema 的实例）
 * 页面：解三角形 · 复习测验
 * 说明：
 *  - 本页为单元综合测验，主要由选择题 / 填空题 / 解答题三个 quiz/example 区块构成
 *  - 文本中的 LaTeX 公式（\(...\)）由 MathJaxRender 组件渲染
 */
export default {
  id: "math-05-03",
  unitNum: "05",
  subject: "math",
  title: "解三角形 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。考查正弦定理、余弦定理、面积公式及解三角形的实际应用，注意 SSA 多解情况的判断，请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题（每题5分，共40分） ----------
    {
      type: "quiz",
      title: "一、选择题（每题 5 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          question: "在 \\(\\triangle ABC\\) 中，已知 \\(A = 60°\\)，\\(B = 45°\\)，则 \\(a : b =\\)（　）\nA. \\(\\sqrt{3} : 1\\)　　B. \\(1 : \\sqrt{3}\\)　　C. \\(\\sqrt{3} : \\sqrt{2}\\)　　D. \\(\\sqrt{2} : \\sqrt{3}\\)",
          answer: "**C**。由正弦定理 \\(a : b = \\sin A : \\sin B = \\sin 60° : \\sin 45° = \\frac{\\sqrt{3}}{2} : \\frac{\\sqrt{2}}{2} = \\sqrt{3} : \\sqrt{2}\\)。"
        },
        {
          difficulty: "basic",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = \\sqrt{3}\\)，\\(b = 1\\)，\\(C = 30°\\)，则边 \\(c =\\)（　）\nA. 1　　B. \\(\\sqrt{2}\\)　　C. 2　　D. \\(\\sqrt{3}\\)",
          answer: "**A**。\\(c^2 = a^2 + b^2 - 2ab\\cos C = 3 + 1 - 2\\times\\sqrt{3}\\times 1\\times\\frac{\\sqrt{3}}{2} = 4 - 3 = 1\\)，\\(c = 1\\)。"
        },
        {
          difficulty: "basic",
          question: "在 \\(\\triangle ABC\\) 中，\\(a^2 + b^2 = c^2\\)，则三角形为（　）\nA. 锐角三角形　　B. 直角三角形　　C. 钝角三角形　　D. 无法确定",
          answer: "**B**。由勾股定理逆定理，\\(a^2 + b^2 = c^2\\) 时角 \\(C = 90°\\)，即直角三角形（直角边为 \\(a, b\\)，斜边为 \\(c\\)）。"
        },
        {
          difficulty: "medium",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 2\\)，\\(b = 3\\)，\\(c = 4\\)，则最大角的余弦值为（　）\nA. \\(\\frac{1}{4}\\)　　B. \\(-\\frac{1}{4}\\)　　C. \\(\\frac{11}{12}\\)　　D. \\(-\\frac{11}{12}\\)",
          answer: "**B**。最大边为 \\(c = 4\\)，最大角为 \\(C\\)。\\(\\cos C = \\frac{a^2 + b^2 - c^2}{2ab} = \\frac{4 + 9 - 16}{12} = -\\frac{1}{4}\\)。"
        },
        {
          difficulty: "medium",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 4\\)，\\(b = 4\\sqrt{2}\\)，\\(A = 30°\\)，则角 \\(B\\) 的值为（　）\nA. 45°　　B. 45° 或 135°　　C. 30°　　D. 60°或120°",
          answer: "**B**。由正弦定理 \\(\\sin B = \\frac{b\\sin A}{a} = \\frac{4\\sqrt{2}\\times\\frac{1}{2}}{4} = \\frac{\\sqrt{2}}{2}\\)。\\(b > a\\)，\\(B > A\\)，\\(B = 45°\\) 或 \\(135°\\) 均可使 \\(A + B < 180°\\)，均成立（SSA 两解）。"
        },
        {
          difficulty: "medium",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 3\\)，\\(b = 4\\)，\\(C = 60°\\)，则三角形面积 \\(S =\\)（　）\nA. \\(6\\sqrt{3}\\)　　B. \\(3\\sqrt{3}\\)　　C. \\(6\\)　　D. \\(12\\)",
          answer: "**B**。\\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2}\\times 3\\times 4\\times\\sin 60° = 6\\times\\frac{\\sqrt{3}}{2} = 3\\sqrt{3}\\)。"
        },
        {
          difficulty: "advanced",
          question: "在 \\(\\triangle ABC\\) 中，若 \\(a^2 = b^2 + c^2 + bc\\)，则角 \\(A =\\)（　）\nA. 60°　　B. 90°　　C. 120°　　D. 30°",
          answer: "**C**。由余弦定理 \\(a^2 = b^2 + c^2 - 2bc\\cos A\\)，与 \\(a^2 = b^2 + c^2 + bc\\) 比较得 \\(-2bc\\cos A = bc\\)，\\(\\cos A = -\\frac{1}{2}\\)，故 \\(A = 120°\\)。"
        },
        {
          difficulty: "advanced",
          question: "在 \\(\\triangle ABC\\) 中，若 \\(a\\cos B = b\\cos A\\)，则 \\(\\triangle ABC\\) 的形状为（　）\nA. 直角三角形　　B. 等腰三角形　　C. 等边三角形　　D. 等腰直角三角形",
          answer: "**B**。由正弦定理 \\(a = 2R\\sin A\\)，\\(b = 2R\\sin B\\) 代入：\\(\\sin A\\cos B = \\sin B\\cos A\\)，即 \\(\\sin(A - B) = 0\\)。因 \\(A, B \\in (0, \\pi)\\)，故 \\(A = B\\)，三角形为等腰三角形。"
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
          question: "在 \\(\\triangle ABC\\) 中，\\(A = 30°\\)，\\(B = 45°\\)，\\(a = 2\\sqrt{2}\\)，则 \\(b =\\) ______。",
          answer: "由正弦定理 \\(b = \\frac{a\\sin B}{\\sin A} = \\frac{2\\sqrt{2}\\times\\frac{\\sqrt{2}}{2}}{\\frac{1}{2}} = \\frac{2}{\\frac{1}{2}} = 4\\)。"
        },
        {
          difficulty: "medium",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 5\\)，\\(b = 3\\)，\\(\\sin A = \\frac{5}{6}\\)，则 \\(\\sin B =\\) ______。",
          answer: "由正弦定理 \\(\\sin B = \\frac{b\\sin A}{a} = \\frac{3\\times\\frac{5}{6}}{5} = \\frac{\\frac{15}{6}}{5} = \\frac{1}{2}\\)。"
        },
        {
          difficulty: "medium",
          question: "在 \\(\\triangle ABC\\) 中，\\(A = 60°\\)，\\(b = 4\\)，\\(c = 3\\)，则边 \\(a =\\) ______。",
          answer: "由余弦定理 \\(a^2 = b^2 + c^2 - 2bc\\cos A = 16 + 9 - 2\\times 4\\times 3\\times\\frac{1}{2} = 25 - 12 = 13\\)，\\(a = \\sqrt{13}\\)。"
        },
        {
          difficulty: "advanced",
          question: "在 \\(\\triangle ABC\\) 中，\\(a = 6\\)，\\(b = 8\\)，\\(C = 60°\\)，则三角形的面积 \\(S =\\) ______。",
          answer: "\\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2}\\times 6\\times 8\\times\\sin 60° = 24\\times\\frac{\\sqrt{3}}{2} = 12\\sqrt{3}\\)。"
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
          question: "在 \\(\\triangle ABC\\) 中，已知 \\(a = 6\\)，\\(b = 8\\)，\\(C = 60°\\)。求：\n（1）边 \\(c\\) 的值；\n（2）\\(\\triangle ABC\\) 的面积 \\(S\\)。",
          solution: "**解：**\n（1）由余弦定理：\n\\(c^2 = a^2 + b^2 - 2ab\\cos C = 36 + 64 - 2\\times 6\\times 8\\times\\cos 60°\\)\n\\(= 100 - 96\\times\\frac{1}{2} = 100 - 48 = 52\\)\n所以 \\(c = \\sqrt{52} = 2\\sqrt{13}\\)。\n（2）由面积公式：\n\\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2}\\times 6\\times 8\\times\\sin 60° = 24\\times\\frac{\\sqrt{3}}{2} = 12\\sqrt{3}\\)。",
          answer: "（1）\\(c = 2\\sqrt{13}\\)；（2）\\(S = 12\\sqrt{3}\\)。"
        },
        {
          title: "第2题（13分）",
          question: "在 \\(\\triangle ABC\\) 中，\\(A = 30°\\)，\\(B = 45°\\)，\\(a = 2\\sqrt{2}\\)。\n（1）求 \\(b\\) 的值；\n（2）由内角和求 \\(C\\)，并求边 \\(c\\)。",
          solution: "**解：**\n（1）由正弦定理 \\(\\frac{a}{\\sin A} = \\frac{b}{\\sin B}\\)：\n\\(b = \\frac{a\\sin B}{\\sin A} = \\frac{2\\sqrt{2}\\times\\frac{\\sqrt{2}}{2}}{\\frac{1}{2}} = \\frac{2}{\\frac{1}{2}} = 4\\)。\n（2）\\(C = 180° - A - B = 180° - 30° - 45° = 105°\\)。\n由正弦定理：\\(\\sin 105° = \\sin(60° + 45°) = \\sin 60°\\cos 45° + \\cos 60°\\sin 45°\\)\n\\(= \\frac{\\sqrt{3}}{2}\\times\\frac{\\sqrt{2}}{2} + \\frac{1}{2}\\times\\frac{\\sqrt{2}}{2} = \\frac{\\sqrt{6} + \\sqrt{2}}{4}\\)\n\\(c = \\frac{a\\sin C}{\\sin A} = \\frac{2\\sqrt{2}\\times\\frac{\\sqrt{6}+\\sqrt{2}}{4}}{\\frac{1}{2}} = 2\\sqrt{2}\\times\\frac{\\sqrt{6}+\\sqrt{2}}{4}\\times 2 = \\sqrt{2}\\times(\\sqrt{6}+\\sqrt{2}) = \\sqrt{12} + 2 = 2\\sqrt{3} + 2\\)。",
          answer: "（1）\\(b = 4\\)；（2）\\(C = 105°\\)，\\(c = 2 + 2\\sqrt{3}\\)。"
        },
        {
          title: "第3题（15分）",
          question: "在 \\(\\triangle ABC\\) 中，\\(b = 3\\)，\\(c = 3\\sqrt{3}\\)，\\(B = 30°\\)。求角 \\(C\\) 和边 \\(a\\) 的值（注意判断解的个数）。",
          solution: "**解：**\n由正弦定理：\\(\\sin C = \\frac{c\\sin B}{b} = \\frac{3\\sqrt{3}\\times\\frac{1}{2}}{3} = \\frac{\\sqrt{3}}{2}\\)。\n因为 \\(c = 3\\sqrt{3} > b = 3\\)，所以 \\(C > B\\)，\\(C\\) 可能为锐角或钝角，故 \\(C = 60°\\) 或 \\(C = 120°\\)。\n当 \\(C = 60°\\) 时，\\(A = 180° - 30° - 60° = 90°\\)，由正弦定理 \\(a = \\frac{b\\sin A}{\\sin B} = \\frac{3\\times 1}{\\frac{1}{2}} = 6\\)；\n当 \\(C = 120°\\) 时，\\(A = 180° - 30° - 120° = 30°\\)，由正弦定理 \\(a = \\frac{b\\sin A}{\\sin B} = \\frac{3\\times\\frac{1}{2}}{\\frac{1}{2}} = 3\\)。\n所以 \\(C = 60°, a = 6\\) 或 \\(C = 120°, a = 3\\)，两种情况均满足三内角和为 \\(180°\\)，故本题有两解。",
          answer: "\\(C = 60°, a = 6\\) 或 \\(C = 120°, a = 3\\)（SSA 情况有两解）。"
        }
      ]
    }
  ]
}