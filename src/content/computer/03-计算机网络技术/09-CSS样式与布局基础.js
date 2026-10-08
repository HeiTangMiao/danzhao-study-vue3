/**
 * 内容页面数据（content-schema 的实例）
 * 页面：CSS 样式与布局基础
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"计算机网络及网页设计 —— 网页设计"模块编制
 * 说明：覆盖考纲"CSS 样式表概念及应用""盒子模型及 DIV+CSS 布局方法""响应式网页设计"三部分
 */
export default {
  blocks: [
    {
      type: "layout",
      as: "hero",
      props: { align: "start", tone: "accent" },
      children: [
        // ---------- 知识结构导图 ----------
        {
          type: "mindmap",
          title: "知识结构导图",
          mermaid: `graph LR
      N0["CSS 样式与布局基础"]
      N1["CSS 概念与作用"]
      N0 --> N1
      N2["三种引入方式"]
      N1 --> N2
      N3["行内 / 内部 / 外部"]
      N2 --> N3
      N4["基础选择器"]
      N0 --> N4
      N5["标签 / 类 / ID"]
      N4 --> N5
      N6["常用样式属性"]
      N0 --> N6
      N7["盒子模型"]
      N0 --> N7
      N8["content / padding / border / margin"]
      N7 --> N8
      N9["DIV+CSS 布局与响应式"]
      N0 --> N9`
        },
        // ---------- 学习目标 ----------
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能说出 CSS 的作用，区分行内、内部、外部三种引入方式",
            "能写出标签选择器、类选择器、ID 选择器的正确写法",
            "能说出盒子模型由内到外的四层结构，会计算元素实际宽度",
            "理解 DIV+CSS 布局与响应式网页设计的基本概念"
          ]
        }
      ]
    },
    // ---------- 知识点：CSS 概念 ----------
    {
      type: "knowledge",
      title: "CSS 概念与作用",
      paragraphs: [
        "**CSS（Cascading Style Sheets）：**层叠样式表，用于控制网页的**外观表现**——颜色、字体、字号、对齐、边框、布局等都靠 CSS 设置。",
        "**分工记忆：**HTML 管**结构**（页面有什么），CSS 管**表现**（长什么样）——两者分离后，改样式只动 CSS，不用改每个页面的标签，便于统一维护。",
        "**基本语法：**`选择器 { 属性: 值; }`，如 `p { color: red; }` 表示把所有段落的文字设为红色。"
      ]
    },
    // ---------- 知识点：三种引入 ----------
    {
      type: "table",
      title: "三种引入方式对比",
      headers: ["方式", "写法位置", "作用范围", "特点"],
      rows: [
        ["行内样式", "标签的 `style` 属性，如 `<p style=\"color: red\">`", "当前一个标签", "书写直接，但样式分散、不易维护"],
        ["内部样式表", "`<head>` 内的 `<style>` 标签中", "当前页面", "页面级统一风格，适合单页"],
        ["外部样式表", "单独 `.css` 文件，用 `<link>` 标签引入", "可被多个页面共用", "推荐做法：改一处、全站生效"]
      ]
    },
    {
      type: "code",
      title: "外部样式表的引入写法（写在 head 内）",
      lang: "html",
      code: `<head>
  <meta charset="UTF-8">
  <title>我的网站</title>
  <link rel="stylesheet" href="style.css">
</head>`
    },
    // ---------- 易错提醒（提前预警高频混淆） ----------
    {
      type: "warning",
      text: "外部样式表用 **`<link>`** 标签引入 `.css` 文件；**`<style>`** 标签则用于写**内部样式表**。一提到\"外部样式表\"，考的就是 `<link>`——这是选择题高频设错点。"
    },
    // ---------- 知识点：选择器 ----------
    {
      type: "knowledge",
      title: "基础选择器",
      paragraphs: [
        "**标签选择器：**直接写标签名，如 `p { }`，作用于页面中**所有**该标签。",
        "**类选择器：**以**点号 `.`** 开头，如 `.note { }`，配合标签的 `class=\"note\"` 使用——同一个类可以被多个标签共用。",
        "**ID 选择器：**以**井号 `#`** 开头，如 `#header { }`，配合 `id=\"header\"` 使用——同一个页面中 id 值应当**唯一**。",
        "**通配符选择器：**`* { }` 作用于所有元素（常用于清除默认边距）。"
      ]
    },
    {
      type: "code",
      title: "三种选择器写法示例",
      lang: "css",
      code: `/* 标签选择器：所有段落 */
p {
  color: #333333;
  font-size: 16px;
}

/* 类选择器：class="note" 的元素（可多处使用） */
.note {
  color: red;
}

/* ID 选择器：id="main" 的元素（页面内唯一） */
#main {
  width: 960px;
}`
    },
    // ---------- 知识点：常用属性 ----------
    {
      type: "knowledge",
      title: "常用样式属性",
      paragraphs: [
        "**文字类：**`color`（文字颜色）、`font-size`（字号）、`font-family`（字体）、`text-align`（水平对齐：left/center/right）。",
        "**背景与边框：**`background-color`（背景色）、`border`（边框，如 `border: 1px solid #cccccc`）。",
        "**记忆要点：**颜色对应 `color`、字号对应 `font-size`——不要用\"字号\"去设置颜色。"
      ]
    },
    {
      type: "code",
      title: "常用属性示例",
      lang: "css",
      code: `h1 {
  color: #0d9488;        /* 文字颜色 */
  font-size: 24px;       /* 字号 */
  text-align: center;    /* 水平居中 */
}

.box {
  background-color: #f5f5f5;   /* 背景色 */
  border: 1px solid #cccccc;   /* 1像素实线边框 */
}`
    },
    // ---------- 知识点：盒子模型 ----------
    {
      type: "knowledge",
      title: "盒子模型（由内到外四层）",
      paragraphs: [
        "**核心观念：**页面上每个元素都可以看作一个\"盒子\"，从内到外由四层组成——**内容（content）→ 内边距（padding）→ 边框（border）→ 外边距（margin）**。",
        "**padding（内边距）：**内容与边框之间的距离，在盒子**内部**。",
        "**margin（外边距）：**盒子与其他元素之间的距离，在盒子**外部**。",
        "**尺寸计算：**width / height 默认指**内容区**的大小；元素的**边框盒实际宽度 = width + padding×2 + border×2**。",
        "**举例：**width 为 200px、左右 padding 各 10px、左右 border 各 2px 时，实际宽度 = 200 + 10×2 + 2×2 = **224px**。"
      ]
    },
    {
      type: "code",
      title: "盒子模型示例",
      lang: "css",
      code: `.box {
  width: 200px;              /* 内容区宽度 */
  height: 100px;             /* 内容区高度 */
  padding: 10px;             /* 四边内边距各 10px */
  border: 2px solid #333333; /* 边框 2px */
  margin: 20px;              /* 四边外边距各 20px */
}`
    },
    // ---------- 知识点：DIV+CSS 布局 ----------
    {
      type: "knowledge",
      title: "DIV+CSS 网页布局",
      paragraphs: [
        "**`<div>` 的作用：**没有具体语义的**块级容器**，用来把页面划分成一块块区域——页头（header）、导航（nav）、主体（main）、页脚（footer）等。",
        "**浮动布局：**用 `float: left`（左浮动）让原本各占一行的块级元素**并排**排列，实现左右分栏。",
        "**清除浮动：**浮动会影响后面元素的排列，常用 `clear: both` 清除，避免版面错乱。",
        "**考纲提示：**本模块重点理解盒子模型与 DIV+CSS 的布局思路；更新的弹性布局（flex）作了解即可。"
      ]
    },
    {
      type: "code",
      title: "两栏布局示例（div + 浮动）",
      lang: "html",
      code: `<div class="left">左侧导航</div>
<div class="right">右侧内容</div>
<div class="clear"></div>

<style>
  .left  { float: left; width: 200px; }
  .right { float: left; width: 700px; }
  .clear { clear: both; }
</style>`
    },
    // ---------- 知识点：响应式 ----------
    {
      type: "knowledge",
      title: "响应式网页设计",
      paragraphs: [
        "**概念：**同一套页面代码，能在电脑、平板、手机等**不同尺寸的设备**上自动调整布局，都获得良好的浏览效果——即\"一套代码、多种屏幕\"。",
        "**两个关键方法：**① 在 `<head>` 中设置视口 `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">`，让页面宽度跟随设备；② 使用**媒体查询 `@media`**，按屏幕宽度条件性地套用不同 CSS。",
        "**媒体查询示例：**`@media (max-width: 600px) { ... }` 表示屏幕宽度不超过 600px 时生效（如手机端把两栏改为上下排布）。"
      ]
    },
    {
      type: "code",
      title: "媒体查询示例",
      lang: "css",
      code: `/* 默认：左右两栏 */
.left  { float: left; width: 200px; }
.right { float: left; width: 700px; }

/* 屏幕宽度 <= 600px 时：取消浮动，两栏变上下排列 */
@media (max-width: 600px) {
  .left, .right {
    float: none;
    width: 100%;
  }
}`
    },
    // ---------- 易错提醒 ----------
    {
      type: "warning",
      text: "三组高频混淆：① **类选择器用 `.`，ID 选择器用 `#`**——记反是最常见失分点；② **padding 是内边距**（盒内），**margin 是外边距**（盒外）；③ 计算元素实际宽度时只加 **padding 与 border**（各 ×2），**不要把 margin 算进去**。"
    },
    // ---------- 快速检测 ----------
    {
      type: "quiz",
      title: "快速检测",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "CSS 称为层叠样式表，用于控制网页的外观样式。",
          answer: "**正确。**CSS（Cascading Style Sheets）负责网页的表现层，与负责结构的 HTML 分离。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "外部样式表文件是通过 `<style>` 标签引入到 HTML 页面中的。",
          answer: "**错误。**外部样式表用 `<link rel=\"stylesheet\" href=\"...\">` 引入；`<style>` 标签用于编写**内部**样式表。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "类选择器的符号是（　）",
          options: ["A. `.`", "B. `#`", "C. `*`", "D. `@`"],
          correctIndex: 0,
          answer: "答案：A。类选择器以点号开头（如 `.note`）；`#` 是 ID 选择器，`*` 是通配符。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "设置元素内边距（内容与边框之间的距离）应使用（　）",
          options: ["A. margin", "B. padding", "C. border", "D. spacing"],
          correctIndex: 1,
          answer: "答案：B。padding 是内边距（盒内），margin 是外边距（盒外）。"
        }
      ]
    },
    // ---------- 练习题 ----------
    {
      type: "quiz",
      title: "练习题",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "ID 选择器用 `#` 号表示，在同一个页面中 id 值应当唯一。",
          answer: "**正确。**id 用于页面内唯一标识；class 则可以多处复用。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "盒子模型由外到内的顺序是：margin → border → padding → content。",
          answer: "**正确。**最外层是外边距 margin，其次是边框 border、内边距 padding，最内是内容 content。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "设置文字颜色的 CSS 属性是（　）",
          options: ["A. font-size", "B. color", "C. background", "D. text-align"],
          correctIndex: 1,
          answer: "答案：B。`color` 设置文字颜色；`font-size` 是字号，`background` 是背景，`text-align` 是对齐。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "让块级元素向左浮动、实现并排布局的 CSS 写法是（　）",
          options: ["A. `float: left;`", "B. `clear: left;`", "C. `display: left;`", "D. `left: float;`"],
          correctIndex: 0,
          answer: "答案：A。`float: left` 左浮动；`clear: left` 是清除浮动，不用于实现并排。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "某盒子 width 为 200px、左右内边距各 10px、左右边框各 2px，其边框盒的实际宽度是（　）",
          options: ["A. 200px", "B. 210px", "C. 224px", "D. 244px"],
          correctIndex: 2,
          answer: "答案：C。实际宽度 = width + padding×2 + border×2 = 200 + 20 + 4 = 224px。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "按屏幕宽度条件性地套用不同样式（响应式）使用的写法是（　）",
          options: ["A. `@media`", "B. `@import`", "C. `@charset`", "D. `@screen`"],
          correctIndex: 0,
          answer: "答案：A。`@media (max-width: 600px) { }` 即媒体查询，是响应式设计的关键方法。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "关于响应式网页设计，说法正确的是（　）",
          options: [
            "A. 需要为每种设备单独编写一套页面",
            "B. 一套代码可在不同尺寸设备上自适应显示",
            "C. 只能在手机浏览器中使用",
            "D. 与视口（viewport）设置无关"
          ],
          correctIndex: 1,
          answer: "答案：B。响应式即\"一套代码、多种屏幕\"，关键是 viewport 设置与媒体查询。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "一页速记",
      points: [
        "CSS = 层叠样式表，管**表现**；HTML 管结构——改样式只动 CSS",
        "三种引入：行内（style 属性）｜内部（head 内 `<style>`）｜外部（`<link>` 引入 .css）",
        "选择器符号：标签直接写｜类 **`.`**｜ID **`#`**｜通配符 `*`",
        "盒子模型（内→外）：**content → padding → border → margin**",
        "边框盒实际宽度 = **width + padding×2 + border×2**（不含 margin）",
        "DIV+CSS 布局：div 分区 + `float` 浮动并排 + `clear` 清除浮动",
        "响应式：viewport 设置 + `@media` 媒体查询，一套代码适配多设备"
      ],
      formulas: [],
      mustKnow: [
        "类选择器 `.`、ID 选择器 `#`——高频反考点",
        "padding 内边距（盒内）、margin 外边距（盒外）",
        "外部样式表用 `<link>` 引入，不是 `<style>`"
      ]
    }
  ]
}
