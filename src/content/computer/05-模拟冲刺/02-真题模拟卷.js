/**
 * 内容页面数据（content-schema 的实例）
 * 页面：真题模拟卷（一）
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》编制
 * 结构：必考模块（程序设计技能 75 分）+ 选考模块（网络技术 / 数字媒体 75 分）
 */
export default {
  blocks: [
    // ---------- 考试说明 ----------
    {
      type: "warning",
      text: "考试说明：① 考试前新建以准考证号为名称的考生文件夹；② 答题过程中注意及时保存；③ 提交前校对所有文件是否存在；④ 考试结束不得关闭计算机。满分 150 分，必考 75 分 + 选考 75 分，各模块 45 分及以上合格。"
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
          question: "下列变量名中，不符合 Python 命名规则的是（　）",
          options: ["`name_1`", "`_count`", "`stu2`", "`2stu`"],
          correctIndex: 3,
          answer: "答案：D。变量名必须以字母或下划线开头，不能以数字开头。`name_1`、`_count`、`stu2` 均合法（下划线可开头，数字只要不在首位即可）。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "表达式 `17 % 5` 的结果是（　）",
          options: ["2", "3", "3.4", "5"],
          correctIndex: 0,
          answer: "答案：A。`%` 是求余运算，17 除以 5 商 3 余 2。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "执行 `n = 5` 后执行 `n += 3`，n 的值是（　）",
          options: ["5", "3", "8", "15"],
          correctIndex: 2,
          answer: "答案：C。`n += 3` 等价于 `n = n + 3 = 8`。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\ns = 0\ni = 1\nwhile i <= 5:\n    s += i\n    i += 1\nprint(s)\n```",
          options: ["10", "15", "21", "6"],
          correctIndex: 1,
          answer: "答案：B。while 循环依次累加 1+2+3+4+5 = 15。注意循环条件是 `i <= 5`，5 也被累加；若写成 `i < 5` 结果才是 10。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "数字 789 的十位数字是（　）",
          options: ["7", "8", "9", "78"],
          correctIndex: 1,
          answer: "答案：B。`789 // 10 % 10 = 78 % 10 = 8`。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nx = 55\nif x >= 90:\n    print(\"A\")\nelif x >= 80:\n    print(\"B\")\nelif x >= 60:\n    print(\"C\")\nelse:\n    print(\"D\")\n```",
          options: ["A", "B", "C", "D"],
          correctIndex: 3,
          answer: "答案：D。55 不满足任何 if / elif 条件，执行 else 分支，输出 D。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "判断一个数是否为偶数，正确的条件是（　）",
          options: ["`n % 2 == 1`", "`n % 2 == 0`", "`n // 2 == 0`", "`n / 2 == 0`"],
          correctIndex: 1,
          answer: "答案：B。能被 2 整除（余数为 0）是偶数。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "累乘器求阶乘时，初始值应为（　）",
          options: ["0", "1", "2", "任意值"],
          correctIndex: 1,
          answer: "答案：B。累乘器初始化为 1，初始化为 0 结果恒为 0。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nfor i in range(1, 6):\n    if i % 2 == 1:\n        continue\n    print(i, end=\" \")\n```",
          options: ["2 4", "1 3 5", "1 2 3 4 5", "2 4 6"],
          correctIndex: 0,
          answer: "答案：A。`continue` 跳过奇数，只打印偶数 2、4。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "下列程序想求 1 到 100 中所有能被 3 整除的数之和，正确的是（　）",
          options: ["`sum = 0` `for i in range(1, 101):` `if i % 3 == 0:` `sum += i`", "`sum = 0` `for i in range(1, 101):` `if i / 3 == 0:` `sum += i`", "`sum = 0` `for i in range(1, 101):` `if i % 3 == 1:` `sum += i`", "`sum = 0` `for i in range(3, 100):` `sum += i`"],
          correctIndex: 0,
          answer: "答案：A。判断整除必须用取模 `%`，余数为 0 即能整除。B 用了除法 `/`，只有 i 为 0 时才成立；C 取的是除以 3 余 1 的数；D 未作判断，直接累加了 3～99 的所有整数。"
        },
        {
          difficulty: "basic",
          type: "solve",
          score: 5,
          question: "编写程序：请输入两个整数，计算并输出它们的和。要求：输入输出有提示文字，代码有注释。",
          answer: "```\n# 计算两个数的和\nnum1 = int(input(\"请输入第一个整数：\"))\nnum2 = int(input(\"请输入第二个整数：\"))\nresult = num1 + num2\nprint(\"两个数的和是：\", result)\n```"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "编写程序：请输入一个整数，判断它是奇数还是偶数并输出结果。",
          answer: "```\nnum = int(input(\"请输入一个整数：\"))\nif num % 2 == 0:\n    print(num, \"是偶数\")\nelse:\n    print(num, \"是奇数\")\n```"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "编写程序：请计算 1 到 100 的所有整数之和，并输出结果。",
          answer: "```\nsum = 0\nfor i in range(1, 101):\n    sum += i\nprint(\"1 到 100 的和是：\", sum)   # 输出 5050\n```"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "编写程序：请输入一个三位正整数，分离出其个位、十位、百位数字，并分别输出。",
          answer: "```\nnum = int(input(\"请输入一个三位正整数：\"))\nge = num % 10\nshi = num // 10 % 10\nbai = num // 100\nprint(\"百位：\", bai)\nprint(\"十位：\", shi)\nprint(\"个位：\", ge)\n```"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 5,
          question: "编写程序：请输入一个学生的成绩（0~100 之间），判断其等级并输出：90 分及以上为\"A\"，80~89 为\"B\"，60~79 为\"C\"，60 分以下为\"D\"。",
          answer: "```\nscore = int(input(\"请输入成绩（0~100）：\"))\nif score >= 90:\n    print(\"等级：A\")\nelif score >= 80:\n    print(\"等级：B\")\nelif score >= 60:\n    print(\"等级：C\")\nelse:\n    print(\"等级：D\")\n```"
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
          question: "用于连接不同网络、实现网段间数据转发的设备是（　）",
          options: ["交换机", "集线器", "路由器", "中继器"],
          correctIndex: 2,
          answer: "答案：C。路由器工作在网络层，负责不同网络之间的转发与路径选择。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在特权模式下，查看交换机当前运行配置的命令是（　）",
          options: ["`show running-config`", "`show ip route`", "`configure terminal`", "`enable`"],
          correctIndex: 0,
          answer: "答案：A。`show running-config` 查看当前生效的配置；B 查看路由表，C 进入全局配置模式，D 由用户模式进入特权模式。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "查看交换机上 VLAN 编号与端口归属的命令是（　）",
          options: ["`show vlan brief`", "`show ip route`", "`show version`", "`show interface fa0/1`"],
          correctIndex: 0,
          answer: "答案：A。`show vlan brief` 列出各 VLAN 及所属端口。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "关于交换机 access 端口与 trunk 端口的区别，下列说法正确的是（　）",
          options: ["access 端口只能属于一个 VLAN，trunk 端口可承载多个 VLAN", "access 端口的传输速率比 trunk 端口更高", "trunk 端口只能用于连接 PC 等终端设备", "两种端口在功能上没有区别"],
          correctIndex: 0,
          answer: "答案：A。access 端口用于接入终端，只属于一个 VLAN；trunk 端口用于交换机之间互联，可同时承载多个 VLAN 的数据。速率与端口模式无关。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "配置静态路由时，命令末尾填写的\"下一跳\"指的是（　）",
          options: ["本路由器出口接口的 IP 地址", "相邻路由器与本路由器直连的那个接口的 IP 地址", "目标网络里某台主机的 IP 地址", "本网络的默认网关 MAC 地址"],
          correctIndex: 1,
          answer: "答案：B。\"下一跳\"是数据包要交给的下一台路由器、且与该路由器直连的那个接口的 IP 地址；不是本端接口 IP，也不是最终目标主机 IP。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 RIP 配置中输入 `network 192.168.1.0` 的作用是（　）",
          options: ["设置该路由器的默认网关", "宣告与本路由器直连的网段，使其参与 RIP 通告", "指定去往该网段的下一跳地址", "设置该网段的子网掩码"],
          correctIndex: 1,
          answer: "答案：B。RIP 用 `network` 宣告本路由器直连的主类网段，宣告后该网段才会被通告给邻居；下一跳、掩码不在这里配置。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "跟踪数据包到目标主机所经过路径的命令是（　）",
          options: ["ping", "tracert", "ipconfig", "netstat"],
          correctIndex: 1,
          answer: "答案：B。`tracert` 显示沿途各跳点，用于判断在哪一段不通。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "关于 HTTPS 与 HTTP 的区别，下列说法正确的是（　）",
          options: ["HTTPS 的默认端口是 80", "HTTPS 通过 SSL/TLS 对传输内容加密", "HTTPS 不需要证书即可启用", "HTTPS 只能用于文件下载"],
          correctIndex: 1,
          answer: "答案：B。HTTPS = HTTP + SSL/TLS，对传输内容加密并用证书验证服务器身份，默认端口 443（HTTP 为 80）。A 错在端口；C 错在证书（必须有）；D 错在用途（浏览网页即常用）。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "完成命令填空：\n`SWA(config)#______`（创建 VLAN 20）\n`SWA#______`（查看 VLAN 信息）",
          answer: "`vlan 20`；`show vlan brief`。创建 VLAN 用 `vlan 编号`；查看用 `show vlan brief`。"
        },
        {
          difficulty: "medium",
          type: "fill",
          score: 5,
          question: "完成命令填空：\n`RA(config)#______`（进入接口 F0/0）\n`RA(config-if)#______`（配置地址 192.168.2.1/24）",
          answer: "`interface f0/0`；`ip address 192.168.2.1 255.255.255.0`。注意接口配完还需 `no shutdown`。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          score: 5,
          question: "完成命令填空：\n`SWD(config)#______`（进入 VLAN 10 的接口）\n`SWD(config-if)#______`（配置地址 192.168.10.1/24）",
          answer: "`interface vlan 10`；`ip address 192.168.10.1 255.255.255.0`。三层交换机通过 SVI 实现 VLAN 间路由。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          score: 5,
          question: "完成命令填空：\n`RA(config)#______`（进入 RIP 配置模式）\n`RA(config-router)#______`（宣告网络 192.168.1.0）",
          answer: "`router rip`；`network 192.168.1.0`。进入协议配置模式后用 network 宣告直连网段。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          score: 5,
          question: "完成命令填空：\n`RB(config)#______`（进入 RIP 配置模式）\n`RB(config-router)#______`（取消自动汇总）",
          answer: "`router rip`；`no auto-summary`。取消自动汇总可避免不连续子网的路由汇总问题。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "简述用 ping 命令排查\"PC 无法访问互联网\"的步骤。",
          answer: "① ipconfig 查看配置；② ping 127.0.0.1 测试本机协议栈；③ ping 网关测试局域网；④ ping 外网 IP 测试互联网；⑤ ping 域名测试 DNS。逐级定位故障点。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 5,
          question: "简述在 Windows Server 2008 中安装 DHCP 服务并新建作用域（起始 192.168.30.2，结束 192.168.30.253，掩码 255.255.255.0，排除 192.168.30.100-110）的步骤。",
          answer: "① 服务器管理器→添加角色→安装 DHCP；② 打开 DHCP 控制台→新建作用域；③ 设起始 192.168.30.2、结束 192.168.30.253、掩码 255.255.255.0；④ 添加排除 192.168.30.100-110；⑤ 配置作用域选项（网关、DNS）；⑥ 激活作用域。"
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
          question: "用于印刷的图像，其分辨率通常不低于（　）",
          options: ["72 像素/英寸", "150 像素/英寸", "300 像素/英寸", "30 像素/英寸"],
          correctIndex: 2,
          answer: "答案：C。印刷通常要求 300 像素/英寸以上；72 像素/英寸用于屏幕显示。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Photoshop 中绘制正方形选区，应使用的工具是（　）",
          options: ["椭圆选框工具", "矩形选框工具", "套索工具", "魔棒工具"],
          correctIndex: 1,
          answer: "答案：B。矩形选框工具绘制矩形/正方形；椭圆选框工具按住 Shift 得到正圆。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Photoshop 中取消当前选区的快捷键是（　）",
          options: ["Ctrl+A", "Ctrl+D", "Ctrl+Shift+I", "Ctrl+J"],
          correctIndex: 1,
          answer: "答案：B。Ctrl+D 取消选择；Ctrl+Shift+I 反选；Ctrl+J 复制图层。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中把当前图层与下方图层合并，应使用（　）",
          options: ["Ctrl+E", "Ctrl+J", "Ctrl+G", "Ctrl+Shift+E"],
          correctIndex: 0,
          answer: "答案：A。Ctrl+E 向下合并；Ctrl+Shift+E 合并可见图层；Ctrl+G 编组。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中，要使选区边缘过渡柔和、不生硬，应进行（　）操作",
          options: ["羽化", "锐化", "反相", "去色"],
          correctIndex: 0,
          answer: "答案：A。羽化（Feather）使选区边缘产生渐变过渡，抠图后边缘更自然；锐化增强清晰度，反相与去色只改变颜色。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Premiere 中应用默认视频过渡（交叉溶解）的快捷键是（　）",
          options: ["Ctrl+D", "Ctrl+Shift+D", "Ctrl+M", "Ctrl+T"],
          correctIndex: 0,
          answer: "答案：A。Ctrl+D 应用默认视频过渡；Ctrl+Shift+D 应用默认音频过渡。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "在 Premiere 中要让字幕从画面左侧飞入，应设置（　）属性的关键帧",
          options: ["位置", "不透明度", "缩放", "旋转"],
          correctIndex: 0,
          answer: "答案：A。位移类动画由「位置」属性的关键帧产生（起点在画外、终点在画内）；不透明度控制淡入淡出，缩放控制大小，旋转控制角度。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "在 Premiere 中把某个片段的速度改为 2 倍，应使用（　）",
          options: ["速度/持续时间", "音频增益", "交叉溶解", "导出媒体"],
          correctIndex: 0,
          answer: "答案：A。右键片段 → 速度/持续时间（Ctrl+R）可调整快慢放。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "在 Photoshop 中新建 700×1000 像素、分辨率 72 的画布，命名为\"剪纸\"。请写出操作步骤。",
          answer: "文件→新建 → 宽度 700、高度 1000 像素、分辨率 72 → 命名\"剪纸\" → 确定。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "在 Photoshop 中绘制 500×500 像素、填充 #1e2d4c、无描边的椭圆形状。请写出操作步骤。",
          answer: "椭圆工具 → 形状模式 → 填充 #1e2d4c、描边无 → 设宽高 500×500 → 画布点击创建。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 5,
          question: "在 Photoshop 中添加直排文字\"手艺\"，华文行楷，36 点大小，文字间距 -100。请写出操作步骤。",
          answer: "直排文字工具 → 输入\"手艺\" → 字符面板设华文行楷 36 点 → 字距 -100 → Ctrl+Enter 确认。"
        },
        {
          difficulty: "medium",
          type: "solve",
          score: 5,
          question: "在 Premiere 中建立自定义大小 640×360 像素、帧速率 25 的项目，命名为\"剪纸.prproj\"。请写出操作步骤。",
          answer: "文件→新建→项目命名\"剪纸\" → 文件→新建→序列，自定义 640×360、帧速率 25 → 保存为剪纸.prproj。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 5,
          question: "在 Premiere 中新建字幕，内容\"匠心向党 技能报国\"，黑体，字体大小 72，字距 5，线性渐变 #FFFFFF 到 #C62828，并添加黑色描边。请写出操作步骤。",
          answer: "文件→新建→字幕 → 输入文字\"匠心向党 技能报国\" → 设黑体、字号 72、字距 5 → 填充设为线性渐变 #FFFFFF→#C62828 → 勾选描边并设黑色、调整宽度 → 保存为字幕.prtl。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 5,
          question: "在 Premiere 中将 bgm.mp3 拖入音轨 1 的 0 秒处，裁剪到适合长度，开头结尾添加恒定增益效果。请写出操作步骤。",
          answer: "拖入音频 1 轨道 0 秒处 → 剃刀裁剪多余部分 → 开头拖入恒定增益实现淡入 → 结尾拖入恒定增益实现淡出。"
        },
        {
          difficulty: "advanced",
          type: "solve",
          score: 5,
          question: "在 Premiere 中渲染导出视频为\"剪纸.mp4\"格式。请写出操作步骤。",
          answer: "文件→导出→媒体 → 选择格式 H.264（mp4）→ 设置输出名称\"剪纸.mp4\" → 导出。"
        }
      ]
    }
  ]
}
