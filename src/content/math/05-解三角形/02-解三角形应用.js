/**
 * 内容页面数据（content-schema 的实例）
 * 页面：解三角形应用
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-05-02",
  "unitNum": "05",
  "subject": "math",
  "title": "解三角形应用",
  "subtitle": "面积公式与实际测量问题",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  ROOT[\"解三角形应用\"]\n  ROOT --> PRACT[\"实际问题\"]\n  ROOT --> STEP[\"解题步骤\"]\n  ROOT --> MODEL[\"常见模型\"]\n  ROOT --> AREA[\"面积公式<br/>S = ½·ab·sinC\"]\n\n  PRACT --> P_DIST[\"测量距离\"]\n  PRACT --> P_HIGH[\"测量高度\"]\n  PRACT --> P_ANG[\"测量角度\"]\n  P_DIST --> P_DIST_M[\"构造三角形<br/>正弦/余弦定理\"]\n  P_HIGH --> P_HIGH_M[\"仰角俯角<br/>构造直角三角形\"]\n  P_ANG --> P_ANG_M[\"方位角/方向角构造\"]\n\n  STEP --> S1[\"1. 建模抽象\"]\n  STEP --> S2[\"2. 画示意图\"]\n  STEP --> S3[\"3. 选择定理\"]\n  STEP --> S4[\"4. 求解计算\"]\n  S3 --> S3_SINE[\"两角一边 → 正弦定理\"]\n  S3 --> S3_COS[\"三边/两边夹角 → 余弦定理\"]\n\n  MODEL --> M_ELEV[\"仰角俯角<br/>以水平线为准\"]\n  MODEL --> M_AZI[\"方位角<br/>以正北为 0°\"]\n  MODEL --> M_DIR[\"方向角<br/>南偏东/西\"]\n\n  AREA -.->|关联| P_DIST_M\n  M_AZI -.->|关联| P_ANG_M\n  S3_SINE -.->|关联| P_HIGH_M"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握三角形面积公式，能求三角形的面积",
        "理解解三角形的四类基本场景，能选择合适的方法求解",
        "能运用正弦定理和余弦定理解决实际测量问题",
        "能综合运用三角公式解决解三角形的综合问题"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、三角形面积公式",
      "paragraphs": [
        "其他面积公式：\n\n      • \\(S = \\frac{1}{2} \\times \\text{底} \\times \\text{高}\\)\n\n      • \\(S = \\frac{abc}{4R}\\)（\\(R\\) 为外接圆半径）\n\n      • \\(S = \\sqrt{p(p-a)(p-b)(p-c)}\\)（海伦公式，\\(p = \\frac{a+b+c}{2}\\)）"
      ]
    },
    {
      "type": "table",
      "title": "二、解三角形的四类场景",
      "headers": [
        "类型",
        "已知条件",
        "使用定理",
        "解的情况"
      ],
      "rows": [
        [
          "SSA",
          "两边及对角",
          "正弦定理",
          "可能一解、两解或无解"
        ],
        [
          "SAS",
          "两边及夹角",
          "余弦定理",
          "唯一解"
        ],
        [
          "SSS",
          "三边",
          "余弦定理",
          "唯一解（需满足三角形不等式）"
        ],
        [
          "ASA/AAS",
          "两角及一边",
          "正弦定理",
          "唯一解"
        ]
      ]
    },
    {
      "type": "knowledge",
      "title": "三、SSA情况解的判断",
      "paragraphs": [
        "已知 \\(a\\)、\\(b\\)、\\(A\\)（\\(A\\) 为锐角）：\n\n      • 当 \\(a < b\\sin A\\) 时，无解\n\n      • 当 \\(a = b\\sin A\\) 时，一解（直角三角形）\n\n      • 当 \\(b\\sin A < a < b\\) 时，两解\n\n      • 当 \\(a \\geq b\\) 时，一解"
      ]
    },
    {
      "type": "tip",
      "text": "当 \\(A\\) 为钝角或直角时，只有当 \\(a > b\\) 时有一解，否则无解。"
    },
    {
      "type": "knowledge",
      "title": "四、实际应用中的常见模型",
      "paragraphs": [
        "• 测量距离：两点间不可直达时，构造三角形利用正弦或余弦定理\n\n      • 测量高度：利用仰角和俯角，构造直角三角形或一般三角形\n\n      • 测量角度：利用方位角、方向角，构造三角形求解\n\n      • 航海问题：利用航行方向和速度构造三角形"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：求面积",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(a = 6\\)，\\(b = 8\\)，\\(C = 60°\\)，求三角形的面积 \\(S\\)。",
          "solution": "解：\n\n        由面积公式 \\(S = \\frac{1}{2}ab\\sin C\\)：\n\n        \\(S = \\frac{1}{2} \\times 6 \\times 8 \\times \\sin 60° = \\frac{1}{2} \\times 48 \\times \\frac{\\sqrt{3}}{2} = 12\\sqrt{3}\\)",
          "answer": "答案：\\(S = 12\\sqrt{3}\\)。"
        },
        {
          "title": "例题2：实际测量问题",
          "question": "如图，为测量河对岸 \\(A\\)、\\(B\\) 两点间的距离，在河岸边选取两点 \\(C\\)、\\(D\\)，测得 \\(CD = 100\\) m，\\(\\angle ACD = 60°\\)，\\(\\angle BCD = 30°\\)，\\(\\angle ADC = 45°\\)，\\(\\angle BDC = 75°\\)。求 \\(A\\)、\\(B\\) 两点间的距离。\n\n      示意图：\\(C\\)、\\(D\\) 为河岸测量点，\\(A\\)、\\(B\\) 为河对岸目标点，基线 \\(CD = 100\\) m。",
          "solution": "解：\n\n        在 \\(\\triangle ACD\\) 中：\n\n        \\(\\angle CAD = 180° - 60° - 45° = 75°\\)\n\n        由正弦定理：\\(\\frac{AC}{\\sin 45°} = \\frac{CD}{\\sin 75°}\\)\n\n        \\(AC = \\frac{100\\sin 45°}{\\sin 75°} = \\frac{100 \\times \\frac{\\sqrt{2}}{2}}{\\frac{\\sqrt{6}+\\sqrt{2}}{4}} = \\frac{50\\sqrt{2} \\times 4}{\\sqrt{6}+\\sqrt{2}} = \\frac{200\\sqrt{2}}{\\sqrt{6}+\\sqrt{2}}\\)\n\n        分母有理化：\\(\\frac{200\\sqrt{2}(\\sqrt{6}-\\sqrt{2})}{6-2} = \\frac{200\\sqrt{2}(\\sqrt{6}-\\sqrt{2})}{4} = 50\\sqrt{2}(\\sqrt{6}-\\sqrt{2}) = 50(2\\sqrt{3}-2) = 100(\\sqrt{3}-1)\\)\n\n        在 \\(\\triangle BCD\\) 中：\n\n        \\(\\angle CBD = 180° - 30° - 75° = 75°\\)\n\n        由正弦定理：\\(\\frac{BC}{\\sin 75°} = \\frac{CD}{\\sin 75°}\\)，所以 \\(BC = CD = 100\\) m\n\n        在 \\(\\triangle ABC\\) 中，\\(\\angle ACB = \\angle ACD - \\angle BCD = 60° - 30° = 30°\\)\n\n        由余弦定理：\n\n        \\(AB^2 = AC^2 + BC^2 - 2 \\cdot AC \\cdot BC \\cdot \\cos 30°\\)\n\n        \\(= [100(\\sqrt{3}-1)]^2 + 100^2 - 2 \\times 100(\\sqrt{3}-1) \\times 100 \\times \\frac{\\sqrt{3}}{2}\\)\n\n        \\(= 10000(4-2\\sqrt{3}) + 10000 - 10000\\sqrt{3}(\\sqrt{3}-1)\\)\n\n        \\(= 10000(4-2\\sqrt{3}) + 10000 - 10000(3-\\sqrt{3})\\)\n\n        \\(= 10000(4-2\\sqrt{3}+1-3+\\sqrt{3}) = 10000(2-\\sqrt{3})\\)\n\n        \\(AB = 100\\sqrt{2-\\sqrt{3}} \\approx 100 \\times 0.5176 \\approx 51.76\\) m",
          "answer": "答案：\\(AB = 100\\sqrt{2-\\sqrt{3}} \\approx 51.76\\) m。"
        },
        {
          "title": "例题3：综合应用",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a + b = 10\\)，\\(C = 60°\\)，求 \\(\\triangle ABC\\) 面积的最大值。",
          "solution": "解：\n\n        面积 \\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2}ab\\sin 60° = \\frac{\\sqrt{3}}{4}ab\\)\n\n        要使面积最大，需要 \\(ab\\) 最大。\n\n        由 \\(a + b = 10\\)，根据基本不等式 \\(ab \\leq \\left(\\frac{a+b}{2}\\right)^2 = 25\\)，当且仅当 \\(a = b = 5\\) 时取等号。\n\n        所以 \\(ab\\) 的最大值为 \\(25\\)。\n\n        \\(S_{\\max} = \\frac{\\sqrt{3}}{4} \\times 25 = \\frac{25\\sqrt{3}}{4}\\)",
          "answer": "答案：面积最大值为 \\(\\frac{25\\sqrt{3}}{4}\\)，当 \\(a = b = 5\\) 时取得。"
        },
        {
          "title": "例题4：推导面积公式 S = abc/(4R)",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a\\)、\\(b\\)、\\(c\\) 为三边，\\(R\\) 为外接圆半径，证明：\\(S = \\dfrac{abc}{4R}\\)。",
          "solution": "证明：把正弦定理与面积公式结合起来。\n\n        由正弦定理 \\(\\dfrac{a}{\\sin A} = 2R\\)，可得 \\(\\sin A = \\dfrac{a}{2R}\\)。\n\n        由三角形面积公式 \\(S = \\dfrac{1}{2}bc\\sin A\\)，\n\n        代入 \\(\\sin A\\)：\\(S = \\dfrac{1}{2}bc \\cdot \\dfrac{a}{2R} = \\dfrac{abc}{4R}\\)。\n\n        故 \\(S = \\dfrac{abc}{4R}\\)，得证。",
          "answer": "答案：\\(S = \\dfrac{abc}{4R}\\) 得证。"
        },
        {
          "title": "例题5：解三角形漏解（易错题）",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(b = 3\\)，\\(c = 3\\sqrt{3}\\)，\\(B = 30°\\)，求角 \\(C\\) 和边 \\(a\\)。",
          "solution": "常见错误：由正弦定理 \\(\\sin C = \\dfrac{c\\sin B}{b} = \\dfrac{3\\sqrt{3} \\times \\frac{1}{2}}{3} = \\dfrac{\\sqrt{3}}{2}\\)，直接得 \\(C = 60°\\)，再算 \\(A = 90°\\)，\\(a = \\dfrac{b\\sin A}{\\sin B} = 6\\)。\n\n        错误分析：\\(\\sin C = \\dfrac{\\sqrt{3}}{2}\\) 时，\\(C\\) 可为 \\(60°\\) 或 \\(120°\\)。题中 \\(c = 3\\sqrt{3} > b = 3\\)，故 \\(C > B = 30°\\)，两种情况均可能，不能只取一解。\n\n        正确解法：由 \\(\\sin C = \\dfrac{\\sqrt{3}}{2}\\)，得 \\(C = 60°\\) 或 \\(C = 120°\\)。\n\n        当 \\(C = 60°\\) 时，\\(A = 180° - 30° - 60° = 90°\\)，由正弦定理 \\(a = \\dfrac{b\\sin A}{\\sin B} = \\dfrac{3 \\times 1}{\\frac{1}{2}} = 6\\)；\n\n        当 \\(C = 120°\\) 时，\\(A = 180° - 30° - 120° = 30°\\)，由正弦定理 \\(a = \\dfrac{b\\sin A}{\\sin B} = \\dfrac{3 \\times \\frac{1}{2}}{\\frac{1}{2}} = 3\\)。\n\n        故 \\(C = 60°, a = 6\\) 或 \\(C = 120°, a = 3\\)。",
          "answer": "答案：\\(C = 60°, a = 6\\) 或 \\(C = 120°, a = 3\\)（SSA 情况有两解）。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a = 3\\)，\\(b = 4\\)，\\(C = 45°\\)，求三角形的面积。",
          "answer": "\\(S = \\frac{1}{2}ab\\sin C = \\frac{1}{2} \\times 3 \\times 4 \\times \\sin 45° = 6 \\times \\frac{\\sqrt{2}}{2} = 3\\sqrt{2}\\)"
        },
        {
          "difficulty": "basic",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(a = 2\\)，\\(b = 2\\sqrt{2}\\)，\\(A = 30°\\)，求 \\(B\\) 和面积 \\(S\\)。",
          "answer": "\\(\\sin B = \\frac{b\\sin A}{a} = \\frac{2\\sqrt{2}\\times\\frac{1}{2}}{2} = \\frac{\\sqrt{2}}{2}\\)，\\(B = 45°\\) 或 \\(135°\\)。当 \\(B=45°\\) 时，\\(C=105°\\)；当 \\(B=135°\\) 时，\\(C=15°\\)。若 \\(B=45°\\)，\\(S=\\frac{1}{2}ab\\sin C=\\frac{1}{2}\\times 2\\times 2\\sqrt{2}\\times\\sin 105°=2\\sqrt{2}\\times\\frac{\\sqrt{6}+\\sqrt{2}}{4}=\\frac{2\\sqrt{12}+2\\sqrt{4}}{4}=\\sqrt{3}+1\\)。"
        },
        {
          "difficulty": "medium",
          "question": "某人在 \\(A\\) 处测得塔顶 \\(C\\) 的仰角为 \\(30°\\)，向塔方向前进 \\(100\\) m 到 \\(B\\) 处，测得仰角为 \\(60°\\)，求塔高。",
          "answer": "设塔高为 \\(h\\)。在 \\(A\\) 处，到塔底距离为 \\(\\frac{h}{\\tan 30°} = \\sqrt{3}h\\)；在 \\(B\\) 处，距离为 \\(\\frac{h}{\\tan 60°} = \\frac{h}{\\sqrt{3}}\\)。\\(\\sqrt{3}h - \\frac{h}{\\sqrt{3}} = 100\\)，\\(\\frac{3h-h}{\\sqrt{3}} = 100\\)，\\(\\frac{2h}{\\sqrt{3}} = 100\\)，\\(h = 50\\sqrt{3}\\) m。"
        },
        {
          "difficulty": "medium",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a = 5\\)，\\(b = 3\\)，\\(\\sin A = \\frac{5}{6}\\)，求 \\(\\sin B\\) 的值。",
          "answer": "由正弦定理：\\(\\sin B = \\frac{b\\sin A}{a} = \\frac{3 \\times \\frac{5}{6}}{5} = \\frac{\\frac{15}{6}}{5} = \\frac{15}{30} = \\frac{1}{2}\\)"
        },
        {
          "difficulty": "advanced",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a\\cos B = b\\cos A\\)，判断三角形形状。",
          "answer": "由正弦定理 \\(a = 2R\\sin A, b = 2R\\sin B\\) 代入：\\(2R\\sin A\\cos B = 2R\\sin B\\cos A\\)，即 \\(\\sin A\\cos B - \\sin B\\cos A = 0\\)，\\(\\sin(A-B) = 0\\)。因为 \\(A, B \\in (0, \\pi)\\)，所以 \\(A - B = 0\\)，即 \\(A = B\\)。三角形为等腰三角形。"
        }
      ]
    }
  ]
}
