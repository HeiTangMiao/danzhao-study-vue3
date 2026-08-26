/**
 * 内容页面数据（content-schema 的实例）
 * 页面：选择结构程序设计
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-03",
  unitNum: "02",
  subject: "computer",
  title: "选择结构程序设计",
  subtitle: "if 语句、多分支与嵌套判断",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["选择结构程序设计"]
  N1["单分支 if"]
  N0 --> N1
  N2["条件成立才执行"]
  N1 --> N2
  N3["双分支 if-else"]
  N0 --> N3
  N4["二选一执行"]
  N3 --> N4
  N5["多分支 if-elif-else"]
  N0 --> N5
  N6["多条件依次判断"]
  N5 --> N6
  N7["嵌套 if"]
  N0 --> N7
  N8["条件里套条件"]
  N7 --> N8
  N9["比较运算符"]
  N0 --> N9
  N10["> < >= <="]
  N9 --> N10
  N11["== !="]
  N9 --> N11
  N12["逻辑运算符"]
  N0 --> N12
  N13["and 与"]
  N12 --> N13
  N14["or 或"]
  N12 --> N14
  N15["not 非"]
  N12 --> N15
  N16["典型程序"]
  N0 --> N16
  N17["判断奇偶"]
  N16 --> N17
  N18["成绩等级"]
  N16 --> N18
  N19["最大值"]
  N16 --> N19`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "理解选择结构的执行流程：根据条件决定执行哪段代码",
        "掌握 if、if-else、if-elif-else 三种基本形式",
        "掌握比较运算符与逻辑运算符（and、or、not）的用法",
        "能编写判断奇偶、成绩等级、求最值等典型程序"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "单分支与双分支",
      paragraphs: [
        "**单分支 if：**`if 条件:` 下面缩进的代码在条件成立时执行，不成立则跳过。",
        "**双分支 if-else：**`if 条件:` 成立执行 if 块，否则执行 else 块，两者必选其一。",
        "**注意冒号：**if 和 else 后面都要加英文冒号 `:`，缩进表示代码块。",
        "**示例：**\n```\nif score >= 60:\n    print(\"及格\")\nelse:\n    print(\"不及格\")\n```"
      ]
    },
    {
      type: "knowledge",
      title: "多分支 if-elif-else",
      paragraphs: [
        "**多分支：**`if 条件1:` ... `elif 条件2:` ... `elif 条件3:` ... `else:` ...，从上到下依次判断，命中一个就结束。",
        "**执行特点：**只要有一个条件成立，后面的 elif 和 else 都不再判断。",
        "**else 可省略：**如果所有条件都不满足且没有 else，则什么都不执行。",
        "**示例：**\n```\nif score >= 90:\n    print(\"A\")\nelif score >= 80:\n    print(\"B\")\nelif score >= 60:\n    print(\"C\")\nelse:\n    print(\"D\")\n```"
      ]
    },
    {
      type: "warning",
      text: "多分支判断顺序很重要！条件必须按从大到小（或从小到大）排列，否则会出错。例如成绩等级必须先从 90 分判断，不能先判断 60 分，否则 95 分会先命中\"60 分以下\"错误分支。"
    },
    {
      type: "table",
      title: "比较运算符与逻辑运算符",
      headers: ["运算符", "含义", "示例", "结果"],
      rows: [
        [">", "大于", "5 > 3", "True"],
        ["<", "小于", "5 < 3", "False"],
        [">=", "大于等于", "5 >= 5", "True"],
        ["<=", "小于等于", "5 <= 3", "False"],
        ["==", "等于", "5 == 5", "True"],
        ["!=", "不等于", "5 != 3", "True"],
        ["and", "与（都真才真）", "True and False", "False"],
        ["or", "或（一真即真）", "True or False", "True"],
        ["not", "非（取反）", "not True", "False"]
      ]
    },
    {
      type: "tip",
      text: "易混点：`=` 是赋值，`==` 是判断相等！写 `if a = 5` 会报错，必须写 `if a == 5`。"
    },
    {
      type: "knowledge",
      title: "嵌套 if",
      paragraphs: [
        "**嵌套：**if 的代码块里再写 if，用于多重条件判断。",
        "**示例：**\n```\nif score >= 0:\n    if score >= 60:\n        print(\"及格\")\n    else:\n        print(\"不及格\")\nelse:\n    print(\"成绩不能为负数\")\n```",
        "**注意：**嵌套层次越多代码越复杂，能用 elif 解决的尽量不用嵌套。"
      ]
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：判断奇偶数（考试样题二）",
          difficulty: "basic",
          question: "请输入一个整数，判断它是奇数还是偶数并输出结果。要求：输入输出有提示文字，代码有注释。",
          solution: "**解：**\n```\n# 试题二：判断奇偶数\n# 输入一个整数\nnum = int(input(\"请输入一个整数：\"))\n# 判断奇偶：能被 2 整除是偶数\nif num % 2 == 0:\n    print(num, \"是偶数\")\nelse:\n    print(num, \"是奇数\")\n```\n运行示例：\n请输入一个整数：7\n7 是奇数",
          answer: "用 `num % 2 == 0` 判断：余数为 0 是偶数，否则是奇数。"
        },
        {
          title: "例题2：成绩等级判断器（考试样题五）",
          difficulty: "medium",
          question: "请输入一个学生的成绩（0~100 之间），判断其等级并输出：90 分及以上为\"A\"，80~89 为\"B\"，60~79 为\"C\"，60 分以下为\"D\"。",
          solution: "**解：**\n```\n# 试题五：成绩等级判断器\nscore = int(input(\"请输入成绩（0~100）：\"))\n# 多分支判断等级\nif score >= 90:\n    print(\"等级：A\")\nelif score >= 80:\n    print(\"等级：B\")\nelif score >= 60:\n    print(\"等级：C\")\nelse:\n    print(\"等级：D\")\n```\n运行示例：\n请输入成绩（0~100）：85\n等级：B",
          answer: "用 if-elif-else 从高到低依次判断：≥90 为 A，≥80 为 B，≥60 为 C，否则 D。"
        },
        {
          title: "例题3：求三个数的最大值",
          difficulty: "advanced",
          question: "输入三个整数，输出其中的最大值。",
          solution: "**解：**\n```\n# 求三个数的最大值\n# 输入三个整数\na = int(input(\"请输入第一个数：\"))\nb = int(input(\"请输入第二个数：\"))\nc = int(input(\"请输入第三个数：\"))\n# 先假设 a 最大\nmax_num = a\n# 依次比较\nif b > max_num:\n    max_num = b\nif c > max_num:\n    max_num = c\n# 输出最大值\nprint(\"最大值为：\", max_num)\n```\n运行示例：\n请输入第一个数：5\n请输入第二个数：9\n请输入第三个数：3\n最大值为： 9",
          answer: "先假设 a 最大，再与 b、c 依次比较，较大的赋给 max_num。"
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
          type: "single",
          question: "判断两个数是否相等，应使用的运算符是（　）",
          options: ["A. =", "B. ==", "C. !=", "D. <="],
          correctIndex: 1,
          answer: "答案：B。`==` 判断相等，`=` 是赋值。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "表达式 `5 > 3 and 2 > 4` 的结果是（　）",
          options: ["A. True", "B. False", "C. 报错", "D. 5"],
          correctIndex: 1,
          answer: "答案：B。and 要求两边都真才为真，`2 > 4` 为假，所以整体为 False。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nx = 85\nif x >= 90:\n    print(\"A\")\nelif x >= 80:\n    print(\"B\")\nelif x >= 60:\n    print(\"C\")\nelse:\n    print(\"D\")\n```",
          options: ["A. A", "B. B", "C. C", "D. D"],
          correctIndex: 1,
          answer: "答案：B。85 不满足 ≥90，满足 ≥80，输出 B。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "if 语句的条件后面必须加英文冒号。",
          answer: "**正确。**`if 条件:` 后面必须有冒号，否则报语法错误。"
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
          question: "下列代码中，能正确判断\"x 是正数\"的是（　）",
          options: ["A. `if x > 0:`", "B. `if x >= 0:`", "C. `if x = 0:`", "D. `if x != 0:`"],
          correctIndex: 0,
          answer: "答案：A。正数即大于 0，用 `x > 0`。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\na = 10\nb = 20\nif a > b:\n    print(\"a大\")\nelse:\n    print(\"b大\")\n```",
          options: ["A. a大", "B. b大", "C. 一样大", "D. 报错"],
          correctIndex: 1,
          answer: "答案：B。10 > 20 为假，执行 else 输出\"b大\"。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "判断一个年份是否为闰年：能被 4 整除且不能被 100 整除，或能被 400 整除。正确的条件是（　）",
          options: ["A. `year % 4 == 0`", "B. `(year % 4 == 0 and year % 100 != 0) or year % 400 == 0`", "C. `year % 4 == 0 or year % 400 == 0`", "D. `year % 100 == 0`"],
          correctIndex: 1,
          answer: "答案：B。闰年条件：(能被4整除且不能被100整除) 或 能被400整除，用 and 和 or 组合。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nscore = 95\nif score >= 60:\n    print(\"及格\")\n    if score >= 90:\n        print(\"优秀\")\nelse:\n    print(\"不及格\")\n```",
          options: ["A. 及格", "B. 及格\\n优秀", "C. 优秀", "D. 不及格"],
          correctIndex: 1,
          answer: "答案：B。95 ≥ 60 输出\"及格\"，嵌套判断 95 ≥ 90 再输出\"优秀\"。"
        }
      ]
    }
  ]
}
