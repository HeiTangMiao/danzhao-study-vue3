/**
 * 内容页面数据（content-schema 的实例）
 * 页面：向量的概念与线性运算
 * 由原始 HTML 自动转换生成
 */
export default {
  blocks: [
    {
      type: "layout",
      as: "hero",
      props: { align: "start", tone: "accent" },
      children: [
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能说出向量、模、零向量、单位向量的概念，并区分向量与数量",
            "能判断平行（共线）向量、相等向量与相反向量",
            "能用三角形法则与平行四边形法则完成向量加减法的作图与运算",
            "能说出向量数乘的几何意义，并完成数乘运算"
          ]
        },

        {
          type: "mindmap",
          title: "知识结构导图",
          mermaid: "graph LR\n  ROOT[\"向量的概念与线性运算\"]\n  ROOT --> A[\"向量概念\"]\n  A --> A1[\"大小<br/>模 |a|\"]\n  A --> A2[\"方向\"]\n  A --> A3[\"有向线段表示<br/>记作 a 或 AB\"]\n  A --> A4[\"零向量 <br/>|0|=0 方向任意\"]\n  A --> A5[\"单位向量 <br/>|a|=1\"]\n  B[\"向量关系\"]\n  ROOT --> B\n  B --> B1[\"平行向量<br/>方向相同或相反\"]\n  B --> B2[\"相等向量<br/>同向且模相等\"]\n  B --> B3[\"相反向量<br/>反向且模相等\"]\n  C[\"加法运算\"]\n  ROOT --> C\n  C --> C1[\"三角形法则\"]\n  C --> C2[\"平行四边形法则\"]\n  C --> C3[\"运算律<br/>交换律·结合律\"]\n  D[\"减法运算\"]\n  ROOT --> D\n  D --> D1[\"a-b = a+(-b)\"]\n  D --> D2[\"共起点<br/>指向被减向量\"]\n  E[\"数乘运算\"]\n  ROOT --> E\n  E --> E1[\"λa 的模与方向\"]\n  E --> E2[\"运算律<br/>分配律·结合律\"]\n  E --> E3[\"共线向量定理<br/>a∥b ⟺ b=λa\"]\n  B -.->|定义基础| A\n  C -.->|依赖| A\n  D -.->|转化| C\n  E -.->|判定| B"
        },
      ]
    },

    {
      type: "knowledge",
      title: "一、向量的定义",
      paragraphs: [
        "既有大小又有方向的量称为向量。向量常用有向线段表示，记作 \\(\\vec{AB}\\) 或 \\(\\boldsymbol{a}\\)。\n\n      向量的大小称为向量的模，记作 \\(|\\vec{AB}|\\) 或 \\(|\\boldsymbol{a}|\\)。"
      ]
    },

    {
      type: "tip",
      text: "零向量与任一向量平行。规定 \\(\\boldsymbol{0}\\) 与任何向量共线。"
    },

    {
      type: "table",
      title: "二、特殊向量",
      headers: ["名称", "定义", "记法"],
      rows: [
        ["零向量", "模为 \\(0\\) 的向量，方向任意", "\\(\\boldsymbol{0}\\)"],
        ["单位向量", "模为 \\(1\\) 的向量", "—"],
        ["平行向量", "方向相同或相反的非零向量（共线）", "\\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)"],
        ["相等向量", "模相等且方向相同的向量", "\\(\\boldsymbol{a} = \\boldsymbol{b}\\)"],
        ["相反向量", "模相等且方向相反的向量", "\\(\\boldsymbol{a} = -\\boldsymbol{b}\\)"]
      ]
    },

    {
      type: "knowledge",
      title: "三、向量加法",
      paragraphs: [
        "三角形法则：首尾相接，从第一个向量的起点指向最后一个向量的终点的向量。\n\n      \\(\\vec{AB} + \\vec{BC} = \\vec{AC}\\)\n\n      平行四边形法则：两个向量共起点，以它们为邻边作平行四边形，对角线即为和向量。"
      ]
    },

    {
      type: "diagram",
      title: "三角形法则演示",
      boardId: "vector-triangle-law",
      caption: "首尾相接：\\(\\vec{AB} + \\vec{BC} = \\vec{AC}\\)。拖动点 B、C 可改变向量，和向量自动更新。"
    },

    {
      type: "diagram",
      title: "平行四边形法则演示",
      boardId: "vector-parallelogram-law",
      caption: "共起点：以 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 为邻边作平行四边形，对角线即和向量。拖动点 A、B 观察变化。"
    },

    {
      type: "knowledge",
      title: "四、向量减法",
      paragraphs: [
        "减法几何意义：共起点的两向量之差，等于从减向量的终点指向被减向量的终点的向量。\n\n      \\(\\vec{AB} - \\vec{AC} = \\vec{CB}\\)"
      ]
    },

    {
      type: "formula",
      title: "数乘运算",
      formulas: [
        "\\(\\lambda \\boldsymbol{a}\\)（\\(\\lambda \\in \\mathbb{R}\\)）是一个向量：",
        "\\lambda > 0",
        "\\lambda\\boldsymbol{a}",
        "\\boldsymbol{a}",
        "|\\lambda\\boldsymbol{a}| = \\lambda|\\boldsymbol{a}|",
        "\\lambda < 0",
        "\\lambda\\boldsymbol{a}",
        "\\boldsymbol{a}",
        "|\\lambda\\boldsymbol{a}| = |\\lambda||\\boldsymbol{a}|",
        "\\lambda = 0",
        "\\lambda\\boldsymbol{a} = \\boldsymbol{0}"
      ]
    },

    {
      type: "diagram",
      title: "数乘的几何意义演示",
      boardId: "vector-scalar-multiplication",
      caption: "\\(\\lambda > 0\\) 时 \\(\\lambda\\boldsymbol{a}\\) 与 \\(\\boldsymbol{a}\\) 同向，\\(\\lambda < 0\\) 时反向，模长为 \\(|\\lambda|\\) 倍。拖动点 A 观察。"
    },

    {
      type: "formula",
      title: "共线向量定理",
      formulas: [
        "向量 \\(\\boldsymbol{a}\\)（\\(\\boldsymbol{a} \\neq \\boldsymbol{0}\\)）与 \\(\\boldsymbol{b}\\) 共线，当且仅当存在唯一实数 \\(\\lambda\\)，使得："
      ]
    },

    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：向量运算",
          question: "化简以下向量表达式：\\(\\overrightarrow{AB} - \\overrightarrow{AC} + \\overrightarrow{BD} - \\overrightarrow{CD}\\)",
          solution: "解：\n\n        \\(\\overrightarrow{AB} - \\overrightarrow{AC} + \\overrightarrow{BD} - \\overrightarrow{CD}\\)\n\n        \\(= (\\overrightarrow{AB} + \\overrightarrow{BD}) - (\\overrightarrow{AC} + \\overrightarrow{CD})\\)\n\n        \\(= \\overrightarrow{AD} - \\overrightarrow{AD}\\)\n\n        \\(= \\boldsymbol{0}\\)",
          answer: "\\(\\boldsymbol{0}\\)（零向量）"
        },
        {
          title: "例题2：化简",
          question: "已知 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 为向量，化简：\\(3(\\boldsymbol{a} - 2\\boldsymbol{b}) - 2(2\\boldsymbol{a} + \\boldsymbol{b})\\)",
          solution: "解：\n\n        \\(3(\\boldsymbol{a} - 2\\boldsymbol{b}) - 2(2\\boldsymbol{a} + \\boldsymbol{b})\\)\n\n        \\(= 3\\boldsymbol{a} - 6\\boldsymbol{b} - 4\\boldsymbol{a} - 2\\boldsymbol{b}\\)\n\n        \\(= (3 - 4)\\boldsymbol{a} + (-6 - 2)\\boldsymbol{b}\\)\n\n        \\(= -\\boldsymbol{a} - 8\\boldsymbol{b}\\)",
          answer: "\\(-\\boldsymbol{a} - 8\\boldsymbol{b}\\)"
        }
      ]
    },

    {
      type: "quiz",
      title: "练习题",
      items: [
        {
          difficulty: "basic",
          question: "化简：\\(\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{CD} + \\overrightarrow{DA}\\)",
          answer: "\\(\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{CD} + \\overrightarrow{DA} = \\overrightarrow{AD} + \\overrightarrow{DA} = \\overrightarrow{AD} - \\overrightarrow{AD} = \\boldsymbol{0}\\)（零向量）"
        },
        {
          difficulty: "medium",
          question: "已知 \\(\\overrightarrow{OA} = \\boldsymbol{a}\\)，\\(\\overrightarrow{OB} = \\boldsymbol{b}\\)，用 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 表示 \\(\\overrightarrow{AB}\\)。",
          answer: "\\(\\overrightarrow{AB} = \\overrightarrow{OB} - \\overrightarrow{OA} = \\boldsymbol{b} - \\boldsymbol{a}\\)"
        },
        {
          difficulty: "medium",
          question: "化简：\\(2(\\boldsymbol{a} + \\boldsymbol{b}) - 3(\\boldsymbol{a} - \\boldsymbol{b})\\)",
          answer: "\\(2\\boldsymbol{a} + 2\\boldsymbol{b} - 3\\boldsymbol{a} + 3\\boldsymbol{b} = -\\boldsymbol{a} + 5\\boldsymbol{b}\\)"
        },
        {
          difficulty: "advanced",
          question: "在平行四边形 \\(ABCD\\) 中，\\(\\overrightarrow{AB} = \\boldsymbol{a}\\)，\\(\\overrightarrow{AD} = \\boldsymbol{b}\\)，用 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 表示 \\(\\overrightarrow{AC}\\) 和 \\(\\overrightarrow{BD}\\)。",
          answer: "\\(\\overrightarrow{AC} = \\overrightarrow{AB} + \\overrightarrow{AD} = \\boldsymbol{a} + \\boldsymbol{b}\\)；\\(\\overrightarrow{BD} = \\overrightarrow{AD} - \\overrightarrow{AB} = \\boldsymbol{b} - \\boldsymbol{a}\\)。"
        }
      ]
    },

    // ---------- 快速检测（客观题 · 可判分） ----------
    {
      type: "quiz",
      title: "快速检测（客观题）",
      items: [
        {
          difficulty: "medium",
          type: "judge",
          question: "零向量与任意向量都平行。",
          answer: "**正确。**这是零向量的规定性质：零向量方向任意，与任何向量平行。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "两个向量相等只需它们的模相等，方向可以不同。",
          answer: "**错误。**向量相等要求模相等**且**方向相同，两者缺一不可。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "\\(\\overrightarrow{AB} + \\overrightarrow{BC} = \\)（　）",
          options: ["A. \\(\\overrightarrow{AC}\\)", "B. \\(\\overrightarrow{CA}\\)", "C. \\(\\overrightarrow{BA}\\)", "D. \\(\\overrightarrow{CB}\\)"],
          correctIndex: 0,
          answer: "答案：A。三角形法则：首尾相接的向量和等于从起点指向终点的向量。"
        }
      ]
    },

    {
      type: "quiz",
      title: "快速检测二（客观题）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "判断：零向量的方向是任意的。",
          answer: "**正确。**规定零向量长度为 0、方向任意，且它与任意向量平行。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "判断：若 \\(\\vec{a}\\) 与 \\(\\vec{b}\\) 都是单位向量，则 \\(\\vec{a} = \\vec{b}\\)。",
          answer: "**错误。**单位向量只要求长度为 1，方向可以不同；方向不同则不是相等向量。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "化简 \\(\\vec{AB} + \\vec{BC} - \\vec{AC}\\) 的结果是（　）",
          options: ["A. \\(\\vec{0}\\)", "B. \\(\\vec{AC}\\)", "C. \\(2\\vec{AC}\\)", "D. \\(\\vec{CA}\\)"],
          correctIndex: 0,
          answer: "**A**。由三角形法则 \\(\\vec{AB} + \\vec{BC} = \\vec{AC}\\)，故原式 \\(= \\vec{AC} - \\vec{AC} = \\vec{0}\\)。"
        }
      ]
    }
  ]
}
