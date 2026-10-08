/**
 * 内容页面数据（content-schema 的实例）
 * 页面：网页设计基础（HTML）
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"计算机网络及网页设计 —— 网页设计"模块编制
 * 说明：网页设计属理论考"网络及网页"（约 30 分）模块的组成部分，全客观题考查，重在概念辨析与标签识记
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
      N0["网页设计基础（HTML）"]
      N1["基本概念"]
      N0 --> N1
      N2["网页 / 网站 / 主页"]
      N1 --> N2
      N3["静态页与动态页"]
      N1 --> N3
      N4["开发流程与工具"]
      N0 --> N4
      N5["HTML 文档结构"]
      N0 --> N5
      N6["DOCTYPE 与 head / body"]
      N5 --> N6
      N7["常用标签"]
      N0 --> N7
      N8["标题 / 段落 / 换行"]
      N7 --> N8
      N9["列表 / 链接 / 图片 / 表格"]
      N7 --> N9`
        },
        // ---------- 学习目标 ----------
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能说出网页、网站、主页的区别，并正确区分静态网页与动态网页",
            "能按顺序说出网站规划与设计的五个阶段，并列举常用前端开发工具",
            "能写出 HTML 文档的基本结构（DOCTYPE、html、head、body），标签完整无误",
            "能用常用标签定义标题、段落、列表、链接、图片等网页元素，代码可直接运行"
          ]
        }
      ]
    },
    // ---------- 知识点：基本概念 ----------
    {
      type: "knowledge",
      title: "网页与网站基本概念",
      paragraphs: [
        "**网页（Web Page）：**用 HTML 等语言编写、可通过浏览器查看的页面文档，是网站的**基本组成单位**，扩展名通常为 `.html`。",
        "**网站（Website）：**按一定规则组织在一起的多个网页的集合，通常有统一的主题和风格。主页（首页）是访问者打开网站时首先看到的页面，是网站的**入口**。",
        "**静态网页：**内容固定，服务器直接返回文件，不随用户操作变化；**动态网页：**内容由服务器程序处理后生成（如登录后显示用户名），更灵活。",
        "**浏览网页的过程：**浏览器发出请求 → Web 服务器返回页面文件 → 浏览器解析并显示。浏览器是客户端软件（如 Chrome、Edge），Web 服务器软件常见有 IIS、Apache。"
      ]
    },
    // ---------- 知识点：开发流程 ----------
    {
      type: "steps",
      title: "网站的规划与设计流程",
      items: [
        { title: "需求分析", content: "明确网站的目标、面向的用户和内容范围——先想清楚\"给谁看、做什么\"。" },
        { title: "结构规划", content: "划分栏目、设计页面层级与导航关系，画出网站结构图。" },
        { title: "页面设计", content: "确定版面布局、色彩搭配与整体风格，形成设计稿。" },
        { title: "制作实现", content: "准备图片文字素材，用 HTML 编写结构、CSS 设置样式，并测试链接与显示效果。" },
        { title: "发布维护", content: "申请域名与空间，上传发布，定期更新内容与检查故障。" }
      ]
    },
    // ---------- 知识点：开发工具 ----------
    {
      type: "knowledge",
      title: "前端开发工具与技术",
      paragraphs: [
        "**前端三件套分工：**HTML 负责**结构**（页面有什么内容）、CSS 负责**样式**（长什么样）、JavaScript 负责**行为**（能做什么交互）。",
        "**常见开发工具：**记事本（最原始）、VS Code、HBuilder 等专业编辑器——提供语法高亮与提示，提高开发效率。",
        "**调试助手：**浏览器自带开发者工具（按 F12 打开），可查看页面结构、样式与报错信息。"
      ]
    },
    // ---------- 知识点：HTML 结构 ----------
    {
      type: "knowledge",
      title: "HTML 文档基本结构",
      paragraphs: [
        "**HTML（HyperText Markup Language）：**超文本标记语言，通过\"标签\"描述网页的结构——注意是**标记**语言，不是\"传输\"（传输是 HTTP 协议的任务）。",
        "**基本结构由四部分组成：**`<!DOCTYPE html>` 文档类型声明 → `<html>` 根元素 → `<head>` 页面元信息（字符编码、标题等，不直接显示）→ `<body>` 可见内容。",
        "**字符编码：**`<meta charset=\"UTF-8\">` 告诉浏览器用 UTF-8 解析，缺少它中文可能显示为乱码。",
        "**标签语法：**成对标签写成 `<p>内容</p>`；单标签不写闭合，如 `<br>`、`<hr>`、`<img>`；属性写在开始标签内，格式为 `属性名=\"值\"`。"
      ]
    },
    {
      type: "code",
      title: "HTML 文档骨架示例",
      lang: "html",
      code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>我的第一个网页</title>
</head>
<body>
  <h1>你好，网页！</h1>
  <p>这是一个段落。</p>
</body>
</html>`
    },
    // ---------- 知识点：常用标签 ----------
    {
      type: "table",
      title: "常用标签速查表",
      headers: ["标签", "作用", "写法示例"],
      rows: [
        ["`<h1>` ~ `<h6>`", "标题，h1 最大、h6 最小", "`<h1>一级标题</h1>`"],
        ["`<p>`", "段落", "`<p>一段文字</p>`"],
        ["`<br>` / `<hr>`", "换行 / 水平线（单标签）", "`<br>`"],
        ["`<a>`", "超链接，href 属性指定目标地址", "`<a href=\"https://www.example.com\">文字</a>`"],
        ["`<img>`", "图片，src 指定图片地址（单标签）", "`<img src=\"logo.jpg\" alt=\"标志\">`"],
        ["`<ul>` / `<ol>` / `<li>`", "无序列表 / 有序列表 / 列表项", "`<ul><li>项目</li></ul>`"],
        ["`<table>` / `<tr>` / `<td>`", "表格 / 表格行 / 单元格", "`<table><tr><td>值</td></tr></table>`"],
        ["`<div>`", "块级容器，用于页面分区与布局", "`<div>...</div>`"]
      ]
    },
    {
      type: "code",
      title: "一个完整的简单网页",
      lang: "html",
      code: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>计算机学习资源</title>
</head>
<body>
  <h1>计算机学习资源</h1>
  <p>欢迎访问我的学习网站。</p>
  <ul>
    <li><a href="https://www.example.com">网络技术专栏</a></li>
    <li><a href="https://www.example.com">程序设计专栏</a></li>
  </ul>
  <img src="logo.jpg" alt="网站标志">
</body>
</html>`
    },
    // ---------- 易错提醒 ----------
    {
      type: "warning",
      text: "三个高频易错点：① **成对标签必须闭合**——`<p>` 开头就要记得 `</p>` 收尾；② **`<title>` 写在 `<head>` 里**，显示在浏览器标签页上，不是页面正文；③ **`<br>`、`<hr>`、`<img>` 是单标签**，不要写成 `</br>` 这种闭合形式。"
    },
    // ---------- 快速检测 ----------
    {
      type: "quiz",
      title: "快速检测",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "一个网站通常由多个网页组成，其中访问者打开网站时首先看到的页面称为主页（首页）。",
          answer: "**正确。**网站是多个网页的集合，主页是网站的入口页面，通常命名为 index.html。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "HTML 的中文全称是\"超文本传输语言\"。",
          answer: "**错误。**HTML 是\"超文本**标记**语言\"（Markup）；\"超文本**传输**协议\"是 HTTP，两者不要混淆。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "网页标题（显示在浏览器标签页上）应写在（　）",
          options: ["A. `<title>` 标签", "B. `<body>` 标签", "C. `<h1>` 标签", "D. `<meta>` 标签"],
          correctIndex: 0,
          answer: "答案：A。`<title>` 写在 `<head>` 内，显示在浏览器标签页；`<h1>` 是页面正文里的一级标题。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "为防止中文显示乱码，网页应设置字符编码，正确的写法是（　）",
          options: ["A. `<meta charset=\"UTF-8\">`", "B. `<title>UTF-8</title>`", "C. `<charset>UTF-8</charset>`", "D. `<html UTF-8>`"],
          correctIndex: 0,
          answer: "答案：A。用 `<meta charset=\"UTF-8\">` 声明字符编码，写在 `<head>` 内。"
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
          question: "换行标签 `<br>` 必须写成 `<br>` 与 `</br>` 成对的形式。",
          answer: "**错误。**`<br>` 是单标签，只写 `<br>` 即可，没有 `</br>` 这种写法。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "网站规划与设计流程的第一步是需求分析。",
          answer: "**正确。**先做需求分析（明确目标、用户与内容），再进行结构规划、页面设计、制作实现与发布维护。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "在网页中插入图片，正确的标签写法是（　）",
          options: ["A. `<img src=\"pic.jpg\">`", "B. `<image src=\"pic.jpg\">`", "C. `<picture src=\"pic.jpg\">`", "D. `<img href=\"pic.jpg\">`"],
          correctIndex: 0,
          answer: "答案：A。图片用单标签 `<img>`，地址写在 `src` 属性中；`href` 是超链接 `<a>` 的属性。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "定义无序列表（项目符号列表）应使用的标签是（　）",
          options: ["A. `<ul>`", "B. `<ol>`", "C. `<li>`", "D. `<dl>`"],
          correctIndex: 0,
          answer: "答案：A。`<ul>` 是无序列表，`<ol>` 是有序列表，`<li>` 是其中的列表项。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "关于标题标签 `<h1>`~`<h6>`，说法正确的是（　）",
          options: ["A. `<h6>` 的字号最大", "B. 数字越大字号越大", "C. `<h1>` 的字号最大", "D. 每页只能使用一个标题标签"],
          correctIndex: 2,
          answer: "答案：C。`<h1>` 是一级标题、字号最大，依次到 `<h6>` 最小。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "超链接 `<a>` 标签中，用于指定链接目标地址的属性是（　）",
          options: ["A. src", "B. href", "C. link", "D. url"],
          correctIndex: 1,
          answer: "答案：B。链接地址写在 `href` 属性中，如 `<a href=\"https://www.example.com\">`。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "关于静态网页与动态网页，说法正确的是（　）",
          options: [
            "A. 静态网页的内容会随用户操作自动变化",
            "B. 动态网页由服务器程序处理后再返回给浏览器",
            "C. 静态网页必须连接数据库才能运行",
            "D. 动态网页的扩展名一定是 .html"
          ],
          correctIndex: 1,
          answer: "答案：B。动态网页需要服务器程序处理（如登录后显示用户名），静态网页内容固定、不依赖数据库。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "一页速记",
      points: [
        "网页是网站的**基本单位**；主页是网站的**入口页**；静态内容固定、动态由服务器程序生成",
        "开发流程：**需求分析 → 结构规划 → 页面设计 → 制作实现 → 发布维护**",
        "前端分工：HTML 管**结构**｜CSS 管**样式**｜JavaScript 管**行为**",
        "HTML 基本结构：`<!DOCTYPE html>` + `<html>` + `<head>`（编码与标题）+ `<body>`（可见内容）",
        "成对标签要闭合（`<p></p>`）；单标签不闭合（`<br>`、`<hr>`、`<img>`）",
        "常用标签：`<h1>`~`<h6>` 标题｜`<p>` 段落｜`<a href>` 链接｜`<img src>` 图片｜`<ul>/<ol>/<li>` 列表｜`<table>` 表格"
      ],
      formulas: [],
      mustKnow: [
        "HTML 是超文本\"标记\"语言，不是\"传输\"（HTTP 才是传输协议）",
        "`<title>` 在 `<head>` 内，显示在浏览器标签页上",
        "`<img>`、`<br>`、`<hr>` 是单标签，写成对形式是常见错误"
      ]
    }
  ]
}
