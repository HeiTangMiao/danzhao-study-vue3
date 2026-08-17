/**
 * 内容页面数据（content-schema 的实例）
 * 页面：三角函数定义与同角关系
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-04-02",
  "unitNum": "04",
  "subject": "math",
  "title": "三角函数定义与同角关系",
  "subtitle": "任意角三角函数定义、同角关系式",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  ROOT[\"三角函数定义与同角关系\"]\n  ROOT --> A[\"坐标定义\"]\n  ROOT --> B[\"定义域与值域\"]\n  ROOT --> C[\"同角基本关系\"]\n  ROOT --> D[\"符号规律\"]\n  A --> A1[\"正弦<br/>sinα=y/r\"]\n  A --> A2[\"余弦<br/>cosα=x/r\"]\n  A --> A3[\"正切<br/>tanα=y/x\"]\n  A --> A4[\"单位圆特例<br/>r=1, sinα=y, cosα=x\"]\n  B --> B1[\"sin、cos<br/>定义域为R\"]\n  B --> B2[\"tan<br/>x≠π/2+kπ\"]\n  B --> B3[\"值域<br/>sin、cos∈[-1,1]<br/>tan∈R\"]\n  C --> C1[\"平方关系<br/>sin²α+cos²α=1\"]\n  C --> C2[\"商数关系<br/>tanα=sinα/cosα\"]\n  C --> C3[\"常用变形<br/>sin²α=1-cos²α\"]\n  D --> D1[\"一全正<br/>第一象限全正\"]\n  D --> D2[\"二正弦<br/>第二象限sin正\"]\n  D --> D3[\"三正切<br/>第三象限tan正\"]\n  D --> D4[\"四余弦<br/>第四象限cos正\"]\n  A3 -.->|定义限制| B2\n  A4 -.->|推导关系| C1\n  C1 -.->|开方定号| D"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握任意角的三角函数定义，能利用定义求三角函数值",
        "熟记三角函数值在各象限的符号规律",
        "掌握同角三角函数的基本关系式，能进行化简求值",
        "熟记特殊角的三角函数值"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、任意角三角函数的定义",
      "paragraphs": [
        "设角 \\(\\alpha\\) 的顶点在原点，始边与 \\(x\\) 轴正半轴重合，终边上任意一点 \\(P(x, y)\\)（异于原点），\\(r = \\sqrt{x^2 + y^2} > 0\\)，则："
      ]
    },
    {
      "type": "tip",
      "text": "三角函数值只与角的终边位置有关，与终边上点 \\(P\\) 的选取无关。"
    },
    {
      "type": "knowledge",
      "title": "二、三角函数值在各象限的符号",
      "paragraphs": [
        "口诀：一全正、二正弦、三正切、四余弦。\n\n      即第一象限全为正，第二象限只有正弦为正，第三象限只有正切为正，第四象限只有余弦为正。"
      ]
    },
    {
      "type": "table",
      "title": "二、三角函数值在各象限的符号",
      "headers": [
        "象限",
        "第一象限",
        "第二象限",
        "第三象限",
        "第四象限"
      ],
      "rows": [
        [
          "\\(\\sin\\alpha\\)",
          "+",
          "+",
          "−",
          "−"
        ],
        [
          "\\(\\cos\\alpha\\)",
          "+",
          "−",
          "−",
          "+"
        ],
        [
          "\\(\\tan\\alpha\\)",
          "+",
          "−",
          "+",
          "−"
        ]
      ]
    },
    {
      "type": "warning",
      "text": "使用平方关系开方时，必须根据 \\(\\alpha\\) 所在象限确定符号。已知一个三角函数值求其他值时，要注意角的范围。"
    },
    {
      "type": "table",
      "title": "四、特殊角三角函数值表",
      "headers": [
        "角 \\(\\alpha\\)",
        "0°",
        "30°",
        "45°",
        "60°",
        "90°",
        "180°",
        "270°",
        "360°"
      ],
      "rows": [
        [
          "弧度",
          "0",
          "\\(\\frac{\\pi}{6}\\)",
          "\\(\\frac{\\pi}{4}\\)",
          "\\(\\frac{\\pi}{3}\\)",
          "\\(\\frac{\\pi}{2}\\)",
          "\\(\\pi\\)",
          "\\(\\frac{3\\pi}{2}\\)",
          "\\(2\\pi\\)"
        ],
        [
          "\\(\\sin\\alpha\\)",
          "0",
          "\\(\\frac{1}{2}\\)",
          "\\(\\frac{\\sqrt{2}}{2}\\)",
          "\\(\\frac{\\sqrt{3}}{2}\\)",
          "1",
          "0",
          "−1",
          "0"
        ],
        [
          "\\(\\cos\\alpha\\)",
          "1",
          "\\(\\frac{\\sqrt{3}}{2}\\)",
          "\\(\\frac{\\sqrt{2}}{2}\\)",
          "\\(\\frac{1}{2}\\)",
          "0",
          "−1",
          "0",
          "1"
        ],
        [
          "\\(\\tan\\alpha\\)",
          "0",
          "\\(\\frac{\\sqrt{3}}{3}\\)",
          "1",
          "\\(\\sqrt{3}\\)",
          "不存在",
          "0",
          "不存在",
          "0"
        ]
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：已知一个三角函数值求其他",
          "question": "已知 \\(\\sin\\alpha = \\frac{3}{5}\\)，且 \\(\\alpha\\) 为第二象限角，求 \\(\\cos\\alpha\\) 和 \\(\\tan\\alpha\\) 的值。",
          "solution": "解：\n\n        由平方关系 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\)：\n\n        \\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = 1 - \\left(\\frac{3}{5}\\right)^2 = 1 - \\frac{9}{25} = \\frac{16}{25}\\)\n\n        \\(\\cos\\alpha = \\pm\\frac{4}{5}\\)\n\n        因为 \\(\\alpha\\) 为第二象限角，\\(\\cos\\alpha 由商数关系：\\(\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{\\frac{3}{5}}{-\\frac{4}{5}} = -\\frac{3}{4}\\)\)",
          "answer": ""
        },
        {
          "title": "例题2：化简求值",
          "question": "化简：\\(\\frac{\\sin\\alpha - \\cos\\alpha}{\\sin\\alpha + \\cos\\alpha}\\)，其中 \\(\\tan\\alpha = 2\\)。",
          "solution": "解：\n\n        将分子分母同时除以 \\(\\cos\\alpha\\)（\\(\\cos\\alpha \\neq 0\\)）：\n\n        \\(\\frac{\\sin\\alpha - \\cos\\alpha}{\\sin\\alpha + \\cos\\alpha} = \\frac{\\frac{\\sin\\alpha}{\\cos\\alpha} - 1}{\\frac{\\sin\\alpha}{\\cos\\alpha} + 1} = \\frac{\\tan\\alpha - 1}{\\tan\\alpha + 1}\\)\n\n        代入 \\(\\tan\\alpha = 2\\)：\n\n        \\(\\frac{2 - 1}{2 + 1} = \\frac{1}{3}\\)",
          "answer": ""
        },
        {
          "title": "例题3：符号判断",
          "question": "确定下列三角函数值的符号：\n\n      （1）\\(\\sin\\frac{7\\pi}{6}\\)；（2）\\(\\cos\\frac{5\\pi}{4}\\)；（3）\\(\\tan\\frac{4\\pi}{3}\\)",
          "solution": "解：\n\n        （1）\\(\\frac{7\\pi}{6} = \\pi + \\frac{\\pi}{6}\\)，是第三象限角，所以 \\(\\sin\\frac{7\\pi}{6} （2）\\(\\frac{5\\pi}{4} = \\pi + \\frac{\\pi}{4}\\)，是第三象限角，所以 \\(\\cos\\frac{5\\pi}{4} （3）\\(\\frac{4\\pi}{3} = \\pi + \\frac{\\pi}{3}\\)，是第三象限角，所以 \\(\\tan\\frac{4\\pi}{3} > 0\\)（正）\)\)",
          "answer": ""
        },
        {
          "title": "例题4：平方关系的证明（推导型）",
          "question": "设角 \\(\\alpha\\) 的终边上任意一点 \\(P(x, y)\\)（异于原点），\\(r = \\sqrt{x^2+y^2}\\)。试由三角函数的坐标定义证明同角平方关系 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\)。",
          "solution": "证明：\n\n        由坐标定义：\\(\\sin\\alpha = \\dfrac{y}{r}\\)，\\(\\cos\\alpha = \\dfrac{x}{r}\\)。\n\n        所以：\n\n        \\(\\sin^2\\alpha + \\cos^2\\alpha = \\left(\\dfrac{y}{r}\\right)^2 + \\left(\\dfrac{x}{r}\\right)^2 = \\dfrac{y^2}{r^2} + \\dfrac{x^2}{r^2} = \\dfrac{x^2+y^2}{r^2}\\)\n\n        又因为 \\(r = \\sqrt{x^2+y^2}\\)，即 \\(r^2 = x^2 + y^2\\)，代入上式：\n\n        \\(\\sin^2\\alpha + \\cos^2\\alpha = \\dfrac{x^2+y^2}{x^2+y^2} = 1\\)\n\n        特别地，当 \\(P\\) 在单位圆上时 \\(r = 1\\)，此时 \\(\\sin\\alpha = y\\)，\\(\\cos\\alpha = x\\)，由 \\(x^2+y^2=1\\) 直接得 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\)。",
          "answer": ""
        },
        {
          "title": "例题5：开方漏掉象限讨论（易错型）",
          "question": "已知 \\(\\sin\\alpha = \\dfrac{3}{5}\\)，求 \\(\\cos\\alpha\\) 的值。",
          "solution": "常见错误解：\n\n        由 \\(\\sin^2\\alpha + \\cos^2\\alpha = 1\\) 得 \\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = 1 - \\dfrac{9}{25} = \\dfrac{16}{25}\\)，于是 \\(\\cos\\alpha = \\dfrac{4}{5}\\)。\n\n        这是错误的！原因：开平方时直接取了正根，忽略了 \\(\\cos\\alpha\\) 的符号由角 \\(\\alpha\\) 所在象限决定。题目未给象限，\\(\\cos\\alpha\\) 可正可负。\n\n        正确解：\n\n        \\(\\cos^2\\alpha = 1 - \\sin^2\\alpha = 1 - \\left(\\dfrac{3}{5}\\right)^2 = \\dfrac{16}{25}\\)，所以 \\(\\cos\\alpha = \\pm\\dfrac{4}{5}\\)。\n\n        需按象限讨论：\n\n        当 \\(\\alpha\\) 为第一象限角时，\\(\\cos\\alpha > 0\\)，\\(\\cos\\alpha = \\dfrac{4}{5}\\)；\n\n        当 \\(\\alpha\\) 为第二象限角时，\\(\\cos\\alpha 反思：使用平方关系由一个三角函数值求另一个时，必须先开方加绝对值（或 \\(\\pm\\)），再根据象限确定符号。\)",
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
          "question": "已知 \\(\\cos\\alpha = -\\frac{5}{13}\\)，且 \\(\\alpha\\) 为第三象限角，求 \\(\\sin\\alpha\\) 和 \\(\\tan\\alpha\\) 的值。",
          "answer": "\\(\\sin^2\\alpha = 1 - \\cos^2\\alpha = 1 - \\frac{25}{169} = \\frac{144}{169}\\)。因为 \\(\\alpha\\) 为第三象限角，\\(\\sin\\alpha < 0\\)，所以 \\(\\sin\\alpha = -\\frac{12}{13}\\)，\\(\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{-\\frac{12}{13}}{-\\frac{5}{13}} = \\frac{12}{5}\\)"
        },
        {
          "difficulty": "basic",
          "question": "化简：\\(\\sqrt{1 - 2\\sin 40°\\cos 40°}\\)。",
          "answer": "\\(\\sqrt{1 - 2\\sin 40°\\cos 40°} = \\sqrt{\\sin^2 40° + \\cos^2 40° - 2\\sin 40°\\cos 40°} = \\sqrt{(\\sin 40° - \\cos 40°)^2} = |\\sin 40° - \\cos 40°|\\)。因为 \\(40° < 45°\\)，\\(\\sin 40° < \\cos 40°\\)，所以原式 \\(= \\cos 40° - \\sin 40°\\)。"
        },
        {
          "difficulty": "medium",
          "question": "已知 \\(\\tan\\alpha = 3\\)，求 \\(\\frac{\\sin\\alpha + 2\\cos\\alpha}{\\sin\\alpha - \\cos\\alpha}\\) 的值。",
          "answer": "分子分母同除以 \\(\\cos\\alpha\\)：\\(\\frac{\\tan\\alpha + 2}{\\tan\\alpha - 1} = \\frac{3 + 2}{3 - 1} = \\frac{5}{2}\\)"
        },
        {
          "difficulty": "medium",
          "question": "若 \\(\\sin\\theta \\cdot \\cos\\theta > 0\\)，判断 \\(\\theta\\) 是第几象限角。",
          "answer": "\\(\\sin\\theta \\cdot \\cos\\theta > 0\\) 说明 \\(\\sin\\theta\\) 和 \\(\\cos\\theta\\) 同号。同正时为第一象限角，同负时为第三象限角。故 \\(\\theta\\) 为第一或第三象限角。"
        },
        {
          "difficulty": "advanced",
          "question": "已知角 \\(\\alpha\\) 终边经过点 \\(P(-3, 4)\\)，求 \\(\\sin\\alpha\\)、\\(\\cos\\alpha\\)、\\(\\tan\\alpha\\) 的值。",
          "answer": "\\(r = \\sqrt{(-3)^2 + 4^2} = \\sqrt{9 + 16} = 5\\)。\\(\\sin\\alpha = \\frac{y}{r} = \\frac{4}{5}\\)，\\(\\cos\\alpha = \\frac{x}{r} = \\frac{-3}{5} = -\\frac{3}{5}\\)，\\(\\tan\\alpha = \\frac{y}{x} = \\frac{4}{-3} = -\\frac{4}{3}\\)"
        }
      ]
    }
  ]
}
