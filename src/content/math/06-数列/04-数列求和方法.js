/**
 * 内容页面数据（content-schema 的实例）
 * 页面：数列求和方法
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-06-04",
  "unitNum": "06",
  "subject": "math",
  "title": "数列求和方法",
  "subtitle": "裂项相消、错位相减、分组求和",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"数列求和方法\"]\n  N1[\"公式法\"]\n  N0 --> N1\n  N2[\"等差数列求和\"]\n  N1 --> N2\n  N3[\"等比数列求和\"]\n  N1 --> N3\n  N4[\"分组求和\"]\n  N0 --> N4\n  N5[\"等差+等比\"]\n  N4 --> N5\n  N6[\"分别求和\"]\n  N4 --> N6\n  N7[\"裂项相消\"]\n  N0 --> N7\n  N8[\"1/(n(n+1))型\"]\n  N7 --> N8\n  N9[\"裂项后首尾相消\"]\n  N7 --> N9\n  N10[\"错位相减\"]\n  N0 --> N10\n  N11[\"等差×等比\"]\n  N10 --> N11\n  N12[\"乘公比后相减\"]\n  N10 --> N12\n  N13[\"倒序相加\"]\n  N0 --> N13\n  N14[\"首末等距配对\"]\n  N13 --> N14"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握公式法求和，能直接运用等差、等比数列求和公式",
        "掌握分组求和法，能将数列拆分为等差与等比分别求和",
        "掌握裂项相消法，能将通项拆分后求和",
        "掌握错位相减法，能解决等差乘等比型数列的求和"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、公式法",
      "paragraphs": [
        "直接使用等差数列和等比数列的求和公式。\n\n      • 等差数列：\\(S_n = \\frac{n(a_1 + a_n)}{2} = na_1 + \\frac{n(n-1)}{2}d\\)\n\n      • 等比数列：\\(S_n = \\frac{a_1(1-q^n)}{1-q}\\)（\\(q \\neq 1\\)）或 \\(S_n = na_1\\)（\\(q = 1\\)）"
      ]
    },
    {
      "type": "knowledge",
      "title": "二、分组求和法",
      "paragraphs": [
        "当一个数列可以拆分为几个等差数列或等比数列的和时，分别求和再相加。\n\n      例如：\\(a_n = (2n-1) + 3^n\\)，则 \\(S_n = \\sum a_n = \\sum(2n-1) + \\sum 3^n\\)。"
      ]
    },
    {
      "type": "knowledge",
      "title": "三、裂项相消法",
      "paragraphs": [
        "将数列的通项拆成两项之差，使得求和时中间项相互抵消，只剩首尾若干项。"
      ]
    },
    {
      "type": "tip",
      "text": "裂项的关键是找到合适的拆分方式，使中间项能够恰好抵消。"
    },
    {
      "type": "knowledge",
      "title": "四、错位相减法",
      "paragraphs": [
        "适用于数列 \\(\\{a_n \\cdot b_n\\}\\)，其中 \\(\\{a_n\\}\\) 为等差数列，\\(\\{b_n\\}\\) 为等比数列。\n\n      步骤：\n\n      1. 写出 \\(S_n = a_1 b_1 + a_2 b_2 + \\cdots + a_n b_n\\)\n\n      2. 两边同乘公比 \\(q\\)，得到 \\(qS_n\\)\n\n      3. 两式相减，中间项消去（等比部分）\n\n      4. 整理求出 \\(S_n\\)"
      ]
    },
    {
      "type": "warning",
      "text": "错位相减后，注意第一项和最后一项不要遗漏，且最后一项需乘 \\(q\\)。"
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：裂项相消",
          "question": "求和：\\(S_n = \\frac{1}{1\\times 2} + \\frac{1}{2\\times 3} + \\frac{1}{3\\times 4} + \\cdots + \\frac{1}{n(n+1)}\\)",
          "solution": "解：\n\n        因为 \\(\\frac{1}{k(k+1)} = \\frac{1}{k} - \\frac{1}{k+1}\\)，所以：\n\n        \\(S_n = \\left(\\frac{1}{1} - \\frac{1}{2}\\right) + \\left(\\frac{1}{2} - \\frac{1}{3}\\right) + \\left(\\frac{1}{3} - \\frac{1}{4}\\right) + \\cdots + \\left(\\frac{1}{n} - \\frac{1}{n+1}\\right)\\)\n\n        \\(= 1 - \\frac{1}{n+1}\\)\n\n        \\(= \\frac{n}{n+1}\\)",
          "answer": ""
        },
        {
          "title": "例题2：错位相减",
          "question": "求和：\\(S_n = 1 + 2 \\times 2 + 3 \\times 2^2 + 4 \\times 2^3 + \\cdots + n \\times 2^{n-1}\\)",
          "solution": "解：\n\n        \\(S_n = 1 + 2 \\times 2 + 3 \\times 2^2 + \\cdots + n \\times 2^{n-1}\\) ... ①\n\n        两边乘 \\(2\\)：\n\n        \\(2S_n = 1 \\times 2 + 2 \\times 2^2 + 3 \\times 2^3 + \\cdots + (n-1) \\times 2^{n-1} + n \\times 2^n\\) ... ②\n\n        ① - ②：\n\n        \\(-S_n = 1 + 2 + 2^2 + \\cdots + 2^{n-1} - n \\times 2^n\\)\n\n        \\(-S_n = \\frac{1 \\times (1 - 2^n)}{1 - 2} - n \\times 2^n = 2^n - 1 - n \\times 2^n\\)\n\n        \\(S_n = n \\times 2^n - 2^n + 1 = (n-1) \\times 2^n + 1\\)",
          "answer": ""
        },
        {
          "title": "例题3：分组求和",
          "question": "求和：\\(S_n = (1 + 2 + 3 + \\cdots + n) + (2 + 4 + 6 + \\cdots + 2n)\\)",
          "solution": "解：\n\n        第一组为等差数列求和：\n\n        \\(1 + 2 + 3 + \\cdots + n = \\frac{n(n+1)}{2}\\)\n\n        第二组为等差数列求和：\n\n        \\(2 + 4 + 6 + \\cdots + 2n = 2(1 + 2 + 3 + \\cdots + n) = 2 \\times \\frac{n(n+1)}{2} = n(n+1)\\)\n\n        所以 \\(S_n = \\frac{n(n+1)}{2} + n(n+1) = \\frac{n(n+1) + 2n(n+1)}{2} = \\frac{3n(n+1)}{2}\\)",
          "answer": ""
        },
        {
          "title": "例题4：裂项相消法的系数易错点（易错型）",
          "question": "求和：\\(S_n = \\frac{1}{1 \\times 3} + \\frac{1}{2 \\times 4} + \\frac{1}{3 \\times 5} + \\cdots + \\frac{1}{n(n+2)}\\)。",
          "solution": "解：\n\n        通项 \\(a_k = \\frac{1}{k(k+2)}\\)。\n\n        裂项：设 \\(\\frac{1}{k(k+2)} = \\frac{A}{k} + \\frac{B}{k+2}\\)，通分得：\n\n        $$\\frac{1}{k(k+2)} = \\frac{A(k+2) + Bk}{k(k+2)} = \\frac{(A+B)k + 2A}{k(k+2)}$$\n\n        比较分子：\\(A + B = 0\\)，\\(2A = 1\\)，解得 \\(A = \\frac{1}{2}\\)，\\(B = -\\frac{1}{2}\\)。\n\n        所以：\n\n        $$\\frac{1}{k(k+2)} = \\frac{1}{2}\\left(\\frac{1}{k} - \\frac{1}{k+2}\\right)$$\n\n        求和：\n\n        \\(S_n = \\frac{1}{2}\\left[\\left(\\frac{1}{1} - \\frac{1}{3}\\right) + \\left(\\frac{1}{2} - \\frac{1}{4}\\right) + \\left(\\frac{1}{3} - \\frac{1}{5}\\right) + \\cdots + \\left(\\frac{1}{n} - \\frac{1}{n+2}\\right)\\right]\\)\n\n        分析抵消规律：每项裂成 \\(\\frac{1}{k}\\) 和 \\(-\\frac{1}{k+2}\\)，间隔为 2。\n\n        正项 \\(\\frac{1}{1}, \\frac{1}{2}, \\frac{1}{3}, \\ldots, \\frac{1}{n}\\) 与负项 \\(-\\frac{1}{3}, -\\frac{1}{4}, -\\frac{1}{5}, \\ldots, -\\frac{1}{n+2}\\)。\n\n        其中 \\(\\frac{1}{3}\\) 到 \\(\\frac{1}{n}\\) 的正项分别被对应负项抵消，剩余未抵消的项为：\n\n        正项剩余：\\(\\frac{1}{1} + \\frac{1}{2}\\)；负项剩余：\\(-\\frac{1}{n+1} - \\frac{1}{n+2}\\)。\n\n        所以：\n\n        $$S_n = \\frac{1}{2}\\left(1 + \\frac{1}{2} - \\frac{1}{n+1} - \\frac{1}{n+2}\\right) = \\frac{1}{2}\\left(\\frac{3}{2} - \\frac{1}{n+1} - \\frac{1}{n+2}\\right) = \\frac{3}{4} - \\frac{1}{2}\\left(\\frac{1}{n+1} + \\frac{1}{n+2}\\right)$$\n\n        易错提醒：裂项 \\(\\frac{1}{k(k+2)}\\) 时，系数是 \\(\\frac{1}{2}\\) 而不是 1！常见错误是直接写成 \\(\\frac{1}{k(k+2)} = \\frac{1}{k} - \\frac{1}{k+2}\\)，漏掉了系数 \\(\\frac{1}{2}\\)。此外，间隔为 2 时，剩余项有 4 项（前两项的正部分和后两项的负部分），不能只保留首尾 2 项。",
          "answer": ""
        },
        {
          "title": "例题5：错位相减法求和的综合应用（综合应用型）",
          "question": "求和：\\(S_n = 1 \\times 3 + 2 \\times 3^2 + 3 \\times 3^3 + \\cdots + n \\times 3^n\\)。",
          "solution": "解：\n\n        数列通项 \\(a_k = k \\times 3^k\\)，其中 \\(\\{k\\}\\) 为等差数列（公差 1），\\(\\{3^k\\}\\) 为等比数列（公比 3），属于\"等差 \\(\\times\\) 等比\"型，用错位相减法。\n\n        写出求和式：\n\n        $$S_n = 1 \\times 3 + 2 \\times 3^2 + 3 \\times 3^3 + \\cdots + n \\times 3^n \\quad \\cdots ①$$\n\n        两边同乘公比 \\(q = 3\\)：\n\n        $$3S_n = 1 \\times 3^2 + 2 \\times 3^3 + \\cdots + (n-1) \\times 3^n + n \\times 3^{n+1} \\quad \\cdots ②$$\n\n        ① - ②（错位相减，左边减右边）：\n\n        $$S_n - 3S_n = 1 \\times 3 + (2-1) \\times 3^2 + (3-2) \\times 3^3 + \\cdots + [n-(n-1)] \\times 3^n - n \\times 3^{n+1}$$\n\n        $$-2S_n = 3 + 3^2 + 3^3 + \\cdots + 3^n - n \\times 3^{n+1}$$\n\n        前 \\(n\\) 项 \\(3 + 3^2 + \\cdots + 3^n\\) 是等比数列求和（\\(a_1 = 3\\)，\\(q = 3\\)，项数 \\(n\\)）：\n\n        $$3 + 3^2 + \\cdots + 3^n = \\frac{3(3^n - 1)}{3 - 1} = \\frac{3(3^n - 1)}{2}$$\n\n        代入得：\n\n        $$-2S_n = \\frac{3(3^n - 1)}{2} - n \\times 3^{n+1}$$\n\n        两边除以 \\(-2\\)：\n\n        $$S_n = \\frac{n \\times 3^{n+1} - \\frac{3(3^n - 1)}{2}}{2} = \\frac{2n \\times 3^{n+1} - 3(3^n - 1)}{4} = \\frac{2n \\times 3^{n+1} - 3^{n+1} + 3}{4} = \\frac{(2n-1) \\times 3^{n+1} + 3}{4}$$\n\n        验证（\\(n = 1\\) 时）：直接计算 \\(S_1 = 1 \\times 3 = 3\\)。代入公式：\\(\\frac{(2 \\times 1 - 1) \\times 3^2 + 3}{4} = \\frac{9 + 3}{4} = \\frac{12}{4} = 3\\)，符合。",
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
          "question": "求和：\\(S_n = \\frac{1}{2 \\times 4} + \\frac{1}{4 \\times 6} + \\frac{1}{6 \\times 8} + \\cdots + \\frac{1}{2n(2n+2)}\\)",
          "answer": "\\(\\frac{1}{2k(2k+2)} = \\frac{1}{2}\\left(\\frac{1}{2k} - \\frac{1}{2k+2}\\right)\\)。\\(S_n = \\frac{1}{2}\\left[\\left(\\frac{1}{2}-\\frac{1}{4}\\right)+\\left(\\frac{1}{4}-\\frac{1}{6}\\right)+\\cdots+\\left(\\frac{1}{2n}-\\frac{1}{2n+2}\\right)\\right] = \\frac{1}{2}\\left(\\frac{1}{2}-\\frac{1}{2n+2}\\right) = \\frac{1}{2} \\times \\frac{2n+2-2}{2(2n+2)} = \\frac{1}{2} \\times \\frac{2n}{2(2n+2)} = \\frac{n}{2(2n+2)} = \\frac{n}{4(n+1)}\\)。"
        },
        {
          "difficulty": "basic",
          "question": "求和：\\(S_n = 1 \\times 3 + 2 \\times 3^2 + 3 \\times 3^3 + \\cdots + n \\times 3^n\\)",
          "answer": "用错位相减法。\\(S_n = 1\\cdot3 + 2\\cdot3^2 + \\cdots + n\\cdot3^n\\) ... ①。\\(3S_n = 1\\cdot3^2 + 2\\cdot3^3 + \\cdots + (n-1)\\cdot3^n + n\\cdot3^{n+1}\\) ... ②。①-②：\\(-2S_n = 3 + 3^2 + 3^3 + \\cdots + 3^n - n\\cdot3^{n+1} = \\frac{3(3^n-1)}{2} - n\\cdot3^{n+1}\\)。\\(S_n = \\frac{n\\cdot3^{n+1} - \\frac{3(3^n-1)}{2}}{2} = \\frac{2n\\cdot3^{n+1} - 3(3^n-1)}{4} = \\frac{2n\\cdot3^{n+1} - 3^{n+1} + 3}{4} = \\frac{(2n-1)\\cdot3^{n+1} + 3}{4}\\)。"
        },
        {
          "difficulty": "medium",
          "question": "求和：\\(S_n = (1 + 2^1) + (2 + 2^2) + (3 + 2^3) + \\cdots + (n + 2^n)\\)",
          "answer": "分组求和：\\(S_n = (1+2+3+\\cdots+n) + (2+4+8+\\cdots+2^n)\\)。第一部分 \\(= \\frac{n(n+1)}{2}\\)。第二部分为等比数列，\\(a_1=2, q=2\\)：\\(\\frac{2(2^n-1)}{2-1} = 2^{n+1}-2\\)。\\(S_n = \\frac{n(n+1)}{2} + 2^{n+1} - 2\\)。"
        },
        {
          "difficulty": "medium",
          "question": "已知数列 \\(\\{a_n\\}\\) 的通项 \\(a_n = \\frac{1}{(2n-1)(2n+1)}\\)，求 \\(S_n\\)。",
          "answer": "\\(\\frac{1}{(2n-1)(2n+1)} = \\frac{1}{2}\\left(\\frac{1}{2n-1} - \\frac{1}{2n+1}\\right)\\)。\\(S_n = \\frac{1}{2}\\left[\\left(1-\\frac{1}{3}\\right)+\\left(\\frac{1}{3}-\\frac{1}{5}\\right)+\\cdots+\\left(\\frac{1}{2n-1}-\\frac{1}{2n+1}\\right)\\right] = \\frac{1}{2}\\left(1-\\frac{1}{2n+1}\\right) = \\frac{1}{2} \\times \\frac{2n}{2n+1} = \\frac{n}{2n+1}\\)。"
        },
        {
          "difficulty": "advanced",
          "question": "求数列 \\(1, \\frac{1}{2}, \\frac{1}{4}, \\frac{1}{8}, \\ldots, \\frac{1}{2^{n-1}}\\) 的前 \\(n\\) 项和。",
          "answer": "这是等比数列，\\(a_1 = 1\\)，\\(q = \\frac{1}{2}\\)。\\(S_n = \\frac{1 \\times \\left(1 - \\frac{1}{2^n}\\right)}{1 - \\frac{1}{2}} = 2\\left(1 - \\frac{1}{2^n}\\right) = 2 - \\frac{1}{2^{n-1}}\\)。"
        }
      ]
    }
  ]
}
