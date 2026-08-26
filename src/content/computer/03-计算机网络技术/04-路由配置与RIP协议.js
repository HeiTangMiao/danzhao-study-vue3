/**
 * 内容页面数据（content-schema 的实例）
 * 页面：路由配置与 RIP 协议
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》计算机网络技术技能模块编制
 */
export default {
  id: "computer-03-04",
  unitNum: "03",
  subject: "computer",
  title: "路由配置与 RIP 协议",
  subtitle: "路由器配置、静态路由与 RIP 动态路由",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["路由配置与 RIP 协议"]
  N1["路由器基本配置"]
  N0 --> N1
  N2["接口 IP 配置"]
  N1 --> N2
  N3["no shutdown"]
  N1 --> N3
  N4["静态路由"]
  N0 --> N4
  N5["ip route 命令"]
  N4 --> N5
  N6["默认路由"]
  N4 --> N6
  N7["RIP 动态路由"]
  N0 --> N7
  N8["router rip"]
  N7 --> N8
  N9["version 2"]
  N7 --> N9
  N10["network 宣告"]
  N7 --> N10
  N11["取消自动汇总"]
  N7 --> N11
  N12["路由重发布"]
  N0 --> N12
  N13["redistribute static"]
  N12 --> N13
  N14["三层交换"]
  N0 --> N14
  N15["ip routing"]
  N14 --> N15
  N16["SVI 接口"]
  N14 --> N16
  N17["全网互通"]
  N0 --> N17
  N18["ping 测试"]
  N17 --> N18`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "掌握路由器接口 IP 地址的配置方法",
        "掌握静态路由与默认路由的配置命令",
        "掌握 RIP 动态路由协议（RIPv2）的配置方法",
        "理解三层交换机的路由功能与 SVI 接口配置"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "路由器接口配置",
      paragraphs: [
        "**进入接口：**`interface f0/1` 进入接口配置模式。",
        "**配置 IP：**`ip address 192.168.1.2 255.255.255.0` 设置接口 IP 和掩码。",
        "**开启接口：**`no shutdown` 启用接口（默认接口是关闭的）。",
        "**完整示例：**\n```\nRouter(config)# hostname RA\nRA(config)# interface f0/1\nRA(config-if)# ip address 192.168.1.2 255.255.255.0\nRA(config-if)# no shutdown\n```"
      ]
    },
    {
      type: "warning",
      text: "配置完接口 IP 后必须执行 `no shutdown` 开启接口！否则接口处于关闭状态，无法通信。这是考试高频考点。"
    },
    {
      type: "knowledge",
      title: "静态路由与默认路由",
      paragraphs: [
        "**静态路由：**手动配置的路由，命令格式 `ip route 目标网络 掩码 下一跳地址`。",
        "**默认路由：**匹配所有未明确路由的数据包，命令格式 `ip route 0.0.0.0 0.0.0.0 下一跳地址`。",
        "**示例（默认路由）：**\n```\nRA(config)# ip route 0.0.0.0 0.0.0.0 202.101.172.2\n```",
        "**作用：**默认路由是\"兜底\"路由，当没有更具体的路由匹配时使用。"
      ]
    },
    {
      type: "knowledge",
      title: "RIP 动态路由",
      paragraphs: [
        "**RIP 协议：**基于距离矢量算法的动态路由协议，以跳数（hop）作为度量值，最大跳数 15。",
        "**配置步骤：**\n```\nRA(config)# router rip\nRA(config-router)# version 2\nRA(config-router)# no auto-summary\nRA(config-router)# network 192.168.1.0\nRA(config-router)# network 202.101.172.0\n```",
        "**version 2：**RIPv2 支持无类路由，考试要求配置 RIPv2。",
        "**network 宣告：**宣告直连网络号，告诉路由器哪些网络参与 RIP。",
        "**no auto-summary：**取消自动汇总功能，考试明确要求。"
      ]
    },
    {
      type: "knowledge",
      title: "三层交换与路由重发布",
      paragraphs: [
        "**三层交换机：**开启路由功能后可作为路由器使用，命令 `ip routing`。",
        "**SVI 接口：**`interface vlan 10` 进入 VLAN 接口，配置 IP 作为该 VLAN 的网关，如 `ip address 192.168.10.254 255.255.255.0`。",
        "**路由重发布：**把静态路由引入 RIP，命令 `redistribute static`，使全网互通。",
        "**考试场景：**SWD 开启路由功能，配置 RIPv2；RA 配置 RIP 并重发布默认路由。"
      ]
    },
    {
      type: "tip",
      text: "RIP 配置口诀：\"router rip 起协议，version 2 用版本，network 宣告直连网，no auto-summary 取消汇总\"。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：SWD 三层配置（考试样题）",
          difficulty: "advanced",
          question: "完成 SWD 的配置填空：进入端口 f0/1；更改端口为路由口；设置端口 IP 为 192.168.1.1/24；进入 VLAN 10；配置 VLAN 10 的 SVI 地址为 192.168.10.254/24；开启路由功能；启用动态路由协议 RIP；宣告版本号 2；宣告直连网络号 192.168.30.0。",
          solution: "**解：**\n```\nSWD(config)# interface f0/1\nSWD(config-if)# no switchport\nSWD(config-if)# ip address 192.168.1.1 255.255.255.0\nSWD(config-if)# interface vlan 10\nSWD(config-if)# ip address 192.168.10.254 255.255.255.0\nSWD(config)# ip routing\nSWD(config)# router rip\nSWD(config-router)# version 2\nSWD(config-router)# network 192.168.30.0\n```",
          answer: "`no switchport` 转路由口 → `ip address` 配 IP → `interface vlan 10` 配 SVI → `ip routing` 开路由 → `router rip` + `version 2` + `network` 宣告。"
        },
        {
          title: "例题2：RA 配置（考试样题）",
          difficulty: "advanced",
          question: "完成 RA 的配置填空：启用动态路由 RIP；宣告版本号 2；取消自动汇总功能；宣告直连网络号 192.168.1.0；重发布默认路由。",
          solution: "**解：**\n```\nRA(config)# router rip\nRA(config-router)# version 2\nRA(config-router)# no auto-summary\nRA(config-router)# network 192.168.1.0\nRA(config-router)# redistribute static\n```",
          answer: "`router rip` → `version 2` → `no auto-summary` → `network 192.168.1.0` → `redistribute static`。"
        },
        {
          title: "例题3：默认路由配置",
          difficulty: "medium",
          question: "在 RB 上配置默认路由，出口为 F0/1，下一跳为 202.101.172.1。",
          solution: "**解：**\n```\nRB(config)# ip route 0.0.0.0 0.0.0.0 202.101.172.1\n```\n默认路由把所有未明确匹配的数据包都发往 202.101.172.1（RA 的接口）。",
          answer: "`ip route 0.0.0.0 0.0.0.0 202.101.172.1`。"
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
          question: "启用路由器接口的命令是（　）",
          options: ["A. `shutdown`", "B. `no shutdown`", "C. `enable`", "D. `no switchport`"],
          correctIndex: 1,
          answer: "答案：B。`no shutdown` 启用接口。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "配置默认路由的命令是（　）",
          options: ["A. `ip route 0.0.0.0 0.0.0.0 下一跳`", "B. `ip route 192.168.1.0 255.255.255.0 下一跳`", "C. `default route`", "D. `route add default`"],
          correctIndex: 0,
          answer: "答案：A。默认路由目标网络和掩码都是 0.0.0.0。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "进入 RIP 路由配置模式的命令是（　）",
          options: ["A. `router rip`", "B. `rip`", "C. `enable rip`", "D. `configure rip`"],
          correctIndex: 0,
          answer: "答案：A。全局模式下输入 `router rip` 进入 RIP 配置。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "RIP 协议以跳数作为度量值，最大跳数为 15。",
          answer: "**正确。**RIP 最大跳数为 15，跳数 16 视为不可达。"
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
          question: "配置接口 IP 地址的命令是（　）",
          options: ["A. `ip address 192.168.1.1 255.255.255.0`", "B. `ip 192.168.1.1`", "C. `address 192.168.1.1`", "D. `set ip 192.168.1.1`"],
          correctIndex: 0,
          answer: "答案：A。接口模式下用 `ip address IP 掩码` 配置。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "三层交换机开启路由功能的命令是（　）",
          options: ["A. `router rip`", "B. `ip routing`", "C. `routing enable`", "D. `ip route`"],
          correctIndex: 1,
          answer: "答案：B。`ip routing` 开启三层交换机的路由功能。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "把静态路由引入 RIP 协议的命令是（　）",
          options: ["A. `redistribute static`", "B. `network static`", "C. `import static`", "D. `default static`"],
          correctIndex: 0,
          answer: "答案：A。RIP 配置模式下用 `redistribute static` 重发布静态路由。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "配置 VLAN 10 的 SVI 接口地址，正确的命令是（　）",
          options: ["A. `interface vlan 10` 后 `ip address 192.168.10.254 255.255.255.0`", "B. `interface f0/10` 后 `ip address`", "C. `vlan 10` 后 `ip address`", "D. `ip address vlan 10`"],
          correctIndex: 0,
          answer: "答案：A。先 `interface vlan 10` 进入 SVI 接口，再配置 IP 地址。"
        }
      ]
    }
  ]
}
