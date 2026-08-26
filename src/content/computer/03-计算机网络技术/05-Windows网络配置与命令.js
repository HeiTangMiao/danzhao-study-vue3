/**
 * 内容页面数据（content-schema 的实例）
 * 页面：Windows 网络配置与命令
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》计算机网络技术技能模块编制
 */
export default {
  id: "computer-03-05",
  unitNum: "03",
  subject: "computer",
  title: "Windows 网络配置与命令",
  subtitle: "IP 配置、网络命令与故障排查",
  blocks: [
    // ---------- 知识结构导图 ----------
    {
      type: "mindmap",
      title: "知识结构导图",
      mermaid: `graph LR
  N0["Windows 网络配置与命令"]
  N1["IP 地址配置"]
  N0 --> N1
  N2["静态 IP"]
  N1 --> N2
  N3["自动获取 DHCP"]
  N1 --> N3
  N4["网络命令"]
  N0 --> N4
  N5["ipconfig"]
  N4 --> N5
  N6["ping"]
  N4 --> N6
  N7["tracert"]
  N4 --> N7
  N8["netstat"]
  N4 --> N8
  N9["arp"]
  N4 --> N9
  N10["故障排查"]
  N0 --> N10
  N11["ipconfig 查看"]
  N11 --> N12
  N12["ping 定位"]
  N10 --> N12
  N13["常见故障"]
  N0 --> N13
  N14["IP 冲突"]
  N13 --> N14
  N15["网关错误"]
  N13 --> N15
  N16["DNS 故障"]
  N13 --> N16
  N17["网络共享"]
  N0 --> N17
  N18["文件共享"]
  N17 --> N18`
    },
    // ---------- 学习目标 ----------
    {
      type: "objectives",
      title: "学习目标",
      items: [
        "掌握 Windows 中静态 IP 与自动获取 IP 的配置方法",
        "掌握 ipconfig、ping、tracert 等常用网络命令的用法",
        "能使用网络命令进行网络故障的分析、定位与排除",
        "了解网络资源共享的配置方法"
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "IP 地址配置",
      paragraphs: [
        "**打开配置：**\"控制面板→网络和共享中心→更改适配器设置\"，右键\"本地连接→属性→Internet 协议版本 4 (TCP/IPv4)\"。",
        "**静态 IP：**选择\"使用下面的 IP 地址\"，填写 IP 地址、子网掩码、默认网关、首选 DNS 服务器。",
        "**自动获取：**选择\"自动获得 IP 地址\"和\"自动获得 DNS 服务器地址\"，由 DHCP 服务器分配。",
        "**考试场景：**服务器配置静态 IP（如 192.168.30.1/24），客户机设置为自动获取。"
      ]
    },
    {
      type: "table",
      title: "常用网络命令",
      headers: ["命令", "作用", "示例"],
      rows: [
        ["ipconfig", "查看本机 IP 配置", "ipconfig /all 查看详细信息"],
        ["ping", "测试网络连通性", "ping 192.168.30.1"],
        ["tracert", "跟踪数据包路径", "tracert www.baidu.com"],
        ["netstat", "查看网络连接状态", "netstat -an"],
        ["arp -a", "查看 ARP 缓存表", "arp -a"],
        ["nslookup", "测试 DNS 解析", "nslookup www.baidu.com"]
      ]
    },
    {
      type: "warning",
      text: "ping 命令是故障排查第一步！ping 本机回环地址 127.0.0.1 测试网卡；ping 网关测试局域网；ping 外网地址测试互联网。逐级排查可定位故障点。"
    },
    {
      type: "knowledge",
      title: "ping 命令详解",
      paragraphs: [
        "**ping 127.0.0.1：**测试本机 TCP/IP 协议栈是否正常，通说明网卡和协议正常。",
        "**ping 本机 IP：**测试本机网卡配置是否正确。",
        "**ping 网关：**测试本机到网关（局域网出口）是否连通。",
        "**ping 其他网段 IP：**测试跨网段通信是否正常。",
        "**ping 域名：**测试 DNS 解析是否正常，如 `ping www.baidu.com`。"
      ]
    },
    {
      type: "knowledge",
      title: "常见网络故障排查",
      paragraphs: [
        "**IP 地址冲突：**两台 PC 使用相同 IP，提示\"IP 地址冲突\"，需修改其中一台的 IP。",
        "**无法上网但局域网正常：**检查默认网关是否配置正确、DNS 是否正常。",
        "**能 ping 通 IP 但打不开网页：**多为 DNS 故障，检查 DNS 服务器地址。",
        "**排查流程：**先 `ipconfig` 查看配置，再 `ping 127.0.0.1` → `ping 网关` → `ping 外网`，逐级定位。"
      ]
    },
    {
      type: "tip",
      text: "故障排查口诀：\"先看配置 ipconfig，再测回环 127，网关不通查链路，外网不通查路由，域名不通查 DNS\"。"
    },
    {
      type: "example",
      title: "典型例题",
      items: [
        {
          title: "例题1：网络命令应用",
          difficulty: "medium",
          question: "某 PC 无法访问互联网，但能 ping 通局域网内其他 PC。请写出排查步骤。",
          solution: "**解：**\n① 用 `ipconfig` 查看本机 IP 配置，检查 IP、掩码、网关是否正确；\n② 用 `ping 127.0.0.1` 测试本机协议栈，确认网卡正常；\n③ 用 `ping 网关地址` 测试到网关的连通性；\n④ 用 `ping 8.8.8.8`（或外网 IP）测试互联网连通性；\n⑤ 用 `ping www.baidu.com` 测试 DNS 解析是否正常。\n能 ping 通局域网但无法上网，重点检查默认网关和 DNS 配置。",
          answer: "ipconfig 查看配置 → ping 127.0.0.1 → ping 网关 → ping 外网 IP → ping 域名，重点检查网关和 DNS。"
        },
        {
          title: "例题2：IP 配置判断",
          difficulty: "basic",
          question: "某 PC 提示\"IP 地址冲突\"，可能的原因及解决办法是什么？",
          solution: "**解：**\n原因：局域网内另一台 PC 使用了相同的 IP 地址。\n解决：用 `ipconfig` 查看本机 IP，修改其中一台 PC 的 IP 地址为网段内其他可用地址，或改为自动获取。",
          answer: "IP 地址重复导致冲突，修改其中一台的 IP 即可解决。"
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
          question: "查看本机 IP 配置的命令是（　）",
          options: ["A. ping", "B. ipconfig", "C. tracert", "D. netstat"],
          correctIndex: 1,
          answer: "答案：B。ipconfig 查看本机 IP 配置。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "测试网络连通性的命令是（　）",
          options: ["A. ipconfig", "B. ping", "C. nslookup", "D. arp"],
          correctIndex: 1,
          answer: "答案：B。ping 用于测试网络连通性。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "ping 127.0.0.1 用于测试（　）",
          options: ["A. 互联网连通性", "B. 本机 TCP/IP 协议栈", "C. 网关连通性", "D. DNS 解析"],
          correctIndex: 1,
          answer: "答案：B。127.0.0.1 是回环地址，测试本机协议栈。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "能 ping 通 IP 但打不开网页，通常是 DNS 故障。",
          answer: "**正确。**IP 连通但域名无法解析，多为 DNS 服务器配置问题。"
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
          question: "查看本机 IP 详细配置信息（含 DNS）的命令是（　）",
          options: ["A. ipconfig", "B. ipconfig /all", "C. ipconfig /renew", "D. ipconfig /release"],
          correctIndex: 1,
          answer: "答案：B。`ipconfig /all` 查看详细信息。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "跟踪数据包到达目标所经过路径的命令是（　）",
          options: ["A. ping", "B. tracert", "C. ipconfig", "D. netstat"],
          correctIndex: 1,
          answer: "答案：B。tracert 跟踪路由路径。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "PC 无法访问互联网，排查顺序最合理的是（　）",
          options: ["A. 直接重装系统", "B. ipconfig 查看配置 → ping 127.0.0.1 → ping 网关 → ping 外网", "C. 直接更换网线", "D. 重启路由器"],
          correctIndex: 1,
          answer: "答案：B。按\"配置→本机→网关→外网\"逐级排查，定位故障点。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "客户机设置为\"自动获得 IP 地址\"后，由 DHCP 服务器分配 IP。",
          answer: "**正确。**自动获取 IP 由 DHCP 服务器统一分配。"
        }
      ]
    }
  ]
}
