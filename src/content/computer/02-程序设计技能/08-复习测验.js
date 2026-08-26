/**
 * 内容页面数据（content-schema 的实例）
 * 页面：程序设计技能 · 复习测验
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》程序设计技能模块编制
 */
export default {
  id: "computer-02-08",
  unitNum: "02",
  subject: "computer",
  title: "程序设计技能 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。请先独立作答，再点击「查看答案」核对解析。本测验覆盖环境语法、顺序/选择/循环结构、常用算法、排序与调试。"
    },
    // ---------- 一、判断题（每题3分，共30分） ----------
    {
      type: "quiz",
      title: "一、判断题（每题 3 分，共 30 分）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "Python 变量名可以以数字开头。",
          answer: "**错误。**变量名不能以数字开头。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "input() 函数返回的数据类型一定是字符串。",
          answer: "**正确。**input() 返回字符串，需要时用 int() 或 float() 转换。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "`7 // 2` 的结果是 3.5。",
          answer: "**错误。**`//` 是整除，`7 // 2` 结果是 3；`7 / 2` 才是 3.5。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "`range(1, 101)` 表示 1 到 100 的整数序列。",
          answer: "**正确。**range 左闭右开，包含 1 不包含 101。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "累乘器求阶乘时应初始化为 0。",
          answer: "**错误。**累乘器应初始化为 1，初始化为 0 结果恒为 0。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "判断两个数是否相等应使用 `=` 运算符。",
          answer: "**错误。**`=` 是赋值，判断相等用 `==`。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "在 while 循环中，循环体内必须有改变条件的语句，否则会形成死循环。",
          answer: "**正确。**否则条件永远成立，程序无限循环。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "`\"abc\".upper()` 会改变原字符串的值。",
          answer: "**错误。**字符串是不可变的，upper() 返回新字符串，原字符串不变。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "冒泡排序 n 个元素需要 n-1 轮。",
          answer: "**正确。**每轮确定一个元素位置，n 个元素需要 n-1 轮。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "程序能运行但不报错、结果却不对，属于逻辑错误。",
          answer: "**正确。**逻辑错误是程序可运行但结果不符合预期。"
        }
      ]
    },
    // ---------- 二、单选题（每题4分，共40分） ----------
    {
      type: "quiz",
      title: "二、单选题（每题 4 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "下列变量名中，合法的是（　）",
          options: ["A. 2num", "B. my-name", "C. student_name", "D. for"],
          correctIndex: 2,
          answer: "答案：C。student_name 合法；`for` 是关键字，`2num` 以数字开头，`my-name` 含非法字符。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "表达式 `10 % 3` 的结果是（　）",
          options: ["A. 3", "B. 3.3", "C. 1", "D. 0"],
          correctIndex: 2,
          answer: "答案：C。`10 % 3` 的余数是 1。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行 `n = 10` 后执行 `n //= 3`，此时 n 的值是（　）",
          options: ["A. 3", "B. 3.3", "C. 1", "D. 10"],
          correctIndex: 0,
          answer: "答案：A。`n //= 3` 等价于 `n = n // 3 = 10 // 3 = 3`。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nsum = 0\nfor i in range(1, 6):\n    sum += i\nprint(sum)\n```",
          options: ["A. 15", "B. 10", "C. 21", "D. 14"],
          correctIndex: 0,
          answer: "答案：A。1+2+3+4+5 = 15。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "数字 789 的百位数字是（　）",
          options: ["A. 7", "B. 8", "C. 9", "D. 78"],
          correctIndex: 0,
          answer: "答案：A。`789 // 100 = 7`。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nx = 75\nif x >= 90:\n    print(\"A\")\nelif x >= 80:\n    print(\"B\")\nelif x >= 60:\n    print(\"C\")\nelse:\n    print(\"D\")\n```",
          options: ["A. A", "B. B", "C. C", "D. D"],
          correctIndex: 2,
          answer: "答案：C。75 不满足 ≥90、≥80，满足 ≥60，输出 C。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "`\"hello\"[0:3]` 的结果是（　）",
          options: ["A. \"hel\"", "B. \"ell\"", "C. \"hello\"", "D. \"he\""],
          correctIndex: 0,
          answer: "答案：A。切片左闭右开，取下标 0、1、2 的字符 \"hel\"。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列代码中，能正确判断 n 是偶数的条件是（　）",
          options: ["A. `n % 2 == 1`", "B. `n % 2 == 0`", "C. `n // 2 == 0`", "D. `n / 2 == 0`"],
          correctIndex: 1,
          answer: "答案：B。能被 2 整除（余数为 0）是偶数。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "执行以下代码，输出结果是（　）\n```\nfor i in range(1, 6):\n    if i % 2 == 0:\n        continue\n    print(i, end=\" \")\n```",
          options: ["A. 1 2 3 4 5", "B. 1 3 5", "C. 2 4", "D. 1 2 3"],
          correctIndex: 1,
          answer: "答案：B。i 为偶数时 continue 跳过，只输出奇数 1 3 5。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列程序想求 1 到 100 中所有偶数的和，正确的是（　）",
          options: ["A. `sum = 0` `for i in range(1, 101):` `if i % 2 == 0:` `sum += i`", "B. `sum = 0` `for i in range(1, 101, 2):` `sum += i`", "C. `sum = 1` `for i in range(1, 101):` `if i % 2 == 0:` `sum += i`", "D. A 和 B 都对"],
          correctIndex: 0,
          answer: "答案：A。A 用 `i % 2 == 0` 判断偶数累加，正确；B 用 `range(1, 101, 2)` 取的是奇数（1、3、5…），求的是奇数和；C 累加器初始化为 1 错误。"
        }
      ]
    },
    // ---------- 三、程序阅读题（每题5分，共15分） ----------
    {
      type: "quiz",
      title: "三、程序阅读题（每题 5 分，共 15 分）",
      items: [
        {
          difficulty: "medium",
          type: "single",
          question: "阅读下列程序，输出结果是（　）\n```\na = 5\nb = 3\na, b = b, a\nprint(a, b)\n```",
          options: ["A. 5 3", "B. 3 5", "C. 3 3", "D. 5 5"],
          correctIndex: 1,
          answer: "答案：B。`a, b = b, a` 交换两个变量的值，a 变为 3，b 变为 5。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "阅读下列程序，输出结果是（　）\n```\nproduct = 1\nfor i in range(1, 5):\n    product *= i\nprint(product)\n```",
          options: ["A. 10", "B. 24", "C. 120", "D. 15"],
          correctIndex: 1,
          answer: "答案：B。1×2×3×4 = 24。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "阅读下列程序，输出结果是（　）\n```\nnum = 246\nge = num % 10\nshi = num // 10 % 10\nbai = num // 100\nprint(bai + shi + ge)\n```",
          options: ["A. 246", "B. 12", "C. 24", "D. 6"],
          correctIndex: 1,
          answer: "答案：B。百位 2 + 十位 4 + 个位 6 = 12。"
        }
      ]
    },
    // ---------- 四、编程题（共15分） ----------
    {
      type: "example",
      title: "四、编程题（共 15 分）",
      items: [
        {
          title: "编程题：累加求和",
          difficulty: "medium",
          question: "编写程序：输入一个正整数 n，计算 1 到 n 的所有整数之和并输出。要求：输入输出有提示文字，代码有详细注释。",
          solution: "**解：**\n```\n# 计算 1 到 n 的和\nn = int(input(\"请输入一个正整数 n：\"))\n# 初始化累加器\nsum = 0\n# 循环累加\nfor i in range(1, n + 1):\n    sum += i\n# 输出结果\nprint(\"1 到\", n, \"的和是：\", sum)\n```\n运行示例：\n请输入一个正整数 n：10\n1 到 10 的和是： 55",
          answer: "`sum = 0` 初始化，`for i in range(1, n + 1)` 循环，`sum += i` 累加后输出。"
        }
      ]
    }
  ]
}
