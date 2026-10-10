/**
 * 内容页面数据（content-schema 的实例）
 * 页面：真题模拟卷（二）
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》编制
 * 结构：必考模块（程序设计技能 75 分）+ 选考模块（网络技术 / 数字媒体 各 75 分）
 * 与卷（一）零重复：全部换新考点与新素材情境
 */
export default {
  blocks: [
    // ---------- 考试说明 ----------
    {
      type: "warning",
      text: "考试说明：① 考试前新建以准考证号为名称的考生文件夹，素材先复制进考生文件夹再操作；② 答题过程中随时保存（Ctrl+S）；③ 提交前逐个核对文件名与扩展名；④ 考试结束不得关闭计算机。满分 150 分，必考 75 分 + 选考 75 分，各模块 45 分及以上合格。"
    },
    // ---------- 必考模块：程序设计技能 ----------
    {
      type: "exam",
      title: "必考模块 · 程序设计技能（75 分）",
      duration: 45,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "Python 中用于求余数的运算符是（　）",
          options: ["A. /", "B. //", "C. %", "D. **"],
          correctIndex: 2,
          answer: "答案：C。`%` 是求余运算符；`//` 是整除，`**` 是幂运算。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "表达式 `3 + 4 * 2` 的值是（　）",
          options: ["A. 14", "B. 11", "C. 10", "D. 9"],
          correctIndex: 1,
          answer: "答案：B。乘法优先于加法，先算 `4 * 2 = 8`，再算 `3 + 8 = 11`。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "下列 Python 数据类型中，属于序列类型的是（　）",
          options: ["A. int", "B. str", "C. bool", "D. float"],
          correctIndex: 1,
          answer: "答案：B。字符串（str）是序列，可按下标取字符；int、bool、float 都是数值型。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "执行 `print(\"5\" + \"3\")` 的输出结果是（　）",
          options: ["A. 8", "B. 53", "C. 5 3", "D. 程序报错"],
          correctIndex: 1,
          answer: "答案：B。两个字符串相加是拼接，结果为 `53`（不是数值相加）。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "下列变量名中，在 Python 中**不合法**的是（　）",
          options: ["A. _count", "B. num1", "C. 1num", "D. total_sum"],
          correctIndex: 2,
          answer: "答案：C。变量名不能以数字开头；其余三个均合法。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "`range(1, 5)` 可以生成的整数共有（　）",
          options: ["A. 3 个", "B. 4 个", "C. 5 个", "D. 6 个"],
          correctIndex: 1,
          answer: "答案：B。range 含头不含尾，生成 1、2、3、4 共 4 个。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "`if x = 5:` 这一行的错误原因是（　）",
          options: ["A. 缺少冒号", "B. 条件中误用了赋值运算符", "C. 变量 x 未定义", "D. 缩进不正确"],
          correctIndex: 1,
          answer: "答案：B。判断相等应写 `==`，`=` 是赋值运算符，不能出现在 if 条件中。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行 `for i in range(3): print(i, end=\"\")`，输出结果是（　）",
          options: ["A. 012", "B. 123", "C. 0123", "D. 1234"],
          correctIndex: 0,
          answer: "答案：A。range(3) 生成 0、1、2，`end=\"\"` 表示不换行，故输出 `012`。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "补全代码，使其输出 1 到 10 的累加和：\n```\ns = 0\nfor i in range(1, 11):\n    ＿＿＿＿\nprint(s)\n```",
          answer: "答案：`s += i`（等价于 `s = s + i`）。循环中把每个 i 累加到 s 上，最后 s 为 55。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "编写一段 Python 代码：输入一个整数，判断它是偶数还是奇数并输出结果。请写出完整代码。",
          answer: "答案：\n```\nn = int(input(\"请输入一个整数：\"))\nif n % 2 == 0:\n    print(\"偶数\")\nelse:\n    print(\"奇数\")\n```\n要点：① 用 `int()` 把输入转换为整数；② 用 `n % 2 == 0` 判断偶数。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "用 while 循环编写代码，计算 1 + 2 + 3 + … + 100 的和并输出。请写出完整代码。",
          answer: "答案：\n```\ns = 0\ni = 1\nwhile i <= 100:\n    s += i\n    i += 1\nprint(s)\n```\n要点：循环变量 i 必须在循环体内自增，否则会死循环；结果应为 5050。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "下面的程序运行后报错，请指出原因并改正：\n```\nn = input(\"请输入一个数：\")\nprint(n + 1)\n```",
          answer: "答案：原因：`input()` 返回的是**字符串**，字符串不能与整数相加。改正：先转换类型，`n = int(input(\"请输入一个数：\"))`，再执行 `print(n + 1)`。"
        }
      ]
    },
    // ---------- 选考模块：计算机网络技术 ----------
    {
      type: "exam",
      title: "选考模块 · 计算机网络技术（75 分）",
      duration: 45,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "双绞线按 T568B 标准制作时，第 1 脚的颜色是（　）",
          options: ["A. 白橙", "B. 橙", "C. 白绿", "D. 绿"],
          correctIndex: 0,
          answer: "答案：A。T568B 线序：白橙、橙、白绿、蓝、白蓝、绿、白棕、棕。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "交换机工作在 OSI 参考模型的（　）",
          options: ["A. 物理层", "B. 数据链路层", "C. 网络层", "D. 传输层"],
          correctIndex: 1,
          answer: "答案：B。交换机依据 MAC 地址转发，属于数据链路层设备。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "下列 IP 地址中属于私有地址的是（　）",
          options: ["A. 8.8.8.8", "B. 192.168.1.1", "C. 202.96.1.1", "D. 114.114.114.114"],
          correctIndex: 1,
          answer: "答案：B。私有地址段为 10.0.0.0/8、172.16.0.0/12、192.168.0.0/16。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "路由器的主要功能是（　）",
          options: ["A. 放大信号延长传输距离", "B. 连接不同网络并选择转发路径", "C. 为终端分配带宽", "D. 把光信号转换为电信号"],
          correctIndex: 1,
          answer: "答案：B。路由器工作在网络层，负责跨网段转发并选择路径。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 PacketTracer 中为 PC 配置 IP 地址，应打开（　）",
          options: ["A. Physical 选项卡", "B. Desktop → IP Configuration", "C. CLI 选项卡", "D. Services 选项卡"],
          correctIndex: 1,
          answer: "答案：B。PC 的 IP 配置入口是 Desktop 选项卡下的 IP Configuration。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "用于测试与目标主机连通性的命令是（　）",
          options: ["A. ipconfig", "B. ping", "C. netstat", "D. dir"],
          correctIndex: 1,
          answer: "答案：B。`ping` 发送 ICMP 报文测试连通性；`ipconfig` 查看本机 IP 配置。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "划分 VLAN 的主要作用是（　）",
          options: ["A. 提高网速", "B. 隔离广播域、增强安全性与管理灵活性", "C. 对数据加密", "D. 自动分配 IP 地址"],
          correctIndex: 1,
          answer: "答案：B。VLAN 把一个物理网络划分为多个逻辑网络，隔离广播域。"
        },
        {
          difficulty: "basic",
          type: "judge",
          score: 5,
          question: "同一网段内的两台 PC 相互通信必须经过路由器。",
          answer: "**错误。**同一网段内主机通过交换机即可直接通信，只有跨网段通信才需要经过路由器。"
        },
        {
          difficulty: "basic",
          type: "judge",
          score: 5,
          question: "子网掩码 255.255.255.0 表示 IP 地址的前 24 位是网络号。",
          answer: "**正确。**255.255.255.0 对应 24 个 1，故前 24 位为网络号，后 8 位为主机号。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "在 PacketTracer 中，把某台 PC 的 IP 设为 192.168.1.10、子网掩码设为 255.255.255.0，并与同网段的另一台 PC 测试连通性。请写出主要操作步骤。",
          answer: "答案：① 打开 PC 的 Desktop → IP Configuration，填写 IP 192.168.1.10 与 Subnet Mask 255.255.255.0；② 用同样方法给另一台 PC 配置 192.168.1.11/255.255.255.0；③ 打开第一台 PC 的 Command Prompt，输入 `ping 192.168.1.11`；④ 若显示 Reply，说明连通正常，保存文件。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "简述在交换机上创建 VLAN 10 并把端口 Fa0/1 划入该 VLAN 的主要命令。",
          answer: "答案：\n```\nSwitch> enable\nSwitch# configure terminal\nSwitch(config)# vlan 10\nSwitch(config-vlan)# exit\nSwitch(config)# interface fa0/1\nSwitch(config-if)# switchport mode access\nSwitch(config-if)# switchport access vlan 10\nSwitch(config-if)# end\n```\n要点：先建 VLAN，再进端口并指定 access 模式与所属 VLAN。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "某台 PC 无法访问网络，请写出至少三条排查思路（可包含所用命令）。",
          answer: "答案：① 查本机 IP 配置是否正确（`ipconfig`，确认 IP、子网掩码、网关）；② `ping` 网关测试链路是否通，不通则检查网线/端口/VLAN 划分；③ `ping` 外网地址或域名，判断是链路问题还是 DNS 问题；④ 检查是否插错端口、网线是否损坏、指示灯是否正常。"
        }
      ]
    },
    // ---------- 选考模块：数字媒体技术 ----------
    {
      type: "exam",
      title: "选考模块 · 数字媒体技术（75 分）",
      duration: 45,
      totalScore: 75,
      passingScore: 45,
      items: [
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "下列图片格式中支持透明背景且适合网页使用的是（　）",
          options: ["A. PSD", "B. PNG", "C. BMP", "D. TIFF"],
          correctIndex: 1,
          answer: "答案：B。PNG 支持透明通道、体积适中，适合网页；PSD 是工程文件，BMP/TIFF 体积大。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "位图图像放大后出现锯齿或马赛克，主要原因是（　）",
          options: ["A. 分辨率过高", "B. 图像由像素点构成", "C. 色彩模式错误", "D. 压缩过度"],
          correctIndex: 1,
          answer: "答案：B。位图由固定数量的像素构成，放大时像素被拉伸故出现锯齿。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "用于印刷输出的图像通常采用的色彩模式是（　）",
          options: ["A. RGB", "B. CMYK", "C. 灰度", "D. 索引颜色"],
          correctIndex: 1,
          answer: "答案：B。印刷用青、品红、黄、黑四色油墨，故用 CMYK；RGB 用于屏幕显示。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Photoshop 中处理图片后，若希望保留图层以便下次继续编辑，应保存为（　）",
          options: ["A. JPG", "B. PSD", "C. GIF", "D. PNG"],
          correctIndex: 1,
          answer: "答案：B。PSD 是 Photoshop 的工程格式，可完整保留图层、蒙版等信息。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "Premiere 中序列帧率 25fps 表示（　）",
          options: ["A. 每秒播放 25 帧画面", "B. 每帧持续 25 秒", "C. 视频总时长 25 秒", "D. 视频码率为 25 Mbps"],
          correctIndex: 0,
          answer: "答案：A。fps 即每秒帧数，25fps 表示每秒 25 帧。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "从纯色背景的产品图中快速抠出主体，最合适的工具是（　）",
          options: ["A. 魔棒工具 / 快速选择工具", "B. 画笔工具", "C. 横排文字工具", "D. 渐变工具"],
          correctIndex: 0,
          answer: "答案：A。纯色背景与主体颜色差异明显，用魔棒或快速选择可快速选中背景并删除。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "视频导出为 mp4 文件时，最常用的视频编码格式是（　）",
          options: ["A. H.264", "B. PSD", "C. WAV", "D. RAW"],
          correctIndex: 0,
          answer: "答案：A。H.264 是 mp4 容器中最常用的视频编码，兼顾画质与体积。"
        },
        {
          difficulty: "basic",
          type: "judge",
          score: 5,
          question: "GIF 格式支持动画，且最多只能显示 256 种颜色。",
          answer: "**正确。**GIF 采用 8 位索引色，最多 256 色，并支持逐帧动画。"
        },
        {
          difficulty: "medium",
          type: "judge",
          score: 5,
          question: "在 Photoshop 中删除了某个图层之后，除撤销以外没有任何办法找回。",
          answer: "**错误。**可通过「历史记录」面板回退到删除前的状态（历史记录保留的步骤范围内）。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "在 Photoshop 中新建一张 800×600 像素、分辨率 72 像素/英寸、RGB 模式的图像，并在画面中央绘制一个红色圆形（无描边）。请写出主要操作步骤。",
          answer: "答案：① 文件 → 新建，设置宽度 800 像素、高度 600 像素、分辨率 72、颜色模式 RGB，确定；② 选择「椭圆选框工具」，按住 Shift 拖动绘制正圆选区（可从中心向外拖以定位中央）；③ 设置前景色为红色，执行「编辑 → 填充 → 前景色」；④ 选择 → 取消选择，文件 → 存储为（PSD 便于修改，JPG/PNG 用于提交）。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 10,
          question: "在 Premiere 中为一段视频添加淡出效果并导出为 mp4，请写出主要步骤。",
          answer: "答案：① 把素材拖入时间线并裁剪到所需长度；② 在「效果」面板搜索「交叉溶解」或「黑场过渡」，拖到视频末尾；③ 拖动过渡边缘调整淡出长度；④ 文件 → 导出 → 媒体，格式选 H.264（mp4），设置输出名称与路径，导出。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 10,
          question: "结合考试要求，说明操作考中素材与文件保存的注意事项（至少四点）。",
          answer: "答案：① 拿到素材后先复制到以准考证号命名的考生文件夹，在副本上操作，不动原始素材；② 文件名严格按题目要求（含扩展名），不使用特殊字符与空格；③ 制作过程中养成「随做随存」（Ctrl+S）的习惯，重大步骤后再另存备份；④ 提交前逐个核对文件是否存在、命名是否正确、能否正常打开；⑤ 保留 PSD/PRPROJ 源文件与导出的成品文件，勿只交其中一种。"
        }
      ]
    }
  ]
}
