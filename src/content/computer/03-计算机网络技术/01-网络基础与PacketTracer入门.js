/**
 * 内容页面数据（content-schema 的实例）
 * 页面：网络基础与 PacketTracer 入门
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》计算机网络技术技能模块编制
 */
export default {
  id: "computer-03-01",
  unitNum: "03",
  subject: "computer",
  title: "网络基础与 PacketTracer 入门",
  subtitle: "网络概念、IP 地址与模拟器使用",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["网络基础与 PacketTracer 入门"]
  N1["网络基本概念"]
  N0 --> N1
  N2["局域网 LAN"]
  N1 --> N2
  N3["广域网 WAN"]
  N1 --> N3
  N4["IP 地址"]
  N0 --> N4
  N5["IPv4 结构"]
  N4 --> N5
  N6["子网掩码"]
  N4 --> N6
  N7["网关"]
  N4 --> N7
  N8["网络设备"]
  N0 --> N8
  N9["交换机"]
  N8 --> N9
  N10["路由器"]
  N8 --> N10
  N11["PC 终端"]
  N8 --> N11
  N12["PacketTracer"]
  N0 --> N12
  N13["工作界面"]
  N12 --> N13
  N14["设备选型"]
  N12 --> N14
  N15["连线方式"]
  N12 --> N15
  N16["配置模式"]
  N0 --> N16
  N17["用户模式"]
  N16 --> N17
  N18["特权模式"]
  N16 --> N18
  N19["全局模式"]
  N16 --> N19`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "了解局域网、广域网等网络基本概念",
        "掌握 IP 地址、子网掩码、网关的作用与配置方法",
        "认识交换机、路由器等网络设备及其作用",
        "掌握 PacketTracer 的基本操作：设备选型、连线、进入配置模式"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "网络基本概念",
      paragraphs: [
        "**局域网（LAN）：**覆盖范围较小的网络，如一个机房、一栋楼内的网络。",
        "**广域网（WAN）：**覆盖范围大的网络，如连接不同城市的网络，互联网是最大的广域网。",
        "**网络拓扑：**网络中设备连接的物理结构，常见有星型、总线型、环型、网状型。",
        "**考试环境：**PacketTracer 6.0 中搭建网络拓扑，考核\"建网、管网、用网\"能力。"
      ]
    },
    {
      type: "knowledge",
      title: "IP 地址",
      paragraphs: [
        "**IPv4 地址：**由 4 组 0~255 的数字组成，用点分隔，如 `192.168.10.1`。",
        "**子网掩码：**用于区分网络位和主机位，如 `255.255.255.0`（即 /24），前 24 位是网络位。",
        "**网关：**连接不同网络的出口设备地址，PC 访问其他网络时数据先发给网关。",
        "**IP 配置三要素：**IP 地址、子网掩码、默认网关，三者必须正确配置才能正常通信。"
      ]
    },
    {
      type: "table",
      title: "常见网络设备",
      headers: ["设备", "作用", "工作层次", "典型配置"],
      rows: [
        ["交换机 Switch", "连接同一局域网内的设备，转发数据帧", "数据链路层", "VLAN、Trunk、端口聚合"],
        ["路由器 Router", "连接不同网络，选择路径转发数据包", "网络层", "静态路由、RIP、默认路由"],
        ["PC 终端", "用户使用的计算机", "—", "IP、子网掩码、网关"],
        ["服务器 Server", "提供服务（WWW、FTP、DNS、DHCP）", "—", "服务安装与配置"]
      ]
    },
    {
      type: "warning",
      text: "交换机与路由器要分清：交换机管\"局域网内部\"通信，路由器管\"不同网络之间\"通信。考试拓扑中，PC 连交换机，交换机连路由器。"
    },
    {
      type: "knowledge",
      title: "PacketTracer 基本操作",
      paragraphs: [
        "**设备选型：**在左下角设备栏选择设备类型（交换机、路由器、PC、服务器），拖到工作区。",
        "**连线方式：**PC 用直通线（Straight-through）连接交换机；交换机之间、交换机与路由器之间用交叉线或直通线（视设备而定）。",
        "**设备标识：**双击设备可修改名称，考试要求设备标识与拓扑图一致（如 SWA、SWB、RA、RB）。",
        "**进入配置：**双击设备 → 选择\"CLI\"标签页，进入命令行配置界面。"
      ]
    },
    {
      type: "knowledge",
      title: "命令行配置模式",
      paragraphs: [
        "**用户模式：**提示符为 `Switch>`，权限最小，只能查看基本信息。",
        "**特权模式：**提示符为 `Switch#`，输入 `enable` 进入，可查看配置、保存配置。",
        "**全局配置模式：**提示符为 `Switch(config)#`，输入 `configure terminal` 进入，可修改设备配置。",
        "**接口配置模式：**提示符为 `Switch(config-if)#`，在全局模式下输入 `interface 接口` 进入。"
      ]
    },
    {
      type: "tip",
      text: "模式切换口诀：\"enable 进特权，configure terminal 进全局，interface 进接口\"。退出用 exit，逐级返回；end 直接回到特权模式。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：模式切换命令",
          difficulty: "basic",
          question: "在 PacketTracer 中，写出从用户模式进入全局配置模式的完整命令序列。",
          solution: "**解：**\n```\nSwitch>enable              // 进入特权模式\nSwitch#configure terminal  // 进入全局配置模式\nSwitch(config)#            // 现在处于全局配置模式\n```",
          answer: "`enable` → `configure terminal`。"
        },
        {
          title: "例题2：IP 地址配置",
          difficulty: "medium",
          question: "某 PC 的 IP 地址为 192.168.10.1，子网掩码为 255.255.255.0，网关为 192.168.10.254。请说明这三个参数的作用。",
          solution: "**解：**\n① IP 地址 192.168.10.1：标识这台 PC 在网络中的唯一地址；\n② 子网掩码 255.255.255.0：表示前 24 位是网络位，后 8 位是主机位，用于判断是否在同一网段；\n③ 默认网关 192.168.10.254：PC 访问其他网段时，数据先发送给网关（通常是路由器接口地址）。",
          answer: "IP 标识主机，掩码划分网段，网关是访问外网的出口。"
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
          question: "连接同一局域网内多台 PC 的设备是（　）",
          options: ["A. 路由器", "B. 交换机", "C. 调制解调器", "D. 集线器"],
          correctIndex: 1,
          answer: "答案：B。交换机用于连接同一局域网内的设备。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "连接不同网络、选择路径转发数据的设备是（　）",
          options: ["A. 交换机", "B. 路由器", "C. 网卡", "D. 服务器"],
          correctIndex: 1,
          answer: "答案：B。路由器工作在网络层，负责不同网络之间的路径选择与转发。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "提示符为 `Switch(config)#` 时，当前处于（　）",
          options: ["A. 用户模式", "B. 特权模式", "C. 全局配置模式", "D. 接口配置模式"],
          correctIndex: 2,
          answer: "答案：C。`(config)#` 表示全局配置模式。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "子网掩码 255.255.255.0 表示网络位占（　）位",
          options: ["A. 8", "B. 16", "C. 24", "D. 32"],
          correctIndex: 2,
          answer: "答案：C。255.255.255.0 前三个 255 共 24 位是网络位，即 /24。"
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
          question: "IPv4 地址由几组数字组成（　）",
          options: ["A. 2", "B. 3", "C. 4", "D. 6"],
          correctIndex: 2,
          answer: "答案：C。IPv4 地址由 4 组 0~255 的数字组成。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "PC 访问其他网段时，数据首先发送给（　）",
          options: ["A. 交换机", "B. 默认网关", "C. DNS 服务器", "D. 本机网卡"],
          correctIndex: 1,
          answer: "答案：B。PC 访问其他网段时，数据先发送给默认网关。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "下列 IP 地址中，合法的是（　）",
          options: ["A. 192.168.1.256", "B. 192.168.1.1", "C. 192.168.1", "D. 256.1.1.1"],
          correctIndex: 1,
          answer: "答案：B。每段范围是 0~255，256 超出范围，且必须有 4 段。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "在 PacketTracer 中，PC 与交换机之间应使用直通线连接。",
          answer: "**正确。**PC 与交换机属于不同类型设备，用直通线连接。"
        }
      ]
    }
  ]
}
