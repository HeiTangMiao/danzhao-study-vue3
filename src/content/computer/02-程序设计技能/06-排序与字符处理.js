/**
 * 内容页面数据（content-schema 的实例）
 * 页面：排序与字符处理
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-06",
  unitNum: "02",
  subject: "computer",
  title: "排序与字符处理",
  subtitle: "冒泡排序、选择排序与字符串操作",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["排序与字符处理"]
  N1["冒泡排序"]
  N0 --> N1
  N2["相邻比较交换"]
  N1 --> N2
  N3["多轮冒泡"]
  N1 --> N3
  N4["选择排序"]
  N0 --> N4
  N5["找最小交换"]
  N4 --> N5
  N6["字符串操作"]
  N0 --> N6
  N7["拼接 +"]
  N6 --> N7
  N8["重复 *"]
  N6 --> N8
  N9["索引与切片"]
  N6 --> N9
  N10["len 长度"]
  N6 --> N10
  N11["常用方法"]
  N0 --> N11
  N12["upper/lower"]
  N11 --> N12
  N13["strip"]
  N11 --> N13
  N14["split/join"]
  N11 --> N14
  N15["字符统计"]
  N0 --> N15
  N16["遍历统计"]
  N15 --> N16
  N17["计数判断"]
  N15 --> N17`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "理解冒泡排序的思想：相邻比较、逐轮交换",
        "理解选择排序的思想：每轮找最小值交换",
        "掌握字符串的拼接、重复、索引、切片操作",
        "掌握字符串常用方法（upper、lower、strip、split 等）"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "冒泡排序",
      paragraphs: [
        "**思想：**相邻两个元素比较，如果顺序不对就交换，每一轮把最大（或最小）的元素\"冒泡\"到最后。",
        "**轮数：**n 个元素需要 n-1 轮；第 i 轮需要比较 n-i 次。",
        "**示例（升序）：**\n```\na = [5, 3, 8, 1]\nn = len(a)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if a[j] > a[j + 1]:\n            a[j], a[j + 1] = a[j + 1], a[j]\nprint(a)   # 输出 [1, 3, 5, 8]\n```",
        "**交换技巧：**`a[j], a[j+1] = a[j+1], a[j]` 一行完成交换。"
      ]
    },
    {
      type: "warning",
      text: "冒泡排序内层循环范围是 `range(n - 1 - i)`！因为每完成一轮，末尾就多一个已排好的元素，无需再比较。写成 `range(n - 1)` 虽然结果正确但效率低，考试阅卷可能扣分。"
    },
    {
      type: "knowledge",
      title: "选择排序",
      paragraphs: [
        "**思想：**每一轮从未排序部分找出最小值，与未排序部分的第一个元素交换。",
        "**示例（升序）：**\n```\na = [5, 3, 8, 1]\nn = len(a)\nfor i in range(n - 1):\n    min_idx = i\n    for j in range(i + 1, n):\n        if a[j] < a[min_idx]:\n            min_idx = j\n    a[i], a[min_idx] = a[min_idx], a[i]\nprint(a)   # 输出 [1, 3, 5, 8]\n```",
        "**与冒泡区别：**选择排序每轮只交换一次，冒泡排序可能交换多次。"
      ]
    },
    {
      type: "knowledge",
      title: "字符串基本操作",
      paragraphs: [
        "**拼接：**`+` 连接字符串，如 `\"你\" + \"好\"` 结果为 `\"你好\"`。",
        "**重复：**`*` 重复字符串，如 `\"ab\" * 3` 结果为 `\"ababab\"`。",
        "**索引：**`s[0]` 取第一个字符，`s[-1]` 取最后一个字符，下标从 0 开始。",
        "**切片：**`s[开始:结束]` 截取子串，左闭右开，如 `\"hello\"[1:3]` 结果为 `\"el\"`。",
        "**长度：**`len(s)` 返回字符串长度，如 `len(\"hello\")` 结果为 5。"
      ]
    },
    {
      type: "table",
      title: "字符串常用方法",
      headers: ["方法", "作用", "示例", "结果"],
      rows: [
        ["upper()", "转大写", "\"abc\".upper()", "\"ABC\""],
        ["lower()", "转小写", "\"ABC\".lower()", "\"abc\""],
        ["strip()", "去两端空格", "\"  hi  \".strip()", "\"hi\""],
        ["split()", "按分隔符拆分", "\"a,b,c\".split(\",\")", "['a','b','c']"],
        ["count()", "统计出现次数", "\"hello\".count(\"l\")", "2"],
        ["find()", "查找子串位置", "\"hello\".find(\"l\")", "2"]
      ]
    },
    {
      type: "tip",
      text: "字符串是不可变的！`s.upper()` 返回新字符串，原字符串不变。要保存结果必须赋值，如 `s = s.upper()`。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：冒泡排序",
          difficulty: "medium",
          question: "用冒泡排序法将列表 [9, 5, 7, 2, 6] 按升序排列，并输出排序结果。",
          solution: "**解：**\n```\n# 冒泡排序升序\na = [9, 5, 7, 2, 6]\nn = len(a)\nfor i in range(n - 1):\n    for j in range(n - 1 - i):\n        if a[j] > a[j + 1]:\n            a[j], a[j + 1] = a[j + 1], a[j]\nprint(\"排序结果：\", a)\n```\n运行结果：\n排序结果： [2, 5, 6, 7, 9]",
          answer: "外层 n-1 轮，内层 n-1-i 次相邻比较，逆序则交换。"
        },
        {
          title: "例题2：字符串统计",
          difficulty: "medium",
          question: "输入一个字符串，统计其中字母 'a' 出现的次数并输出。",
          solution: "**解：**\n```\ns = input(\"请输入一个字符串：\")\ncount = 0\n# 遍历每个字符\nfor ch in s:\n    if ch == \"a\":\n        count += 1\nprint(\"字母 a 出现次数：\", count)\n```\n运行示例：\n请输入一个字符串：banana\na 出现次数： 3",
          answer: "遍历字符串，`if ch == \"a\"` 计数累加；也可用 `s.count(\"a\")`。"
        },
        {
          title: "例题3：字符串反转",
          difficulty: "advanced",
          question: "输入一个字符串，将其反转后输出。",
          solution: "**解：**\n方法一（切片）：\n```\ns = input(\"请输入字符串：\")\nprint(\"反转结果：\", s[::-1])\n```\n方法二（循环）：\n```\ns = input(\"请输入字符串：\")\nresult = \"\"\nfor ch in s:\n    result = ch + result\nprint(\"反转结果：\", result)\n```\n运行示例：\n请输入字符串：abcde\n反转结果： edcba",
          answer: "方法一用切片 `s[::-1]`；方法二循环把每个字符放到结果前面。"
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
          question: "表达式 `\"ab\" * 3` 的结果是（　）",
          options: ["A. \"ababab\"", "B. \"ab3\"", "C. \"3ab\"", "D. 报错"],
          correctIndex: 0,
          answer: "答案：A。`*` 重复字符串，`\"ab\" * 3` 得到 \"ababab\"。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "`len(\"hello\")` 的结果是（　）",
          options: ["A. 4", "B. 5", "C. 6", "D. 0"],
          correctIndex: 1,
          answer: "答案：B。hello 共 5 个字符。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "`\"hello\"[1:3]` 的结果是（　）",
          options: ["A. \"hel\"", "B. \"el\"", "C. \"ell\"", "D. \"he\""],
          correctIndex: 1,
          answer: "答案：B。切片左闭右开，取下标 1、2 的字符 \"el\"。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "冒泡排序 n 个元素需要 n-1 轮。",
          answer: "**正确。**n 个元素冒泡排序需要 n-1 轮，每轮确定一个元素的位置。"
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
          question: "`\"AbC\".lower()` 的结果是（　）",
          options: ["A. \"AbC\"", "B. \"abc\"", "C. \"ABC\"", "D. \"aBC\""],
          correctIndex: 1,
          answer: "答案：B。lower() 将所有字母转为小写。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "`\"hello\".count(\"l\")` 的结果是（　）",
          options: ["A. 1", "B. 2", "C. 3", "D. 0"],
          correctIndex: 1,
          answer: "答案：B。hello 中有两个 l。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "对列表 [3, 1, 2] 进行冒泡排序，第一轮（i=0）结束后列表是（　）",
          options: ["A. [1, 2, 3]", "B. [1, 3, 2]", "C. [3, 2, 1]", "D. [2, 1, 3]"],
          correctIndex: 0,
          answer: "答案：A。第一轮比较 2 次：先 3 和 1 比较，3>1 交换得 [1,3,2]；再 3 和 2 比较，3>2 交换得 [1,2,3]。所以第一轮结束是 [1,2,3]。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列代码中，能正确统计字符串中数字字符个数的是（　）",
          options: ["A. `s = input(\"输入：\")` `count = 0` `for ch in s:` `if ch.isdigit():` `count += 1`", "B. `s = input(\"输入：\")` `count = 0` `for ch in s:` `count += 1`", "C. `s = input(\"输入：\")` `print(len(s))`", "D. `s = input(\"输入：\")` `print(s.count(\"0\"))`"],
          correctIndex: 0,
          answer: "答案：A。用 `ch.isdigit()` 判断是否为数字字符并计数；B 统计所有字符，C 是总长度，D 只统计字符 0。"
        }
      ]
    }
  ]
}
