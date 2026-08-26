/**
 * 内容页面数据（content-schema 的实例）
 * 页面：常用算法基础
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-05",
  unitNum: "02",
  subject: "computer",
  title: "常用算法基础",
  subtitle: "累加累乘、求最值、穷举、素数、数字分离",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["常用算法基础"]
  N1["累加算法"]
  N0 --> N1
  N2["累加器 sum"]
  N1 --> N2
  N3["累乘算法"]
  N0 --> N3
  N4["累乘器 product"]
  N3 --> N4
  N5["求最值"]
  N0 --> N5
  N6["假设法"]
  N5 --> N6
  N7["穷举法"]
  N0 --> N7
  N8["枚举所有可能"]
  N7 --> N8
  N9["求素数"]
  N0 --> N9
  N10["2 到 n-1 试除"]
  N9 --> N10
  N11["数字分离"]
  N0 --> N11
  N12["取余 % 得个位"]
  N11 --> N12
  N13["整除 // 去位"]
  N11 --> N13
  N14["典型应用"]
  N0 --> N14
  N15["水仙花数"]
  N14 --> N15
  N16["阶乘"]
  N14 --> N16
  N17["斐波那契"]
  N14 --> N17`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "掌握累加、累乘算法的基本模式",
        "掌握求最值（最大、最小）的假设法",
        "理解穷举法的思想并能编写简单穷举程序",
        "掌握判断素数、数字分离等典型算法"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "累加与累乘",
      paragraphs: [
        "**累加：**初始化 `sum = 0`，循环内 `sum += i`，用于求和。",
        "**累乘：**初始化 `product = 1`，循环内 `product *= i`，用于求阶乘、连乘。",
        "**注意：**累乘器必须初始化为 1，初始化为 0 结果永远是 0。",
        "**示例（阶乘）：**\n```\n# 求 n 的阶乘\nn = int(input(\"请输入 n：\"))\nproduct = 1\nfor i in range(1, n + 1):\n    product *= i\nprint(n, \"的阶乘是：\", product)\n```"
      ]
    },
    {
      type: "warning",
      text: "累乘器初始值必须是 1！写成 `product = 0` 会导致所有结果都是 0，这是考试常见错误。累加器初始值才是 0。"
    },
    {
      type: "knowledge",
      title: "求最值（假设法）",
      paragraphs: [
        "**求最大值：**先假设第一个数为最大值，再依次与后面的数比较，遇到更大的就更新。",
        "**求最小值：**同理，先假设第一个数为最小值，遇到更小的就更新。",
        "**示例：**\n```\n# 求 5 个数中的最大值\nmax_num = int(input(\"请输入第 1 个数：\"))\nfor i in range(2, 6):\n    x = int(input(\"请输入第\" + str(i) + \"个数：\"))\n    if x > max_num:\n        max_num = x\nprint(\"最大值为：\", max_num)\n```"
      ]
    },
    {
      type: "knowledge",
      title: "穷举法与素数",
      paragraphs: [
        "**穷举法：**把问题的所有可能情况一一列举，逐个检验，找出满足条件的解。",
        "**判断素数：**素数（质数）是大于 1 且只能被 1 和自身整除的数。用 2 到 n-1 依次试除，只要有一个能整除就不是素数。",
        "**示例（判断素数）：**\n```\nn = int(input(\"请输入一个正整数：\"))\nis_prime = True\nfor i in range(2, n):\n    if n % i == 0:\n        is_prime = False\n        break\nif is_prime and n > 1:\n    print(n, \"是素数\")\nelse:\n    print(n, \"不是素数\")\n```"
      ]
    },
    {
      type: "knowledge",
      title: "数字分离",
      paragraphs: [
        "**核心思想：**`% 10` 取个位，`// 10` 去掉个位。反复操作即可分离各位数字。",
        "**三位数分离：**\n```\nnum = int(input(\"请输入一个三位数：\"))\nge = num % 10          # 个位\nshi = num // 10 % 10   # 十位\nbai = num // 100       # 百位\nprint(\"个位：\", ge)\nprint(\"十位：\", shi)\nprint(\"百位：\", bai)\n```",
        "**通用分离：**用 while 循环反复取余、整除，直到数字变为 0。"
      ]
    },
    {
      type: "tip",
      text: "数字分离口诀：\"取余得个位，整除去个位\"。123 % 10 = 3（个位），123 // 10 = 12（去掉个位）。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：数字分离（考试样题四）",
          difficulty: "basic",
          question: "请输入一个三位正整数，分离出其个位、十位、百位数字，并分别输出。要求：代码有注释，保存到\"考生文件夹\\程序设计\\试题四\"。",
          solution: "**解：**\n```\n# 试题四：数字分离\nnum = int(input(\"请输入一个三位正整数：\"))\n# 分离各位数字\nge = num % 10          # 个位\nshi = num // 10 % 10   # 十位\nbai = num // 100       # 百位\n# 分别输出\nprint(\"百位：\", bai)\nprint(\"十位：\", shi)\nprint(\"个位：\", ge)\n```\n运行示例：\n请输入一个三位正整数：456\n百位： 4\n十位： 5\n个位： 6",
          answer: "个位 `num % 10`，十位 `num // 10 % 10`，百位 `num // 100`。"
        },
        {
          title: "例题2：判断水仙花数",
          difficulty: "medium",
          question: "水仙花数是指一个三位数，其各位数字的立方和等于该数本身，如 153 = 1³+5³+3³。编写程序判断输入的三位数是否为水仙花数。",
          solution: "**解：**\n```\nnum = int(input(\"请输入一个三位数：\"))\nge = num % 10\nshi = num // 10 % 10\nbai = num // 100\n# 判断立方和是否等于本身\nif bai ** 3 + shi ** 3 + ge ** 3 == num:\n    print(num, \"是水仙花数\")\nelse:\n    print(num, \"不是水仙花数\")\n```\n运行示例：\n请输入一个三位数：153\n153 是水仙花数",
          answer: "分离百十个位，判断 `bai**3 + shi**3 + ge**3 == num`。"
        },
        {
          title: "例题3：求 1~n 中所有素数",
          difficulty: "advanced",
          question: "输入一个正整数 n，输出 2 到 n 之间的所有素数。",
          solution: "**解：**\n```\nn = int(input(\"请输入 n：\"))\n# 穷举 2 到 n 的每个数\nfor num in range(2, n + 1):\n    is_prime = True\n    # 判断 num 是否为素数\n    for i in range(2, num):\n        if num % i == 0:\n            is_prime = False\n            break\n    if is_prime:\n        print(num, end=\" \")\n```\n运行示例：\n请输入 n：20\n2 3 5 7 11 13 17 19",
          answer: "外层穷举每个数，内层用 2 到 num-1 试除判断是否为素数。"
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
          question: "累乘器（求阶乘）的初始值应为（　）",
          options: ["A. 0", "B. 1", "C. 2", "D. 任意值"],
          correctIndex: 1,
          answer: "答案：B。累乘器初始化为 1，初始化为 0 结果永远是 0。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "数字 123 的个位数字是（　）",
          options: ["A. 1", "B. 2", "C. 3", "D. 0"],
          correctIndex: 2,
          answer: "答案：C。`123 % 10 = 3`，取余得到个位。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "数字 456 的十位数字是（　）",
          options: ["A. 4", "B. 5", "C. 6", "D. 45"],
          correctIndex: 1,
          answer: "答案：B。`456 // 10 % 10 = 45 % 10 = 5`。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "素数是指只能被 1 和它本身整除的大于 1 的自然数。",
          answer: "**正确。**素数的定义：大于 1，且只能被 1 和自身整除。"
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
          question: "执行以下代码，输出结果是（　）\n```\nproduct = 1\nfor i in range(1, 5):\n    product *= i\nprint(product)\n```",
          options: ["A. 10", "B. 24", "C. 120", "D. 12"],
          correctIndex: 1,
          answer: "答案：B。1×2×3×4 = 24，即 4 的阶乘。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "判断 n 是否为素数，正确的循环范围是（　）",
          options: ["A. `range(2, n)`", "B. `range(1, n)`", "C. `range(2, n + 1)`", "D. `range(0, n)`"],
          correctIndex: 0,
          answer: "答案：A。用 2 到 n-1 试除即可，`range(2, n)` 左闭右开正好是 2 到 n-1。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nnum = 789\nge = num % 10\nshi = num // 10 % 10\nbai = num // 100\nprint(bai + shi + ge)\n```",
          options: ["A. 789", "B. 24", "C. 21", "D. 27"],
          correctIndex: 1,
          answer: "答案：B。百位 7 + 十位 8 + 个位 9 = 24。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列代码中，能正确求出 1 到 10 中所有偶数的乘积的是（　）",
          options: ["A. `p = 1` `for i in range(1, 11):` `if i % 2 == 0:` `p *= i`", "B. `p = 0` `for i in range(1, 11):` `if i % 2 == 0:` `p *= i`", "C. `p = 1` `for i in range(1, 11):` `p *= i`", "D. `p = 1` `for i in range(2, 11, 2):` `p += i`"],
          correctIndex: 0,
          answer: "答案：A。累乘器初始化为 1，判断偶数后累乘；B 初始化为 0 结果恒为 0，C 乘了所有数，D 是累加不是累乘。"
        }
      ]
    }
  ]
}
