/**
 * 内容页面数据（content-schema 的实例）
 * 页面：三角函数图像与性质
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-04-05",
  "unitNum": "04",
  "subject": "math",
  "title": "三角函数图像与性质",
  "subtitle": "正弦余弦正切性质与y=Asin(ωx+φ)",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  ROOT[\"三角函数图像与性质\"]\n  ROOT --> A[\"正弦函数\"]\n  ROOT --> B[\"余弦函数\"]\n  ROOT --> C[\"正切函数\"]\n  ROOT --> D[\"图像变换\"]\n  A --> A1[\"y=sin x<br/>定义域R\"]\n  A --> A2[\"周期T=2π<br/>值域[-1,1]\"]\n  A --> A3[\"奇函数<br/>关于原点对称\"]\n  A --> A4[\"单调性<br/>增减区间交替\"]\n  B --> B1[\"y=cos x<br/>定义域R\"]\n  B --> B2[\"周期T=2π<br/>值域[-1,1]\"]\n  B --> B3[\"偶函数<br/>关于y轴对称\"]\n  B --> B4[\"由sin左移π/2<br/>cosx=sin(x+π/2)\"]\n  C --> C1[\"y=tan x<br/>x≠π/2+kπ\"]\n  C --> C2[\"周期T=π<br/>值域R\"]\n  C --> C3[\"奇函数<br/>渐近线x=π/2+kπ\"]\n  C --> C4[\"单调递增<br/>每个周期内递增\"]\n  D --> D1[\"振幅变换<br/>y=sinx→y=Asinx\"]\n  D --> D2[\"周期变换<br/>y=sinx→y=sinωx\"]\n  D --> D3[\"相位变换<br/>y=sinx→y=sin(x+φ)\"]\n  D --> D4[\"一般形式<br/>y=Asin(ωx+φ)<br/>T=2π/ω\"]\n  A -.->|平移π/2| B\n  B4 -.->|本质平移| D3\n  D4 -.->|综合参数| A2\n  C3 -.->|渐近线| C1"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握 \\(y = \\sin x\\)、\\(y = \\cos x\\)、\\(y = \\tan x\\) 的定义域、值域、周期性和奇偶性",
        "理解 \\(y = A\\sin(\\omega x + \\varphi)\\) 中各参数的含义，掌握周期公式",
        "掌握图像的平移变换和伸缩变换规律",
        "能用五点法画出 \\(y = A\\sin(\\omega x + \\varphi)\\) 的图像"
      ]
    },
    {
      "type": "table",
      "title": "一、正弦函数 \\(y = \\sin x\\) 的性质",
      "headers": [
        "性质",
        "内容"
      ],
      "rows": [
        [
          "定义域",
          "\\(\\mathbb{R}\\)"
        ],
        [
          "值域",
          "\\([-1, 1]\\)"
        ],
        [
          "周期",
          "\\(T = 2\\pi\\)"
        ],
        [
          "奇偶性",
          "奇函数（图像关于原点对称）"
        ],
        [
          "单调性",
          "增区间：\\(\\left[2k\\pi - \\frac{\\pi}{2}, 2k\\pi + \\frac{\\pi}{2}\\right]\\)；减区间：\\(\\left[2k\\pi + \\frac{\\pi}{2}, 2k\\pi + \\frac{3\\pi}{2}\\right]\\)，\\(k \\in \\mathbb{Z}\\)"
        ]
      ]
    },
    {
      "type": "table",
      "title": "二、余弦函数 \\(y = \\cos x\\) 的性质",
      "headers": [
        "性质",
        "内容"
      ],
      "rows": [
        [
          "定义域",
          "\\(\\mathbb{R}\\)"
        ],
        [
          "值域",
          "\\([-1, 1]\\)"
        ],
        [
          "周期",
          "\\(T = 2\\pi\\)"
        ],
        [
          "奇偶性",
          "偶函数（图像关于 \\(y\\) 轴对称）"
        ],
        [
          "单调性",
          "增区间：\\([2k\\pi - \\pi, 2k\\pi]\\)；减区间：\\([2k\\pi, 2k\\pi + \\pi]\\)，\\(k \\in \\mathbb{Z}\\)"
        ]
      ]
    },
    {
      "type": "table",
      "title": "三、正切函数 \\(y = \\tan x\\) 的性质",
      "headers": [
        "性质",
        "内容"
      ],
      "rows": [
        [
          "定义域",
          "\\(\\left\\{x \\mid x \\neq \\frac{\\pi}{2} + k\\pi, k \\in \\mathbb{Z}\\right\\}\\)"
        ],
        [
          "值域",
          "\\(\\mathbb{R}\\)"
        ],
        [
          "周期",
          "\\(T = \\pi\\)"
        ],
        [
          "奇偶性",
          "奇函数"
        ],
        [
          "单调性",
          "增区间：\\(\\left(-\\frac{\\pi}{2} + k\\pi, \\frac{\\pi}{2} + k\\pi\\right)\\)，\\(k \\in \\mathbb{Z}\\)"
        ]
      ]
    },
    {
      "type": "knowledge",
      "title": "四、函数 \\(y = A\\sin(\\omega x + \\varphi)\\) 的参数意义",
      "paragraphs": [
        "值域为 \\([-A, A]\\)，最大值为 \\(A\\)，最小值为 \\(-A\\)。"
      ]
    },
    {
      "type": "formula",
      "title": "参数说明",
      "formulas": [
        "• 振幅：\\(A\\)（\\(A > 0\\)），决定函数的最大值和最小值",
        "• 角频率：\\(\\omega\\)（\\(\\omega > 0\\)），决定函数的周期",
        "\\omega x + \\varphi",
        "\\varphi"
      ]
    },
    {
      "type": "knowledge",
      "title": "五、图像变换",
      "paragraphs": [
        "由 \\(y = \\sin x\\) 变换得到 \\(y = A\\sin(\\omega x + \\varphi)\\)：\n\n      • 平移变换（相位变换）：\\(y = \\sin x \\to y = \\sin(x + \\varphi)\\)，左加右减，\\(\\varphi > 0\\) 左移 \\(|\\varphi|\\)，\\(\\varphi • 伸缩变换（周期变换）：\\(y = \\sin x \\to y = \\sin(\\omega x)\\)，横坐标变为原来的 \\(\\frac{1}{\\omega}\\) 倍\n\n      • 振幅变换：\\(y = \\sin x \\to y = A\\sin x\\)，纵坐标变为原来的 \\(A\\) 倍\)"
      ]
    },
    {
      "type": "warning",
      "text": "先平移后伸缩与先伸缩后平移，平移量不同。若先伸缩后平移，平移量为 \\(\\frac{\\varphi}{\\omega}\\)。"
    },
    {
      "type": "knowledge",
      "title": "六、五点法画图",
      "paragraphs": [
        "画 \\(y = A\\sin(\\omega x + \\varphi)\\) 在一个周期内的图像，取五个关键点：\n\n      令 \\(\\omega x + \\varphi\\) 分别取 \\(0, \\frac{\\pi}{2}, \\pi, \\frac{3\\pi}{2}, 2\\pi\\)，求出对应的 \\(x\\) 值和 \\(y\\) 值，描点连线。"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求周期和最值",
          "question": "求函数 \\(f(x) = 3\\sin\\left(2x + \\frac{\\pi}{4}\\right)\\) 的周期、最大值、最小值及取最大值时的 \\(x\\) 的集合。",
          "solution": "解：\n\n        \\(\\omega = 2\\)，所以周期 \\(T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{2} = \\pi\\)\n\n        振幅 \\(A = 3\\)，最大值为 \\(3\\)，最小值为 \\(-3\\)\n\n        当 \\(\\sin\\left(2x + \\frac{\\pi}{4}\\right) = 1\\) 时取最大值，即：\n\n        \\(2x + \\frac{\\pi}{4} = \\frac{\\pi}{2} + 2k\\pi\\)，\\(k \\in \\mathbb{Z}\\)\n\n        \\(2x = \\frac{\\pi}{2} - \\frac{\\pi}{4} + 2k\\pi = \\frac{\\pi}{4} + 2k\\pi\\)\n\n        \\(x = \\frac{\\pi}{8} + k\\pi\\)，\\(k \\in \\mathbb{Z}\\)",
          "answer": ""
        },
        {
          "title": "例题2：图像变换",
          "question": "说明如何由 \\(y = \\sin x\\) 的图像得到 \\(y = 2\\sin\\left(2x - \\frac{\\pi}{3}\\right)\\) 的图像。",
          "solution": "解（方法一：先平移后伸缩）：\n\n        ① 将 \\(y = \\sin x\\) 的图像向右平移 \\(\\frac{\\pi}{3}\\) 个单位，得到 \\(y = \\sin\\left(x - \\frac{\\pi}{3}\\right)\\)\n\n        ② 将各点横坐标缩短为原来的 \\(\\frac{1}{2}\\)（纵坐标不变），得到 \\(y = \\sin\\left(2x - \\frac{\\pi}{3}\\right)\\)\n\n        ③ 将各点纵坐标伸长为原来的 \\(2\\) 倍（横坐标不变），得到 \\(y = 2\\sin\\left(2x - \\frac{\\pi}{3}\\right)\\)\n\n        解（方法二：先伸缩后平移）：\n\n        ① 将 \\(y = \\sin x\\) 各点横坐标缩短为原来的 \\(\\frac{1}{2}\\)，得到 \\(y = \\sin 2x\\)\n\n        ② 向右平移 \\(\\frac{\\pi}{6}\\) 个单位，得到 \\(y = \\sin 2\\left(x - \\frac{\\pi}{6}\\right) = \\sin\\left(2x - \\frac{\\pi}{3}\\right)\\)\n\n        ③ 纵坐标伸长为原来的 \\(2\\) 倍，得到 \\(y = 2\\sin\\left(2x - \\frac{\\pi}{3}\\right)\\)",
          "answer": ""
        },
        {
          "title": "例题3：由图像求解析式",
          "question": "已知函数 \\(y = A\\sin(\\omega x + \\varphi)\\)（\\(A > 0, \\omega > 0, 0 < \\varphi < \\pi\\)）的图像最高点为 \\(\\left(\\frac{\\pi}{6}, 2\\right)\\)，由该点到相邻最低点时图像与 \\(x\\) 轴交于点 \\(\\left(\\frac{2\\pi}{3}, 0\\right)\\)，求该函数的解析式。",
          "solution": "解：\n\n        由最高点纵坐标为 \\(2\\)，得 \\(A = 2\\)。\n\n        从最高点到与 \\(x\\) 轴交点，经过 \\(\\frac{1}{4}\\) 周期，即 \\(\\frac{T}{4} = \\frac{2\\pi}{3} - \\frac{\\pi}{6} = \\frac{\\pi}{2}\\)，所以 \\(T = 2\\pi\\)，\\(\\omega = \\frac{2\\pi}{T} = 1\\)。\n\n        当 \\(x = \\frac{\\pi}{6}\\) 时取最大值，即 \\(\\sin\\left(\\frac{\\pi}{6} + \\varphi\\right) = 1\\)，所以 \\(\\frac{\\pi}{6} + \\varphi = \\frac{\\pi}{2} + 2k\\pi\\)。\n\n        \\(\\varphi = \\frac{\\pi}{2} - \\frac{\\pi}{6} = \\frac{\\pi}{3}\\)（满足 \\(0 所以 \\(y = 2\\sin\\left(x + \\frac{\\pi}{3}\\right)\\)\)",
          "answer": ""
        },
        {
          "title": "例题4：周期公式 T = 2π/ω 的推导（推导型）",
          "question": "设 \\(\\omega > 0\\)，试由周期函数的定义推导函数 \\(y = \\sin(\\omega x + \\varphi)\\) 的最小正周期 \\(T = \\dfrac{2\\pi}{\\omega}\\)。",
          "solution": "推导：\n\n        设 \\(f(x) = \\sin(\\omega x + \\varphi)\\)。若存在非零常数 \\(T\\) 使 \\(f(x+T) = f(x)\\) 对一切 \\(x\\) 成立，则：\n\n        \\(\\sin(\\omega(x+T) + \\varphi) = \\sin(\\omega x + \\varphi)\\)\n\n        即 \\(\\sin((\\omega x + \\varphi) + \\omega T) = \\sin(\\omega x + \\varphi)\\)\n\n        由正弦函数的周期为 \\(2\\pi\\)，需 \\(\\omega T = 2k\\pi\\)（\\(k \\in \\mathbb{Z}\\)），即 \\(T = \\dfrac{2k\\pi}{\\omega}\\)。\n\n        取最小正周期对应 \\(k = 1\\)，故 \\(T = \\dfrac{2\\pi}{\\omega}\\)。\n\n        特别地，当 \\(\\omega = 1\\) 时 \\(T = 2\\pi\\)，即 \\(y = \\sin x\\) 的周期；当 \\(\\omega = 2\\) 时 \\(T = \\pi\\)。",
          "answer": ""
        },
        {
          "title": "例题5：变换顺序中的平移量陷阱（易错型）",
          "question": "说明如何由 \\(y = \\sin x\\) 的图像得到 \\(y = \\sin\\left(2x + \\dfrac{\\pi}{3}\\right)\\) 的图像。下面给出一种解法，请判断正误并纠正。",
          "solution": "常见错误解：\n\n        ① 将 \\(y = \\sin x\\) 各点横坐标缩短为原来的 \\(\\dfrac{1}{2}\\)，得到 \\(y = \\sin 2x\\)；\n\n        ② 再向左平移 \\(\\dfrac{\\pi}{3}\\) 个单位，得到 \\(y = \\sin\\left(2\\left(x + \\dfrac{\\pi}{3}\\right)\\right) = \\sin\\left(2x + \\dfrac{2\\pi}{3}\\right)\\)。\n\n        这是错误的！原因：先伸缩后平移时，平移是针对自变量 \\(x\\) 进行的，应平移 \\(\\dfrac{\\varphi}{\\omega}\\) 而非 \\(\\varphi\\)。这里平移了 \\(\\dfrac{\\pi}{3}\\)（即 \\(\\varphi\\)），导致相位多出 \\(\\omega\\) 倍，得到 \\(2x + \\dfrac{2\\pi}{3}\\) 而非 \\(2x + \\dfrac{\\pi}{3}\\)。\n\n        正确解（先伸缩后平移）：\n\n        ① 横坐标缩短为原来的 \\(\\dfrac{1}{2}\\)：\\(y = \\sin x \\to y = \\sin 2x\\)\n\n        ② 向左平移 \\(\\dfrac{\\pi}{6}\\) 个单位（即 \\(\\dfrac{\\varphi}{\\omega} = \\dfrac{\\pi/3}{2} = \\dfrac{\\pi}{6}\\)）：\n\n        \\(y = \\sin 2\\left(x + \\dfrac{\\pi}{6}\\right) = \\sin\\left(2x + \\dfrac{\\pi}{3}\\right)\\)\n\n        反思：先平移后伸缩，平移量为 \\(|\\varphi|\\)；先伸缩后平移，平移量为 \\(\\left|\\dfrac{\\varphi}{\\omega}\\right|\\)。二者不可混淆。",
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
          "question": "求函数 \\(y = \\sin\\left(\\frac{1}{2}x + \\frac{\\pi}{6}\\right)\\) 的周期和振幅。",
          "answer": "\\(\\omega = \\frac{1}{2}\\)，周期 \\(T = \\frac{2\\pi}{\\frac{1}{2}} = 4\\pi\\)，振幅 \\(A = 1\\)。"
        },
        {
          "difficulty": "basic",
          "question": "函数 \\(y = 4\\cos(3x - \\frac{\\pi}{6})\\) 的最大值和最小值分别是多少？",
          "answer": "最大值为 \\(4\\)，最小值为 \\(-4\\)。"
        },
        {
          "difficulty": "medium",
          "question": "函数 \\(y = \\tan\\left(2x + \\frac{\\pi}{3}\\right)\\) 的定义域是什么？",
          "answer": "\\(2x + \\frac{\\pi}{3} \\neq \\frac{\\pi}{2} + k\\pi\\)，即 \\(2x \\neq \\frac{\\pi}{6} + k\\pi\\)，\\(x \\neq \\frac{\\pi}{12} + \\frac{k\\pi}{2}\\)，\\(k \\in \\mathbb{Z}\\)。定义域为 \\(\\left\\{x \\mid x \\neq \\frac{\\pi}{12} + \\frac{k\\pi}{2}, k \\in \\mathbb{Z}\\right\\}\\)。"
        },
        {
          "difficulty": "medium",
          "question": "将 \\(y = \\sin x\\) 的图像向左平移 \\(\\frac{\\pi}{6}\\) 个单位，再使纵坐标变为原来的 \\(3\\) 倍，求所得函数的解析式。",
          "answer": "向左平移 \\(\\frac{\\pi}{6}\\)：\\(y = \\sin\\left(x + \\frac{\\pi}{6}\\right)\\)；纵坐标变为 \\(3\\) 倍：\\(y = 3\\sin\\left(x + \\frac{\\pi}{6}\\right)\\)。"
        },
        {
          "difficulty": "advanced",
          "question": "已知函数 \\(y = A\\sin(\\omega x + \\varphi)\\) 的图像过点 \\((0, 1)\\)，振幅为 \\(2\\)，周期为 \\(\\pi\\)，且 \\(\\varphi\\) 为锐角，求该函数的解析式。",
          "answer": "\\(A = 2\\)，\\(T = \\pi\\)，\\(\\omega = \\frac{2\\pi}{\\pi} = 2\\)。由 \\(x=0, y=1\\)：\\(2\\sin\\varphi = 1\\)，\\(\\sin\\varphi = \\frac{1}{2}\\)，\\(\\varphi = \\frac{\\pi}{6}\\)（锐角）。解析式为 \\(y = 2\\sin\\left(2x + \\frac{\\pi}{6}\\right)\\)。"
        }
      ]
    }
  ]
}
