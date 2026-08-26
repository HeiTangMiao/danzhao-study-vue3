/**
 * 内容页面数据（content-schema 的实例）
 * 页面：程序调试与运行
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-07",
  unitNum: "02",
  subject: "computer",
  title: "程序调试与运行",
  subtitle: "语法错误、逻辑错误与调试方法",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["程序调试与运行"]
  N1["错误类型"]
  N0 --> N1
  N2["语法错误"]
  N1 --> N2
  N3["运行错误"]
  N1 --> N3
  N4["逻辑错误"]
  N1 --> N4
  N5["调试方法"]
  N0 --> N5
  N6["阅读代码"]
  N5 --> N6
  N7["print 输出中间值"]
  N5 --> N7
  N8["逐行检查"]
  N5 --> N8
  N9["常见错误"]
  N0 --> N9
  N10["缩进错误"]
  N9 --> N10
  N11["缺少冒号"]
  N9 --> N11
  N12["类型错误"]
  N9 --> N12
  N13["变量名错误"]
  N9 --> N13
  N14["算法错误"]
  N0 --> N14
  N15["累乘器初始化"]
  N14 --> N15
  N16["range 边界"]
  N14 --> N16
  N17["交换顺序"]
  N14 --> N17`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "区分语法错误、运行错误与逻辑错误",
        "掌握基本的程序调试方法（阅读、print 输出、逐行检查）",
        "能找出典型程序（累加、累乘、求最值、素数、数字分离、排序）中的错误并修改",
        "养成规范书写、及时测试的编程习惯"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "三类错误",
      paragraphs: [
        "**语法错误：**违反语言规则，程序无法运行。如缺少冒号、括号不匹配、缩进错误、拼写错误。",
        "**运行错误：**程序能运行但执行时报错。如字符串与数字相加、除数为 0、变量未定义。",
        "**逻辑错误：**程序能运行不报错，但结果不对。如累乘器初始化为 0、range 边界写错、判断条件写反。",
        "**考试要求：**能找出典型程序的错误之处并加以修改，这是程序设计模块的重要考点。"
      ]
    },
    {
      type: "warning",
      text: "逻辑错误最隐蔽！程序不报错但结果错误，必须通过运行测试、对比预期结果才能发现。考试中写完程序一定要运行验证结果是否正确。"
    },
    {
      type: "table",
      title: "常见错误对照表",
      headers: ["错误类型", "错误示例", "正确写法", "说明"],
      rows: [
        ["缺少冒号", "if x > 0", "if x > 0:", "if/for/while 后必须有冒号"],
        ["缩进错误", "if x > 0:\nprint(x)", "if x > 0:\n    print(x)", "代码块必须缩进且一致"],
        ["赋值误用", "if x = 5:", "if x == 5:", "= 是赋值，== 是判断"],
        ["类型错误", "a = input()\nprint(a + 1)", "a = int(input())\nprint(a + 1)", "input 返回字符串需转换"],
        ["变量未定义", "print(total)", "total = 0\nprint(total)", "使用前必须先赋值"],
        ["括号不匹配", "print(\"hi\"", "print(\"hi\")", "括号必须成对"]
      ]
    },
    {
      type: "knowledge",
      title: "调试方法",
      paragraphs: [
        "**阅读代码：**逐行阅读，检查语法、缩进、变量名、运算符是否书写正确。",
        "**print 输出中间值：**在关键位置输出中间变量的值，定位出错位置。",
        "**逐行检查：**用纸笔模拟程序执行，跟踪每个变量的变化，判断逻辑是否正确。",
        "**运行测试：**用多组数据测试，包括边界值（如 0、最大值、负数），验证程序健壮性。"
      ]
    },
    {
      type: "tip",
      text: "调试口诀：\"先看语法，再查逻辑；print 定位，边界测试\"。遇到结果不对，先在循环前后加 print 看中间值。"
    },
    // ---------- 易错专项 ----------
    {
      type: "errorfocus",
      title: "高频易错专项",
      items: [
        {
          scenario: "累乘器求阶乘结果恒为 0",
          commonMistake: "```\nproduct = 0\nfor i in range(1, 6):\n    product *= i\nprint(product)   # 输出 0\n```",
          correctApproach: "```\nproduct = 1\nfor i in range(1, 6):\n    product *= i\nprint(product)   # 输出 120\n```",
          tip: "累乘器必须初始化为 1；累加器才初始化为 0。"
        },
        {
          scenario: "求 1 到 100 的和少了 100",
          commonMistake: "```\nsum = 0\nfor i in range(1, 100):\n    sum += i\nprint(sum)   # 输出 4950，少了 100\n```",
          correctApproach: "```\nsum = 0\nfor i in range(1, 101):\n    sum += i\nprint(sum)   # 输出 5050\n```",
          tip: "range 左闭右开，求 1 到 100 必须写 range(1, 101)。"
        },
        {
          scenario: "判断奇偶条件写反",
          commonMistake: "```\nif num % 2 == 1:\n    print(\"偶数\")\nelse:\n    print(\"奇数\")\n```",
          correctApproach: "```\nif num % 2 == 0:\n    print(\"偶数\")\nelse:\n    print(\"奇数\")\n```",
          tip: "能被 2 整除（余数为 0）才是偶数，余数为 1 是奇数。"
        },
        {
          scenario: "input 未转换类型直接运算",
          commonMistake: "```\na = input(\"请输入：\")\nprint(a + 10)   # 报错：字符串不能加数字\n```",
          correctApproach: "```\na = int(input(\"请输入：\"))\nprint(a + 10)   # 正确\n```",
          tip: "input 返回字符串，参与数学运算前必须用 int() 或 float() 转换。"
        },
        {
          scenario: "冒泡排序内层循环范围错误",
          commonMistake: "```\nfor i in range(n - 1):\n    for j in range(n - 1):\n        if a[j] > a[j + 1]:\n            a[j], a[j+1] = a[j+1], a[j]\n```",
          correctApproach: "```\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if a[j] > a[j + 1]:\n            a[j], a[j+1] = a[j+1], a[j]\n```",
          tip: "每完成一轮末尾已排好，内层范围应为 n-1-i，避免多余比较。"
        }
      ]
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：找错误并修改",
          difficulty: "medium",
          question: "下列程序想计算 1 到 10 的累加和，但结果不对，请找出错误并修改。\n```\nsum = 1\nfor i in range(1, 11):\n    sum += i\nprint(sum)\n```",
          solution: "**解：**\n错误：累加器初始化为 1，导致结果多加了 1。\n正确代码：\n```\nsum = 0\nfor i in range(1, 11):\n    sum += i\nprint(sum)   # 输出 55\n```",
          answer: "累加器应初始化为 0，修改为 `sum = 0`。"
        },
        {
          title: "例题2：找错误并修改",
          difficulty: "advanced",
          question: "下列程序想判断一个数是否为素数，但结果错误，请找出错误并修改。\n```\nn = int(input(\"请输入：\"))\nfor i in range(2, n):\n    if n % i == 0:\n        print(n, \"不是素数\")\n    else:\n        print(n, \"是素数\")\n```",
          solution: "**解：**\n错误：在循环内直接输出结论，只要有一个 i 不能整除就输出\"是素数\"，判断不完整。\n正确代码：\n```\nn = int(input(\"请输入：\"))\nis_prime = True\nfor i in range(2, n):\n    if n % i == 0:\n        is_prime = False\n        break\nif is_prime and n > 1:\n    print(n, \"是素数\")\nelse:\n    print(n, \"不是素数\")\n```",
          answer: "用标志变量 is_prime 记录，循环结束后统一判断，而不是在循环内直接输出。"
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
          question: "下列错误中，属于语法错误的是（　）",
          options: ["A. 结果不对", "B. 缺少冒号", "C. 除数为 0", "D. 变量未定义"],
          correctIndex: 1,
          answer: "答案：B。缺少冒号导致程序无法运行，是语法错误；结果不对是逻辑错误，除数为 0 是运行错误。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "程序能运行但不报错，结果却不对，这属于（　）",
          options: ["A. 语法错误", "B. 运行错误", "C. 逻辑错误", "D. 编译错误"],
          correctIndex: 2,
          answer: "答案：C。逻辑错误是程序能运行但结果不符合预期。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列代码中，有错误的是（　）\n```\na = int(input(\"请输入：\"))\nif a % 2 == 0:\n    print(\"偶数\")\nelse\n    print(\"奇数\")\n```",
          options: ["A. 没有错误", "B. else 后面缺少冒号", "C. if 条件错误", "D. input 用法错误"],
          correctIndex: 1,
          answer: "答案：B。else 后面必须加冒号，缺少冒号是语法错误。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "在程序中添加 print 输出中间值，可以帮助定位逻辑错误。",
          answer: "**正确。**print 输出中间变量是常用的调试方法。"
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
          question: "下列代码中，能正确输出 1 到 5 的是（　）",
          options: ["A. `for i in range(1, 5):` `print(i)`", "B. `for i in range(1, 6):` `print(i)`", "C. `for i in range(5):` `print(i)`", "D. `for i in range(0, 5):` `print(i)`"],
          correctIndex: 1,
          answer: "答案：B。range(1, 6) 生成 1 到 5。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列程序想求 5 的阶乘，结果错误的是（　）",
          options: ["A. `p = 1` `for i in range(1, 6):` `p *= i`", "B. `p = 1` `for i in range(1, 5):` `p *= i`", "C. `p = 1` `for i in range(1, 6):` `p = p * i`", "D. `p = 1` `for i in range(1, 6):` `p *= i` `print(p)`"],
          correctIndex: 1,
          answer: "答案：B。range(1, 5) 只乘到 4，结果是 24 而不是 120，边界写错。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列代码想求三个数的最大值，结果错误的是（　）",
          options: ["A. `a,b,c = 5,9,3` `m = a` `if b > m:` `m = b` `if c > m:` `m = c` `print(m)`", "B. `a,b,c = 5,9,3` `m = 0` `if a > m:` `m = a` `if b > m:` `m = b` `if c > m:` `m = c` `print(m)`", "C. A 和 B 都对", "D. A 和 B 都错"],
          correctIndex: 1,
          answer: "答案：B。m 初始化为 0 时，如果三个数都是负数，结果错误（会输出 0 而不是最大负数）；A 假设第一个数为最大更稳妥。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "调试程序时，发现结果比预期大 1，最可能的原因是（　）",
          options: ["A. 累加器初始化为 1", "B. range 结束值写小", "C. 条件判断写反", "D. 缺少注释"],
          correctIndex: 0,
          answer: "答案：A。累加器初始化为 1 会导致结果多 1，应初始化为 0。"
        }
      ]
    }
  ]
}
