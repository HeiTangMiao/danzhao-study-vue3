/**
 * 内容页面数据（content-schema 的实例）
 * 页面：诱导公式
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-04-03",
  "unitNum": "04",
  "subject": "math",
  "title": "诱导公式",
  "subtitle": "奇变偶不变，符号看象限",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  ROOT[\"诱导公式<br/>奇变偶不变·符号看象限\"]\n  ROOT --> A1[\"公式一 2kπ+α\"]\n  ROOT --> A2[\"公式二 π+α\"]\n  ROOT --> A3[\"公式三 -α\"]\n  ROOT --> A4[\"公式四 π-α\"]\n  ROOT --> A5[\"公式五六 π/2±α\"]\n  A1 --> A1a[\"sin(2kπ+α)=sinα<br/>cos(2kπ+α)=cosα<br/>tan(2kπ+α)=tanα\"]\n  A1 --> A1c[\"偶不变·函数名不变\"]\n  A2 --> A2a[\"sin(π+α)=-sinα<br/>cos(π+α)=-cosα<br/>tan(π+α)=tanα\"]\n  A3 --> A3a[\"sin(-α)=-sinα<br/>cos(-α)=cosα<br/>tan(-α)=-tanα\"]\n  A4 --> A4a[\"sin(π-α)=sinα<br/>cos(π-α)=-cosα<br/>tan(π-α)=-tanα\"]\n  A5 --> A5a[\"π/2-α<br/>sin(π/2-α)=cosα<br/>cos(π/2-α)=sinα<br/>tan(π/2-α)=cotα\"]\n  A5 --> A5b[\"π/2+α<br/>sin(π/2+α)=cosα<br/>cos(π/2+α)=-sinα<br/>tan(π/2+α)=-cotα\"]\n  A5 --> A5c[\"奇变·函数名改变\"]\n  A2 -.->|\"原点对称\"| A3\n  A4 -.->|\"y轴对称\"| A2\n  A5c -.->|\"奇变规律\"| A1c"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解诱导公式的推导过程，掌握口诀\"奇变偶不变，符号看象限\"",
        "熟练运用诱导公式进行三角函数式的化简和求值",
        "能利用诱导公式证明简单的三角恒等式"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、诱导公式口诀",
      "paragraphs": [
        "\"奇变偶不变，符号看象限\"\n\n      • 奇变偶不变：当 \\(k\\) 为奇数时，函数名改变（正弦变余弦，余弦变正弦）；当 \\(k\\) 为偶数时，函数名不变。\n\n      • 符号看象限：将 \\(\\alpha\\) 视为锐角，判断 \\(k \\cdot \\frac{\\pi}{2} \\pm \\alpha\\) 所在象限，原三角函数在该象限的符号决定结果的符号。"
      ]
    },
    {
      "type": "tip",
      "text": "\\(2k\\pi + \\alpha\\)（\\(k \\in \\mathbb{Z}\\)）的三角函数值等于 \\(\\alpha\\) 的同名三角函数值，即 \\(\\sin(2k\\pi + \\alpha) = \\sin\\alpha\\)，\\(\\cos(2k\\pi + \\alpha) = \\cos\\alpha\\)。"
    },
    {
      "type": "table",
      "title": "九、六组诱导公式对照总表",
      "headers": [
        "组别",
        "角",
        "\\(\\sin\\)",
        "\\(\\cos\\)",
        "\\(\\tan\\)",
        "函数名"
      ],
      "rows": [
        [
          "一",
          "\\(2k\\pi + \\alpha\\)",
          "\\(\\sin\\alpha\\)",
          "\\(\\cos\\alpha\\)",
          "\\(\\tan\\alpha\\)",
          "不变"
        ],
        [
          "二",
          "\\(\\pi + \\alpha\\)",
          "\\(-\\sin\\alpha\\)",
          "\\(-\\cos\\alpha\\)",
          "\\(\\tan\\alpha\\)",
          "不变"
        ],
        [
          "三",
          "\\(-\\alpha\\)",
          "\\(-\\sin\\alpha\\)",
          "\\(\\cos\\alpha\\)",
          "\\(-\\tan\\alpha\\)",
          "不变"
        ],
        [
          "四",
          "\\(\\pi - \\alpha\\)",
          "\\(\\sin\\alpha\\)",
          "\\(-\\cos\\alpha\\)",
          "\\(-\\tan\\alpha\\)",
          "不变"
        ],
        [
          "五",
          "\\(\\frac{\\pi}{2} - \\alpha\\)",
          "\\(\\cos\\alpha\\)",
          "\\(\\sin\\alpha\\)",
          "\\(\\cot\\alpha\\)",
          "改变"
        ],
        [
          "六",
          "\\(\\frac{\\pi}{2} + \\alpha\\)",
          "\\(\\cos\\alpha\\)",
          "\\(-\\sin\\alpha\\)",
          "\\(-\\cot\\alpha\\)",
          "改变"
        ]
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：化简",
          "question": "化简：\\(\\sin\\left(\\frac{3\\pi}{2} - \\alpha\\right) + \\cos(\\pi + \\alpha)\\)",
          "solution": "解：\n\n        \\(\\frac{3\\pi}{2} = 3 \\times \\frac{\\pi}{2}\\)，\\(k=3\\) 为奇数，函数名改变。\n\n        将 \\(\\alpha\\) 视为锐角，\\(\\frac{3\\pi}{2} - \\alpha\\) 在第三象限，\\(\\sin\\) 在第三象限为负。\n\n        所以 \\(\\sin\\left(\\frac{3\\pi}{2} - \\alpha\\right) = -\\cos\\alpha\\)\n\n        \\(\\pi + \\alpha\\)：\\(k=2\\) 为偶数，函数名不变，\\(\\pi + \\alpha\\) 在第三象限，\\(\\cos\\) 为负。\n\n        所以 \\(\\cos(\\pi + \\alpha) = -\\cos\\alpha\\)\n\n        原式 \\(= -\\cos\\alpha + (-\\cos\\alpha) = -2\\cos\\alpha\\)",
          "answer": "原式 \\(= -2\\cos\\alpha\\)"
        },
        {
          "title": "例题2：求值",
          "question": "求值：\\(\\sin\\frac{8\\pi}{3} \\cdot \\cos\\frac{25\\pi}{6}\\)",
          "solution": "解：\n\n        \\(\\sin\\frac{8\\pi}{3} = \\sin\\left(2\\pi + \\frac{2\\pi}{3}\\right) = \\sin\\frac{2\\pi}{3} = \\sin\\left(\\pi - \\frac{\\pi}{3}\\right) = \\sin\\frac{\\pi}{3} = \\frac{\\sqrt{3}}{2}\\)\n\n        \\(\\cos\\frac{25\\pi}{6} = \\cos\\left(4\\pi + \\frac{\\pi}{6}\\right) = \\cos\\frac{\\pi}{6} = \\frac{\\sqrt{3}}{2}\\)\n\n        原式 \\(= \\frac{\\sqrt{3}}{2} \\times \\frac{\\sqrt{3}}{2} = \\frac{3}{4}\\)",
          "answer": "原式 \\(= \\frac{3}{4}\\)"
        },
        {
          "title": "例题3：证明",
          "question": "求证：\\(\\frac{\\sin(\\pi - \\alpha)\\cos(-\\alpha)}{\\tan(\\pi + \\alpha)} = \\cos^2\\alpha\\)",
          "solution": "证明：\n\n        左边 \\(= \\frac{\\sin\\alpha \\cdot \\cos\\alpha}{\\tan\\alpha}\\)\n\n        \\(= \\frac{\\sin\\alpha \\cdot \\cos\\alpha}{\\frac{\\sin\\alpha}{\\cos\\alpha}}\\)\n\n        \\(= \\sin\\alpha \\cdot \\cos\\alpha \\cdot \\frac{\\cos\\alpha}{\\sin\\alpha}\\)\n\n        \\(= \\cos^2\\alpha =\\) 右边\n\n        所以等式成立。",
          "answer": "是（左边化简得 \\(\\cos^2\\alpha\\)，与右边相等，得证）"
        },
        {
          "title": "例题4：公式推导",
          "question": "利用已学诱导公式，推导 \\(\\sin\\left(\\frac{3\\pi}{2} + \\alpha\\right)\\) 的表达式。",
          "solution": "推导：\n\n        将 \\(\\frac{3\\pi}{2} + \\alpha\\) 拆分为 \\(\\pi + \\left(\\frac{\\pi}{2} + \\alpha\\right)\\)，分两步使用诱导公式。\n\n        第一步：对 \\(\\frac{\\pi}{2} + \\alpha\\) 使用公式六（函数名改变）。\n\n        将 \\(\\alpha\\) 视为锐角，\\(\\frac{\\pi}{2} + \\alpha\\) 在第二象限，\\(\\sin\\) 为正，故 \\(\\sin\\left(\\frac{\\pi}{2} + \\alpha\\right) = \\cos\\alpha\\)。\n\n        第二步：对 \\(\\pi + \\left(\\frac{\\pi}{2} + \\alpha\\right)\\) 使用公式二（函数名不变）。\n\n        \\(\\pi + \\left(\\frac{\\pi}{2} + \\alpha\\right) = \\frac{3\\pi}{2} + \\alpha\\) 在第四象限，\\(\\sin\\) 为负，故：\n\n        \\(\\sin\\left(\\frac{3\\pi}{2} + \\alpha\\right) = \\sin\\left[\\pi + \\left(\\frac{\\pi}{2} + \\alpha\\right)\\right] = -\\sin\\left(\\frac{\\pi}{2} + \\alpha\\right) = -\\cos\\alpha\\)\n\n        亦可直接用口诀验证：\\(\\frac{3\\pi}{2} + \\alpha = 3 \\times \\frac{\\pi}{2} + \\alpha\\)，\\(k = 3\\) 为奇数，函数名改变（正弦变余弦）；\\(\\frac{3\\pi}{2} + \\alpha\\) 在第四象限，\\(\\sin\\) 为负，所以结果为 \\(-\\cos\\alpha\\)，两种方法一致。",
          "answer": "\\(\\sin\\left(\\frac{3\\pi}{2} + \\alpha\\right) = -\\cos\\alpha\\)"
        },
        {
          "title": "例题5：易错辨析",
          "question": "化简：\\(\\sin(\\pi - \\alpha) + \\cos(\\pi + \\alpha)\\)",
          "solution": "常见错误解法：\n\n        误认为 \\(\\pi - \\alpha\\) 与 \\(\\pi + \\alpha\\) 都是\"加 \\(\\pi\\)\"型，统一变号：\n\n        错误地写 \\(\\sin(\\pi - \\alpha) = -\\sin\\alpha\\)，\\(\\cos(\\pi + \\alpha) = \\cos\\alpha\\)，\n\n        得原式 \\(= -\\sin\\alpha + \\cos\\alpha\\)（错误！）。\n\n        错误原因：混淆了 \\(\\pi - \\alpha\\) 与 \\(\\pi + \\alpha\\)。两者虽都属\"函数名不变\"型，但所在象限不同，符号不同。\\(\\pi - \\alpha\\) 在第二象限，\\(\\sin\\) 为正；\\(\\pi + \\alpha\\) 在第三象限，\\(\\cos\\) 为负。\n\n        正确解法：\n\n        \\(\\sin(\\pi - \\alpha) = \\sin\\alpha\\)（第二象限，\\(\\sin\\) 为正）\n\n        \\(\\cos(\\pi + \\alpha) = -\\cos\\alpha\\)（第三象限，\\(\\cos\\) 为负）\n\n        原式 \\(= \\sin\\alpha + (-\\cos\\alpha) = \\sin\\alpha - \\cos\\alpha\\)",
          "answer": "原式 \\(= \\sin\\alpha - \\cos\\alpha\\)"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "化简：\\(\\cos(\\pi - \\alpha) - \\cos(\\pi + \\alpha)\\)",
          "answer": "\\(\\cos(\\pi - \\alpha) = -\\cos\\alpha\\)，\\(\\cos(\\pi + \\alpha) = -\\cos\\alpha\\)，原式 \\(= -\\cos\\alpha - (-\\cos\\alpha) = 0\\)"
        },
        {
          "difficulty": "basic",
          "question": "求 \\(\\sin\\frac{17\\pi}{6}\\) 的值。",
          "answer": "\\(\\sin\\frac{17\\pi}{6} = \\sin\\left(2\\pi + \\frac{5\\pi}{6}\\right) = \\sin\\frac{5\\pi}{6} = \\sin\\left(\\pi - \\frac{\\pi}{6}\\right) = \\sin\\frac{\\pi}{6} = \\frac{1}{2}\\)"
        },
        {
          "difficulty": "medium",
          "question": "化简：\\(\\sin\\left(\\frac{\\pi}{2} + \\alpha\\right) \\cdot \\cos\\left(\\frac{\\pi}{2} - \\alpha\\right)\\)",
          "answer": "\\(\\sin\\left(\\frac{\\pi}{2} + \\alpha\\right) = \\cos\\alpha\\)，\\(\\cos\\left(\\frac{\\pi}{2} - \\alpha\\right) = \\sin\\alpha\\)，原式 \\(= \\cos\\alpha \\cdot \\sin\\alpha = \\sin\\alpha\\cos\\alpha\\)"
        },
        {
          "difficulty": "medium",
          "question": "已知 \\(\\sin\\alpha = \\frac{1}{3}\\，\\alpha \\in \\left(\\frac{\\pi}{2}, \\pi\\right)\\)，求 \\(\\sin(\\pi + \\alpha)\\) 和 \\(\\cos(-\\alpha)\\) 的值。",
          "answer": "\\(\\sin(\\pi + \\alpha) = -\\sin\\alpha = -\\frac{1}{3}\\)。由 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\)，\\(\\cos\\alpha = -\\frac{2\\sqrt{2}}{3}\\)（第二象限为负），\\(\\cos(-\\alpha) = \\cos\\alpha = -\\frac{2\\sqrt{2}}{3}\\)"
        },
        {
          "difficulty": "advanced",
          "question": "求值：\\(\\tan\\frac{7\\pi}{4} + \\sin\\frac{11\\pi}{3}\\)",
          "answer": "\\(\\tan\\frac{7\\pi}{4} = \\tan\\left(2\\pi - \\frac{\\pi}{4}\\right) = -\\tan\\frac{\\pi}{4} = -1\\)；\\(\\sin\\frac{11\\pi}{3} = \\sin\\left(2\\pi + \\frac{5\\pi}{3}\\right) = \\sin\\frac{5\\pi}{3} = \\sin\\left(2\\pi - \\frac{\\pi}{3}\\right) = -\\sin\\frac{\\pi}{3} = -\\frac{\\sqrt{3}}{2}\\)。原式 \\(= -1 + \\left(-\\frac{\\sqrt{3}}{2}\\right) = -1 - \\frac{\\sqrt{3}}{2}\\)"
        }
      ]
    }
  ]
}
