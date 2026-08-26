/**
 * 内容页面数据（content-schema 的实例）
 * 页面：立体几何 · 复习测验
 * 说明：
 *  - 由原始 HTML `05-复习测验.html` 抽取为结构化区块
 *  - 本页为单元综合测验，主要由选择题 / 填空题 / 解答题三个 quiz/example 区块构成
 *  - 文本中的 LaTeX 公式（\(...\)）由 MathJaxRender 组件渲染
 */
export default {
  id: "math-10-05",
  unitNum: "10",
  subject: "math",
  title: "立体几何 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题（每题5分，共40分） ----------
    {
      type: "quiz",
      title: "一、选择题（每题 5 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          question: "已知圆锥的底面半径为 3，高为 4，则该圆锥的侧面积为（　）\nA. \\(12\\pi\\)　　B. \\(15\\pi\\)　　C. \\(20\\pi\\)　　D. \\(24\\pi\\)",
          answer: "**B**。母线 \\(l = \\sqrt{r^2 + h^2} = \\sqrt{9 + 16} = 5\\)，侧面积 \\(S_{侧} = \\pi r l = \\pi \\times 3 \\times 5 = 15\\pi\\)。"
        },
        {
          difficulty: "basic",
          question: "已知正方体的棱长为 2，则该正方体的表面积为（　）\nA. \\(8\\)　　B. \\(16\\)　　C. \\(24\\)　　D. \\(32\\)",
          answer: "**C**。正方体六个面都是全等的正方形，表面积 \\(S = 6a^2 = 6 \\times 4 = 24\\)。"
        },
        {
          difficulty: "basic",
          question: "已知球的半径为 3，则该球的体积为（　）\nA. \\(9\\pi\\)　　B. \\(12\\pi\\)　　C. \\(27\\pi\\)　　D. \\(36\\pi\\)",
          answer: "**D**。\\(V = \\dfrac{4}{3}\\pi R^3 = \\dfrac{4}{3}\\pi \\times 27 = 36\\pi\\)。"
        },
        {
          difficulty: "basic",
          question: "下列说法正确的是（　）\nA. 没有公共点的两条直线一定平行\nB. 空间中的两条直线既不平行也不相交，则它们是异面直线\nC. 分别在两个不同平面内的两条直线一定是异面直线\nD. 平行于同一条直线的两条直线一定异面",
          answer: "**B**。空间两直线的位置关系只有相交、平行、异面三种。\"没有公共点\"也可能是异面；\"分别在不同平面内\"也可能相交或平行，故 B 正确。"
        },
        {
          difficulty: "medium",
          question: "下列说法正确的是（　）\nA. 空间任意三点确定一个平面\nB. 一条直线和直线外一点确定一个平面\nC. 两条异面直线确定一个平面\nD. 空间任意四点确定一个平面",
          answer: "**B**。由公理 2 的推论，一条直线和直线外一点确定一个平面。A 需加点不共线；C 异面直线不共面；D 错。"
        },
        {
          difficulty: "medium",
          question: "下列说法正确的是（　）\nA. 若直线 \\(l\\) 垂直于平面内无数条直线，则 \\(l\\) 垂直于该平面\nB. 若直线 \\(l\\) 垂直于平面内的两条相交直线，则 \\(l\\) 垂直于该平面\nC. 若直线 \\(l\\) 垂直于平面内的两条直线，则 \\(l\\) 垂直于该平面\nD. 若一条直线垂直于平面内的一条直线，则 \\(l\\) 垂直于该平面",
          answer: "**B**。线面垂直判定定理：直线必须垂直于平面内的两条**相交**直线。无数条平行直线只代表一个方向，不能判定线面垂直。"
        },
        {
          difficulty: "medium",
          question: "已知直线 \\(a \\parallel\\) 平面 \\(\\alpha\\)，\\(a \\subset\\) 平面 \\(\\beta\\)，\\(\\alpha \\cap \\beta = b\\)，则 \\(a\\) 与 \\(b\\) 的关系是（　）\nA. \\(a \\parallel b\\)　　B. \\(a\\) 与 \\(b\\) 相交　　C. \\(a \\perp b\\)　　D. 无法确定",
          answer: "**A**。由线面平行性质定理：一条直线与一个平面平行，则过这条直线的任一平面与该平面的交线与其平行，故 \\(a \\parallel b\\)。"
        },
        {
          difficulty: "medium",
          question: "一个平面过另一个平面的垂线，则这两个平面的位置关系是（　）\nA. 平行　　B. 垂直　　C. 相交但不垂直　　D. 重合",
          answer: "**B**。由面面垂直判定定理：一个平面过另一个平面的垂线，则这两个平面垂直。"
        }
      ]
    },
    // ---------- 二、填空题（每题5分，共20分） ----------
    {
      type: "quiz",
      title: "二、填空题（每题 5 分，共 20 分）",
      items: [
        {
          difficulty: "medium",
          question: "已知球的体积为 \\(\\dfrac{32\\pi}{3}\\)，则该球的表面积为 ______。",
          answer: "\\(16\\pi\\)。由 \\(V = \\dfrac{4}{3}\\pi R^3 = \\dfrac{32\\pi}{3}\\) 得 \\(R^3 = 8\\)，\\(R = 2\\)，表面积 \\(S = 4\\pi R^2 = 16\\pi\\)。"
        },
        {
          difficulty: "medium",
          question: "在正方体 \\(ABCD\\text{-}A_1B_1C_1D_1\\) 中，异面直线 \\(BD\\) 与 \\(A_1C_1\\) 所成角为 ______ 度。",
          answer: "\\(90^\\circ\\)。\\(A_1C_1 \\parallel AC\\)，而正方形 \\(ABCD\\) 对角线 \\(BD \\perp AC\\)，故 \\(BD \\perp A_1C_1\\)，所成角为 \\(90^\\circ\\)。"
        },
        {
          difficulty: "medium",
          question: "正三棱锥底面边长为 2，高为 \\(\\sqrt{3}\\)，则该正三棱锥的体积为 ______。",
          answer: "\\(1\\)。底面积 \\(S = \\dfrac{\\sqrt{3}}{4} \\times 2^2 = \\sqrt{3}\\)，体积 \\(V = \\dfrac{1}{3}Sh = \\dfrac{1}{3} \\times \\sqrt{3} \\times \\sqrt{3} = 1\\)。"
        },
        {
          difficulty: "medium",
          question: "空间两条不重合直线的位置关系共有 ______ 种。",
          answer: "\\(3\\) 种。分别是相交、平行、异面。"
        }
      ]
    },
    // ---------- 三、解答题（共40分） ----------
    {
      type: "example",
      title: "三、解答题（共 40 分）",
      items: [
        {
          title: "第1题（12分）",
          question: "已知圆锥的底面半径为 3，母线长为 5。\n（1）求圆锥的高；\n（2）求圆锥的侧面积；\n（3）求圆锥的体积。",
          solution: "**解：**\n（1）母线 \\(l\\)、底面半径 \\(r\\)、高 \\(h\\) 满足 \\(l^2 = r^2 + h^2\\)。\n\\(h = \\sqrt{l^2 - r^2} = \\sqrt{25 - 9} = \\sqrt{16} = 4\\)。\n（2）侧面积 \\(S_{侧} = \\pi r l = \\pi \\times 3 \\times 5 = 15\\pi\\)。\n（3）体积 \\(V = \\dfrac{1}{3}\\pi r^2 h = \\dfrac{1}{3}\\pi \\times 9 \\times 4 = 12\\pi\\)。",
          answer: "答：（1）\\(h = 4\\)；（2）\\(15\\pi\\)；（3）\\(12\\pi\\)。"
        },
        {
          title: "第2题（13分）",
          question: "在正方体 \\(ABCD\\text{-}A_1B_1C_1D_1\\) 中，\\(E, F\\) 分别是棱 \\(A_1B_1\\) 与 \\(B_1C_1\\) 的中点。\n（1）证明：\\(EF \\parallel\\) 平面 \\(ABCD\\)；\n（2）证明：\\(BD \\perp EF\\)。",
          solution: "**解：**\n（1）在 \\(\\triangle A_1B_1C_1\\) 中，\\(E, F\\) 分别是 \\(A_1B_1\\)、\\(B_1C_1\\) 的中点，所以 \\(EF\\) 是中位线，\\(EF \\parallel A_1C_1\\)。\n又正方体中 \\(A_1C_1 \\parallel AC\\)，故 \\(EF \\parallel AC\\)。\n而 \\(AC \\subset\\) 平面 \\(ABCD\\)，\\(EF \\not\\subset\\) 平面 \\(ABCD\\)，由线面平行判定定理：\\(EF \\parallel\\) 平面 \\(ABCD\\)。\n（2）底面正方形 \\(ABCD\\) 中，对角线 \\(AC \\perp BD\\)。由（1）已证 \\(EF \\parallel AC\\)，所以 \\(BD \\perp EF\\)。",
          answer: "答：（1）由 \\(EF \\parallel AC\\)，\\(AC \\subset\\) 平面 \\(ABCD\\) 得 \\(EF \\parallel\\) 平面 \\(ABCD\\)；（2）由 \\(EF \\parallel AC\\) 且 \\(AC \\perp BD\\)，得 \\(BD \\perp EF\\)。"
        },
        {
          title: "第3题（15分）",
          question: "在四棱锥 \\(P\\text{-}ABCD\\) 中，底面 \\(ABCD\\) 是矩形，\\(PA \\perp\\) 平面 \\(ABCD\\)，\\(PA = AB = 2\\)，\\(AD = 1\\)。\n（1）证明：\\(BC \\perp\\) 平面 \\(PAB\\)；\n（2）证明：平面 \\(PBC \\perp\\) 平面 \\(PAB\\)。",
          solution: "**解：**\n（1）\\(PA \\perp\\) 平面 \\(ABCD\\)，\\(BC \\subset\\) 平面 \\(ABCD\\)，所以 \\(PA \\perp BC\\)。\n又底面是矩形，\\(AB \\perp BC\\)。\n而 \\(PA \\cap AB = A\\)，\\(PA, AB \\subset\\) 平面 \\(PAB\\)，由线面垂直判定定理：\\(BC \\perp\\) 平面 \\(PAB\\)。\n（2）由（1）知 \\(BC \\perp\\) 平面 \\(PAB\\)，而 \\(BC \\subset\\) 平面 \\(PBC\\)，由面面垂直判定定理：平面 \\(PBC \\perp\\) 平面 \\(PAB\\)。",
          answer: "答：（1）证得 \\(BC \\perp\\) 平面 \\(PAB\\)；（2）证得平面 \\(PBC \\perp\\) 平面 \\(PAB\\)。"
        }
      ]
    }
  ]
}