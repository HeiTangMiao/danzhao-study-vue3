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
          question: "下列变量名中，合法的是（　）",
          options: ["A. 2num", "B. my-name", "C. student_name", "D. for"],
          correctIndex: 2,
          answer: "答案：C。student_name 合法；`for` 是关键字，`2num` 以数字开头，`my-name` 含非法字符。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "表达式 `10 % 3` 的结果是（　）",
          options: ["A. 1", "B. 3", "C. 3.33", "D. 0"],
          correctIndex: 0,
          answer: "答案：A。`%` 是求余运算，10 除以 3 余 1。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "执行 `n = 5` 后执行 `n += 3`，n 的值是（　）",
          options: ["A. 5", "B. 3", "C. 8", "D. 15"],
          correctIndex: 2,
          answer: "答案：C。`n += 3` 等价于 `n = n + 3 = 8`。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nsum = 0\nfor i in range(1, 5):\n    sum += i\nprint(sum)\n```",
          options: ["A. 10", "B. 15", "C. 6", "D. 4"],
          correctIndex: 0,
          answer: "答案：A。range(1, 5) 生成 1、2、3、4，累加得 10。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "数字 789 的十位数字是（　）",
          options: ["A. 7", "B. 8", "C. 9", "D. 78"],
          correctIndex: 1,
          answer: "答案：B。`789 // 10 % 10 = 78 % 10 = 8`。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nx = 75\nif x >= 90:\n    print(\"A\")\nelif x >= 80:\n    print(\"B\")\nelif x >= 60:\n    print(\"C\")\nelse:\n    print(\"D\")\n```",
          options: ["A. A", "B. B", "C. C", "D. D"],
          correctIndex: 2,
          answer: "答案：C。75 满足 ≥60，输出 C。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "判断一个数是否为偶数，正确的条件是（　）",
          options: ["A. `n % 2 == 1`", "B. `n % 2 == 0`", "C. `n // 2 == 0`", "D. `n / 2 == 0`"],
          correctIndex: 1,
          answer: "答案：B。能被 2 整除（余数为 0）是偶数。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "累乘器求阶乘时，初始值应为（　）",
          options: ["A. 0", "B. 1", "C. 2", "D. 任意值"],
          correctIndex: 1,
          answer: "答案：B。累乘器初始化为 1，初始化为 0 结果恒为 0。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "执行以下代码，输出结果是（　）\n```\nfor i in range(1, 6):\n    if i % 2 == 1:\n        continue\n    print(i, end=\" \")\n```",
          options: ["A. 2 4", "B. 1 3 5", "C. 1 2 3 4 5", "D. 2 4 6"],
          correctIndex: 0,
          answer: "答案：A。`continue` 跳过奇数，只打印偶数 2、4。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "下列程序想求 1 到 100 中所有偶数的和，正确的是（　）",
          options: ["A. `sum = 0` `for i in range(1, 101):` `if i % 2 == 0:` `sum += i`", "B. `sum = 0` `for i in range(1, 101, 2):` `sum += i`", "C. `sum = 1` `for i in range(1, 101):` `if i % 2 == 0:` `sum += i`", "D. A 和 B 都对"],
          correctIndex: 0,
          answer: "答案：A。A 判断偶数累加正确；B 取的是奇数；C 累加器初始化为 1 错误。"
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
          options: ["A. 交换机", "B. 集线器", "C. 路由器", "D. 中继器"],
          correctIndex: 2,
          answer: "答案：C。路由器工作在网络层，负责不同网络之间的转发与路径选择。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "提示符为 `Switch(config)#` 时，当前处于（　）",
          options: ["A. 用户模式", "B. 特权模式", "C. 全局配置模式", "D. 接口配置模式"],
          correctIndex: 2,
          answer: "答案：C。`(config)#` 是全局配置模式。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "查看交换机上 VLAN 编号与端口归属的命令是（　）",
          options: ["A. `show vlan brief`", "B. `show ip route`", "C. `show version`", "D. `show interface fa0/1`"],
          correctIndex: 0,
          answer: "答案：A。`show vlan brief` 列出各 VLAN 及所属端口。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "连接两台交换机并传输多个 VLAN 数据的端口应设为（　）",
          options: ["A. access", "B. trunk", "C. console", "D. vlan"],
          correctIndex: 1,
          answer: "答案：B。trunk 端口承载多个 VLAN。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "配置默认路由的命令是（　）",
          options: ["A. `ip route 0.0.0.0 0.0.0.0 下一跳`", "B. `ip route 192.168.1.0 255.255.255.0 下一跳`", "C. `default route`", "D. `route default`"],
          correctIndex: 0,
          answer: "答案：A。默认路由目标网络和掩码均为 0.0.0.0。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "进入 RIP 路由配置模式的命令是（　）",
          options: ["A. `router rip`", "B. `rip enable`", "C. `configure rip`", "D. `ip rip`"],
          correctIndex: 0,
          answer: "答案：A。`router rip` 进入 RIP 配置模式。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "跟踪数据包到目标主机所经过路径的命令是（　）",
          options: ["A. ping", "B. tracert", "C. ipconfig", "D. netstat"],
          correctIndex: 1,
          answer: "答案：B。`tracert` 显示沿途各跳点，用于判断在哪一段不通。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "将域名解析为 IP 地址的服务是（　）",
          options: ["A. DHCP", "B. FTP", "C. DNS", "D. HTTP"],
          correctIndex: 2,
          answer: "答案：C。DNS 负责域名与 IP 地址的相互解析。"
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
          options: ["A. 72 像素/英寸", "B. 150 像素/英寸", "C. 300 像素/英寸", "D. 30 像素/英寸"],
          correctIndex: 2,
          answer: "答案：C。印刷通常要求 300 像素/英寸以上；72 像素/英寸用于屏幕显示。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Photoshop 中绘制正方形选区，应使用的工具是（　）",
          options: ["A. 椭圆选框工具", "B. 矩形选框工具", "C. 套索工具", "D. 魔棒工具"],
          correctIndex: 1,
          answer: "答案：B。矩形选框工具绘制矩形/正方形；椭圆选框工具按住 Shift 得到正圆。"
        },
        {
          difficulty: "basic",
          type: "single",
          score: 5,
          question: "在 Photoshop 中取消当前选区的快捷键是（　）",
          options: ["A. Ctrl+A", "B. Ctrl+D", "C. Ctrl+Shift+I", "D. Ctrl+J"],
          correctIndex: 1,
          answer: "答案：B。Ctrl+D 取消选择；Ctrl+Shift+I 反选；Ctrl+J 复制图层。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Photoshop 中把当前图层与下方图层合并，应使用（　）",
          options: ["A. Ctrl+E", "B. Ctrl+J", "C. Ctrl+G", "D. Ctrl+Shift+E"],
          correctIndex: 0,
          answer: "答案：A。Ctrl+E 向下合并；Ctrl+Shift+E 合并可见图层；Ctrl+G 编组。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "文字竖排显示应使用（　）",
          options: ["A. 横排文字工具", "B. 直排文字工具", "C. 段落文字", "D. 钢笔工具"],
          correctIndex: 1,
          answer: "答案：B。直排文字工具。"
        },
        {
          difficulty: "medium",
          type: "single",
          score: 5,
          question: "在 Premiere 中应用默认视频过渡（交叉溶解）的快捷键是（　）",
          options: ["A. Ctrl+D", "B. Ctrl+Shift+D", "C. Ctrl+M", "D. Ctrl+T"],
          correctIndex: 0,
          answer: "答案：A。Ctrl+D 应用默认视频过渡；Ctrl+Shift+D 应用默认音频过渡。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "去除视频中白色背景应使用（　）特效",
          options: ["A. 颜色键", "B. 亮度与对比度", "C. 模糊", "D. 锐化"],
          correctIndex: 0,
          answer: "答案：A。颜色键去背景。"
        },
        {
          difficulty: "advanced",
          type: "single",
          score: 5,
          question: "在 Premiere 中把某个片段的速度改为 2 倍，应使用（　）",
          options: ["A. 速度/持续时间", "B. 音频增益", "C. 交叉溶解", "D. 导出媒体"],
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
          question: "在 Premiere 中新建字幕，内容\"民间手艺 剪纸\"，隶书，字体大小 65，字距 -10，线性渐变 #FDFDC8 到 #FDC177，并添加阴影。请写出操作步骤。",
          answer: "文件→新建→字幕 → 输入文字 → 设隶书 65、字距 -10 → 填充线性渐变 #FDFDC8→#FDC177 → 勾选阴影 → 保存为字幕.prtl。"
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
