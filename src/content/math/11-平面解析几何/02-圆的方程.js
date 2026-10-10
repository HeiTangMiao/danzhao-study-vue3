/**
 * 内容页面数据（content-schema 的实例）
 * 页面：圆的方程
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
          items: ["能写出圆的标准方程与一般方程，并完成相互转化", "能判断点与圆、直线与圆、圆与圆的位置关系（比较距离与半径）", "能运用弦长公式（结合垂径定理）求解相关问题"]
        },

        {
          type: "mindmap",
          title: "知识结构导图",
          mermaid: "graph LR\n  N0[\"圆的方程\"]\n  N1[\"圆的方程\"]\n  N0 --> N1\n  N2[\"标准方程\"]\n  N1 --> N2\n  N3[\"一般方程\"]\n  N1 --> N3\n  N4[\"圆心与半径\"]\n  N1 --> N4\n  N5[\"点与圆位置关系\"]\n  N0 --> N5\n  N6[\"点在圆外\"]\n  N5 --> N6\n  N7[\"点在圆上\"]\n  N5 --> N7\n  N8[\"点在圆内\"]\n  N5 --> N8\n  N9[\"直线与圆位置关系\"]\n  N0 --> N9\n  N10[\"相离 d>r\"]\n  N9 --> N10\n  N11[\"相切 d=r\"]\n  N9 --> N11\n  N12[\"相交 d<r\"]\n  N9 --> N12\n  N13[\"弦长公式\"]\n  N0 --> N13\n  N14[\"2√(r²-d²)\"]\n  N13 --> N14\n  N15[\"圆与圆位置关系\"]\n  N0 --> N15\n  N16[\"相离 外切 相交 内切 内含\"]\n  N15 --> N16"
        },
      ]
    },

    {
      type: "diagram",
      title: "圆的标准方程演示",
      boardId: "circle-standard",
      caption: "拖动圆心 C 或半径控制点 P，实时显示圆的标准方程。"
    },

    {
      type: "formula",
      title: "圆的标准方程",
      formulas: ["C(a, b)", "r"]
    },

    {
      type: "formula",
      title: "圆的一般方程",
      formulas: [
        "D^2 + E^2 - 4F > 0",
        "\\left(-\\dfrac{D}{2}, -\\dfrac{E}{2}\\right)",
        "r = \\dfrac{1}{2}\\sqrt{D^2 + E^2 - 4F}",
        "D^2 + E^2 - 4F = 0",
        "D^2 + E^2 - 4F < 0"
      ]
    },

    {
      type: "knowledge",
      title: "二、点与圆的位置关系",
      paragraphs: [
        "设点 \\(P(x_0, y_0)\\)，圆 \\((x-a)^2 + (y-b)^2 = r^2\\)，圆心到点的距离 \\(d = \\sqrt{(x_0-a)^2 + (y_0-b)^2}\\)：\n\n      • \\(d > r\\)：点在圆外；• \\(d = r\\)：点在圆上；• \\(d < r\\)：点在圆内。"
      ]
    },

    {
      type: "knowledge",
      title: "三、直线与圆的位置关系",
      paragraphs: ["设圆心到直线的距离为 \\(d\\)，圆的半径为 \\(r\\)："]
    },

    {
      type: "table",
      title: "三、直线与圆的位置关系",
      headers: ["位置关系", "条件", "交点个数"],
      rows: [
        ["相离", "\\(d > r\\)", "0 个"],
        ["相切", "\\(d = r\\)", "1 个"],
        ["相交", "\\(d < r\\)", "2 个"]
      ]
    },

    {
      type: "formula",
      title: "弦长公式",
      formulas: ["r", "d"]
    },

    {
      type: "knowledge",
      title: "五、圆与圆的位置关系",
      paragraphs: ["设两圆圆心距为 \\(d\\)，两圆半径分别为 \\(R\\) 和 \\(r\\)（\\(R \\geq r\\)）："]
    },

    {
      type: "table",
      title: "五、圆与圆的位置关系",
      headers: ["位置关系", "条件"],
      rows: [
        ["相离", "\\(d > R + r\\)"],
        ["外切", "\\(d = R + r\\)"],
        ["相交", "\\(|R - r| < d < R + r\\)"],
        ["内切", "\\(d = |R - r|\\)"],
        ["内含", "\\(d < r\\)"]
      ]
    },

    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：求圆的方程",
          question: "求圆心为 \\((2, -1)\\) 且经过点 \\(P(5, 3)\\) 的圆的方程。",
          solution: "解：圆心 \\(C(2, -1)\\)，半径为 C 到 P 的距离：\n\n        $$r = \\sqrt{(5-2)^2 + (3-(-1))^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5$$\n\n        圆的标准方程：\\((x-2)^2 + (y+1)^2 = 25\\)。",
          answer: "答：圆的方程为 \\((x-2)^2 + (y+1)^2 = 25\\)。"
        },
        {
          title: "例题2：判断直线与圆位置关系",
          question: "判断直线 \\(x - y + 1 = 0\\) 与圆 \\(x^2 + y^2 = 2\\) 的位置关系。",
          solution: "解：圆心 \\((0,0)\\)，半径 \\(r = \\sqrt{2}\\)。\n\n        圆心到直线的距离：\n\n        $$d = \\frac{|0 - 0 + 1|}{\\sqrt{1^2 + (-1)^2}} = \\frac{1}{\\sqrt{2}} = \\frac{\\sqrt{2}}{2}$$\n\n        因为 \\(d = \\dfrac{\\sqrt{2}}{2} < r\\)，所以直线与圆相交。",
          answer: "答：直线与圆相交。"
        },
        {
          title: "例题3：求弦长",
          question: "已知圆 \\(x^2 + y^2 = 4\\) 被直线 \\(x + y - 2 = 0\\) 截得的弦长。",
          solution: "解：圆心 \\((0,0)\\)，半径 \\(r = 2\\)。\n\n        圆心到直线的距离：\n\n        $$d = \\frac{|0 + 0 - 2|}{\\sqrt{1+1}} = \\frac{2}{\\sqrt{2}} = \\sqrt{2}$$\n\n        由弦长公式：弦长 \\(= 2\\sqrt{r^2 - d^2} = 2\\sqrt{4 - 2} = 2\\sqrt{2}\\)。",
          answer: "答：弦长为 \\(2\\sqrt{2}\\)。"
        }
      ]
    },

    {
      type: "quiz",
      title: "练习题",
      items: [
        {
          difficulty: "basic",
          question: "圆 \\((x-1)^2 + (y+2)^2 = 9\\) 的圆心和半径是什么？",
          answer: "解：圆心 \\((1, -2)\\)，半径 \\(r = 3\\)。"
        },
        {
          difficulty: "basic",
          question: "将圆的一般方程 \\(x^2 + y^2 - 4x + 6y - 3 = 0\\) 化为标准方程，并指出圆心和半径。",
          answer: "解：配方得 \\((x-2)^2 + (y+3)^2 = 16\\)。圆心 \\((2, -3)\\)，半径 \\(r = 4\\)。"
        },
        {
          difficulty: "medium",
          question: "判断点 \\(P(1, 1)\\) 与圆 \\(x^2 + y^2 = 4\\) 的位置关系。",
          answer: "解：\\(d=\\sqrt{1+1}=\\sqrt{2} < 2 = r\\)，点在圆内。"
        },
        {
          difficulty: "medium",
          question: "求过圆 \\(x^2 + y^2 = 5\\) 上点 \\((1, 2)\\) 的切线方程。",
          answer: "解：圆心 \\((0,0)\\)，切线公式 \\(x_0 x + y_0 y = r^2\\)，即 \\(1\\cdot x + 2\\cdot y = 5\\)，故切线方程为 \\(x + 2y - 5 = 0\\)。"
        },
        {
          difficulty: "advanced",
          question: "圆 \\(C_1: x^2+y^2=1\\) 与 \\(C_2: (x-3)^2+y^2=1\\) 的位置关系是什么？",
          answer: "解：圆心距 \\(d=3\\)，\\(R+r=2\\)，\\(d>R+r\\)，两圆相离。"
        }
      ]
    },

    // ---------- 快速检测（客观题 · 可判分） ----------
    {
      type: "quiz",
      title: "快速检测（客观题）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "方程 \\(x^2 + y^2 = 9\\) 表示圆心在原点、半径为 3 的圆。",
          answer: "**正确。**标准方程 \\((x-a)^2+(y-b)^2=r^2\\) 中 \\(a=b=0\\)，\\(r=3\\)。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "一条直线与一个圆最多有两个公共点。",
          answer: "**正确。**相交时 2 个公共点，相切时 1 个，相离时 0 个——最多 2 个。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "圆 \\((x-1)^2 + (y+2)^2 = 4\\) 的圆心坐标是（　）",
          options: ["A. \\((1, -2)\\)", "B. \\((-1, 2)\\)", "C. \\((1, 2)\\)", "D. \\((-1, -2)\\)"],
          correctIndex: 0,
          answer: "答案：A。由 \\((x-1)^2+(y+2)^2 = (x-1)^2 + (y-(-2))^2\\) 知圆心为 \\((1, -2)\\)，半径为 2。"
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
          question: "判断：圆 \\((x-1)^2 + (y+2)^2 = 4\\) 的圆心是 \\((1, -2)\\)，半径为 2。",
          answer: "**正确。**标准式 \\((x-a)^2 + (y-b)^2 = r^2\\) 中圆心 \\((a,b)\\)、半径 \\(r = 2\\)。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "判断：任意一个关于 x、y 的二次方程都表示圆。",
          answer: "**错误。**需满足 \\(x^2, y^2\\) 系数相等且不为 0、无 xy 项，且 \\(D^2 + E^2 - 4F > 0\\)。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "圆心在原点、半径为 3 的圆的方程是（　）",
          options: ["A. \\(x^2 + y^2 = 3\\)", "B. \\(x^2 + y^2 = 9\\)", "C. \\(x^2 + y^2 = 6\\)", "D. \\((x-3)^2 + y^2 = 9\\)"],
          correctIndex: 1,
          answer: "**B**。标准式中右端为 \\(r^2 = 9\\)。"
        }
      ]
    }
  ]
}
