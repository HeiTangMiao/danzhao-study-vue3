/**
 * 内容页面数据（content-schema 的实例）
 * 页面：正弦定理与余弦定理
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-05-01",
  "unitNum": "05",
  "subject": "math",
  "title": "正弦定理与余弦定理",
  "subtitle": "正弦定理、余弦定理及适用场景",
  "blocks": [
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  ROOT[\"正弦定理与余弦定理\"]\n  ROOT --> SINE[\"正弦定理<br/>a/sinA = 2R\"]\n  ROOT --> COS[\"余弦定理<br/>a² = b²+c²-2bc·cosA\"]\n  ROOT --> AREA[\"面积公式<br/>S = ½·ab·sinC\"]\n  ROOT --> CHOOSE[\"定理选择\"]\n\n  SINE --> SINE_FORM[\"变形形式<br/>a = 2R·sinA\"]\n  SINE --> SINE_USE[\"适用场景\"]\n  SINE_FORM --> SINE_RATIO[\"a:b:c = sinA:sinB:sinC\"]\n  SINE_USE --> SINE_AAS[\"两角一边 AAS/ASA\"]\n  SINE_USE --> SINE_SSA[\"两边对角 SSA<br/>可能两解\"]\n\n  COS --> COS_FORM[\"变形形式<br/>cosA = b²+c²-a² / 2bc\"]\n  COS --> COS_USE[\"适用场景\"]\n  COS_USE --> COS_SSS[\"已知三边 SSS\"]\n  COS_USE --> COS_SAS[\"两边夹角 SAS\"]\n  COS --> COS_SHAPE[\"判断形状<br/>cosA 与 0 比较\"]\n\n  AREA --> AREA_R[\"S = abc/4R\"]\n  AREA --> AREA_HERON[\"海伦公式<br/>S = √ p·(p-a)·(p-b)·(p-c)\"]\n\n  CHOOSE --> C_SINE[\"两角一边 → 正弦定理\"]\n  CHOOSE --> C_COS[\"三边/两边夹角 → 余弦定理\"]\n\n  SINE_SSA -.->|关联| C_SINE\n  COS_FORM -.->|关联| AREA_R\n  SINE -.->|互补| COS"
    },
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "掌握正弦定理的内容及其变形形式，能运用正弦定理解三角形",
        "掌握余弦定理的内容及其变形形式，能运用余弦定理解三角形",
        "能根据已知条件选择合适的定理解三角形",
        "能利用余弦定理判断三角形的形状"
      ]
    },
    {
      "type": "knowledge",
      "title": "一、正弦定理",
      "paragraphs": [
        "正弦定理的变形形式：\n\n      • \\(a = 2R\\sin A\\)，\\(b = 2R\\sin B\\)，\\(c = 2R\\sin C\\)\n\n      • \\(a : b : c = \\sin A : \\sin B : \\sin C\\)\n\n      • \\(\\sin A : \\sin B : \\sin C = a : b : c\\)"
      ]
    },
    {
      "type": "formula",
      "title": "正弦定理",
      "formulas": [
        "a",
        "b",
        "c",
        "A",
        "B",
        "C",
        "R"
      ]
    },
    {
      "type": "knowledge",
      "title": "正弦定理的证明",
      "paragraphs": [
        "证明思路：利用外接圆，把边与对角的关系转化为直径与圆周角的关系。\n\n      第一步：作 \\(\\triangle ABC\\) 的外接圆 \\(O\\)，设其半径为 \\(R\\)。\n\n      第二步：过顶点 \\(B\\) 作外接圆的直径 \\(BD\\)（\\(D\\) 在圆上），则 \\(BD = 2R\\)。\n\n      第三步：连接 \\(CD\\)。因为 \\(BD\\) 为直径，所以 \\(\\angle BCD = 90°\\)（直径所对圆周角为直角），即 \\(\\triangle BCD\\) 为直角三角形。\n\n      第四步：由同弧所对圆周角相等，\\(\\angle BAC\\) 与 \\(\\angle BDC\\) 都对着弧 \\(BC\\)，故 \\(\\angle BAC = \\angle BDC = A\\)。\n\n      第五步：在 \\(\\mathrm{Rt}\\triangle BCD\\) 中，\\(\\sin\\angle BDC = \\dfrac{BC}{BD} = \\dfrac{a}{2R}\\)，即 \\(\\sin A = \\dfrac{a}{2R}\\)。\n\n      第六步：整理得 \\(\\dfrac{a}{\\sin A} = 2R\\)。同理可得 \\(\\dfrac{b}{\\sin B} = 2R\\)，\\(\\dfrac{c}{\\sin C} = 2R\\)。\n\n      结论：故 \\(\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C} = 2R\\)，正弦定理得证。"
      ]
    },
    {
      "type": "knowledge",
      "title": "余弦定理的证明",
      "paragraphs": [
        "证明思路：建立平面直角坐标系，用两点间距离公式表示边长，化简即得。\n\n      第一步：以顶点 \\(A\\) 为原点，边 \\(AB\\) 所在直线为 \\(x\\) 轴，建立平面直角坐标系。\n\n      第二步：设 \\(AB = c\\)，\\(AC = b\\)，\\(\\angle BAC = A\\)，则各点坐标为 \\(A(0,0)\\)、\\(B(c,0)\\)、\\(C(b\\cos A,\\ b\\sin A)\\)。\n\n      第三步：由两点间距离公式求 \\(BC\\)：\n\n      \\(BC^2 = (b\\cos A - c)^2 + (b\\sin A - 0)^2\\)\n\n      第四步：展开并化简：\n\n      \\(BC^2 = b^2\\cos^2 A - 2bc\\cos A + c^2 + b^2\\sin^2 A\\)\n\n      \\(= b^2(\\cos^2 A + \\sin^2 A) + c^2 - 2bc\\cos A\\)\n\n      第五步：由 \\(\\cos^2 A + \\sin^2 A = 1\\)，得 \\(BC^2 = b^2 + c^2 - 2bc\\cos A\\)。\n\n      第六步：因为 \\(BC = a\\)，所以 \\(a^2 = b^2 + c^2 - 2bc\\cos A\\)。\n\n      结论：同理可证 \\(b^2 = a^2 + c^2 - 2ac\\cos B\\)，\\(c^2 = a^2 + b^2 - 2ab\\cos C\\)，余弦定理得证。"
      ]
    },
    {
      "type": "warning",
      "text": "SSA 情况使用正弦定理时，可能出现一解、两解或无解的情况，需要根据条件判断。"
    },
    {
      "type": "table",
      "title": "三、定理的适用场景",
      "headers": [
        "定理",
        "适用场景",
        "已知条件"
      ],
      "rows": [
        [
          "正弦定理",
          "已知两角及任意一边",
          "AAS、ASA"
        ],
        [
          "正弦定理",
          "已知两边及其中一边的对角",
          "SSA（可能两解）"
        ],
        [
          "余弦定理",
          "已知三边",
          "SSS"
        ],
        [
          "余弦定理",
          "已知两边及夹角",
          "SAS"
        ]
      ]
    },
    {
      "type": "knowledge",
      "title": "四、利用余弦值判断三角形形状",
      "paragraphs": [
        "在 \\(\\triangle ABC\\) 中：\n\n      • 若 \\(\\cos A > 0\\)，即 \\(b^2 + c^2 > a^2\\)，则角 \\(A\\) 为锐角\n\n      • 若 \\(\\cos A = 0\\)，即 \\(b^2 + c^2 = a^2\\)，则角 \\(A\\) 为直角（直角三角形）\n\n      • 若 \\(\\cos A < 0\\)，即 \\(b^2 + c^2 < a^2\\)，则角 \\(A\\) 为钝角（钝角三角形）"
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：正弦定理解三角形",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(a = 6\\)，\\(B = 45°\\)，\\(C = 75°\\)，求 \\(b\\)、\\(c\\) 和 \\(A\\)。",
          "solution": "解：\n\n        由内角和定理：\\(A = 180° - B - C = 180° - 45° - 75° = 60°\\)\n\n        由正弦定理 \\(\\frac{a}{\\sin A} = \\frac{b}{\\sin B}\\)：\n\n        \\(b = \\frac{a \\sin B}{\\sin A} = \\frac{6 \\sin 45°}{\\sin 60°} = \\frac{6 \\times \\frac{\\sqrt{2}}{2}}{\\frac{\\sqrt{3}}{2}} = \\frac{3\\sqrt{2}}{\\frac{\\sqrt{3}}{2}} = \\frac{6\\sqrt{2}}{\\sqrt{3}} = 2\\sqrt{6}\\)\n\n        由正弦定理 \\(\\frac{a}{\\sin A} = \\frac{c}{\\sin C}\\)：\n\n        \\(\\sin 75° = \\sin(45° + 30°) = \\frac{\\sqrt{6} + \\sqrt{2}}{4}\\)\n\n        \\(c = \\frac{a \\sin C}{\\sin A} = \\frac{6 \\times \\frac{\\sqrt{6}+\\sqrt{2}}{4}}{\\frac{\\sqrt{3}}{2}} = \\frac{6(\\sqrt{6}+\\sqrt{2})}{4} \\times \\frac{2}{\\sqrt{3}} = \\frac{3(\\sqrt{6}+\\sqrt{2})}{\\sqrt{3}} = 3(√2 + \\frac{\\sqrt{2}}{\\sqrt{3}}) \\)\n\n        化简：\\(c = \\frac{6 \\sin 75°}{\\sin 60°} = \\frac{6 \\times \\frac{\\sqrt{6}+\\sqrt{2}}{4}}{\\frac{\\sqrt{3}}{2}} = \\frac{3(\\sqrt{6}+\\sqrt{2})}{2} \\times \\frac{2}{\\sqrt{3}} = \\frac{3(\\sqrt{6}+\\sqrt{2})}{\\sqrt{3}} = 3\\sqrt{2} + \\sqrt{6}\\)",
          "answer": ""
        },
        {
          "title": "例题2：余弦定理解三角形",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(a = 3\\)，\\(b = 5\\)，\\(C = 60°\\)，求 \\(c\\) 和 \\(A\\)。",
          "solution": "解：\n\n        由余弦定理求 \\(c\\)：\n\n        \\(c^2 = a^2 + b^2 - 2ab\\cos C = 9 + 25 - 2 \\times 3 \\times 5 \\times \\cos 60° = 34 - 30 \\times \\frac{1}{2} = 34 - 15 = 19\\)\n\n        \\(c = \\sqrt{19}\\)\n\n        由余弦定理求 \\(A\\)：\n\n        \\(\\cos A = \\frac{b^2 + c^2 - a^2}{2bc} = \\frac{25 + 19 - 9}{2 \\times 5 \\times \\sqrt{19}} = \\frac{35}{10\\sqrt{19}} = \\frac{7}{2\\sqrt{19}} = \\frac{7\\sqrt{19}}{38}\\)\n\n        \\(A = \\arccos\\frac{7\\sqrt{19}}{38}\\)",
          "answer": ""
        },
        {
          "title": "例题3：判断三角形形状",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\((a^2 + b^2 - c^2)\\tan C = ab\\)，判断三角形的形状。",
          "solution": "解：\n\n        由余弦定理：\\(\\cos C = \\frac{a^2 + b^2 - c^2}{2ab}\\)，即 \\(a^2 + b^2 - c^2 = 2ab\\cos C\\)\n\n        代入已知条件：\\(2ab\\cos C \\cdot \\tan C = ab\\)\n\n        因为 \\(ab \\neq 0\\)，两边同除以 \\(ab\\)：\n\n        \\(2\\cos C \\cdot \\tan C = 1\\)\n\n        \\(2\\cos C \\cdot \\frac{\\sin C}{\\cos C} = 1\\)\n\n        \\(2\\sin C = 1\\)，即 \\(\\sin C = \\frac{1}{2}\\)\n\n        因为 \\(C \\in (0, \\pi)\\)，所以 \\(C = \\frac{\\pi}{6}\\) 或 \\(C = \\frac{5\\pi}{6}\\)\n\n        但需验证 \\(\\cos C \\neq 0\\)（\\(\\tan C\\) 有意义），两种情况都满足。\n\n        但由于原式中有 \\(\\tan C\\)，当 \\(C = \\frac{5\\pi}{6}\\) 时，\\(\\tan C  0\\)，可以成立。\n\n        但进一步检验：\\(\\sin C = \\frac{1}{2}\\)，\\(C = 30°\\) 或 \\(150°\\)。\n\n        所以三角形为含 \\(30°\\) 或 \\(150°\\) 角的三角形，但仅由角度无法确定唯一形状。\n\n        实际上，更准确地说，本题条件只能确定 \\(C = 30°\\) 或 \\(C = 150°\\)。",
          "answer": ""
        },
        {
          "title": "例题4：推导射影定理",
          "question": "在 \\(\\triangle ABC\\) 中，证明：射影定理 \\(a = b\\cos C + c\\cos B\\)。",
          "solution": "证明：利用余弦定理的变形形式（用三边表示余弦）。\n\n        由余弦定理：\\(\\cos C = \\dfrac{a^2 + b^2 - c^2}{2ab}\\)，\\(\\cos B = \\dfrac{a^2 + c^2 - b^2}{2ac}\\)。\n\n        于是：\n\n        \\(b\\cos C + c\\cos B = b \\cdot \\dfrac{a^2 + b^2 - c^2}{2ab} + c \\cdot \\dfrac{a^2 + c^2 - b^2}{2ac}\\)\n\n        \\(= \\dfrac{a^2 + b^2 - c^2}{2a} + \\dfrac{a^2 + c^2 - b^2}{2a}\\)\n\n        \\(= \\dfrac{a^2 + b^2 - c^2 + a^2 + c^2 - b^2}{2a} = \\dfrac{2a^2}{2a} = a\\)\n\n        故 \\(a = b\\cos C + c\\cos B\\)。同理可证 \\(b = a\\cos C + c\\cos A\\)，\\(c = a\\cos B + b\\cos A\\)，射影定理得证。",
          "answer": ""
        },
        {
          "title": "例题5：SSA 漏解（易错题）",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(a = 4\\)，\\(b = 4\\sqrt{2}\\)，\\(A = 30°\\)，求 \\(B\\)。",
          "solution": "常见错误：由正弦定理 \\(\\sin B = \\dfrac{b\\sin A}{a} = \\dfrac{4\\sqrt{2} \\times \\frac{1}{2}}{4} = \\dfrac{\\sqrt{2}}{2}\\)，直接得 \\(B = 45°\\)。\n\n        错误分析：\\(\\sin B = \\dfrac{\\sqrt{2}}{2}\\) 时，\\(B\\) 可为锐角或钝角。题中 \\(b = 4\\sqrt{2} > a = 4\\)，故 \\(B > A = 30°\\)，\\(B\\) 可能为钝角，不能只取锐角解。\n\n        正确解法：由 \\(\\sin B = \\dfrac{\\sqrt{2}}{2}\\)，得 \\(B = 45°\\) 或 \\(B = 135°\\)。\n\n        检验：\\(B = 45°\\) 时，\\(A + B = 75° \\(B = 135°\\) 时，\\(A + B = 165° 故 \\(B = 45°\\) 或 \\(B = 135°\\)。\)\)",
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
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(A = 30°\\)，\\(B = 45°\\)，\\(a = 2\\sqrt{2}\\)，求 \\(b\\) 的值。",
          "answer": "由正弦定理：\\(b = \\frac{a\\sin B}{\\sin A} = \\frac{2\\sqrt{2} \\times \\frac{\\sqrt{2}}{2}}{\\frac{1}{2}} = \\frac{2}{\\frac{1}{2}} = 4\\)"
        },
        {
          "difficulty": "basic",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a = 2\\)，\\(b = 3\\)，\\(c = 4\\)，求最大角的余弦值。",
          "answer": "最大边为 \\(c = 4\\)，最大角为 \\(C\\)。\\(\\cos C = \\frac{a^2+b^2-c^2}{2ab} = \\frac{4+9-16}{12} = \\frac{-3}{12} = -\\frac{1}{4}\\)"
        },
        {
          "difficulty": "medium",
          "question": "在 \\(\\triangle ABC\\) 中，\\(a = 4\\)，\\(b = 4\\sqrt{3}\\)，\\(A = 30°\\)，求 \\(B\\) 的值。",
          "answer": "由正弦定理：\\(\\sin B = \\frac{b\\sin A}{a} = \\frac{4\\sqrt{3} \\times \\frac{1}{2}}{4} = \\frac{\\sqrt{3}}{2}\\)。因为 \\(b > a\\)，所以 \\(B > A\\)，\\(B = 60°\\) 或 \\(B = 120°\\)。当 \\(B = 120°\\) 时，\\(A + B = 150° < 180°\\)，成立。故 \\(B = 60°\\) 或 \\(120°\\)。"
        },
        {
          "difficulty": "medium",
          "question": "在 \\(\\triangle ABC\\) 中，已知 \\(a = 5\\)，\\(b = 7\\)，\\(C = 120°\\)，求 \\(c\\) 的值。",
          "answer": "\\(c^2 = a^2+b^2-2ab\\cos C = 25+49-2\\times 5\\times 7\\times\\cos 120° = 74-70\\times(-\\frac{1}{2}) = 74+35 = 109\\)，\\(c = \\sqrt{109}\\)"
        },
        {
          "difficulty": "advanced",
          "question": "在 \\(\\triangle ABC\\) 中，若 \\(a^2 = b^2 + c^2 + bc\\)，求角 \\(A\\) 的度数。",
          "answer": "由余弦定理 \\(a^2 = b^2+c^2-2bc\\cos A\\)，与 \\(a^2 = b^2+c^2+bc\\) 比较：\\(-2bc\\cos A = bc\\)，\\(\\cos A = -\\frac{1}{2}\\)，所以 \\(A = 120°\\)。"
        }
      ]
    }
  ]
}
