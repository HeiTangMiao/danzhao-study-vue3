/**
 * 内容页面数据（content-schema 的实例）
 * 页面：理论基础 · 复习测验
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"计算机基础"模块编制
 * 说明：本单元对应理论考中分值最高的「计算机基础」（约 70 分 / 46.7%），全部为客观题
 */
export default {
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "本测验覆盖「理论基础」单元全部 7 页内容（发展史与性能指标、数制转换与信息编码、系统组成与工作原理、信息安全与防护、操作系统基础、语言与算法基础、新一代信息技术）。建议用时 30 分钟。请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题 ----------
    {
      type: "quiz",
      title: "一、单项选择题（共 12 题）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "世界上第一台电子计算机 ENIAC 所采用的核心器件是（　）",
          options: ["A. 晶体管", "B. 电子管", "C. 集成电路", "D. 大规模集成电路"],
          correctIndex: 1,
          answer: "答案：B。ENIAC（1946 年）属于第一代计算机，核心器件为电子管。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "1 GB 的存储容量等于（　）",
          options: ["A. 1000 MB", "B. 1024 MB", "C. 1024 KB", "D. 1000 KB"],
          correctIndex: 1,
          answer: "答案：B。存储单位进率为 1024：1 GB = 1024 MB = 1024 × 1024 KB。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "二进制数 \\((1011)_2\\) 转换为十进制是（　）",
          options: ["A. 9", "B. 10", "C. 11", "D. 12"],
          correctIndex: 2,
          answer: "答案：C。\\(1\\times2^3+0\\times2^2+1\\times2^1+1\\times2^0 = 8+0+2+1 = 11\\)。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "十进制数 25 转换为二进制是（　）",
          options: ["A. 11001", "B. 11011", "C. 11101", "D. 10011"],
          correctIndex: 0,
          answer: "答案：A。除 2 取余倒序排列：25→12余1、12→6余0、6→3余0、3→1余1、1→0余1，得 11001。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "在计算机中，一个汉字通常占用的字节数是（　）",
          options: ["A. 1 B", "B. 2 B", "C. 4 B", "D. 8 B"],
          correctIndex: 1,
          answer: "答案：B。一个汉字通常占 2 个字节；一个 ASCII 字符占 1 个字节。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "运算器和控制器合称为（　）",
          options: ["A. 主机", "B. 中央处理器（CPU）", "C. 内存", "D. 外部设备"],
          correctIndex: 1,
          answer: "答案：B。CPU = 运算器 + 控制器；主机 = CPU + 内存。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "断电后信息不会丢失的存储器是（　）",
          options: ["A. RAM", "B. Cache", "C. ROM", "D. 寄存器"],
          correctIndex: 2,
          answer: "答案：C。ROM（只读存储器）断电后信息保留；RAM、Cache、寄存器断电后信息丢失。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "计算机病毒最本质的特征是（　）",
          options: ["A. 破坏性", "B. 潜伏性", "C. 传染性（自我复制）", "D. 隐蔽性"],
          correctIndex: 2,
          answer: "答案：C。传染性（自我复制）是病毒区别于其他恶意程序的最本质特征。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列软件中属于系统软件的是（　）",
          options: ["A. WPS 文字", "B. Photoshop", "C. Windows 操作系统", "D. 微信"],
          correctIndex: 2,
          answer: "答案：C。操作系统是最基本的系统软件；其余均为应用软件。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "机器语言的特点是（　）",
          options: [
            "A. 可读性好，便于记忆",
            "B. 是计算机唯一能直接识别和执行的语言",
            "C. 不依赖具体机型",
            "D. 需要经过编译才能执行"
          ],
          correctIndex: 1,
          answer: "答案：B。机器语言由二进制构成，是唯一可直接执行的语言；它依赖机型，且不可读。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "栈这种数据结构的特点是（　）",
          options: ["A. 先进先出", "B. 后进先出", "C. 随机访问", "D. 只能顺序插入"],
          correctIndex: 1,
          answer: "答案：B。栈是后进先出（LIFO）；队列才是先进先出（FIFO）。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "云计算中直接提供可使用的应用软件的服务模式是（　）",
          options: ["A. IaaS", "B. PaaS", "C. SaaS", "D. DaaS"],
          correctIndex: 2,
          answer: "答案：C。SaaS（软件即服务）直接提供可用软件，用户无需管理底层设施。"
        }
      ]
    },
    // ---------- 二、判断题 ----------
    {
      type: "quiz",
      title: "二、判断题（共 10 题）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "个人计算机（PC）按规模分类属于微型机。",
          answer: "**正确。**按规模分为巨型机、大型机、中型机、小型机、微型机，PC 属于微型机。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "数据处理是计算机应用中应用最广泛的领域。",
          answer: "**正确。**数据处理涉及办公、管理、金融等各方面，是应用最广泛的领域。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "十进制整数转换为二进制时，应把每次除 2 的余数正序排列。",
          answer: "**错误。**应**倒序排列**（先得的余数为低位），口诀\"除 R 取余，倒序排列\"。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "操作系统是用户与计算机硬件之间的接口。",
          answer: "**正确。**操作系统屏蔽硬件细节，并为用户提供操作界面。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "分时操作系统的主要目标是保证在规定时间内作出响应。",
          answer: "**错误。**那是**实时系统**的目标；分时系统追求多用户交互、轮流使用主机。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "解释程序在翻译源程序时会生成目标文件。",
          answer: "**错误。**解释程序**逐条翻译并立即执行，不生成目标文件**；生成目标文件的是编译程序。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "算法必须在有限步骤之后结束，否则不满足有穷性。",
          answer: "**正确。**有穷性是算法的基本特征，无限循环的程序段不能称为算法。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "区块链具有去中心化和不可篡改的特点。",
          answer: "**正确。**去中心化与不可篡改是区块链最核心的两个特性。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "5G 的三大特点是高速率、低时延、大连接。",
          answer: "**正确。**这是 5G 区别于前代移动通信的核心特征。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "一个 ASCII 字符在计算机中占用 2 个字节。",
          answer: "**错误。**一个 ASCII 字符占 **1 个字节**（8 位）；占 2 个字节的是**汉字**。"
        }
      ]
    },
    // ---------- 三、综合应用题 ----------
    {
      type: "quiz",
      title: "三、综合应用（共 3 题）",
      items: [
        {
          difficulty: "advanced",
          type: "single",
          question: "某存储区存放了 3 个汉字和 6 个 ASCII 字符，共占用的字节数是（　）",
          options: ["A. 9 B", "B. 12 B", "C. 15 B", "D. 18 B"],
          correctIndex: 1,
          answer: "答案：B。3 × 2 B = 6 B（汉字），6 × 1 B = 6 B（ASCII 字符），合计 12 B。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "二进制数 \\((11101101)_2\\) 转换为十六进制是（　）",
          options: ["A. ED", "B. DE", "C. EF", "D. FE"],
          correctIndex: 0,
          answer: "答案：A。从右往左四位分组：1110 | 1101 → E | D，结果为 ED。"
        },
        {
          difficulty: "sprint",
          type: "single",
          question: "某同学收到\"银行账户异常，请点击链接核实\"的邮件，最恰当的做法是（　）",
          options: [
            "A. 立即点击链接并输入账号密码",
            "B. 通过官方 App 或客服电话自行核实，不点击邮件链接",
            "C. 转发给好友",
            "D. 直接忽略不做任何处理"
          ],
          correctIndex: 1,
          answer: "答案：B。这是典型的网络钓鱼，应通过官方渠道自行核实，绝不点击可疑链接。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "本单元核心结论速记",
      points: [
        "四代：电子管 → 晶体管 → 中小规模集成电路 → 大规模/超大规模集成电路（ENIAC = 第一代电子管）",
        "存储单位进率 **1024**；1 汉字 = 2 B，1 ASCII = 1 B",
        "数制：R→十用按权展开；十→R 用除 R 取余**倒序**；二转十六**四位一组**（从右往左）",
        "CPU = 运算器 + 控制器；主机 = CPU + 内存；ROM 断电不丢、RAM 断电丢",
        "病毒最本质特征 = 传染性；OS 五大管理 = 处存设文作；四特征 = 并发共享虚拟异步",
        "机器语言唯一可直接执行；编译有目标文件、解释无目标文件；栈 LIFO、队 FIFO",
        "大数据 4V、云 IaaS/PaaS/SaaS、物联网 RFID、区块链不可篡改、5G 高速率低时延大连接"
      ],
      mustKnow: [
        "倒序排列、1024 进率、汉字 2 字节——这三个是计算题最常设错的地方",
        "分时 vs 实时、编译 vs 解释、栈 vs 队列——这三组是辨析题高频考点"
      ]
    }
  ]
}
