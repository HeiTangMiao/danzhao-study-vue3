/**
 * 内容页面数据（content-schema 的实例）
 * 页面：操作考卡点清单（网络技术）
 * 用途：与学习软件的「卡点本」配套——把下表逐条录入复习器（正面写操作名、背面写路径或命令），
 *      系统按 SM-2 安排复习，考前自动把不熟的卡点推给你。
 * 说明：命令以 Cisco PacketTracer 与 Windows 命令行为准；考试以考场软件版本与题目要求为准。
 */
export default {
  blocks: [
    {
      type: "layout",
      as: "hero",
      props: { align: "start", tone: "accent" },
      children: [
        {
          type: "mindmap",
          title: "知识结构导图",
          mermaid: `graph LR
      N0["网络操作卡点清单"]
      N1["PacketTracer 操作"]
      N0 --> N1
      N2["设备放置 / 连线 / 命名 / 保存"]
      N1 --> N2
      N3["交换机与路由命令"]
      N0 --> N3
      N4["VLAN / 端口 / 路由 / 查看"]
      N3 --> N4
      N5["Windows 网络命令"]
      N0 --> N5
      N6["ipconfig / ping / tracert / netstat"]
      N5 --> N6
      N7["故障排查"]
      N0 --> N7
      N8["由近及远 · 分层排查"]
      N7 --> N8`
        },
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能说出 PacketTracer 从建拓扑到保存文件的完整操作顺序",
            "能默写交换机 VLAN 配置、端口划分、路由配置的常用命令",
            "能说出四个 Windows 网络命令的作用与典型输出",
            "能按「由近及远、分层排查」的思路写出网络故障的排查步骤"
          ]
        }
      ]
    },
    {
      type: "knowledge",
      title: "一、怎么用这份清单（与卡点本配套）",
      paragraphs: [
        "**网络模块的失分点有两类**：一是命令想不起来（如忘了端口划 VLAN 的第二句），二是排查没有章法（ping 不通就乱试）。本页把两类都整理成可录入的卡点。",
        "**录入方法**：复习器里「记一个卡点」——**正面写操作名或命令用途**（如「把 Fa0/1 划入 VLAN 10」），**背面写完整命令**（如 `interface fa0/1` → `switchport mode access` → `switchport access vlan 10`）。",
        "**命令类卡点建议按「顺序组」录入**：一条命令拆成三步来记比整段背更牢，翻面时能按顺序复述出来才算掌握。"] 
    },
    {
      type: "table",
      title: "二、PacketTracer 操作卡点（操作名 → 路径）",
      headers: ["操作名", "操作路径", "要点 / 易错"],
      rows: [
        ["放置设备", "底部设备栏 → 选择设备类型 → 拖入工作区", "先看清拓扑图要哪些设备（PC / 交换机 / 路由器 / 服务器）"],
        ["修改设备名称", "单击设备 → Config 选项卡 → 第一栏 Display Name", "名称必须与题目一致（如 SWA、R1），改动后拓扑图会同步显示"],
        ["选择线缆类型", "底部「闪电」图标 → 选择线型", "同类型设备用**交叉线**，不同类型设备用**直通线**；配置用配置线"],
        ["连接设备", "选中线型后分别点击两台设备的对应端口", "端口号要按题目要求选（Fa0/1、Fa0/24 等）"],
        ["配置 PC 的 IP", "单击 PC → Desktop → IP Configuration", "IP、子网掩码、网关三项都要填；网关是同网段路由器的接口地址"],
        ["打开命令提示符", "单击 PC → Desktop → Command Prompt", "在此执行 ping / ipconfig 等命令"],
        ["进入交换机 CLI", "单击交换机 → CLI 选项卡", "先回车激活，再输入 enable 进入特权模式"],
        ["保存拓扑文件", "文件 → 保存（或 Save As）", "命名与路径按题目要求（如 1.pkt），保存到考生文件夹"],
        ["校验拓扑", "View → 或直接目视核对", "设备数量、连线端口、标识名称三项逐项核对——这三项是拓扑题的主要分值"]
      ]
    },
    {
      type: "table",
      title: "三、交换机与路由配置卡点（命令 → 用途）",
      headers: ["操作名", "命令（按顺序）", "易错提醒"],
      rows: [
        ["进入特权 / 全局配置模式", "enable → configure terminal", "提示符变化：`>` → `#` → `(config)#`，看提示符确认所处模式"],
        ["创建 VLAN", "vlan 10 → exit", "创建后要到端口上「划入」，只建 VLAN 不划端口等于没配"],
        ["把端口划入 VLAN", "interface fa0/1 → switchport mode access → switchport access vlan 10", "两句缺一不可；漏了 mode access 可能不生效"],
        ["批量划分端口", "interface range fa0/1-5 → switchport mode access → switchport access vlan 10", "连续端口可用 range 一次配完"],
        ["查看 VLAN 与端口归属", "show vlan brief", "输出中能看到 VLAN 编号、名称与所属端口，是自检的主要手段"],
        ["查看全部配置", "show running-config", "确认配置是否真的写进去了；空格键翻页，q 退出"],
        ["配置路由器接口 IP", "interface fa0/0 → ip address 192.168.1.1 255.255.255.0 → no shutdown", "**no shutdown** 最易忘——接口默认关闭，不启用则链路不通"],
        ["三层交换机开启路由", "ip routing", "在全局配置模式下执行；只建 VLAN 未开路由时 VLAN 间不通"],
        ["删除配置（改错时）", "no vlan 10 / no ip address 等", "在命令前加 `no` 撤销；拿不准就用 show 先看"],
        ["保存配置", "copy running-config startup-config（或 write）", "题目要求「保存配置」时必须执行，否则重启丢失"]
      ]
    },
    {
      type: "table",
      title: "四、Windows 网络命令卡点（命令 → 作用）",
      headers: ["命令", "作用", "典型用法 / 输出要点"],
      rows: [
        ["ipconfig", "查看本机 IP 配置", "看 IP、子网掩码、默认网关是否与规划一致；`ipconfig /all` 看物理地址（MAC）"],
        ["ping", "测试与目标主机的连通性", "`ping 192.168.1.1`；显示 Reply 表示通，Request timed out 表示不通或被屏蔽"],
        ["tracert", "跟踪到目标经过的路由跳点", "`tracert 8.8.8.8`；用于判断「哪一段不通」"],
        ["netstat", "查看本机网络连接与端口状态", "`netstat -an`；排查端口是否处于监听（LISTENING）"],
        ["arp -a", "查看 IP 与 MAC 的对应表", "同网段通信依赖 ARP；表里没有对应项说明二层没通"],
        ["nslookup", "测试域名解析", "能 ping 通 IP 但打不开域名时，用它判断是否 DNS 问题"]
      ]
    },
    {
      type: "steps",
      title: "五、故障排查卡点：由近及远、分层排查（三步法）",
      items: [
        { title: "第一步：查本机", content: "用 `ipconfig` 确认 IP、掩码、网关是否正确；网线是否插好、指示灯是否亮——**先排除「自己的问题」**。" },
        { title: "第二步：测链路", content: "`ping` 网关：不通 → 问题在本地到网关之间（网线、端口、VLAN 划分、接口 shutdown）；通 → 继续下一步。" },
        { title: "第三步：测上层", content: "`ping` 外网 IP：不通 → 路由 / 出口问题；通但域名打不开 → DNS 问题，用 `nslookup` 确认。" }
      ]
    },
    {
      type: "warning",
      text: "三个高频失分点：① **接口 no shutdown 忘写**——路由器/三层交换机接口默认关闭，命令配得再对也不通；② **只建 VLAN 不划端口**——VLAN 建了但端口还在默认 VLAN 1；③ **配置完不保存**——`copy running-config startup-config` 忘了执行，题目要求「保存配置」就直接丢分。"
    },
    {
      type: "quiz",
      title: "快速检测（客观题）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "把交换机端口 Fa0/1 划入 VLAN 10 的正确命令组合是（　）",
          options: ["vlan 10 → switchport access vlan 10", "interface fa0/1 → switchport mode access → switchport access vlan 10", "interface fa0/1 → vlan 10", "switchport mode trunk → switchport access vlan 10"],
          correctIndex: 1,
          answer: "**B**。必须进入具体端口，先设为 access 模式，再指定所属 VLAN。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "查看交换机上各 VLAN 及其端口归属的命令是（　）",
          options: ["show running-config", "show vlan brief", "show ip interface", "ipconfig"],
          correctIndex: 1,
          answer: "**B**。`show vlan brief` 直接列出 VLAN 编号、名称与所属端口，是自检的常用命令。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "配置路由器接口 IP 地址后还必须执行的命令是（　）",
          options: ["no shutdown", "shutdown", "ip routing", "copy running-config startup-config"],
          correctIndex: 0,
          answer: "**A**。接口默认处于关闭状态，必须 `no shutdown` 启用；保存配置是整台设备配完后的最后一步。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "PC 能 ping 通 8.8.8.8 但打不开网页，最可能的原因是（　）",
          options: ["网线未插好", "交换机端口被 shutdown", "DNS 解析异常", "子网掩码配错"],
          correctIndex: 2,
          answer: "**C**。能通 IP 说明网络层可达；域名打不开属于名称解析问题，可用 `nslookup` 进一步确认。"
        }
      ]
    },
    {
      type: "summary",
      title: "一页速记",
      points: [
        "拓扑三步核对：**设备数量、连线端口、标识名称**——这三项是拓扑题主要分值",
        "同类型设备用**交叉线**，不同类型用**直通线**（PC↔交换机 = 直通）",
        "VLAN 两句不能少：**switchport mode access** + **switchport access vlan 10**",
        "路由器接口配完必写 **no shutdown**；整台设备配完必做 **保存配置**",
        "四个命令记用途：**ipconfig 看自己、ping 测连通、tracert 找断点、nslookup 查域名**",
        "排查三步：**查本机 → ping 网关 → ping 外网 / 查 DNS**（由近及远，别乱试）"
      ],
      formulas: [],
      mustKnow: [
        "只建 VLAN 不划端口 = 没配（端口仍在默认 VLAN 1）",
        "接口默认关闭，no shutdown 忘写则链路必然不通",
        "题目要求「保存配置」时，必须 copy running-config startup-config"
      ]
    }
  ]
}
