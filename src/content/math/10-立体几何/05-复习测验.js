/**
 * 内容页面数据（复习测验）
 * 由原始 HTML 自动转换
 */
export default {
  "id": "math-10-05",
  "unitNum": "10",
  "subject": "math",
  "title": "立体几何 · 复习测验",
  "subtitle": "本单元知识综合检测",
  "blocks": [
    {
      "type": "example",
      "title": "📝三、解答题（共40分）",
      "items": [
        {
          "title": "第1题（12分）",
          "question": "中等已知圆锥的底面半径为 2，母线长为 4。求：（1）圆锥的高；（2）圆锥的侧面积；（3）圆锥的体积。\n      查看答案\n      第1题",
          "solution": "已知 \\(r=2\\)，\\(l=4\\)。\n        （1）高 \\(h=\\sqrt{l^2-r^2}=\\sqrt{16-4}=\\sqrt{12}=2\\sqrt{3}\\)。\n        （2）侧面积 \\(S_{侧}=\\pi rl=\\pi\\times2\\times4=8\\pi\\)。\n        （3）体积 \\(V=\\dfrac{1}{3}\\pi r^2 h=\\dfrac{1}{3}\\pi\\times4\\times2\\sqrt{3}=\\dfrac{8\\sqrt{3}\\pi}{3}\\)。",
          "answer": "答：（1）\\(2\\sqrt{3}\\)；（2）\\(8\\pi\\)；（3）\\(\\dfrac{8\\sqrt{3}\\pi}{3}\\)。"
        },
        {
          "title": "第2题（13分）",
          "question": "中等在正方体 \\(ABCD\\text{-}A_1B_1C_1D_1\\) 中：（1）证明 \\(A_1C_1 \\parallel AC\\)；（2）求异面直线 \\(A_1B\\) 与 \\(B_1C_1\\) 所成角的大小。\n      查看答案\n      第2题",
          "solution": "（1）在正方体中，\\(A_1A \\parallel C_1C\\)，\\(A_1B_1 \\parallel CD\\) 方向，更直接地：\\(A_1C_1\\) 与 \\(AC\\) 分别是上下底面的对角线，\\(AA_1 \\parallel CC_1\\)，故四边形 \\(AA_1C_1C\\) 是平行四边形，所以 \\(A_1C_1 \\parallel AC\\)。\n        （2）\\(B_1C_1 \\parallel BC\\)（上下底面对应边平行），所以 \\(\\angle A_1BC\\) 为所求角。设棱长为 1，\\(A_1B=\\sqrt{2}\\)，\\(BC=1\\)，\\(A_1C=\\sqrt{A_1A^2+AC^2}=\\sqrt{1+2}=\\sqrt{3}\\)。\n        在 \\(\\triangle A_1BC\\) 中，\\(\\cos\\angle A_1BC=\\dfrac{A_1B^2+BC^2-A_1C^2}{2\\cdot A_1B\\cdot BC}=\\dfrac{2+1-3}{2\\sqrt{2}\\times1}=0\\)，所以 \\(\\angle A_1BC=90^\\circ\\)。",
          "answer": "答：（1）证得 \\(A_1C_1 \\parallel AC\\)；（2）所成角为 \\(90^\\circ\\)。"
        },
        {
          "title": "第3题（15分）",
          "question": "拓展在四棱锥 \\(P\\text{-}ABCD\\) 中，底面 \\(ABCD\\) 是矩形，\\(PA \\perp\\) 平面 \\(ABCD\\)，\\(PA = AB = 2\\)，\\(AD = 1\\)。（1）证明 \\(BC \\perp\\) 平面 \\(PAB\\)；（2）证明平面 \\(PBC \\perp\\) 平面 \\(PAB\\)。\n      查看答案\n      第3题",
          "solution": "（1）因为 \\(PA \\perp\\) 平面 \\(ABCD\\)，\\(BC \\subset\\) 平面 \\(ABCD\\)，所以 \\(PA \\perp BC\\)。又底面是矩形，\\(AB \\perp BC\\)。而 \\(PA \\cap AB = A\\)，\\(PA, AB \\subset\\) 平面 \\(PAB\\)，由线面垂直判定定理：\\(BC \\perp\\) 平面 \\(PAB\\)。\n        （2）由（1）知 \\(BC \\perp\\) 平面 \\(PAB\\)，而 \\(BC \\subset\\) 平面 \\(PBC\\)，由面面垂直判定定理：平面 \\(PBC \\perp\\) 平面 \\(PAB\\)。",
          "answer": "答：（1）证得 \\(BC \\perp\\) 平面 \\(PAB\\)；（2）证得平面 \\(PBC \\perp\\) 平面 \\(PAB\\)。"
        }
      ]
    }
  ]
}
