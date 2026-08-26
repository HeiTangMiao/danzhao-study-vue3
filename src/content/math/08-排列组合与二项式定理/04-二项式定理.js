/**
 * 内容页面数据（content-schema 的实例）
 * 页面：二项式定理
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-08-04",
  "unitNum": "08",
  "subject": "math",
  "title": "二项式定理",
  "subtitle": "通项公式与赋值法求系数和",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"二项式定理\"]\n  N1[\"定理公式\"]\n  N0 --> N1\n  N2[\"(a+b)^n = Σ C(n,k)·a^(n-k)·b^k\"]\n  N1 --> N2\n  N3[\"通项公式\"]\n  N0 --> N3\n  N4[\"Tr+1 = C(n,r)·a^(n-r)·b^r\"]\n  N3 --> N4\n  N5[\"性质\"]\n  N0 --> N5\n  N6[\"二项式系数对称性\"]\n  N5 --> N6\n  N7[\"二项式系数和 = 2^n\"]\n  N5 --> N7\n  N8[\"奇数项系数和 = 偶数项系数和\"]\n  N5 --> N8\n  N9[\"应用\"]\n  N0 --> N9\n  N10[\"求特定项\"]\n  N9 --> N10\n  N11[\"求系数\"]\n  N9 --> N11\n  N12[\"整除问题\"]\n  N9 --> N12"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握二项式定理及其通项公式",
        "理解二项式系数的性质，能求指定项的系数",
        "掌握赋值法求系数和的方法"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、二项式定理",
      "paragraphs": [
        "对任意正整数 \\(n\\)，有："
      ]
    },
    {
      "type": "formula",
      "title": "二项式定理",
      "formulas": [
        "(a+b)",
        "n+1"
      ]
    },
    {
      "type": "formula",
      "title": "通项公式（第 k+1 项）",
      "formulas": [
        "C_n^k",
        "k+1",
        "k"
      ]
    },
    {
      "type": "warning",
      "text": "注意区分\"二项式系数\"\\(C_n^k\\) 与\"项的系数\"。例如 \\(C_n^k \\cdot a^{n-k} \\cdot b^k\\) 中，\\(C_n^k\\) 是二项式系数，而整个项前面的常数因子才是项的系数。"
    },
    {
      "type": "table",
      "title": "三、二项式系数的性质",
      "headers": [
        "性质",
        "内容"
      ],
      "rows": [
        [
          "对称性",
          "\\(C_n^k = C_n^{n-k}\\)，即与首末等距的两项二项式系数相等"
        ],
        [
          "最大值",
          "当 \\(n\\) 为偶数时，中间一项最大；当 \\(n\\) 为奇数时，中间两项最大"
        ],
        [
          "系数和",
          "\\(C_n^0 + C_n^1 + \\cdots + C_n^n = 2^n\\)"
        ]
      ]
    },
    {
      "type": "knowledge",
      "title": "四、赋值法求系数和",
      "paragraphs": [
        "在二项展开式 \\(f(a,b) = (a+b)^n\\) 中，给 \\(a, b\\) 赋特定值，可得到系数和："
      ]
    },
    {
      "type": "formula",
      "title": "赋值法（令 a=b=1）",
      "formulas": [
        "2^n"
      ]
    },
    {
      "type": "formula",
      "title": "赋值法（令 a=1, b=-1）",
      "formulas": [
        "2^{n-1}"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求指定项",
          "question": "求 \\((x + \\dfrac{1}{x})^6\\) 的展开式中含 \\(x^2\\) 的项。",
          "solution": "解：设展开式的通项为：\n\n        $$T_{k+1} = C_6^k \\, x^{6-k} \\cdot \\left(\\frac{1}{x}\\right)^k = C_6^k \\, x^{6-k} \\cdot x^{-k} = C_6^k \\, x^{6-2k}$$\n\n        令 \\(6 - 2k = 2\\)，解得 \\(k = 2\\)。\n\n        所以含 \\(x^2\\) 的项为：\\(T_3 = C_6^2 \\, x^2 = 15 x^2\\)。",
          "answer": "答：含 \\(x^2\\) 的项为 \\(15x^2\\)。"
        },
        {
          "title": "例题2：求系数",
          "question": "求 \\((2x - 1)^5\\) 展开式中 \\(x^3\\) 的系数。",
          "solution": "解：设通项为：\n\n        $$T_{k+1} = C_5^k \\, (2x)^{5-k} \\cdot (-1)^k = C_5^k \\cdot 2^{5-k} \\cdot (-1)^k \\cdot x^{5-k}$$\n\n        令 \\(5 - k = 3\\)，得 \\(k = 2\\)。\n\n        所以 \\(x^3\\) 的系数为：\n\n        \\(C_5^2 \\cdot 2^3 \\cdot (-1)^2 = 10 \\times 8 \\times 1 = 80\\)。",
          "answer": "答：\\(x^3\\) 的系数为 80。"
        },
        {
          "title": "例题3：赋值法求系数和",
          "question": "已知 \\((1 - 2x)^7 = a_0 + a_1 x + a_2 x^2 + \\cdots + a_7 x^7\\)，求 \\(a_0 + a_1 + a_2 + \\cdots + a_7\\) 的值。",
          "solution": "分析：令 \\(x = 1\\)，左边变成各项系数之和。\n\n        解：令 \\(x = 1\\)，代入等式两边：\n\n        $$(1 - 2 \\times 1)^7 = a_0 + a_1 + a_2 + \\cdots + a_7$$\n\n        $$(-1)^7 = a_0 + a_1 + a_2 + \\cdots + a_7$$\n\n        所以 \\(a_0 + a_1 + \\cdots + a_7 = -1\\)。",
          "answer": "答：\\(a_0 + a_1 + \\cdots + a_7 = -1\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "写出 \\((a + b)^4\\) 的展开式。",
          "answer": "解：\\((a+b)^4 = a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4\\)。"
        },
        {
          "difficulty": "basic",
          "question": "\\((x + 2)^6\\) 的展开式中第 4 项的二项式系数是多少？",
          "answer": "解：第 4 项即 \\(k=3\\)，二项式系数为 \\(C_6^3 = 20\\)。"
        },
        {
          "difficulty": "medium",
          "question": "求 \\((1 + x)^8\\) 展开式中二项式系数最大的项。",
          "answer": "解：\\(n=8\\) 为偶数，中间项（第 5 项，\\(k=4\\)）最大：\\(T_5 = C_8^4 x^4 = 70x^4\\)。"
        },
        {
          "difficulty": "medium",
          "question": "\\((x - \\dfrac{2}{x})^5\\) 展开式中的常数项是多少？",
          "answer": "解：通项 \\(T_{k+1} = C_5^k x^{5-k}(-\\dfrac{2}{x})^k = C_5^k(-2)^k x^{5-2k}\\)。令 \\(5-2k=0\\)，\\(k=2.5\\) 非整数，故无常数项（答案为 0，即展开式中不含常数项）。"
        },
        {
          "difficulty": "advanced",
          "question": "若 \\((1 + x)^n\\) 的展开式中各项系数和为 32，求 \\(n\\) 的值。",
          "answer": "解：令 \\(x=1\\)，得 \\(2^n = 32\\)，所以 \\(n = 5\\)。"
        }
      ]
    }
  ]
}
