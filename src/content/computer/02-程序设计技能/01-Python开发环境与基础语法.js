/**
 * 内容页面数据（content-schema 的实例）
 * 页面：Python 开发环境与基础语法
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-01",
  unitNum: "02",
  subject: "computer",
  title: "Python 开发环境与基础语法",
  subtitle: "环境搭建、变量、数据类型与输入输出",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["Python 开发环境与基础语法"]
  N1["开发环境"]
  N0 --> N1
  N2["IDLE 交互模式"]
  N1 --> N2
  N3["脚本文件运行"]
  N1 --> N3
  N4["变量与常量"]
  N0 --> N4
  N5["变量命名规则"]
  N4 --> N5
  N6["数据类型"]
  N0 --> N6
  N7["整数 int"]
  N6 --> N7
  N8["浮点数 float"]
  N6 --> N8
  N9["字符串 str"]
  N6 --> N9
  N10["布尔 bool"]
  N6 --> N10
  N11["输入输出"]
  N0 --> N11
  N12["print 输出"]
  N11 --> N12
  N13["input 输入"]
  N11 --> N13
  N14["类型转换"]
  N11 --> N14
  N15["注释与规范"]
  N0 --> N15
  N16["单行注释"]
  N15 --> N16
  N17["多行注释"]
  N15 --> N17
  N18["代码书写规范"]
  N15 --> N18`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "了解 Python 开发环境（IDLE），掌握交互模式与脚本文件的运行方法",
        "掌握变量命名规则与常用数据类型（int、float、str、bool）",
        "掌握 print 输出与 input 输入的基本用法，学会类型转换",
        "养成添加注释、规范书写代码的良好习惯"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "Python 开发环境",
      paragraphs: [
        "**IDLE 交互模式：**启动 IDLE 后直接输入语句，按回车立即执行，适合测试单条语句。例如输入 `print(\"hello\")` 回车即可输出结果。",
        "**脚本文件运行：**在 IDLE 中通过\"文件→新建文件\"编写多行程序，保存为 `.py` 文件后按 F5 运行。考试中必须将程序保存为 `.py` 文件。",
        "**考试要求：**程序输入、输出时请添加合适的提示或说明文字；注释是程序代码的重要部分，请在代码中添加详细注释说明。"
      ]
    },
    {
      type: "warning",
      text: "考试评分要点：① 源文件必须保存为 .py 格式，保存到题目指定文件夹；② 代码要有详细注释；③ 输入输出要有提示文字；④ 缩进必须一致（Python 用缩进表示代码块）。"
    },
    {
      type: "knowledge",
      title: "变量与命名规则",
      paragraphs: [
        "**变量：**变量是存储数据的容器，通过赋值创建，如 `age = 18`。变量名区分大小写，`Age` 和 `age` 是两个不同的变量。",
        "**命名规则：**变量名由字母、数字、下划线组成，不能以数字开头，不能使用 Python 关键字（如 if、for、while、print 等）。",
        "**命名规范：**使用有意义的英文单词或拼音，如 `score`、`total`、`name`，多个单词用下划线连接，如 `student_name`。",
        "**常量：**程序中固定不变的值，如 `PI = 3.14159`，约定俗成用全大写字母表示。"
      ]
    },
    {
      type: "table",
      title: "Python 常用数据类型",
      headers: ["数据类型", "关键字", "示例", "说明"],
      rows: [
        ["整数", "int", "18、-5、0", "不带小数点的数字"],
        ["浮点数", "float", "3.14、2.0", "带小数点的数字"],
        ["字符串", "str", "\"hello\"、'你好'", "用引号括起来的文本"],
        ["布尔值", "bool", "True、False", "只有两个值，用于判断"]
      ]
    },
    {
      type: "tip",
      text: "记忆技巧：int 取整数、float 是浮点（小数）、str 是字符串（str 是 string 的缩写）、bool 是布尔（True/False）。"
    },
    {
      type: "knowledge",
      title: "输入与输出",
      paragraphs: [
        "**print 输出：**`print(内容)` 用于输出，多个内容用逗号分隔，如 `print(\"总分\", 95)` 输出 `总分 95`。",
        "**input 输入：**`input(\"提示文字\")` 用于接收键盘输入，**input 返回的一定是字符串**。",
        "**类型转换：**`int(字符串)` 转整数、`float(字符串)` 转小数、`str(数字)` 转字符串。",
        "**典型写法：**`num = int(input(\"请输入一个整数：\"))` 先输入字符串，再转换为整数。"
      ]
    },
    {
      type: "warning",
      text: "高频易错：input 返回的是字符串！如果直接参与运算会报错或出错。例如 `a = input(\"请输入：\")` 后 `a + 1` 会报错，必须先 `a = int(a)` 转换。"
    },
    {
      type: "knowledge",
      title: "注释与代码规范",
      paragraphs: [
        "**单行注释：**以 `#` 开头，注释本行后面的内容，如 `# 计算两个数的和`。",
        "**多行注释：**用三引号 `\"\"\"...\"\"\"` 或 `'''...'''` 括起来。",
        "**缩进规范：**Python 用缩进表示代码块，同一代码块的缩进必须一致，一般用 4 个空格。",
        "**书写规范：**运算符两侧加空格，如 `a + b` 而不是 `a+b`；一行不超过 79 个字符。"
      ]
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：环境与运行",
          difficulty: "basic",
          question: "在 IDLE 中新建脚本文件，编写程序输出\"你好，Python\"，并说明保存与运行步骤。",
          solution: "**解：**\n① 打开 IDLE，点击\"文件→新建文件\"；\n② 输入代码：\n`print(\"你好，Python\")`\n③ 点击\"文件→保存\"，文件名取 `01.py`，保存到指定文件夹；\n④ 按 F5 运行，输出结果：你好，Python。",
          answer: "新建文件 → 输入 print 语句 → 保存为 .py → 按 F5 运行。"
        },
        {
          title: "例题2：输入输出与类型转换",
          difficulty: "medium",
          question: "编写程序：输入两个整数，计算并输出它们的和。要求输入输出有提示文字，代码有注释。",
          solution: "**解：**\n```\n# 计算两个数的和\n# 输入第一个整数\nnum1 = int(input(\"请输入第一个整数：\"))\n# 输入第二个整数\nnum2 = int(input(\"请输入第二个整数：\"))\n# 计算和\nsum = num1 + num2\n# 输出结果\nprint(\"两个数的和是：\", sum)\n```\n运行示例：\n请输入第一个整数：12\n请输入第二个整数：30\n两个数的和是： 42",
          answer: "用 int(input()) 输入两个整数，相加后 print 输出。"
        }
      ]
    },
    // ---------- 快速检测 ----------
    {
      type: "quiz",
      title: "快速检测",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "Python 中变量名可以以数字开头。",
          answer: "**错误。**变量名不能以数字开头，如 `1abc` 是非法的。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "input() 函数返回的数据类型是（　）",
          options: ["A. int", "B. float", "C. str", "D. bool"],
          correctIndex: 2,
          answer: "答案：C。input() 返回的一定是字符串，需要时用 int() 或 float() 转换。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列变量名中，合法的是（　）",
          options: ["A. 2name", "B. my-name", "C. student_name", "D. if"],
          correctIndex: 2,
          answer: "答案：C。student_name 由字母和下划线组成且不以数字开头；`if` 是关键字，`2name` 以数字开头，`my-name` 含非法字符 `-`。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "Python 中 `age = 18` 和 `Age = 18` 表示同一个变量。",
          answer: "**错误。**Python 变量名区分大小写，`age` 和 `Age` 是两个不同的变量。"
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
          type: "single",
          question: "下列哪个是 Python 的注释符号（　）",
          options: ["A. //", "B. #", "C. /*", "D. --"],
          correctIndex: 1,
          answer: "答案：B。Python 单行注释用 `#`。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行 `print(\"3\" + \"4\")` 的输出结果是（　）",
          options: ["A. 7", "B. 34", "C. 3 4", "D. 报错"],
          correctIndex: 1,
          answer: "答案：B。两个字符串用 `+` 连接，结果是字符串 `34`。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列代码中，能正确输入一个浮点数并输出的程序是（　）",
          options: ["A. `n = input(\"输入：\")` `print(n + 1)`", "B. `n = float(input(\"输入：\"))` `print(n)`", "C. `n = int(input(\"输入：\"))` `print(n)`", "D. `n = input(\"输入：\")` `print(n)`"],
          correctIndex: 1,
          answer: "答案：B。用 float() 将输入转换为浮点数；A 中字符串不能与数字相加。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "Python 中同一代码块的缩进必须一致，否则程序会报错。",
          answer: "**正确。**Python 用缩进表示代码块，缩进不一致会引发 IndentationError。"
        }
      ]
    }
  ]
}
