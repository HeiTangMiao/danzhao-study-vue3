/**
 * 计算机类站点配置
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》编制
 * 结构：必考（职业素养 + 程序设计技能）+ 选考（网络技术 / 数字媒体技术）
 */

export const COMPUTER_CONFIG = {
  title: "浙江单招单考计算机类学习之路",
  subtitle: "职业技能操作考试备考 | 职业素养 + 程序设计 + 网络技术 + 数字媒体",
  subject: "computer",
  themeKey: "computer_theme",
  progressKey: "computer_progress_v1",
  breadcrumbHome: "浙江单招计算机",
  sidebarTitle: "计算机学习导航",
  units: [
    {
      num: "01", title: "职业素养", folder: "01-职业素养", phase: 1, color: "#0ea5e9", icon: "🧭",
      files: [
        { name: "01-计算机操作规范", title: "计算机操作规范", subtitle: "职业道德、机房规范、开关机与设备操作" },
        { name: "02-文件命名与安全管理", title: "文件命名与安全管理", subtitle: "命名规则、文件安全与数据备份" },
        { name: "03-复习测验", title: "职业素养 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    },
    {
      num: "02", title: "程序设计技能", folder: "02-程序设计技能", phase: 1, color: "#6366f1", icon: "💻",
      files: [
        { name: "01-Python开发环境与基础语法", title: "Python 开发环境与基础语法", subtitle: "环境搭建、变量、数据类型与输入输出" },
        { name: "02-顺序结构程序设计", title: "顺序结构程序设计", subtitle: "表达式、运算符与顺序执行程序" },
        { name: "03-选择结构程序设计", title: "选择结构程序设计", subtitle: "if 语句、多分支与嵌套判断" },
        { name: "04-循环结构程序设计", title: "循环结构程序设计", subtitle: "for 循环、while 循环与循环嵌套" },
        { name: "05-常用算法基础", title: "常用算法基础", subtitle: "累加累乘、求最值、穷举、素数、数字分离" },
        { name: "06-排序与字符处理", title: "排序与字符处理", subtitle: "冒泡排序、选择排序与字符串操作" },
        { name: "07-程序调试与运行", title: "程序调试与运行", subtitle: "语法错误、逻辑错误与调试方法" },
        { name: "08-复习测验", title: "程序设计技能 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    },
    {
      num: "03", title: "计算机网络技术", folder: "03-计算机网络技术", phase: 2, color: "#0891b2", icon: "🌐",
      files: [
        { name: "01-网络基础与PacketTracer入门", title: "网络基础与 PacketTracer 入门", subtitle: "网络概念、IP 地址与模拟器使用" },
        { name: "02-网络拓扑搭建", title: "网络拓扑搭建", subtitle: "拓扑结构、设备选型与连线配置" },
        { name: "03-交换机配置与VLAN", title: "交换机配置与 VLAN", subtitle: "交换机基本配置、VLAN 划分与 Trunk" },
        { name: "04-路由配置与RIP协议", title: "路由配置与 RIP 协议", subtitle: "路由器配置、静态路由与 RIP 动态路由" },
        { name: "05-Windows网络配置与命令", title: "Windows 网络配置与命令", subtitle: "IP 配置、网络命令与故障排查" },
        { name: "06-网络服务配置", title: "网络服务配置", subtitle: "DHCP、WWW、FTP、DNS 服务搭建" },
        { name: "07-复习测验", title: "计算机网络技术 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    },
    {
      num: "04", title: "数字媒体技术", folder: "04-数字媒体技术", phase: 2, color: "#db2777", icon: "🎨",
      files: [
        { name: "01-Photoshop基础与常用工具", title: "Photoshop 基础与常用工具", subtitle: "工作界面、选区工具、画笔与修图工具" },
        { name: "02-Photoshop图层与图像操作", title: "Photoshop 图层与图像操作", subtitle: "图层操作、文字、滤镜与调整图层" },
        { name: "03-Photoshop综合案例", title: "Photoshop 综合案例", subtitle: "海报设计、图案填充与印章效果" },
        { name: "04-Premiere基础与视频编辑", title: "Premiere 基础与视频编辑", subtitle: "项目创建、素材导入、剪辑与关键帧" },
        { name: "05-Premiere特效字幕与音频", title: "Premiere 特效字幕与音频", subtitle: "视频特效、字幕制作、转场与音频" },
        { name: "06-复习测验", title: "数字媒体技术 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    },
    {
      num: "05", title: "模拟冲刺", folder: "05-模拟冲刺", phase: 3, color: "#a855f7", icon: "🚀", sprint: true,
      files: [
        { name: "01-考试技巧", title: "考试技巧与得分策略（计算机）", subtitle: "考场流程、时间分配与抢分技巧" },
        { name: "02-真题模拟卷", title: "真题模拟卷（一）", subtitle: "全真模拟 · 限时 90 分钟 · 满分 150 分", isTest: true }
      ]
    },
    // ↓↓↓ 新增单元：理论基础（面向「职业技能理论考试」，与操作考试内容互为补充）
    // 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"计算机基础"模块（约占 70 分 / 46.7%）
    {
      num: "06", title: "理论基础", folder: "06-理论基础", phase: 1, color: "#0d9488", icon: "📚",
      files: [
        { name: "01-计算机发展史与性能指标", title: "计算机发展史与性能指标", subtitle: "四代发展、主要特点与六项性能指标" },
        { name: "02-数制转换与信息编码", title: "数制转换与信息编码", subtitle: "进制互转、ASCII 与汉字编码" },
        { name: "03-计算机系统组成与工作原理", title: "计算机系统组成与工作原理", subtitle: "冯·诺依曼体系、软硬件系统与指令执行" },
        { name: "04-信息安全与防护", title: "信息安全与防护", subtitle: "安全三要素、病毒木马与安全习惯" },
        { name: "05-操作系统基础", title: "操作系统基础", subtitle: "五大管理功能、基本特征与常见类型" },
        { name: "06-计算机语言与算法基础", title: "计算机语言与算法基础", subtitle: "语言分类、算法特征、流程图与三种结构" },
        { name: "07-新一代信息技术", title: "新一代信息技术", subtitle: "大数据、云计算、物联网、区块链、5G、人工智能" },
        { name: "08-复习测验", title: "理论基础 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    },
    // ↓↓↓ 新增单元：组装与维护（理论考约 20 分 / 13.3%，此前零命中）
    {
      num: "07", title: "组装与维护", folder: "07-组装与维护", phase: 1, color: "#f59e0b", icon: "🔧",
      files: [
        { name: "01-计算机主要部件与外围设备", title: "计算机主要部件与外围设备", subtitle: "主机内部部件、外围设备与选购方法" },
        { name: "02-硬件拆装与BIOS基础", title: "硬件拆装与 BIOS 基础", subtitle: "拆装流程、注意事项与 BIOS/CMOS" },
        { name: "03-硬盘分区与软件安装", title: "硬盘分区与软件安装", subtitle: "分区格式、软件版权与备份还原" },
        { name: "04-系统维护与故障处理", title: "系统维护与故障处理", subtitle: "驱动补丁、维护方法与常见故障" },
        { name: "05-复习测验", title: "组装与维护 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    },
    // ↓↓↓ 新增单元：数据库基础（理论考约 15 分 / 10%，此前零命中）
    {
      num: "08", title: "数据库基础", folder: "08-数据库基础", phase: 1, color: "#10b981", icon: "🗄️",
      files: [
        { name: "01-数据库基本概念", title: "数据库基本概念", subtitle: "DB/DBMS/DBS、系统特征与数据模型" },
        { name: "02-数据表与字段", title: "数据表与字段", subtitle: "记录与字段、主键外键与数据类型" },
        { name: "03-SQL基础语句", title: "SQL 基础语句", subtitle: "CREATE/INSERT/SELECT/UPDATE/DELETE（单表）" },
        { name: "04-复习测验", title: "数据库基础 · 复习测验", subtitle: "本单元知识综合检测", isTest: true }
      ]
    }
  ],
  phases: {
    1: { name: "第一阶段 · 素养与程序设计", color: "#6366f1", icon: "🔰" },
    2: { name: "第二阶段 · 网络与数字媒体", color: "#0891b2", icon: "🌐" },
    3: { name: "冲刺阶段 · 模拟实战", color: "#a855f7", icon: "🚀" }
  }
}

export default COMPUTER_CONFIG
