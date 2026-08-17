/**
 * 内容页面数据（content-schema 的实例）
 * 页面：集合的基本运算
 * 说明：由原始 HTML 抽取为结构化区块，按 type 分发渲染
 */
export default {
  id: "math-01-03",
  unitNum: "01",
  subject: "math",
  title: "集合的基本运算",
  subtitle: "掌握交集、并集、补集的运算及德摩根定律",
  blocks: [
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["集合的基本运算"]
  N1["交集"]
  N0 --> N1
  N2["A ∩ B"]
  N1 --> N2
  N3["公共元素"]
  N1 --> N3
  N4["并集"]
  N0 --> N4
  N5["A ∪ B"]
  N4 --> N5
  N6["所有元素"]
  N4 --> N6
  N7["补集"]
  N0 --> N7
  N8["全集 U"]
  N7 --> N8
  N9["∁UA"]
  N7 --> N9
  N10["运算定律"]
  N0 --> N10
  N11["交换律"]
  N10 --> N11
  N12["结合律"]
  N10 --> N12
  N13["分配律"]
  N10 --> N13
  N14["德摩根定律"]
  N10 --> N14`
    },
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "理解并掌握交集、并集、补集的定义和运算",
        "熟记集合运算的运算律（交换律、结合律、分配律、德摩根定律）",
        "能利用数轴求解含不等式集合的交、并、补运算",
        "掌握含参数的集合运算问题的分类讨论方法"
      ]
    },
    {
      type: "knowledge",
      title: "一、交集",
      paragraphs: [
        "由属于 \\(A\\) 且属于 \\(B\\) 的所有元素组成的集合，称为 \\(A\\) 与 \\(B\\) 的交集。"
      ]
    },
    {
      type: "formula",
      title: "交集",
      lines: ["$$A \\cap B = \\{x \\mid x \\in A \\text{ 且 } x \\in B\\}$$"]
    },
    {
      type: "knowledge",
      title: "交集的性质",
      paragraphs: [
        "① \\(A \\cap B \\subseteq A\\)，\\(A \\cap B \\subseteq B\\)",
        "② \\(A \\cap A = A\\)，\\(A \\cap \\varnothing = \\varnothing\\)",
        "③ 若 \\(A \\subseteq B\\)，则 \\(A \\cap B = A\\)"
      ]
    },
    {
      type: "knowledge",
      title: "二、并集",
      paragraphs: [
        "由属于 \\(A\\) 或属于 \\(B\\) 的所有元素组成的集合，称为 \\(A\\) 与 \\(B\\) 的并集。"
      ]
    },
    {
      type: "formula",
      title: "并集",
      lines: ["$$A \\cup B = \\{x \\mid x \\in A \\text{ 或 } x \\in B\\}$$"]
    },
    {
      type: "knowledge",
      title: "并集的性质",
      paragraphs: [
        "① \\(A \\subseteq A \\cup B\\)，\\(B \\subseteq A \\cup B\\)",
        "② \\(A \\cup A = A\\)，\\(A \\cup \\varnothing = A\\)",
        "③ 若 \\(A \\subseteq B\\)，则 \\(A \\cup B = B\\)"
      ]
    },
    {
      type: "knowledge",
      title: "三、补集",
      paragraphs: [
        "设 \\(U\\) 为全集，\\(A \\subseteq U\\)，由 \\(U\\) 中不属于 \\(A\\) 的所有元素组成的集合，称为 \\(A\\) 在全集 \\(U\\) 下的补集。"
      ]
    },
    {
      type: "formula",
      title: "补集",
      lines: ["$$\\complement_U A = \\{x \\mid x \\in U \\text{ 且 } x \\notin A\\}$$"]
    },
    {
      type: "knowledge",
      title: "补集的性质",
      paragraphs: [
        "① \\(\\complement_U U = \\varnothing\\)，\\(\\complement_U \\varnothing = U\\)",
        "② \\(A \\cup \\complement_U A = U\\)，\\(A \\cap \\complement_U A = \\varnothing\\)",
        "③ \\(\\complement_U(\\complement_U A) = A\\)"
      ]
    },
    {
      type: "formula",
      title: "德摩根定律",
      lines: [
        "$$\\complement_U(A \\cap B) = (\\complement_U A) \\cup (\\complement_U B)$$",
        "$$\\complement_U(A \\cup B) = (\\complement_U A) \\cap (\\complement_U B)$$"
      ]
    },
    {
      type: "tip",
      text: "口诀：\"交的补等于补的并，并的补等于补的交\"。"
    },
    {
      type: "table",
      title: "运算律总结",
      headers: ["定律", "交集", "并集"],
      rows: [
        ["交换律", "\\(A \\cap B = B \\cap A\\)", "\\(A \\cup B = B \\cup A\\)"],
        ["结合律", "\\((A\\cap B)\\cap C = A\\cap(B\\cap C)\\)", "\\((A\\cup B)\\cup C = A\\cup(B\\cup C)\\)"],
        ["分配律", "\\(A\\cap(B\\cup C) = (A\\cap B)\\cup(A\\cap C)\\)", "\\(A\\cup(B\\cap C) = (A\\cup B)\\cap(A\\cup C)\\)"]
      ]
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：求交集、并集、补集",
          question: "设全集 \\(U = \\{1, 2, 3, 4, 5, 6, 7, 8\\}\\)，\\(A = \\{1, 2, 3, 4\\}\\)，\\(B = \\{3, 4, 5, 6\\}\\)，求 \\(A \\cap B\\)、\\(A \\cup B\\)、\\(\\complement_U A\\)、\\(\\complement_U(A \\cap B)\\)。",
          solution: "**解：**\n① \\(A \\cap B = \\{3, 4\\}\\)（两集合共有的元素）\n② \\(A \\cup B = \\{1, 2, 3, 4, 5, 6\\}\\)（两集合所有元素合并）\n③ \\(\\complement_U A = \\{5, 6, 7, 8\\}\\)（全集去掉 \\(A\\) 中的元素）\n④ \\(\\complement_U(A \\cap B) = \\complement_U\\{3,4\\} = \\{1, 2, 5, 6, 7, 8\\}\\)\n验证德摩根定律：\\((\\complement_U A)\\cup(\\complement_U B) = \\{5,6,7,8\\}\\cup\\{1,2,7,8\\} = \\{1,2,5,6,7,8\\}\\)，结果一致。",
          answer: "答案：\\(A\\cap B=\\{3,4\\}\\)；\\(A\\cup B=\\{1,2,3,4,5,6\\}\\)；\\(\\complement_U A=\\{5,6,7,8\\}\\)；\\(\\complement_U(A\\cap B)=\\{1,2,5,6,7,8\\}\\)。"
        },
        {
          title: "例题2：含参数的集合运算",
          question: "设集合 \\(A = \\{x \\mid -2 \\le x \\le 5\\}\\)，\\(B = \\{x \\mid m+1 \\le x \\le 2m-1\\}\\)，若 \\(A \\cup B = A\\)，求实数 \\(m\\) 的取值范围。",
          solution: "**解：**\n因为 \\(A \\cup B = A\\)，所以 \\(B \\subseteq A\\)。\n**情况1：**当 \\(B = \\varnothing\\) 时，即 \\(m+1 > 2m-1\\)，解得 \\(m < 2\\)。\n**情况2：**当 \\(B \\ne \\varnothing\\) 时，即 \\(m \\ge 2\\)，需要 \\(B \\subseteq A\\)：\n$$\\begin{cases} m+1 \\ge -2 \\\\ 2m-1 \\le 5 \\end{cases}$$\n解得 \\(m \\ge -3\\) 且 \\(m \\le 3\\)，结合 \\(m \\ge 2\\)，得 \\(2 \\le m \\le 3\\)。\n综上，\\(m < 2\\) 或 \\(2 \\le m \\le 3\\)，即 \\(m \\le 3\\)。",
          answer: "答案：\\(m\\) 的取值范围是 \\(m \\le 3\\)。"
        },
        {
          title: "例题3：利用数轴求不等式解集的运算",
          question: "设全集 \\(U = \\mathbb{R}\\)，\\(A = \\{x \\mid x < 1 \\text{ 或 } x > 3\\}\\)，\\(B = \\{x \\mid x \\le -1 \\text{ 或 } x \\ge 2\\}\\)，求 \\(A \\cap B\\)、\\(\\complement_U A\\)、\\((\\complement_U A) \\cap B\\)。",
          solution: "**解：**\n画数轴辅助分析。\n① \\(A \\cap B\\)：\\(A\\) 为 \\((-\\infty,1)\\cup(3,+\\infty)\\)，\\(B\\) 为 \\((-\\infty,-1]\\cup[2,+\\infty)\\)。公共部分为 \\((-\\infty,-1] \\cup (3,+\\infty)\\)。\n② \\(\\complement_U A = \\{x \\mid 1 \\le x \\le 3\\}\\)。\n③ \\((\\complement_U A) \\cap B = [1,3] \\cap \\big((-\\infty,-1]\\cup[2,+\\infty)\\big) = [2,3]\\)。",
          answer: "答案：\\(A\\cap B=\\{x\\mid x\\le -1 \\text{ 或 } x>3\\}\\)；\\(\\complement_U A=\\{x\\mid 1\\le x\\le 3\\}\\)；\\((\\complement_U A)\\cap B=[2,3]\\)。"
        },
        {
          title: "例题4：德摩根定律的验证（基础计算型）",
          question: "设全集 \\(U = \\{1, 2, 3, 4, 5, 6\\}\\)，\\(A = \\{1, 2, 3, 4\\}\\)，\\(B = \\{3, 4, 5\\}\\)，求 \\(\\complement_U(A \\cup B)\\) 和 \\((\\complement_U A) \\cap (\\complement_U B)\\)，并验证德摩根定律。",
          solution: "**解：**\n**第一步：**\\(A \\cup B = \\{1, 2, 3, 4, 5\\}\\)。\n**第二步：**\\(\\complement_U(A \\cup B) = U \\setminus \\{1,2,3,4,5\\} = \\{6\\}\\)。\n**第三步：**\\(\\complement_U A = \\{5, 6\\}\\)，\\(\\complement_U B = \\{1, 2, 6\\}\\)，两者交集为 \\(\\{6\\}\\)。\n**验证：**两结果相等，德摩根定律\"并的补等于补的交\"成立。",
          answer: "答案：\\(\\complement_U(A \\cup B) = \\{6\\}\\)，\\((\\complement_U A) \\cap (\\complement_U B) = \\{6\\}\\)，两者相等，德摩根定律成立。"
        },
        {
          title: "例题5：由交集条件求参数（综合应用型）",
          question: "已知集合 \\(A = \\{1, 3, a^2\\}\\)，\\(B = \\{1, a+2, a-2\\}\\)，若 \\(A \\cap B = \\{1, 4\\}\\)，求实数 \\(a\\) 的值。",
          solution: "**解：**\n因为 \\(A \\cap B = \\{1, 4\\}\\)，所以 4 必须同时属于 \\(A\\) 和 \\(B\\)。\n**第一步：**由 \\(4 \\in A\\)，\\(a^2 = 4\\)，解得 \\(a = \\pm 2\\)。\n**第二步：**逐一验证。\n① 当 \\(a = 2\\) 时：\\(A = \\{1, 3, 4\\}\\)，\\(B = \\{1, 4, 0\\}\\)，\\(A \\cap B = \\{1, 4\\}\\)，符合；\n② 当 \\(a = -2\\) 时：\\(A = \\{1, 3, 4\\}\\)，\\(B = \\{1, 0, -4\\}\\)，\\(A \\cap B = \\{1\\}\\)，不符合。\n综上，\\(a = 2\\)。",
          answer: "答案：\\(a = 2\\)。"
        }
      ]
    },
    {
      type: "quiz",
      title: "练习题",
      items: [
        {
          difficulty: "basic",
          question: "设集合 \\(A = \\{1, 2, 3\\}\\)，\\(B = \\{2, 3, 4\\}\\)，则 \\(A \\cap B =\\) ______，\\(A \\cup B =\\) ______。",
          answer: "答案：\\(A\\cap B=\\{2,3\\}\\)；\\(A\\cup B=\\{1,2,3,4\\}\\)。"
        },
        {
          difficulty: "basic",
          question: "设全集 \\(U = \\{1,2,3,4,5\\}\\)，\\(A = \\{1,2,3\\}\\)，\\(B = \\{2,3,4\\}\\)，则 \\(\\complement_U(A \\cup B) =\\) ______。",
          answer: "答案：\\(\\{5\\}\\)。\\(A\\cup B = \\{1,2,3,4\\}\\)，所以 \\(\\complement_U(A\\cup B) = \\{5\\}\\)。"
        },
        {
          difficulty: "medium",
          question: "已知集合 \\(A = \\{x \\mid x < a\\}\\)，\\(B = \\{x \\mid 1 \\le x \\le 3\\}\\)，若 \\(A \\cap B = \\varnothing\\)，求实数 \\(a\\) 的取值范围。",
          answer: "答案：\\(a \\le 1\\)。\\(A\\cap B = \\varnothing\\) 表示 \\((-\\infty, a)\\) 与 \\([1,3]\\) 无公共部分，需 \\(a \\le 1\\)。"
        },
        {
          difficulty: "medium",
          question: "已知全集 \\(U = \\mathbb{R}\\)，\\(A = \\{x \\mid x^2-3x+2 < 0\\}\\)，\\(B = \\{x \\mid x \\ge 0\\}\\)，求 \\(A \\cap B\\) 和 \\(\\complement_U A\\)。",
          answer: "答案：\\(A = \\{x \\mid 1 < x < 2\\}\\)。\\(A\\cap B = \\{x \\mid 1 < x < 2\\}\\)。\\(\\complement_U A = \\{x \\mid x \\le 1 \\text{ 或 } x \\ge 2\\}\\)。"
        },
        {
          difficulty: "advanced",
          question: "设 \\(A = \\{x \\mid x^2-4x+3 \\le 0\\}\\)，\\(B = \\{x \\mid x-a > 0\\}\\)，若 \\(A \\cap B \\ne \\varnothing\\)，求实数 \\(a\\) 的取值范围。",
          answer: "答案：\\(a < 3\\)。\\(A=[1,3]\\)，\\(B=(a,+\\infty)\\)。\\(A\\cap B \\ne \\varnothing\\) 要求 \\(a < 3\\)。"
        }
      ]
    }
  ]
}