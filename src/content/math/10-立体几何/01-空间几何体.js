/**
 * 内容页面数据（content-schema 的实例）
 * 页面：空间几何体
 * 由原始 HTML 自动转换生成
 */
export default {
  "id": "math-10-01",
  "unitNum": "10",
  "subject": "math",
  "title": "空间几何体",
  "subtitle": "多面体与旋转体结构特征、三视图",
  "blocks": [
    {
      "type": "objectives",
      "title": "学习目标",
      "items": [
        "认识棱柱、棱锥、棱台等常见多面体的结构特征",
        "认识圆柱、圆锥、圆台、球等旋转体的结构特征",
        "掌握三视图的画法规则，能由三视图还原几何体"
      ]
    },
    {
      "type": "mindmap",
      "title": "知识结构导图",
      "mermaid": "graph LR\n  N0[\"空间几何体\"]\n  N1[\"多面体\"]\n  N0 --> N1\n  N2[\"棱柱\"]\n  N1 --> N2\n  N3[\"两底面平行且全等\"]\n  N2 --> N3\n  N4[\"侧棱平行且相等\"]\n  N2 --> N4\n  N5[\"直棱柱与斜棱柱\"]\n  N2 --> N5\n  N6[\"正棱柱\"]\n  N2 --> N6\n  N7[\"棱锥\"]\n  N1 --> N7\n  N8[\"正棱锥\"]\n  N7 --> N8\n  N9[\"底面正多边形\"]\n  N7 --> N9\n  N10[\"顶点射影为底面中心\"]\n  N7 --> N10\n  N11[\"棱台\"]\n  N1 --> N11\n  N12[\"平行于底面截去顶部\"]\n  N11 --> N12\n  N13[\"两底面平行且相似\"]\n  N11 --> N13\n  N14[\"旋转体\"]\n  N0 --> N14\n  N15[\"圆柱\"]\n  N14 --> N15\n  N16[\"矩形旋转形成\"]\n  N15 --> N16\n  N17[\"侧面展开为矩形\"]\n  N15 --> N17\n  N18[\"圆锥\"]\n  N14 --> N18\n  N19[\"直角三角形旋转形成\"]\n  N18 --> N19\n  N20[\"侧面展开为扇形\"]\n  N18 --> N20\n  N21[\"圆台\"]\n  N14 --> N21\n  N22[\"直角梯形旋转形成\"]\n  N21 --> N22\n  N23[\"球\"]\n  N14 --> N23\n  N24[\"半圆绕直径旋转\"]\n  N23 --> N24\n  N25[\"三视图\"]\n  N0 --> N25\n  N26[\"正视图\"]\n  N25 --> N26\n  N27[\"侧视图\"]\n  N25 --> N27\n  N28[\"俯视图\"]\n  N25 --> N28\n  N29[\"长对正\"]\n  N25 --> N29\n  N30[\"高平齐\"]\n  N25 --> N30\n  N31[\"宽相等\"]\n  N25 --> N31"
    },
    {
      "type": "tip",
      "text": "棱柱按侧棱与底面是否垂直分为直棱柱（垂直）和斜棱柱（不垂直）。底面是正多边形的直棱柱叫正棱柱。"
    },
    {
      "type": "table",
      "title": "一、多面体的结构特征",
      "headers": [
        "几何体",
        "结构特征"
      ],
      "rows": [
        [
          "棱柱",
          "两底面平行且全等，侧棱平行且相等，侧面为平行四边形"
        ],
        [
          "正棱锥",
          "底面是正多边形，顶点在底面的射影为底面中心，侧面为全等的等腰三角形"
        ],
        [
          "棱台",
          "用平行于棱锥底面的平面截去顶部所得，两底面平行且相似"
        ]
      ]
    },
    {
      "type": "diagram",
      "title": "棱柱结构演示（三棱柱）",
      "boardId": "solid-prism",
      "caption": "两底面平行且全等（三角形），侧棱平行且相等，侧面为平行四边形。",
      "initCode": `const back = board.create('polygon', [[1.2,1.2],[5.2,1.2],[3.2,3.7]], {fillColor: colors.accent, fillOpacity:0.08, borders:{strokeColor: colors.muted, strokeWidth:1.5, dash:2}});
board.create('segment', [[0,0],[1.2,1.2]], {strokeColor: colors.text, strokeWidth:1.5, dash:1});
board.create('segment', [[4,0],[5.2,1.2]], {strokeColor: colors.text, strokeWidth:1.5, dash:1});
board.create('segment', [[2,2.5],[3.2,3.7]], {strokeColor: colors.text, strokeWidth:1.5, dash:1});
const front = board.create('polygon', [[0,0],[4,0],[2,2.5]], {fillColor: colors.primary, fillOpacity:0.15, borders:{strokeColor: colors.primary, strokeWidth:2}});
board.create('text', [2, -0.8, '底面（三角形）'], {fontSize:13, color: colors.muted});
board.create('text', [3.4, 4.2, '顶面（全等三角形）'], {fontSize:13, color: colors.muted});
board.create('text', [5.6, 0.6, '侧棱平行且相等'], {fontSize:13, color: colors.muted});`
    },
    {
      "type": "diagram",
      "title": "棱锥结构演示（四棱锥）",
      "boardId": "solid-pyramid",
      "caption": "底面是多边形，各侧面为三角形，所有侧棱交于顶点 S。",
      "initCode": `const base = board.create('polygon', [[-2.5,-1.2],[2.5,-1.2],[2,1.2],[-2,1.2]], {fillColor: colors.primary, fillOpacity:0.15, borders:{strokeColor: colors.primary, strokeWidth:2}});
const S = board.create('point', [0,3.4], {name:'S', size:2, color: colors.accent});
board.create('segment', [S, [-2.5,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [S, [2.5,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [S, [2,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [S, [-2,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('text', [0, 3.9, '顶点 S'], {fontSize:13, color: colors.accent});
board.create('text', [0, -1.8, '底面（四边形）'], {fontSize:13, color: colors.muted});`
    },
    {
      "type": "knowledge",
      "title": "二、旋转体的结构特征",
      "paragraphs": [
        "圆柱：由矩形绕一边所在直线旋转一周形成。两底面是全等的圆，侧面展开为矩形。\n\n      圆锥：由直角三角形绕一条直角边所在直线旋转一周形成。底面是圆，侧面展开为扇形。\n\n      圆台：由直角梯形绕垂直于底边的腰所在直线旋转一周形成，也可由平行于圆锥底面的平面截去顶部所得。\n\n      球：由半圆绕其直径所在直线旋转一周形成。球面上任一点到球心距离等于半径。"
      ]
    },
    {
      "type": "diagram",
      "title": "圆柱与圆锥结构演示",
      "boardId": "solid-cylinder-cone",
      "caption": "圆柱由矩形绕轴旋转形成，圆锥由直角三角形绕直角边旋转形成，虚线为旋转轴。",
      "initCode": `function ellipse(cx, cy, rx, ry) {
  board.create('curve', [function(t){return cx + rx*Math.cos(t);}, function(t){return cy + ry*Math.sin(t);}, 0, 2*Math.PI], {strokeColor: colors.text, strokeWidth:1.5});
}
ellipse(-2.5, -1.2, 1.6, 0.6);
ellipse(-2.5, 1.2, 1.6, 0.6);
board.create('segment', [[-4.1,-1.2],[-4.1,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [[-0.9,-1.2],[-0.9,1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [[-2.5,-1.2],[-2.5,1.2]], {strokeColor: colors.accent, strokeWidth:1.5, dash:2});
board.create('text', [-2.5, 1.7, '圆柱'], {fontSize:14, color: colors.primary});
ellipse(3, -1.2, 1.6, 0.6);
board.create('segment', [[3,1.6],[1.4,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [[3,1.6],[4.6,-1.2]], {strokeColor: colors.text, strokeWidth:1.5});
board.create('segment', [[3,-1.2],[3,1.6]], {strokeColor: colors.accent, strokeWidth:1.5, dash:2});
board.create('point', [3,1.6], {name:'顶点', size:2, color: colors.accent});
board.create('text', [3, 2.1, '圆锥'], {fontSize:14, color: colors.primary});`
    },
    {
      "type": "knowledge",
      "title": "三、三视图",
      "paragraphs": [
        "从不同方向观察物体得到的投影图称为三视图：\n\n      正视图（主视图）：从前向后观察得到的投影图。\n\n      侧视图（左视图）：从左向右观察得到的投影图。\n\n      俯视图：从上向下观察得到的投影图。"
      ]
    },
    {
      "type": "formula",
      "title": "三视图的规则",
      "formulas": [
        "① 长对正：正视图与俯视图的长度相等且对正；",
        "② 高平齐：正视图与侧视图的高度相等且平齐；",
        "③ 宽相等：俯视图与侧视图的宽度相等。"
      ]
    },
    {
      "type": "warning",
      "text": "画三视图时，看得见的轮廓线画实线，看不见的轮廓线画虚线。"
    },
    {
      "type": "example",
      "title": "典型例题",
      "items": [
        {
          "title": "例题1：识别几何体",
          "question": "下列说法是否正确？（1）底面是正方形的棱锥是正四棱锥；（2）有两个面平行且全等，其余各面都是平行四边形的几何体是棱柱。",
          "solution": "解：\n\n        （1）不正确。正四棱锥不仅要求底面是正方形，还要求顶点在底面的射影是底面中心（即各侧棱相等）。底面是正方形但顶点不在中心的棱锥不是正四棱锥。\n\n        （2）正确。这符合棱柱的定义特征：两底面平行且全等，侧面是平行四边形，侧棱平行。",
          "answer": "答：（1）不正确；（2）正确。"
        },
        {
          "title": "例题2：由三视图还原几何体",
          "question": "一个几何体的三视图都是边长为 2 的正三角形，判断该几何体是什么形状，并求其体积。",
          "solution": "分析：三个视图都是正三角形，说明该几何体是正四面体（四条棱长相等的正三棱锥）。\n\n        解：该几何体为正四面体，棱长 \\(a = 2\\)。\n\n        正四面体的底面是边长为 2 的正三角形，底面积：\n\n        $$S = \\frac{\\sqrt{3}}{4} \\times 2^2 = \\sqrt{3}$$\n\n        正四面体的高：\\(h = \\dfrac{\\sqrt{6}}{3} \\times 2 = \\dfrac{2\\sqrt{6}}{3}\\)。\n\n        体积：\\(V = \\dfrac{1}{3} \\times \\sqrt{3} \\times \\dfrac{2\\sqrt{6}}{3} = \\dfrac{2\\sqrt{18}}{9} = \\dfrac{6\\sqrt{2}}{9} = \\dfrac{2\\sqrt{2}}{3}\\)。",
          "answer": "答：该几何体是正四面体，体积为 \\(\\dfrac{2\\sqrt{2}}{3}\\)。"
        },
        {
          "title": "例题3：圆柱侧面展开图与表面积计算（基础计算型）",
          "question": "已知圆柱的侧面展开图是一个边长为 4 和 \\(2\\pi\\) 的矩形（其中 \\(2\\pi\\) 为展开图的长边）。\n\n      （1）求该圆柱的底面半径和高；\n\n      （2）求该圆柱的表面积和体积。",
          "solution": "解：\n\n        （1）圆柱侧面展开图为矩形，其长边等于底面圆周长 \\(2\\pi r\\)，宽边等于圆柱的高 \\(h\\)。\n\n        由题意：\\(2\\pi r = 2\\pi\\)，解得 \\(r = 1\\)。\n\n        高 \\(h = 4\\)（矩形的另一边）。\n\n        （2）底面积：\\(S_{底} = \\pi r^2 = \\pi \\times 1 = \\pi\\)。\n\n        侧面积：\\(S_{侧} = 2\\pi r h = 2\\pi \\times 1 \\times 4 = 8\\pi\\)。\n\n        表面积：\\(S = S_{侧} + 2S_{底} = 8\\pi + 2\\pi = 10\\pi\\)。\n\n        体积：\\(V = \\pi r^2 h = \\pi \\times 1 \\times 4 = 4\\pi\\)。",
          "answer": "答：（1）底面半径 \\(r = 1\\)，高 \\(h = 4\\)；（2）表面积为 \\(10\\pi\\)，体积为 \\(4\\pi\\)。"
        },
        {
          "title": "例题4：三视图画法的常见错误辨析（易错型）",
          "question": "判断下列关于三视图的说法是否正确，并说明理由：\n\n      （1）正视图和侧视图的宽度一定相等；\n\n      （2）一个长方体的三视图都是矩形；\n\n      （3）画三视图时，看不见的轮廓线不需要画出。",
          "solution": "解：\n\n        （1）错误。三视图的规则是\"长对正\"（正视图与俯视图长度相等）、\"高平齐\"（正视图与侧视图高度相等）、\"宽相等\"（俯视图与侧视图宽度相等）。正视图和侧视图之间是\"高平齐\"（高度相等），不是宽度相等。宽度相等指的是俯视图和侧视图之间的关系。\n\n        （2）正确。长方体从正面、侧面、上面三个方向投影，得到的都是矩形，所以三视图都是矩形。\n\n        （3）错误。画三视图时，看得见的轮廓线画实线，看不见的轮廓线画虚线，不能省略。例如从正面看长方体时，背面的棱虽然看不见，但仍需用虚线表示。\n\n        易错提醒：\"长对正、高平齐、宽相等\"分别对应不同的视图对，不能混淆。\"长对正\"是正视图与俯视图，\"高平齐\"是正视图与侧视图，\"宽相等\"是俯视图与侧视图。看不见的轮廓线必须用虚线画出，不能省略。",
          "answer": "答：（1）错误（正视图与侧视图是\"高平齐\"，不是宽度相等）；（2）正确；（3）错误（看不见的轮廓线需画虚线）。"
        },
        {
          "title": "例题5：由三视图还原几何体并求体积（综合应用型）",
          "question": "一个几何体的正视图和侧视图都是底为 4、高为 3 的等腰三角形，俯视图是半径为 2 的圆。求该几何体的体积和表面积。",
          "solution": "分析：正视图和侧视图都是等腰三角形，俯视图是圆，说明该几何体是圆锥。\n\n        由俯视图（半径为 2 的圆）可知：底面半径 \\(r = 2\\)。\n\n        由正视图（底为 4、高为 3 的等腰三角形）可知：底面直径 \\(2r = 4\\)（与 \\(r = 2\\) 一致），圆锥的高 \\(h = 3\\)。\n\n        解：\n\n        （1）求体积：\n\n        圆锥体积 \\(V = \\dfrac{1}{3}\\pi r^2 h = \\dfrac{1}{3}\\pi \\times 4 \\times 3 = 4\\pi\\)。\n\n        （2）求表面积：\n\n        先求母线长 \\(l\\)：由 \\(l^2 = r^2 + h^2 = 4 + 9 = 13\\)，得 \\(l = \\sqrt{13}\\)。\n\n        侧面积：\\(S_{侧} = \\pi r l = \\pi \\times 2 \\times \\sqrt{13} = 2\\sqrt{13}\\pi\\)。\n\n        底面积：\\(S_{底} = \\pi r^2 = 4\\pi\\)。\n\n        表面积：\\(S = S_{侧} + S_{底} = 2\\sqrt{13}\\pi + 4\\pi = (2\\sqrt{13} + 4)\\pi\\)。",
          "answer": "答：该几何体为圆锥，体积为 \\(4\\pi\\)，表面积为 \\((2\\sqrt{13} + 4)\\pi\\)。"
        }
      ]
    },
    {
      "type": "quiz",
      "title": "练习题",
      "items": [
        {
          "difficulty": "basic",
          "question": "圆柱的侧面展开图是什么形状？圆锥的侧面展开图是什么形状？",
          "answer": "解：圆柱侧面展开图是矩形；圆锥侧面展开图是扇形。"
        },
        {
          "difficulty": "medium",
          "question": "正棱锥的顶点在底面的射影是底面的什么位置？",
          "answer": "解：正棱锥的顶点在底面的射影是底面正多边形的中心。"
        },
        {
          "difficulty": "medium",
          "question": "三视图中\"长对正、高平齐、宽相等\"分别指哪两个视图之间的关系？",
          "answer": "解：长对正=正视图与俯视图；高平齐=正视图与侧视图；宽相等=俯视图与侧视图。"
        },
        {
          "difficulty": "advanced",
          "question": "一个几何体的三视图都是正方形（边长相同），该几何体是什么？",
          "answer": "解：三个视图都是正方形，该几何体是正方体（棱长等于正方形边长）。"
        }
      ]
    }
  ]
}
