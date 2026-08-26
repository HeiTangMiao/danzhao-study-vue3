/**
 * 内容页面数据（content-schema 的实例）
 * 页面：三角恒等变换
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-04-04",
  "unitNum": "04",
  "subject": "math",
  "title": "三角恒等变换",
  "subtitle": "和差公式、倍角公式、辅助角公式",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  ROOT[\"三角恒等变换\"]\n  ROOT --> A[\"两角和差公式\"]\n  ROOT --> B[\"二倍角公式\"]\n  ROOT --> C[\"半角公式\"]\n  ROOT --> D[\"辅助角公式\"]\n  ROOT --> E[\"和差化积·积化和差\"]\n  A --> A1[\"cos(α±β)=cosαcosβ∓sinαsinβ\"]\n  A --> A2[\"sin(α±β)=sinαcosβ±cosαsinβ\"]\n  A --> A3[\"tan(α±β)=(tanα±tanβ)/(1∓tanαtanβ)\"]\n  B --> B1[\"sin2α=2sinαcosα\"]\n  B --> B2[\"cos2α=cos²α-sin²α<br/>=2cos²α-1=1-2sin²α\"]\n  B --> B3[\"tan2α=2tanα/(1-tan²α)\"]\n  C --> C1[\"sin(α/2)=±√((1-cosα)/2)\"]\n  C --> C2[\"cos(α/2)=±√((1+cosα)/2)\"]\n  C --> C3[\"tan(α/2)=±√((1-cosα)/(1+cosα))\"]\n  D --> D1[\"asinα+bcosα<br/>=√(a²+b²)sin(α+φ)\"]\n  D --> D2[\"tanφ=b/a\"]\n  E --> E1[\"和差化积<br/>sinα+sinβ<br/>=2sin((α+β)/2)cos((α-β)/2)\"]\n  E --> E2[\"积化和差<br/>sinαcosβ<br/>=½·(sin(α+β)+sin(α-β))\"]\n  A -.->|\"α=β 推导\"| B\n  B -.->|\"逆用降幂\"| C\n  A -.->|\"代换推导\"| E1\n  E1 -.->|\"互逆\"| E2"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握两角和与差的正弦、余弦、正切公式",
        "熟练运用二倍角公式进行化简求值",
        "了解降幂公式和辅助角公式的应用",
        "能综合运用公式解决三角恒等变换问题"
      ]
    },
    {
      "type": "warning",
      "text": "注意余弦公式中的符号与正弦相反：\\(\\cos(\\alpha+\\beta)\\) 用减号，\\(\\cos(\\alpha-\\beta)\\) 用加号。"
    },
    {
      "type": "tip",
      "text": "降幂公式是二倍角公式的逆用，将二次幂降为一次幂，常用于化简和积分。"
    },
    {
      "type": "knowledge",
      "title": "四、辅助角公式",
      "paragraphs": [
        "辅助角公式的作用：将 \\(a\\sin x + b\\cos x\\) 形式化为单一三角函数 \\(\\sqrt{a^2+b^2}\\sin(x+\\varphi)\\)，便于求周期、最值等。"
      ]
    },
    {
      "type": "formula",
      "title": "辅助角公式",
      "formulas": [
        "\\tan\\varphi = \\dfrac{b}{a}",
        "\\varphi",
        "(a, b)"
      ]
    },
    {
      "type": "warning",
      "text": "半角公式中的\"±\"号由 \\(\\frac{\\alpha}{2}\\) 所在象限决定，必须根据角的范围确定符号，不能随意取舍。当 \\(\\alpha\\) 已知时，\\(\\frac{\\alpha}{2}\\) 的象限需由 \\(\\alpha\\) 的范围进一步缩小判断。"
    },
    {
      "type": "tip",
      "text": "和差化积公式的记忆技巧：正弦的和差结果中\"正弦配余弦\"，余弦的和结果为\"余弦配余弦\"，余弦的差结果前面多一个负号。"
    },
    {
      "type": "tip",
      "text": "积化和差与和差化积互为逆运算，两者均由两角和差公式推导而得，是三角恒等变换中\"升降次\"\"凑角\"的重要工具。"
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：化简求值",
          "question": "求值：\\(\\sin 75° - \\sin 15°\\)",
          "solution": "解：\n\n        利用和差化积或直接用和角公式：\n\n        \\(\\sin 75° = \\sin(45° + 30°) = \\sin 45°\\cos 30° + \\cos 45°\\sin 30°\\)\n\n        \\(= \\frac{\\sqrt{2}}{2} \\times \\frac{\\sqrt{3}}{2} + \\frac{\\sqrt{2}}{2} \\times \\frac{1}{2} = \\frac{\\sqrt{6}}{4} + \\frac{\\sqrt{2}}{4}\\)\n\n        \\(\\sin 15° = \\sin(45° - 30°) = \\sin 45°\\cos 30° - \\cos 45°\\sin 30°\\)\n\n        \\(= \\frac{\\sqrt{6}}{4} - \\frac{\\sqrt{2}}{4}\\)\n\n        原式 \\(= \\left(\\frac{\\sqrt{6}}{4} + \\frac{\\sqrt{2}}{4}\\right) - \\left(\\frac{\\sqrt{6}}{4} - \\frac{\\sqrt{2}}{4}\\right) = \\frac{2\\sqrt{2}}{4} = \\frac{\\sqrt{2}}{2}\\)",
          "answer": ""
        },
        {
          "title": "例题2：利用二倍角公式",
          "question": "已知 \\(\\cos\\alpha = \\frac{4}{5}\\)，\\(\\alpha \\in \\left(0, \\frac{\\pi}{2}\\right)\\)，求 \\(\\sin 2\\alpha\\) 和 \\(\\cos 2\\alpha\\) 的值。",
          "solution": "解：\n\n        因为 \\(\\alpha \\in \\left(0, \\frac{\\pi}{2}\\right)\\)，所以 \\(\\sin\\alpha > 0\\)。\n\n        \\(\\sin\\alpha = \\sqrt{1 - \\cos^2\\alpha} = \\sqrt{1 - \\frac{16}{25}} = \\sqrt{\\frac{9}{25}} = \\frac{3}{5}\\)\n\n        \\(\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha = 2 \\times \\frac{3}{5} \\times \\frac{4}{5} = \\frac{24}{25}\\)\n\n        \\(\\cos 2\\alpha = 2\\cos^2\\alpha - 1 = 2 \\times \\frac{16}{25} - 1 = \\frac{32}{25} - 1 = \\frac{7}{25}\\)",
          "answer": ""
        },
        {
          "title": "例题3：辅助角公式应用",
          "question": "将函数 \\(f(x) = \\sin x - \\sqrt{3}\\cos x\\) 化为 \\(A\\sin(x + \\varphi)\\) 的形式，并求其最大值和最小值。",
          "solution": "解：\n\n        这里 \\(a = 1\\)，\\(b = -\\sqrt{3}\\)\n\n        振幅 \\(A = \\sqrt{a^2 + b^2} = \\sqrt{1 + 3} = 2\\)\n\n        \\(\\tan\\varphi = \\frac{b}{a} = \\frac{-\\sqrt{3}}{1} = -\\sqrt{3}\\)，且点 \\((1, -\\sqrt{3})\\) 在第四象限\n\n        所以 \\(\\varphi = -\\frac{\\pi}{3}\\)\n\n        故 \\(f(x) = 2\\sin\\left(x - \\frac{\\pi}{3}\\right)\\)\n\n        最大值为 \\(f(x)_{\\max} = 2\\)，最小值为 \\(f(x)_{\\min} = -2\\)",
          "answer": ""
        },
        {
          "title": "例题4：公式推导",
          "question": "利用二倍角公式推导半角公式 \\(\\sin\\frac{\\alpha}{2} = \\pm\\sqrt{\\frac{1 - \\cos\\alpha}{2}}\\)。",
          "solution": "推导：\n\n        在二倍角公式 \\(\\cos 2\\theta = 1 - 2\\sin^2\\theta\\) 中，令 \\(\\theta = \\frac{\\alpha}{2}\\)，则 \\(2\\theta = \\alpha\\)。\n\n        代入得：\\(\\cos\\alpha = 1 - 2\\sin^2\\frac{\\alpha}{2}\\)\n\n        移项得：\\(2\\sin^2\\frac{\\alpha}{2} = 1 - \\cos\\alpha\\)，即 \\(\\sin^2\\frac{\\alpha}{2} = \\frac{1 - \\cos\\alpha}{2}\\)\n\n        两边开平方：\\(\\sin\\frac{\\alpha}{2} = \\pm\\sqrt{\\frac{1 - \\cos\\alpha}{2}}\\)\n\n        其中\"±\"号由 \\(\\frac{\\alpha}{2}\\) 所在象限确定：若 \\(\\frac{\\alpha}{2}\\) 在第一、二象限取\"+\"，在第三、四象限取\"−\"。\n\n        同理，由 \\(\\cos 2\\theta = 2\\cos^2\\theta - 1\\) 可推得 \\(\\cos\\frac{\\alpha}{2} = \\pm\\sqrt{\\frac{1 + \\cos\\alpha}{2}}\\)，说明半角公式本质上是二倍角公式的逆用。",
          "answer": ""
        },
        {
          "title": "例题5：易错辨析",
          "question": "将 \\(f(x) = -\\sin x - \\cos x\\) 化为 \\(A\\sin(x + \\varphi)\\) 的形式。",
          "solution": "常见错误解法：\n\n        这里 \\(a = -1\\)，\\(b = -1\\)，振幅 \\(A = \\sqrt{(-1)^2 + (-1)^2} = \\sqrt{2}\\)。\n\n        由 \\(\\tan\\varphi = \\frac{b}{a} = \\frac{-1}{-1} = 1\\)，得 \\(\\varphi = \\arctan 1 = \\frac{\\pi}{4}\\)。\n\n        于是错误地写 \\(f(x) = \\sqrt{2}\\sin\\left(x + \\frac{\\pi}{4}\\right)\\)（错误！）。\n\n        错误原因：仅由 \\(\\tan\\varphi = 1\\) 得 \\(\\varphi = \\frac{\\pi}{4}\\) 忽略了象限。辅助角 \\(\\varphi\\) 的终边由点 \\((a, b) = (-1, -1)\\) 确定，该点在第三象限，故 \\(\\varphi\\) 应为第三象限角，而非第一象限角。\\(\\arctan\\) 只能返回 \\(\\left(-\\frac{\\pi}{2}, \\frac{\\pi}{2}\\right)\\) 内的值，必须结合象限修正。\n\n        正确解法：\n\n        点 \\((a, b) = (-1, -1)\\) 在第三象限，\\(\\tan\\varphi = 1\\) 且 \\(\\varphi\\) 为第三象限角，故 \\(\\varphi = \\pi + \\frac{\\pi}{4} = \\frac{5\\pi}{4}\\)。\n\n        所以 \\(f(x) = \\sqrt{2}\\sin\\left(x + \\frac{5\\pi}{4}\\right)\\)。\n\n        验证：\\(\\sqrt{2}\\sin\\left(x + \\frac{5\\pi}{4}\\right) = \\sqrt{2}\\left[\\sin x\\cos\\frac{5\\pi}{4} + \\cos x\\sin\\frac{5\\pi}{4}\\right] = \\sqrt{2}\\left[\\sin x \\cdot \\left(-\\frac{\\sqrt{2}}{2}\\right) + \\cos x \\cdot \\left(-\\frac{\\sqrt{2}}{2}\\right)\\right] = -\\sin x - \\cos x\\)，与原式一致。",
          "answer": ""
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "求 \\(\\cos 75°\\cos 15° - \\sin 75°\\sin 15°\\) 的值。",
          "answer": "逆用余弦和角公式 \\(\\cos(\\alpha+\\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta\\)：\n原式 \\(= \\cos(75° + 15°) = \\cos 90° = 0\\)"
        },
        {
          "difficulty": "basic",
          "question": "已知 \\(\\sin\\alpha = \\frac{3}{5}\\)，\\(\\alpha \\in \\left(\\frac{\\pi}{2}, \\pi\\right)\\)，求 \\(\\sin 2\\alpha\\) 的值。",
          "answer": "解：因为 \\(\\alpha \\in \\left(\\frac{\\pi}{2}, \\pi\\right)\\)（第二象限），\\(\\cos\\alpha < 0\\)。\n由 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\)，得 \\(\\cos\\alpha = -\\sqrt{1 - \\sin^2\\alpha} = -\\sqrt{1 - \\frac{9}{25}} = -\\frac{4}{5}\\)。\n由二倍角公式：\\(\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha = 2 \\times \\frac{3}{5} \\times \\left(-\\frac{4}{5}\\right) = -\\frac{24}{25}\\)。"
        },
        {
          "difficulty": "medium",
          "question": "化简：\\(\\frac{1 - \\cos 2\\alpha}{\\sin 2\\alpha}\\)",
          "answer": "解：逆用二倍角公式。\n由 \\(1 - \\cos 2\\alpha = 2\\sin^2\\alpha\\)（降幂公式），\\(\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha\\)（二倍角公式）。\n原式 \\(= \\dfrac{2\\sin^2\\alpha}{2\\sin\\alpha\\cos\\alpha} = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = \\tan\\alpha\\)。"
        },
        {
          "difficulty": "medium",
          "question": "将 \\(f(x) = 2\\sin x + 2\\cos x\\) 化为 \\(A\\sin(x+\\varphi)\\) 的形式，并求其周期。",
          "answer": "解：利用辅助角公式 \\(a\\sin x + b\\cos x = \\sqrt{a^2+b^2}\\sin(x+\\varphi)\\)，其中 \\(\\tan\\varphi = \\dfrac{b}{a}\\)。\n这里 \\(a = 2\\)，\\(b = 2\\)，振幅 \\(A = \\sqrt{2^2 + 2^2} = \\sqrt{8} = 2\\sqrt{2}\\)。\n\\(\\tan\\varphi = \\dfrac{b}{a} = \\dfrac{2}{2} = 1\\)，且点 \\((a, b) = (2, 2)\\) 在第一象限，故 \\(\\varphi = \\dfrac{\\pi}{4}\\)。\n所以 \\(f(x) = 2\\sqrt{2}\\sin\\left(x + \\dfrac{\\pi}{4}\\right)\\)。\n周期 \\(T = \\dfrac{2\\pi}{\\omega} = 2\\pi\\)（\\(\\omega = 1\\)）。"
        },
        {
          "difficulty": "advanced",
          "question": "求值：\\(\\cos^2 22.5° - \\sin^2 22.5°\\)",
          "answer": "逆用二倍角公式 \\(\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha\\)：\n原式 \\(= \\cos(2 \\times 22.5°) = \\cos 45° = \\frac{\\sqrt{2}}{2}\\)"
        }
      ]
    }
  ]
}
