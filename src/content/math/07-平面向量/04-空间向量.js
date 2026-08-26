/**
 * 内容页面数据（content-schema 的实例）
 * 页面：空间向量
 * 说明：空间向量运算、坐标表示及其在立体几何中的应用
 */
export default {
  id: "math-07-04",
  unitNum: "07",
  subject: "math",
  title: "空间向量",
  subtitle: "空间向量运算与立体几何中的向量方法",
  blocks: [
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["空间向量"]
  N1["概念与平面向量类比"]
  N0 --> N1
  N2["线性运算"]
  N0 --> N2
  N3["加法"]
  N2 --> N3
  N4["减法"]
  N2 --> N4
  N5["数乘"]
  N2 --> N5
  N6["数量积"]
  N0 --> N6
  N7["a·b = a b cosθ"]
  N6 --> N7
  N8["空间直角坐标系"]
  N0 --> N8
  N9["坐标运算"]
  N8 --> N9
  N10["基本定理"]
  N0 --> N10
  N11["不共面三向量表示"]
  N10 --> N11
  N12["平行与垂直"]
  N0 --> N12
  N13["线线 线面 面面"]
  N12 --> N13
  N14["空间角"]
  N0 --> N14
  N15["异面直线所成角"]
  N14 --> N15
  N16["线面角"]
  N14 --> N16
  N17["二面角"]
  N14 --> N17
  N18["点到平面距离"]
  N0 --> N18`
    },
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "理解空间向量的概念，掌握空间向量的线性运算与数量积",
        "掌握空间向量基本定理、空间直角坐标系与坐标运算",
        "能利用空间向量证明线线、线面、面面的平行与垂直",
        "能利用空间向量计算空间角与点到平面的距离"
      ]
    },
    {
      type: "knowledge",
      title: "一、空间向量的概念与线性运算",
      paragraphs: [
        "空间中既有大小又有方向的量叫做**空间向量**，其概念、表示方法与平面向量完全类似，可以类比平面向量学习。",
        "空间向量的**线性运算**包括加法（平行四边形法则、三角形法则）、减法（\\(\\boldsymbol{a} - \\boldsymbol{b} = \\boldsymbol{a} + (-\\boldsymbol{b})\\)）和数乘（\\(\\lambda\\boldsymbol{a}\\)）。",
        "空间向量的加法、减法、数乘运算满足交换律、结合律、分配律，与平面向量一致。",
        "**共线向量定理**：\\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\)（\\(\\boldsymbol{b} \\ne \\boldsymbol{0}\\)）共线 \\(\\iff\\) 存在唯一实数 \\(\\lambda\\)，使 \\(\\boldsymbol{a} = \\lambda\\boldsymbol{b}\\)。"
      ]
    },
    {
      type: "knowledge",
      title: "二、空间向量的数量积",
      paragraphs: [
        "已知两个非零空间向量 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\)，它们的夹角为 \\(\\theta\\)（\\(0 \\le \\theta \\le \\pi\\)），则数量积定义为：",
        "\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos\\theta\\)。",
        "数量积是**实数**，满足交换律、分配律；\\(\\boldsymbol{a} \\perp \\boldsymbol{b} \\iff \\boldsymbol{a} \\cdot \\boldsymbol{b} = 0\\)；\\(\\boldsymbol{a} \\cdot \\boldsymbol{a} = |\\boldsymbol{a}|^2\\)。"
      ]
    },
    {
      type: "formula",
      title: "空间向量数量积",
      formulas: [
        "\\boldsymbol{a} \\cdot \\boldsymbol{b} = |\\boldsymbol{a}||\\boldsymbol{b}|\\cos\\theta",
        "\\boldsymbol{a} \\perp \\boldsymbol{b} \\iff \\boldsymbol{a} \\cdot \\boldsymbol{b} = 0",
        "|\\boldsymbol{a}| = \\sqrt{\\boldsymbol{a} \\cdot \\boldsymbol{a}}"
      ]
    },
    {
      type: "knowledge",
      title: "三、空间向量基本定理与空间直角坐标系",
      paragraphs: [
        "**空间向量基本定理**：如果三个向量 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\)、\\(\\boldsymbol{c}\\) **不共面**，那么对空间任一向量 \\(\\boldsymbol{p}\\)，存在唯一的有序实数组 \\((x, y, z)\\)，使 \\(\\boldsymbol{p} = x\\boldsymbol{a} + y\\boldsymbol{b} + z\\boldsymbol{c}\\)。",
        "三个不共面的向量叫做空间的一个**基底**。",
        "在空间直角坐标系 \\(Oxyz\\) 中，\\(\\boldsymbol{i}\\)、\\(\\boldsymbol{j}\\)、\\(\\boldsymbol{k}\\) 是两两垂直的单位向量，构成空间的一个基底。空间任一点 \\(P\\) 对应坐标 \\((x, y, z)\\)，向量 \\(\\boldsymbol{OP} = x\\boldsymbol{i} + y\\boldsymbol{j} + z\\boldsymbol{k}\\)。"
      ]
    },
    {
      type: "formula",
      title: "空间向量坐标运算",
      formulas: [
        "设 \\boldsymbol{a} = (x_1, y_1, z_1)，\\boldsymbol{b} = (x_2, y_2, z_2)：",
        "\\boldsymbol{a} + \\boldsymbol{b} = (x_1 + x_2, y_1 + y_2, z_1 + z_2)",
        "\\boldsymbol{a} - \\boldsymbol{b} = (x_1 - x_2, y_1 - y_2, z_1 - z_2)",
        "\\lambda\\boldsymbol{a} = (\\lambda x_1, \\lambda y_1, \\lambda z_1)",
        "\\boldsymbol{a} \\cdot \\boldsymbol{b} = x_1 x_2 + y_1 y_2 + z_1 z_2",
        "|\\boldsymbol{a}| = \\sqrt{x_1^2 + y_1^2 + z_1^2}"
      ]
    },
    {
      type: "formula",
      title: "平行与垂直的坐标条件",
      lines: [
        "• \\(\\boldsymbol{a} \\parallel \\boldsymbol{b} \\iff \\boldsymbol{a} = \\lambda\\boldsymbol{b} \\iff \\dfrac{x_1}{x_2} = \\dfrac{y_1}{y_2} = \\dfrac{z_1}{z_2}\\)（对应坐标成比例）",
        "• \\(\\boldsymbol{a} \\perp \\boldsymbol{b} \\iff \\boldsymbol{a} \\cdot \\boldsymbol{b} = 0 \\iff x_1 x_2 + y_1 y_2 + z_1 z_2 = 0\\)"
      ]
    },
    {
      type: "knowledge",
      title: "四、用空间向量证明平行与垂直",
      paragraphs: [
        "设直线 \\(l\\) 的方向向量为 \\(\\boldsymbol{a}\\)，平面 \\(\\alpha\\) 的法向量为 \\(\\boldsymbol{n}\\)，平面 \\(\\beta\\) 的法向量为 \\(\\boldsymbol{m}\\)：",
        "• **线线平行**：\\(l_1 \\parallel l_2 \\iff \\boldsymbol{a}_1 \\parallel \\boldsymbol{a}_2\\)；**线线垂直**：\\(l_1 \\perp l_2 \\iff \\boldsymbol{a}_1 \\cdot \\boldsymbol{a}_2 = 0\\)；",
        "• **线面平行**：\\(l \\parallel \\alpha \\iff \\boldsymbol{a} \\perp \\boldsymbol{n}\\)（即 \\(\\boldsymbol{a} \\cdot \\boldsymbol{n} = 0\\)，且直线不在平面内）；**线面垂直**：\\(l \\perp \\alpha \\iff \\boldsymbol{a} \\parallel \\boldsymbol{n}\\)；",
        "• **面面平行**：\\(\\alpha \\parallel \\beta \\iff \\boldsymbol{n} \\parallel \\boldsymbol{m}\\)；**面面垂直**：\\(\\alpha \\perp \\beta \\iff \\boldsymbol{n} \\perp \\boldsymbol{m}\\)（即 \\(\\boldsymbol{n} \\cdot \\boldsymbol{m} = 0\\)）。"
      ]
    },
    {
      type: "table",
      title: "平行与垂直的向量判定",
      headers: ["位置关系", "平行条件", "垂直条件"],
      rows: [
        ["线线", "方向向量共线：\\(\\boldsymbol{a}_1 \\parallel \\boldsymbol{a}_2\\)", "方向向量数量积为 0：\\(\\boldsymbol{a}_1 \\cdot \\boldsymbol{a}_2 = 0\\)"],
        ["线面", "方向向量与法向量垂直：\\(\\boldsymbol{a} \\cdot \\boldsymbol{n} = 0\\)", "方向向量与法向量平行：\\(\\boldsymbol{a} \\parallel \\boldsymbol{n}\\)"],
        ["面面", "法向量平行：\\(\\boldsymbol{n} \\parallel \\boldsymbol{m}\\)", "法向量垂直：\\(\\boldsymbol{n} \\cdot \\boldsymbol{m} = 0\\)"]
      ]
    },
    {
      type: "knowledge",
      title: "五、用空间向量计算空间角与距离",
      paragraphs: [
        "设两异面直线的方向向量为 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\)，直线方向向量为 \\(\\boldsymbol{a}\\)、平面法向量为 \\(\\boldsymbol{n}\\)，两平面法向量为 \\(\\boldsymbol{n}\\)、\\(\\boldsymbol{m}\\)：",
        "• **异面直线所成角** \\(\\theta\\)：\\(\\cos\\theta = \\dfrac{|\\boldsymbol{a} \\cdot \\boldsymbol{b}|}{|\\boldsymbol{a}||\\boldsymbol{b}|}\\)（取绝对值，\\(0 < \\theta \\le \\dfrac{\\pi}{2}\\)）；",
        "• **线面角** \\(\\theta\\)：\\(\\sin\\theta = \\dfrac{|\\boldsymbol{a} \\cdot \\boldsymbol{n}|}{|\\boldsymbol{a}||\\boldsymbol{n}|}\\)（\\(0 \\le \\theta \\le \\dfrac{\\pi}{2}\\)）；",
        "• **二面角**：\\(\\cos\\theta = \\dfrac{\\boldsymbol{n} \\cdot \\boldsymbol{m}}{|\\boldsymbol{n}||\\boldsymbol{m}|}\\)（根据图形判断取正负）；",
        "• **点到平面的距离**：设平面法向量为 \\(\\boldsymbol{n}\\)，点 \\(P\\) 到平面内一点 \\(A\\) 的向量为 \\(\\boldsymbol{AP}\\)，则 \\(d = \\dfrac{|\\boldsymbol{n} \\cdot \\boldsymbol{AP}|}{|\\boldsymbol{n}|}\\)。"
      ]
    },
    {
      type: "formula",
      title: "空间角与距离公式",
      formulas: [
        "\\cos\\theta = \\frac{|\\boldsymbol{a} \\cdot \\boldsymbol{b}|}{|\\boldsymbol{a}||\\boldsymbol{b}|} \\quad (\\text{异面直线所成角})",
        "\\sin\\theta = \\frac{|\\boldsymbol{a} \\cdot \\boldsymbol{n}|}{|\\boldsymbol{a}||\\boldsymbol{n}|} \\quad (\\text{线面角})",
        "\\cos\\theta = \\frac{\\boldsymbol{n} \\cdot \\boldsymbol{m}}{|\\boldsymbol{n}||\\boldsymbol{m}|} \\quad (\\text{二面角})",
        "d = \\frac{|\\boldsymbol{n} \\cdot \\boldsymbol{AP}|}{|\\boldsymbol{n}|} \\quad (\\text{点到平面距离})"
      ]
    },
    {
      type: "tip",
      text: "用向量法解立体几何题的步骤：① 建系（选取合适的原点与坐标轴，尽量使关键点落在坐标轴上）；② 写出相关点的坐标；③ 求出直线的方向向量与平面的法向量；④ 代入公式计算。求法向量常用平面内两个不共线向量的叉积，或设 \\(\\boldsymbol{n} = (x, y, z)\\) 解方程组。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：建系求异面直线所成角",
          difficulty: "medium",
          question: "在棱长为 1 的正方体 \\(ABCD-A_1B_1C_1D_1\\) 中，求异面直线 \\(A_1B\\) 与 \\(B_1C\\) 所成的角。",
          solution: "**解：**\n建立空间直角坐标系，以 \\(A\\) 为原点，\\(AB\\)、\\(AD\\)、\\(AA_1\\) 所在直线分别为 \\(x\\)、\\(y\\)、\\(z\\) 轴。\n各点坐标：\\(A_1(0,0,1)\\)，\\(B(1,0,0)\\)，\\(B_1(1,0,1)\\)，\\(C(1,1,0)\\)。\n方向向量：\\(\\overrightarrow{A_1B} = (1, 0, -1)\\)，\\(\\overrightarrow{B_1C} = (0, 1, -1)\\)。\n\\(\\overrightarrow{A_1B} \\cdot \\overrightarrow{B_1C} = 1 \\times 0 + 0 \\times 1 + (-1) \\times (-1) = 1\\)。\n\\(|\\overrightarrow{A_1B}| = \\sqrt{1 + 0 + 1} = \\sqrt{2}\\)，\\(|\\overrightarrow{B_1C}| = \\sqrt{0 + 1 + 1} = \\sqrt{2}\\)。\n\\(\\cos\\theta = \\dfrac{|\\overrightarrow{A_1B} \\cdot \\overrightarrow{B_1C}|}{|\\overrightarrow{A_1B}||\\overrightarrow{B_1C}|} = \\dfrac{1}{\\sqrt{2} \\times \\sqrt{2}} = \\dfrac{1}{2}\\)。\n所以异面直线所成角 \\(\\theta = 60°\\)。",
          answer: "答案：异面直线 \\(A_1B\\) 与 \\(B_1C\\) 所成的角为 \\(60°\\)。"
        },
        {
          title: "例题2：建系求线面角",
          difficulty: "medium",
          question: "在棱长为 1 的正方体 \\(ABCD-A_1B_1C_1D_1\\) 中，求直线 \\(A_1C\\) 与平面 \\(ABCD\\) 所成的角的正弦值。",
          solution: "**解：**\n建立空间直角坐标系，以 \\(A\\) 为原点，\\(AB\\)、\\(AD\\)、\\(AA_1\\) 所在直线分别为 \\(x\\)、\\(y\\)、\\(z\\) 轴。\n\\(A_1(0,0,1)\\)，\\(C(1,1,0)\\)，方向向量 \\(\\overrightarrow{A_1C} = (1, 1, -1)\\)。\n平面 \\(ABCD\\) 即 \\(z = 0\\) 平面，法向量 \\(\\boldsymbol{n} = (0, 0, 1)\\)。\n\\(\\overrightarrow{A_1C} \\cdot \\boldsymbol{n} = 1 \\times 0 + 1 \\times 0 + (-1) \\times 1 = -1\\)，取绝对值 \\(= 1\\)。\n\\(|\\overrightarrow{A_1C}| = \\sqrt{1 + 1 + 1} = \\sqrt{3}\\)，\\(|\\boldsymbol{n}| = 1\\)。\n\\(\\sin\\theta = \\dfrac{|\\overrightarrow{A_1C} \\cdot \\boldsymbol{n}|}{|\\overrightarrow{A_1C}||\\boldsymbol{n}|} = \\dfrac{1}{\\sqrt{3}} = \\dfrac{\\sqrt{3}}{3}\\)。\n所以直线 \\(A_1C\\) 与平面 \\(ABCD\\) 所成角的正弦值为 \\(\\dfrac{\\sqrt{3}}{3}\\)。",
          answer: "答案：\\(\\sin\\theta = \\dfrac{\\sqrt{3}}{3}\\)。"
        },
        {
          title: "例题3：建系求点到平面的距离",
          difficulty: "advanced",
          question: "在棱长为 1 的正方体 \\(ABCD-A_1B_1C_1D_1\\) 中，求点 \\(B\\) 到平面 \\(A_1C_1D\\) 的距离。",
          solution: "**解：**\n建立空间直角坐标系，以 \\(A\\) 为原点，\\(AB\\)、\\(AD\\)、\\(AA_1\\) 所在直线分别为 \\(x\\)、\\(y\\)、\\(z\\) 轴。\n\\(B(1,0,0)\\)，\\(A_1(0,0,1)\\)，\\(C_1(1,1,1)\\)，\\(D(0,1,0)\\)。\n平面 \\(A_1C_1D\\) 内取两个不共线向量：\\(\\overrightarrow{A_1C_1} = (1, 1, 0)\\)，\\(\\overrightarrow{A_1D} = (0, 1, -1)\\)。\n设法向量 \\(\\boldsymbol{n} = (x, y, z)\\)，由 \\(\\boldsymbol{n} \\cdot \\overrightarrow{A_1C_1} = 0\\) 且 \\(\\boldsymbol{n} \\cdot \\overrightarrow{A_1D} = 0\\)：\n\\(x + y = 0\\)，\\(y - z = 0\\)。取 \\(y = 1\\)，得 \\(x = -1\\)，\\(z = 1\\)，即 \\(\\boldsymbol{n} = (-1, 1, 1)\\)。\n\\(\\overrightarrow{A_1B} = (1, 0, -1)\\)，\\(\\boldsymbol{n} \\cdot \\overrightarrow{A_1B} = -1 \\times 1 + 1 \\times 0 + 1 \\times (-1) = -2\\)，取绝对值 \\(= 2\\)。\n\\(|\\boldsymbol{n}| = \\sqrt{(-1)^2 + 1^2 + 1^2} = \\sqrt{3}\\)。\n距离 \\(d = \\dfrac{|\\boldsymbol{n} \\cdot \\overrightarrow{A_1B}|}{|\\boldsymbol{n}|} = \\dfrac{2}{\\sqrt{3}} = \\dfrac{2\\sqrt{3}}{3}\\)。",
          answer: "答案：点 \\(B\\) 到平面 \\(A_1C_1D\\) 的距离为 \\(\\dfrac{2\\sqrt{3}}{3}\\)。"
        }
      ]
    },
    {
      type: "quiz",
      title: "练习题",
      items: [
        {
          difficulty: "basic",
          question: "已知 \\(\\boldsymbol{a} = (1, 2, -1)\\)，\\(\\boldsymbol{b} = (2, -1, 3)\\)，求 \\(\\boldsymbol{a} + \\boldsymbol{b}\\)、\\(\\boldsymbol{a} \\cdot \\boldsymbol{b}\\)。",
          answer: "答案：\\(\\boldsymbol{a} + \\boldsymbol{b} = (3, 1, 2)\\)；\\(\\boldsymbol{a} \\cdot \\boldsymbol{b} = 1 \\times 2 + 2 \\times (-1) + (-1) \\times 3 = 2 - 2 - 3 = -3\\)。"
        },
        {
          difficulty: "basic",
          question: "已知 \\(\\boldsymbol{a} = (1, 2, 3)\\)，\\(\\boldsymbol{b} = (2, 4, 6)\\)，判断 \\(\\boldsymbol{a}\\) 与 \\(\\boldsymbol{b}\\) 是否平行。",
          answer: "答案：平行。\\(\\boldsymbol{b} = 2\\boldsymbol{a}\\)，对应坐标成比例 \\(\\dfrac{1}{2} = \\dfrac{2}{4} = \\dfrac{3}{6}\\)，故 \\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)。"
        },
        {
          difficulty: "medium",
          question: "在棱长为 1 的正方体 \\(ABCD-A_1B_1C_1D_1\\) 中，求二面角 \\(A_1-BD-C\\) 的余弦值。",
          answer: "答案：\\(\\dfrac{\\sqrt{3}}{3}\\)。平面 \\(CBD\\)（即平面 \\(ABCD\\)）法向量 \\(\\boldsymbol{n}_1 = (0,0,1)\\)；平面 \\(A_1BD\\) 的法向量 \\(\\boldsymbol{n}_2 = (1,1,1)\\)（由 \\(\\overrightarrow{A_1B}=(1,0,-1)\\)、\\(\\overrightarrow{A_1D}=(0,1,-1)\\) 求得）。\\(\\cos\\theta = \\dfrac{|\\boldsymbol{n}_1 \\cdot \\boldsymbol{n}_2|}{|\\boldsymbol{n}_1||\\boldsymbol{n}_2|} = \\dfrac{1}{1 \\times \\sqrt{3}} = \\dfrac{\\sqrt{3}}{3}\\)。"
        },
        {
          difficulty: "advanced",
          question: "已知空间三点 \\(A(1, 0, 0)\\)、\\(B(0, 1, 0)\\)、\\(C(0, 0, 1)\\)，求点 \\(P(1, 1, 1)\\) 到平面 \\(ABC\\) 的距离。",
          answer: "答案：\\(\\dfrac{2\\sqrt{3}}{3}\\)。平面 \\(ABC\\) 的法向量 \\(\\boldsymbol{n} = (1, 1, 1)\\)（由 \\(\\overrightarrow{AB}=(-1,1,0)\\)、\\(\\overrightarrow{AC}=(-1,0,1)\\) 求得）。\\(\\overrightarrow{AP} = (0, 1, 1)\\)，\\(\\boldsymbol{n} \\cdot \\overrightarrow{AP} = 2\\)，\\(|\\boldsymbol{n}| = \\sqrt{3}\\)，\\(d = \\dfrac{2}{\\sqrt{3}} = \\dfrac{2\\sqrt{3}}{3}\\)。"
        }
      ]
    }
  ]
}
