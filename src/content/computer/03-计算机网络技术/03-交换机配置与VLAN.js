/**
 * 内容页面数据（content-schema 的实例）
 * 页面：交换机配置与 VLAN
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》计算机网络技术技能模块编制
 */
export default {
  id: "computer-03-03",
  unitNum: "03",
  subject: "computer",
  title: "交换机配置与 VLAN",
  subtitle: "交换机基本配置、VLAN 划分与 Trunk",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["交换机配置与 VLAN"]
  N1["交换机基本配置"]
  N0 --> N1
  N2["设备命名"]
  N1 --> N2
  N3["VLAN 概念"]
  N0 --> N3
  N4["划分广播域"]
  N3 --> N4
  N5["隔离广播"]
  N3 --> N5
  N6["创建 VLAN"]
  N0 --> N6
  N7["vlan 命令"]
  N6 --> N7
  N8["命名 vlan"]
  N6 --> N8
  N9["端口划分"]
  N0 --> N9
  N10["access 模式"]
  N9 --> N10
  N11["switchport access vlan"]
  N9 --> N11
  N12["Trunk 端口"]
  N0 --> N12
  N13["跨交换机传输"]
  N12 --> N13
  N14["switchport mode trunk"]
  N12 --> N14
  N15["端口聚合"]
  N0 --> N15
  N16["channel-group"]
  N15 --> N16
  N17["保存配置"]
  N0 --> N17
  N18["copy running-config"]
  N17 --> N18`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "理解 VLAN 的作用：划分广播域、隔离广播、提高安全性",
        "掌握创建 VLAN、命名 VLAN 的命令",
        "掌握将端口划入 VLAN（access 模式）的命令",
        "掌握 Trunk 端口配置与端口聚合（channel-group）配置"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "VLAN 基本概念",
      paragraphs: [
        "**VLAN（虚拟局域网）：**把物理上连接在同一交换机的设备，按逻辑划分成多个独立的广播域。",
        "**作用：**隔离广播、提高安全性、便于管理。不同 VLAN 之间默认不能直接通信。",
        "**VLAN 编号：**常用 VLAN 10、20、30 等，VLAN 1 是默认 VLAN。",
        "**考试场景：**SWA 的 Fa0/1-10 划入 VLAN 10，Fa0/11-20 划入 VLAN 20，实现不同部门隔离。"
      ]
    },
    {
      type: "warning",
      text: "不同 VLAN 之间默认不能通信！VLAN 10 的 PC 不能直接访问 VLAN 20 的 PC。要实现跨 VLAN 通信，需要三层设备（如三层交换机开启路由功能或路由器）配合。"
    },
    {
      type: "knowledge",
      title: "创建 VLAN 与端口划分",
      paragraphs: [
        "**创建 VLAN：**在全局模式下输入 `vlan 10` 进入 VLAN 配置模式，`name 名称` 命名。",
        "**进入端口：**`interface f0/1` 进入单个端口，或 `interface range f0/1-10` 进入端口范围。",
        "**设置 access 模式：**`switchport mode access` 将端口设为接入模式。",
        "**划入 VLAN：**`switchport access vlan 10` 将端口划入 VLAN 10。",
        "**完整示例：**\n```\nSwitch(config)# vlan 10\nSwitch(config-vlan)# name vlan10\nSwitch(config)# interface range f0/1-10\nSwitch(config-if-range)# switchport mode access\nSwitch(config-if-range)# switchport access vlan 10\n```"
      ]
    },
    {
      type: "knowledge",
      title: "Trunk 端口",
      paragraphs: [
        "**Trunk 作用：**连接两台交换机，同时传输多个 VLAN 的数据，实现跨交换机的 VLAN 通信。",
        "**配置命令：**\n```\nSwitch(config)# interface f0/21\nSwitch(config-if)# switchport mode trunk\n```",
        "**与 access 区别：**access 端口只属于一个 VLAN，trunk 端口可以承载多个 VLAN。",
        "**考试场景：**SWA 的 Fa0/21 设为 trunk，连接 SWD；SWA 的 Fa0/23-24 端口聚合后设为 trunk。"
      ]
    },
    {
      type: "knowledge",
      title: "端口聚合（EtherChannel）",
      paragraphs: [
        "**端口聚合：**把多条物理链路捆绑成一条逻辑链路，增加带宽、提高可靠性。",
        "**配置命令：**\n```\nSwitch(config)# interface range f0/23-24\nSwitch(config-if-range)# channel-group 1 mode on\nSwitch(config-if-range)# switchport mode trunk\n```",
        "**考试场景：**SWA 将 Fa0/23-24 配置为端口聚合，聚合端口设置为 trunk 口。",
        "**注意：**聚合前先进入端口范围，channel-group 1 表示链路组编号为 1。"
      ]
    },
    {
      type: "tip",
      text: "配置顺序口诀：\"先建 VLAN，再划端口；access 接终端，trunk 连交换机；多链路用聚合\"。配置完成后用 `copy running-config startup-config` 保存。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：SWA 完整配置（考试样题）",
          difficulty: "advanced",
          question: "根据考试要求完成 SWA 的配置：更改设备名称为 SWA；建立 VLAN 10、VLAN 20；将 Fa0/1-10 划入 VLAN 10，Fa0/11-20 划入 VLAN 20；将 Fa0/23-24 配置为端口聚合并设为 trunk；将 Fa0/21 设为 trunk；保存配置。",
          solution: "**解：**\n```\nSwitch>enable\nSwitch#configure terminal\nSwitch(config)# hostname SWA\nSWA(config)# vlan 10\nSWA(config-vlan)# name vlan10\nSWA(config-vlan)# vlan 20\nSWA(config-vlan)# name vlan20\nSWA(config)# interface range f0/1-10\nSWA(config-if-range)# switchport mode access\nSWA(config-if-range)# switchport access vlan 10\nSWA(config-if-range)# interface range f0/11-20\nSWA(config-if-range)# switchport mode access\nSWA(config-if-range)# switchport access vlan 20\nSWA(config)# interface range f0/23-24\nSWA(config-if-range)# channel-group 1 mode on\nSWA(config-if-range)# switchport mode trunk\nSWA(config)# interface f0/21\nSWA(config-if)# switchport mode trunk\nSWA(config-if)# end\nSWA# copy running-config startup-config\n```",
          answer: "hostname 改名 → vlan 建 VLAN → switchport access vlan 划端口 → channel-group 聚合 → switchport mode trunk 设 trunk → copy 保存。"
        },
        {
          title: "例题2：命令填空",
          difficulty: "medium",
          question: "完成下列命令填空：\n`Switch>______`（进入特权模式）\n`Switch#______`（进入全局模式）\n`Switch(config)#______`（更改设备名称为 SWA）\n`SWA(config)#______`（建立 VLAN 10）",
          solution: "**解：**\n```\nSwitch>enable\nSwitch#configure terminal\nSwitch(config)# hostname SWA\nSWA(config)# vlan 10\n```",
          answer: "enable → configure terminal → hostname SWA → vlan 10。"
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
          question: "将端口设为接入模式并划入 VLAN 10，正确的命令是（　）",
          options: ["A. `switchport mode trunk`", "B. `switchport mode access` 和 `switchport access vlan 10`", "C. `vlan 10`", "D. `hostname SWA`"],
          correctIndex: 1,
          answer: "答案：B。先 `switchport mode access` 设接入模式，再 `switchport access vlan 10` 划入 VLAN。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "连接两台交换机并传输多个 VLAN 数据的端口应设为（　）",
          options: ["A. access", "B. trunk", "C. console", "D. aux"],
          correctIndex: 1,
          answer: "答案：B。trunk 端口可承载多个 VLAN 的数据。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "更改交换机设备名称的命令是（　）",
          options: ["A. `name SWA`", "B. `hostname SWA`", "C. `rename SWA`", "D. `setname SWA`"],
          correctIndex: 1,
          answer: "答案：B。全局模式下用 `hostname` 修改设备名称。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "不同 VLAN 之间默认可以直接通信。",
          answer: "**错误。**不同 VLAN 之间默认不能直接通信，需要三层设备配合。"
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
          question: "创建 VLAN 10 的命令是（　）",
          options: ["A. `vlan 10`", "B. `create vlan 10`", "C. `switchport vlan 10`", "D. `interface vlan 10`"],
          correctIndex: 0,
          answer: "答案：A。全局模式下输入 `vlan 10` 进入 VLAN 配置模式。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "进入端口范围 Fa0/1-10 的命令是（　）",
          options: ["A. `interface f0/1`", "B. `interface range f0/1-10`", "C. `interface f0/1-10`", "D. `range f0/1-10`"],
          correctIndex: 1,
          answer: "答案：B。批量进入端口范围用 `interface range`。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "将 Fa0/23-24 配置为端口聚合，正确的命令是（　）",
          options: ["A. `channel-group 1 mode on`", "B. `switchport mode trunk`", "C. `interface f0/23`", "D. `vlan 1`"],
          correctIndex: 0,
          answer: "答案：A。端口聚合用 `channel-group 1 mode on`，进入端口范围后执行。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "保存交换机配置到启动配置文件的命令是（　）",
          options: ["A. `save`", "B. `write memory`", "C. `copy running-config startup-config`", "D. B 和 C 都对"],
          correctIndex: 3,
          answer: "答案：D。`copy running-config startup-config` 和 `write memory` 都可以保存配置。"
        }
      ]
    }
  ]
}
