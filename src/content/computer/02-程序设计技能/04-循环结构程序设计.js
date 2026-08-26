/**
 * 内容页面数据（content-schema 的实例）
 * 页面：循环结构程序设计
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-04",
  unitNum: "02",
  subject: "computer",
  title: "循环结构程序设计",
  subtitle: "for 循环、while 循环与循环嵌套",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["循环结构程序设计"]
  N1["for 循环"]
  N0 --> N1
  N2["range 函数"]
  N1 --> N2
  N3["遍历序列"]
  N1 --> N3
  N4["while 循环"]
  N0 --> N4
  N5["条件控制"]
  N4 --> N5
  N6["计数器"]
  N4 --> N6
  N7["循环控制"]
  N0 --> N7
  N8["break 跳出"]
  N7 --> N8
  N9["continue 继续"]
  N7 --> N9
  N10["循环嵌套"]
  N0 --> N10
  N11["外层循环"]
  N10 --> N11
  N12["内层循环"]
  N10 --> N12
  N13["累加器模式"]
  N0 --> N13
  N14["初始化 sum=0"]
  N13 --> N14
  N15["循环累加"]
  N13 --> N15
  N16["典型程序"]
  N0 --> N16
  N17["1到100求和"]
  N16 --> N17
  N18["打印乘法表"]
  N16 --> N18`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "理解循环结构的执行流程：重复执行一段代码直到条件不满足",
        "掌握 for 循环与 range() 函数的用法",
        "掌握 while 循环与计数器的用法",
        "掌握 break、continue 与循环嵌套，能编写累加求和等典型程序"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "for 循环",
      paragraphs: [
        "**for 循环：**`for 变量 in 序列:` 依次取出序列中的每个元素执行循环体。",
        "**range 函数：**`range(n)` 生成 0~n-1；`range(开始, 结束)` 生成开始~结束-1；`range(开始, 结束, 步长)` 按步长生成。",
        "**示例：**\n```\nfor i in range(1, 6):\n    print(i)   # 输出 1 2 3 4 5\n```",
        "**注意：**range(1, 6) 包含 1 不包含 6，即左闭右开。"
      ]
    },
    {
      type: "warning",
      text: "range 是左闭右开！`range(1, 101)` 表示 1 到 100，不包含 101。求 1 到 100 的和必须写 `range(1, 101)`，写 `range(1, 100)` 会少加 100。"
    },
    {
      type: "knowledge",
      title: "while 循环",
      paragraphs: [
        "**while 循环：**`while 条件:` 条件成立就执行循环体，直到条件不成立。",
        "**计数器：**while 循环通常需要计数器控制次数，如 `i = 1`，循环内 `i += 1`。",
        "**示例：**\n```\ni = 1\nwhile i <= 5:\n    print(i)\n    i += 1   # 计数器自增，防止死循环\n```",
        "**死循环：**如果条件永远成立且没有改变条件的语句，程序会无限循环，考试中要避免。"
      ]
    },
    {
      type: "knowledge",
      title: "循环控制与嵌套",
      paragraphs: [
        "**break：**立即跳出整个循环，不再执行剩余循环。",
        "**continue：**跳过本次循环的剩余语句，直接进入下一次循环。",
        "**循环嵌套：**循环体里再写循环，外层每执行一次，内层完整执行一遍。",
        "**示例（乘法表）：**\n```\nfor i in range(1, 10):\n    for j in range(1, i + 1):\n        print(j, \"*\", i, \"=\", i * j, end=\"  \")\n    print()\n```"
      ]
    },
    {
      type: "tip",
      text: "累加器模式是考试核心：先 `sum = 0` 初始化，循环内 `sum += i` 累加，循环结束后输出 sum。累乘器同理：先 `product = 1`，循环内 `product *= i`。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：累加求和（考试样题三）",
          difficulty: "basic",
          question: "请计算 1 到 100 的所有整数之和，并输出结果。要求：代码有注释，保存到\"考生文件夹\\程序设计\\试题三\"。",
          solution: "**解：**\n```\n# 试题三：计算 1 到 100 的和\n# 初始化累加器\nsum = 0\n# 循环 1 到 100\nfor i in range(1, 101):\n    sum += i   # 累加\n# 输出结果\nprint(\"1 到 100 的和是：\", sum)\n```\n运行结果：\n1 到 100 的和是： 5050",
          answer: "`sum = 0` 初始化，`for i in range(1, 101)` 循环，`sum += i` 累加，输出 5050。"
        },
        {
          title: "例题2：while 循环累加",
          difficulty: "medium",
          question: "用 while 循环计算 1 到 100 的所有整数之和。",
          solution: "**解：**\n```\n# 用 while 计算 1 到 100 的和\nsum = 0\ni = 1\nwhile i <= 100:\n    sum += i\n    i += 1   # 计数器自增\nprint(\"1 到 100 的和是：\", sum)\n```\n运行结果：\n1 到 100 的和是： 5050",
          answer: "计数器 i 从 1 开始，`while i <= 100` 循环累加，循环内 `i += 1` 防止死循环。"
        },
        {
          title: "例题3：求 1~100 中偶数的和",
          difficulty: "advanced",
          question: "计算 1 到 100 中所有偶数的和，并输出结果。",
          solution: "**解：**\n方法一（步长法）：\n```\nsum = 0\nfor i in range(2, 101, 2):\n    sum += i\nprint(\"偶数和是：\", sum)\n```\n方法二（判断法）：\n```\nsum = 0\nfor i in range(1, 101):\n    if i % 2 == 0:\n        sum += i\nprint(\"偶数和是：\", sum)\n```\n运行结果：\n偶数和是： 2550",
          answer: "方法一用 `range(2, 101, 2)` 直接取偶数；方法二用 `i % 2 == 0` 判断后累加。"
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
          question: "`range(1, 5)` 生成的序列是（　）",
          options: ["A. 1, 2, 3, 4, 5", "B. 1, 2, 3, 4", "C. 0, 1, 2, 3, 4", "D. 0, 1, 2, 3, 4, 5"],
          correctIndex: 1,
          answer: "答案：B。range 左闭右开，`range(1, 5)` 包含 1 不包含 5。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "执行以下代码，循环体执行次数是（　）\n```\nfor i in range(1, 101):\n    print(i)\n```",
          options: ["A. 99", "B. 100", "C. 101", "D. 0"],
          correctIndex: 1,
          answer: "答案：B。range(1, 101) 生成 1 到 100 共 100 个数。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nsum = 0\nfor i in range(1, 5):\n    sum += i\nprint(sum)\n```",
          options: ["A. 10", "B. 15", "C. 9", "D. 14"],
          correctIndex: 0,
          answer: "答案：A。累加 1+2+3+4 = 10。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "在 while 循环中，防止死循环的关键是（　）",
          options: ["A. 循环体尽量短", "B. 循环内有改变条件的语句", "C. 使用 for 循环", "D. 添加注释"],
          correctIndex: 1,
          answer: "答案：B。循环内必须有改变条件（如计数器自增）的语句，否则条件永远成立形成死循环。"
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
          question: "下列代码中，能正确输出 1 到 10 的是（　）",
          options: ["A. `for i in range(1, 10):` `print(i)`", "B. `for i in range(1, 11):` `print(i)`", "C. `for i in range(0, 10):` `print(i)`", "D. `for i in range(10):` `print(i)`"],
          correctIndex: 1,
          answer: "答案：B。range(1, 11) 生成 1 到 10。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nfor i in range(1, 6):\n    if i == 3:\n        break\n    print(i)\n```",
          options: ["A. 1 2 3", "B. 1 2", "C. 1 2 3 4 5", "D. 1 2 4 5"],
          correctIndex: 1,
          answer: "答案：B。i 等于 3 时 break 跳出循环，只输出 1 和 2。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nfor i in range(1, 6):\n    if i == 3:\n        continue\n    print(i)\n```",
          options: ["A. 1 2 3 4 5", "B. 1 2 4 5", "C. 1 2", "D. 1 2 3"],
          correctIndex: 1,
          answer: "答案：B。i 等于 3 时 continue 跳过本次，不输出 3，其余照常输出。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "计算 1 到 100 中所有奇数的和，正确的代码是（　）",
          options: ["A. `sum = 0` `for i in range(1, 101):` `sum += i`", "B. `sum = 0` `for i in range(1, 101):` `if i % 2 == 1:` `sum += i`", "C. `sum = 0` `for i in range(1, 101, 2):` `sum += i`", "D. B 和 C 都对"],
          correctIndex: 3,
          answer: "答案：D。B 用 `i % 2 == 1` 判断奇数累加；C 用 `range(1, 101, 2)` 步长 2 直接取奇数，两种方法都正确。"
        }
      ]
    }
  ]
}
