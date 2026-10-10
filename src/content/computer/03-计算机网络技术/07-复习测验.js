/**
 * 内容页面数据（content-schema 的实例）
 * 页面：计算机网络技术 · 复习测验
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》计算机网络技术技能模块编制
 */
export default {
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 45 分钟，满分 100 分。请先独立作答，再点击「查看答案」核对解析。本测验覆盖网络基础、拓扑搭建、交换机/VLAN、路由/RIP、Windows 网络命令与服务配置。"
    },
    // ---------- 一、判断题（每题3分，共30分） ----------
    {
      type: "quiz",
      title: "一、判断题（每题 3 分，共 30 分）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "交换机用于连接同一局域网内的设备。",
          answer: "**正确。**交换机工作在数据链路层，连接局域网设备。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "路由器用于连接不同网络，选择路径转发数据。",
          answer: "**正确。**路由器工作在网络层。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "PC 与交换机之间应使用交叉线连接。",
          answer: "**错误。**不同类型设备用直通线，PC 与交换机用直通线。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "同一 VLAN 内的主机可以直接通信，无需经过三层设备。",
          answer: "**正确。**同一 VLAN 属同一广播域，二层即可互通；跨 VLAN 通信才需要三层设备。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "配置完路由器接口 IP 后，必须执行 no shutdown 启用接口。",
          answer: "**正确。**默认接口关闭，必须 no shutdown 启用。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "RIP 属于距离矢量路由协议，以跳数作为度量值。",
          answer: "**正确。**RIP 用跳数衡量路径优劣，最大有效跳数为 15，16 表示不可达。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "ping 127.0.0.1 用于测试互联网连通性。",
          answer: "**错误。**127.0.0.1 是回环地址，测试本机协议栈。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "DHCP 服务可以自动为客户机分配 IP、网关、DNS 等参数。",
          answer: "**正确。**DHCP 自动分配网络参数。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "星型拓扑中，中心设备故障会导致全网瘫痪。",
          answer: "**正确。**星型拓扑依赖中心设备。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "考试中搭建拓扑，工程文件应保存为 .pkt 格式。",
          answer: "**正确。**PacketTracer 工程文件扩展名为 .pkt。"
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
          question: "提示符为 `Switch(config-if)#` 时，当前处于（　）",
          options: ["A. 用户模式", "B. 特权模式", "C. 全局配置模式", "D. 接口配置模式"],
          correctIndex: 3,
          answer: "答案：D。`(config-if)#` 表示已进入某个具体接口的配置模式。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "进入特权模式的命令是（　）",
          options: ["A. enable", "B. configure terminal", "C. interface", "D. hostname"],
          correctIndex: 0,
          answer: "答案：A。`enable` 进入特权模式。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "将端口 Fa0/1-10 划入 VLAN 10，正确的命令序列是（　）",
          options: ["A. `interface range f0/1-10` → `switchport mode access` → `switchport access vlan 10`", "B. `vlan 10` → `interface f0/1`", "C. `switchport mode trunk` → `switchport access vlan 10`", "D. `hostname SWA` → `vlan 10`"],
          correctIndex: 0,
          answer: "答案：A。进入端口范围 → 设 access → 划入 VLAN 10。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "交换机上用于连接普通 PC 的端口通常应配置为（　）",
          options: ["A. trunk 模式", "B. access 模式", "C. 路由模式", "D. 混杂模式"],
          correctIndex: 1,
          answer: "答案：B。连接终端设备的端口设为 access 模式并划入相应 VLAN；trunk 用于交换机之间的多 VLAN 互联。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "静态路由配置中，目标网络与掩码都写成 0.0.0.0 表示（　）",
          options: ["A. 直连路由", "B. 默认路由", "C. 主机路由", "D. 动态路由"],
          correctIndex: 1,
          answer: "答案：B。目标网络和掩码均为 0.0.0.0 即默认路由，匹配所有目的地址。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "查看路由器路由表的命令是（　）",
          options: ["A. show ip route", "B. show vlan brief", "C. show running-config", "D. show version"],
          correctIndex: 0,
          answer: "答案：A。`show ip route` 显示路由表；`show vlan brief` 看 VLAN 与端口归属。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "三层交换机上创建 VLAN 后，若要实现 VLAN 间通信，还需（　）",
          options: ["A. 仅创建 VLAN 即可自动互通", "B. 执行 ip routing 并配置 VLAN 接口地址", "C. 把所有端口设为 trunk", "D. 重启交换机"],
          correctIndex: 1,
          answer: "答案：B。需开启 ip routing 并给各 VLAN 配置接口地址，VLAN 间才可路由互通。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "查看本机 IP 详细配置（含 DNS）的命令是（　）",
          options: ["A. ipconfig", "B. ipconfig /all", "C. ping", "D. tracert"],
          correctIndex: 1,
          answer: "答案：B。`ipconfig /all` 查看详细信息。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "能 ping 通 IP 但打不开网页，最可能是（　）故障",
          options: ["A. 网卡损坏", "B. DNS 故障", "C. 网线松动", "D. IP 冲突"],
          correctIndex: 1,
          answer: "答案：B。IP 连通但域名无法解析，多为 DNS 故障。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "DHCP 作用域中设置\"排除地址 192.168.30.100-110\"的作用是（　）",
          options: ["A. 增加地址池", "B. 指定不自动分配的地址", "C. 设置网关", "D. 设置 DNS"],
          correctIndex: 1,
          answer: "答案：B。排除地址不参与自动分配。"
        }
      ]
    },
    // ---------- 三、命令填空（每题5分，共30分） ----------
    {
      type: "quiz",
      title: "三、命令填空（每题 5 分，共 30 分）",
      items: [
        {
          difficulty: "medium",
          type: "fill",
          question: "完成 SWA 配置命令填空：\n`Switch>______`（进入特权模式）\n`Switch#______`（进入全局模式）\n`Switch(config)#______`（更改设备名称为 SWA）",
          answer: "enable → configure terminal → hostname SWA。"
        },
        {
          difficulty: "medium",
          type: "fill",
          question: "完成 SWA 配置命令填空：\n`SWA(config)#______`（建立 VLAN 10）\n`SWA(config)#______`（进入端口 F0/1-10）\n`SWA(config-if-range)#______`（将端口 F0/1-10 划入 VLAN 10）",
          answer: "vlan 10 → interface range f0/1-10 → switchport access vlan 10。"
        },
        {
          difficulty: "medium",
          type: "fill",
          question: "完成 SWA 配置命令填空：\n`SWA(config)#______`（进入端口 F0/23-F0/24）\n`SWA(config-if)#______`（启用端口 trunk 模式）\n`SWA(config-if)#______`（加入链路组 1 并开启）",
          answer: "interface range f0/23-24 → switchport mode trunk → channel-group 1 mode on。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          question: "完成 SWD 配置命令填空：\n`SWD(config)#______`（开启路由功能）\n`SWD(config)#______`（启用动态路由协议）\n`SWD(config-router)#______`（宣告版本号为 2）",
          answer: "ip routing → router rip → version 2。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          question: "完成 RA 配置命令填空：\n`RA(config-router)#______`（取消自动汇总功能）\n`RA(config-router)#______`（宣告直连网络号 192.168.1.0）\n`RA(config-router)#______`（重发布默认路由）",
          answer: "no auto-summary → network 192.168.1.0 → redistribute static。"
        },
        {
          difficulty: "advanced",
          type: "fill",
          question: "完成 RB 配置命令填空：\n`RB(config)#______`（配置默认路由，出口为 F0/1，下一跳 202.101.172.1）",
          answer: "ip route 0.0.0.0 0.0.0.0 202.101.172.1。"
        }
      ]
    }
  ]
}
