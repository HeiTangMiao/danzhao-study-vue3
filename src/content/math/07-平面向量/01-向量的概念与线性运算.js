/**
 * 内容页面数据（content-schema 的实例）
 * 页面：向量的概念与线性运算
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-07-01",
  "unitNum": "07",
  "subject": "math",
  "title": "向量的概念与线性运算",
  "subtitle": "向量定义、加减法与数乘运算",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "理解向量的概念，掌握向量的模、零向量、单位向量等概念",
        "掌握平行向量、相等向量、相反向量的概念",
        "熟练掌握向量的加法、减法运算（三角形法则和平行四边形法则）",
        "掌握向量的数乘运算及其几何意义"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"向量的概念与线性运算\"]\n  N1[\"向量概念\"]\n  N0 --> N1\n  N2[\"大小 模\"]\n  N1 --> N2\n  N3[\"方向\"]\n  N1 --> N3\n  N4[\"有向线段表示\"]\n  N1 --> N4\n  N5[\"特殊向量\"]\n  N0 --> N5\n  N6[\"零向量\"]\n  N5 --> N6\n  N7[\"单位向量\"]\n  N5 --> N7\n  N8[\"平行向量\"]\n  N5 --> N8\n  N9[\"相等向量\"]\n  N5 --> N9\n  N10[\"相反向量\"]\n  N5 --> N10\n  N11[\"加法运算\"]\n  N0 --> N11\n  N12[\"三角形法则\"]\n  N11 --> N12\n  N13[\"平行四边形法则\"]\n  N11 --> N13\n  N14[\"交换律\"]\n  N11 --> N14\n  N15[\"结合律\"]\n  N11 --> N15\n  N16[\"减法运算\"]\n  N0 --> N16\n  N17[\"a - b = a + -b\"]\n  N16 --> N17\n  N18[\"共起点差向量\"]\n  N16 --> N18\n  N19[\"数乘运算\"]\n  N0 --> N19\n  N20[\"lambda a\"]\n  N19 --> N20\n  N21[\"同向或反向\"]\n  N19 --> N21\n  N22[\"运算律\"]\n  N19 --> N22\n  N23[\"共线向量定理\"]\n  N0 --> N23\n  N24[\"b = lambda a\"]\n  N23 --> N24"
    },
    {
      "type": "knowledge",
      "title": "一、向量的定义",
      "paragraphs": [
        "既有大小又有方向的量称为向量。向量常用有向线段表示，记作 \\(\\vec{AB}\\) 或 \\(\\boldsymbol{a}\\)。\n\n      向量的大小称为向量的模，记作 \\(|\\vec{AB}|\\) 或 \\(|\\boldsymbol{a}|\\)。"
      ]
    },
    {
      "type": "tip",
      "text": "零向量与任一向量平行。规定 \\(\\boldsymbol{0}\\) 与任何向量共线。"
    },
    {
      "type": "table",
      "title": "二、特殊向量",
      "headers": [
        "名称",
        "定义",
        "记法"
      ],
      "rows": [
        [
          "零向量",
          "模为 \\(0\\) 的向量，方向任意",
          "\\(\\boldsymbol{0}\\)"
        ],
        [
          "单位向量",
          "模为 \\(1\\) 的向量",
          "—"
        ],
        [
          "平行向量",
          "方向相同或相反的非零向量（共线）",
          "\\(\\boldsymbol{a} \\parallel \\boldsymbol{b}\\)"
        ],
        [
          "相等向量",
          "模相等且方向相同的向量",
          "\\(\\boldsymbol{a} = \\boldsymbol{b}\\)"
        ],
        [
          "相反向量",
          "模相等且方向相反的向量",
          "\\(\\boldsymbol{a} = -\\boldsymbol{b}\\)"
        ]
      ]
    },
    {
      "type": "knowledge",
      "title": "三、向量加法",
      "paragraphs": [
        "三角形法则：首尾相接，从第一个向量的起点指向最后一个向量的终点的向量。\n\n      \\(\\vec{AB} + \\vec{BC} = \\vec{AC}\\)\n\n      平行四边形法则：两个向量共起点，以它们为邻边作平行四边形，对角线即为和向量。"
      ]
    },
    {
      "type": "diagram",
      "title": "三角形法则演示",
      "boardId": "vector-triangle-law",
      "caption": "首尾相接：\\(\\vec{AB} + \\vec{BC} = \\vec{AC}\\)。拖动点 B、C 可改变向量，和向量自动更新。",
      "initCode": `const A = board.create('point', [-4,-1], {name:'A', size:2, color: colors.text, fixed:true});
const B = board.create('point', [-1,2], {name:'B', size:2, color: colors.text});
const C = board.create('point', [2,-1], {name:'C', size:2, color: colors.text});
board.create('arrow', [A, B], {color: colors.primary, strokeWidth:3, firstArrow:false, lastArrow:true});
board.create('arrow', [B, C], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
board.create('arrow', [A, C], {color: colors.text, strokeWidth:2, firstArrow:false, lastArrow:true, dash:1});
board.create('text', [-2.8, 1.0, 'a'], {fontSize:16, color: colors.primary});
board.create('text', [0.8, 1.0, 'b'], {fontSize:16, color: colors.accent});
board.create('text', [-1.4, -1.6, 'a + b'], {fontSize:16, color: colors.text});`
    },
    {
      "type": "diagram",
      "title": "平行四边形法则演示",
      "boardId": "vector-parallelogram-law",
      "caption": "共起点：以 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 为邻边作平行四边形，对角线即和向量。拖动点 A、B 观察变化。",
      "initCode": `const O = board.create('point', [-3,-1.5], {name:'O', size:2, color: colors.text, fixed:true});
const A = board.create('point', [0,1.5], {name:'A', size:2, color: colors.text});
const B = board.create('point', [2,-0.5], {name:'B', size:2, color: colors.text});
const C = board.create('point', [function(){return A.X()+B.X()-O.X();}, function(){return A.Y()+B.Y()-O.Y();}], {name:'C', size:2, color: colors.accent});
board.create('arrow', [O, A], {color: colors.primary, strokeWidth:3, firstArrow:false, lastArrow:true});
board.create('arrow', [O, B], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
board.create('arrow', [O, C], {color: colors.text, strokeWidth:2, firstArrow:false, lastArrow:true, dash:1});
board.create('segment', [A, C], {color: colors.muted, strokeWidth:1, dash:2});
board.create('segment', [B, C], {color: colors.muted, strokeWidth:1, dash:2});
board.create('text', [-1.8, 0.6, 'a'], {fontSize:16, color: colors.primary});
board.create('text', [-0.2, -1.5, 'b'], {fontSize:16, color: colors.accent});
board.create('text', [1.4, 1.0, 'a + b'], {fontSize:16, color: colors.text});`
    },
    {
      "type": "knowledge",
      "title": "四、向量减法",
      "paragraphs": [
        "减法几何意义：共起点的两向量之差，等于从减向量的终点指向被减向量的终点的向量。\n\n      \\(\\vec{AB} - \\vec{AC} = \\vec{CB}\\)"
      ]
    },
    {
      "type": "formula",
      "title": "数乘运算",
      "formulas": [
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
      "type": "diagram",
      "title": "数乘的几何意义演示",
      "boardId": "vector-scalar-multiplication",
      "caption": "\\(\\lambda > 0\\) 时 \\(\\lambda\\boldsymbol{a}\\) 与 \\(\\boldsymbol{a}\\) 同向，\\(\\lambda < 0\\) 时反向，模长为 \\(|\\lambda|\\) 倍。拖动点 A 观察。",
      "initCode": `const O = board.create('point', [-3,0], {name:'O', size:2, color: colors.text, fixed:true});
const A = board.create('point', [1,1.2], {name:'A', size:2, color: colors.primary});
board.create('arrow', [O, A], {color: colors.primary, strokeWidth:3, firstArrow:false, lastArrow:true});
const B = board.create('point', [function(){return O.X()+2*(A.X()-O.X());}, function(){return O.Y()+2*(A.Y()-O.Y());}], {name:'2a', size:2, color: colors.accent});
board.create('arrow', [O, B], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
const C = board.create('point', [function(){return O.X()-0.5*(A.X()-O.X());}, function(){return O.Y()-0.5*(A.Y()-O.Y());}], {name:'-0.5a', size:2, color: colors.accent});
board.create('arrow', [O, C], {color: colors.accent, strokeWidth:3, firstArrow:false, lastArrow:true});
board.create('text', [-0.6, 1.2, 'a'], {fontSize:16, color: colors.primary});
board.create('text', [1.4, 1.8, '2a'], {fontSize:16, color: colors.accent});
board.create('text', [-5.2, -1.0, '-0.5a'], {fontSize:16, color: colors.accent});`
    },
    {
      "type": "formula",
      "title": "共线向量定理",
      "formulas": [
        "向量 \\(\\boldsymbol{a}\\)（\\(\\boldsymbol{a} \\neq \\boldsymbol{0}\\)）与 \\(\\boldsymbol{b}\\) 共线，当且仅当存在唯一实数 \\(\\lambda\\)，使得："
      ]
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：向量运算",
          "question": "化简以下向量表达式：\\(\\overrightarrow{AB} - \\overrightarrow{AC} + \\overrightarrow{BD} - \\overrightarrow{CD}\\)",
          "solution": "解：\n\n        \\(\\overrightarrow{AB} - \\overrightarrow{AC} + \\overrightarrow{BD} - \\overrightarrow{CD}\\)\n\n        \\(= (\\overrightarrow{AB} + \\overrightarrow{BD}) - (\\overrightarrow{AC} + \\overrightarrow{CD})\\)\n\n        \\(= \\overrightarrow{AD} - \\overrightarrow{AD}\\)\n\n        \\(= \\boldsymbol{0}\\)",
          "answer": ""
        },
        {
          "title": "例题2：化简",
          "question": "已知 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 为向量，化简：\\(3(\\boldsymbol{a} - 2\\boldsymbol{b}) - 2(2\\boldsymbol{a} + \\boldsymbol{b})\\)",
          "solution": "解：\n\n        \\(3(\\boldsymbol{a} - 2\\boldsymbol{b}) - 2(2\\boldsymbol{a} + \\boldsymbol{b})\\)\n\n        \\(= 3\\boldsymbol{a} - 6\\boldsymbol{b} - 4\\boldsymbol{a} - 2\\boldsymbol{b}\\)\n\n        \\(= (3 - 4)\\boldsymbol{a} + (-6 - 2)\\boldsymbol{b}\\)\n\n        \\(= -\\boldsymbol{a} - 8\\boldsymbol{b}\\)",
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
          "question": "化简：\\(\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{CD} + \\overrightarrow{DA}\\)",
          "answer": "\\(\\overrightarrow{AB} + \\overrightarrow{BC} + \\overrightarrow{CD} + \\overrightarrow{DA} = \\overrightarrow{AD} + \\overrightarrow{DA} = \\overrightarrow{AD} - \\overrightarrow{AD} = \\boldsymbol{0}\\)（零向量）"
        },
        {
          "difficulty": "medium",
          "question": "已知 \\(\\overrightarrow{OA} = \\boldsymbol{a}\\)，\\(\\overrightarrow{OB} = \\boldsymbol{b}\\)，用 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 表示 \\(\\overrightarrow{AB}\\)。",
          "answer": "\\(\\overrightarrow{AB} = \\overrightarrow{OB} - \\overrightarrow{OA} = \\boldsymbol{b} - \\boldsymbol{a}\\)"
        },
        {
          "difficulty": "medium",
          "question": "化简：\\(2(\\boldsymbol{a} + \\boldsymbol{b}) - 3(\\boldsymbol{a} - \\boldsymbol{b})\\)",
          "answer": "\\(2\\boldsymbol{a} + 2\\boldsymbol{b} - 3\\boldsymbol{a} + 3\\boldsymbol{b} = -\\boldsymbol{a} + 5\\boldsymbol{b}\\)"
        },
        {
          "difficulty": "advanced",
          "question": "在平行四边形 \\(ABCD\\) 中，\\(\\overrightarrow{AB} = \\boldsymbol{a}\\)，\\(\\overrightarrow{AD} = \\boldsymbol{b}\\)，用 \\(\\boldsymbol{a}\\)、\\(\\boldsymbol{b}\\) 表示 \\(\\overrightarrow{AC}\\) 和 \\(\\overrightarrow{BD}\\)。",
          "answer": "\\(\\overrightarrow{AC} = \\overrightarrow{AB} + \\overrightarrow{AD} = \\boldsymbol{a} + \\boldsymbol{b}\\)；\\(\\overrightarrow{BD} = \\overrightarrow{AD} - \\overrightarrow{AB} = \\boldsymbol{b} - \\boldsymbol{a}\\)。"
        }
      ]
    }
  ]
}
