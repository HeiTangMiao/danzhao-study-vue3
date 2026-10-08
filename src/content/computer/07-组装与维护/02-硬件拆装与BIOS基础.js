/**
 * 内容页面数据（content-schema 的实例）
 * 页面：硬件拆装与 BIOS 基础
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"计算机组装与维护"模块编制
 */
export default {
  blocks: [
    {
      type: "layout",
      as: "hero",
      props: { align: "start", tone: "accent" },
      children: [
        // ---------- 知识结构导图 ----------
        {
          type: "mindmap",
          title: "知识结构导图",
          mermaid: `graph LR
      N0["硬件拆装与BIOS基础"]
      N1["拆装准备"]
      N0 --> N1
      N2["断电与防静电"]
      N1 --> N2
      N3["工具与摆放"]
      N1 --> N3
      N4["拆装流程"]
      N0 --> N4
      N5["安装顺序"]
      N4 --> N5
      N6["注意事项"]
      N4 --> N6
      N7["BIOS与CMOS"]
      N0 --> N7
      N8["概念与作用"]
      N7 --> N8
      N9["常见设置"]
      N7 --> N9`
        },
        // ---------- 学习目标 ----------
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能说出硬件拆装前的准备工作与防静电措施",
            "能按正确顺序描述主机组装的主要步骤",
            "能说出拆装过程中的 5 项注意事项",
            "能解释 BIOS 与 CMOS 的概念、区别与常见设置项"
          ]
        },
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "硬件拆装的准备工作",
      paragraphs: [
        "**切断电源：**拆装前必须关闭计算机并**拔掉电源线**，严禁带电操作。",
        "**释放静电：**人体静电可能击穿电子元件，操作前应洗手或触摸接地金属释放静电，必要时佩戴**防静电手环**。",
        "**准备工具：**常用十字螺丝刀、尖嘴钳、导热硅脂、扎带等。",
        "**摆放有序：**拆下的螺丝与部件分类摆放，避免遗失或装错。",
        "**环境要求：**在干燥、整洁、光线充足的台面上操作，避免液体与杂物。"
      ]
    },
    {
      type: "warning",
      text: "安全第一：**严禁带电插拔**内部部件（热插拔仅限 USB 等支持的外设）。带电操作可能造成短路并损坏硬件。"
    },
    {
      type: "steps",
      title: "主机组装的主要步骤",
      items: [
        { title: "安装 CPU 与散热器", content: "打开 CPU 插槽拉杆，对准缺口放入 CPU（不可用力按压），扣好后涂抹导热硅脂并安装散热器。" },
        { title: "安装内存", content: "掰开内存插槽卡扣，对准防呆缺口垂直插入，听到\"咔\"声表示卡扣扣紧。" },
        { title: "固定主板", content: "将主板放入机箱，对准螺丝孔位安装铜柱与螺丝，注意主板与机箱之间不要有多余金属物。" },
        { title: "安装电源", content: "将电源放入机箱电源位并固定螺丝，注意风扇朝向与散热风道。" },
        { title: "安装硬盘与显卡", content: "硬盘固定于硬盘位并连接数据线与电源线；显卡插入 PCI-E 插槽并用螺丝固定在机箱上。" },
        { title: "连接各类线缆", content: "连接主板供电、CPU 供电、硬盘数据线与机箱前置面板（开机、重启、指示灯、USB、音频）跳线。" },
        { title: "整理与检查", content: "用扎带整理线缆避免挡住风道，检查各部件是否安装牢固、有无异物遗留后再通电。" }
      ]
    },
    {
      type: "knowledge",
      title: "拆装注意事项",
      paragraphs: [
        "**轻拿轻放：**部件拿取时握住边缘，避免触碰金手指与芯片引脚。",
        "**对准防呆缺口：**内存、显卡等都有防呆设计，插不进去时**不可强行用力**，应先检查方向。",
        "**力度适中：**拧螺丝以固定为准，过度拧紧可能损坏螺纹或压坏主板。",
        "**先放电后操作：**拆机前长按开机键数秒释放主板余电。",
        "**记录接线：**拆卸时如不确定，先拍照记录原接线位置，便于复原。"
      ]
    },
    {
      type: "tip",
      text: "考点提示：内存与显卡都有**防呆缺口**——安装时应对准缺口垂直插入，听到卡扣声即到位，不能用蛮力。"
    },
    {
      type: "knowledge",
      title: "BIOS 与 CMOS",
      paragraphs: [
        "**BIOS：**基本输入输出系统，是固化在主板 ROM 芯片上的一组程序，负责开机自检（POST）、初始化硬件并引导操作系统。",
        "**CMOS：**主板上的一块可读写的 RAM 芯片，用于**保存 BIOS 的设置参数**（如系统时间、启动顺序）；由主板电池供电，断电后设置会丢失。",
        "**区别记忆：**BIOS 是**程序**（放在 ROM 中），CMOS 是**存储参数的地方**（RAM，需电池维持）。",
        "**进入方法：**开机时按 `Del`、`F2`、`F10` 或 `Esc` 等键进入 BIOS 设置界面（不同主板按键不同）。"
      ]
    },
    {
      type: "table",
      title: "BIOS 与 CMOS 对比",
      headers: ["对比项", "BIOS", "CMOS"],
      rows: [
        ["本质", "**程序**（固件）", "**存储器**（芯片）"],
        ["存放位置", "主板 ROM 芯片", "主板 RAM 芯片"],
        ["作用", "自检、初始化、引导系统", "保存 BIOS 设置参数"],
        ["断电后", "信息保留", "信息丢失（靠电池维持）"]
      ]
    },
    {
      type: "knowledge",
      title: "BIOS 常见设置项",
      paragraphs: [
        "**系统时间：**设置日期与时间。",
        "**启动顺序（Boot）：**设置从硬盘、U 盘还是光盘启动，安装系统时常需调整为 U 盘优先。",
        "**硬件参数：**查看或调整 CPU、内存、硬盘等识别情况与工作模式。",
        "**安全设置：**设置开机密码、管理员密码。",
        "**恢复默认：**选择 `Load Default Settings` 可恢复出厂设置，常用于设置错误导致无法开机时。"
      ]
    },
    {
      type: "warning",
      text: "易混考点：BIOS 是**程序**、放在 ROM 中；CMOS 是**存放参数的芯片**、靠电池供电。题目常把二者对调来设错。"
    },
    // ---------- 快速检测 ----------
    {
      type: "quiz",
      title: "快速检测",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "拆装计算机内部部件时，可以带电操作。",
          answer: "**错误。**必须先关机并拔掉电源线，严禁带电插拔内部部件，否则可能损坏硬件。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "CMOS 用于保存 BIOS 的设置参数，由主板电池供电。",
          answer: "**正确。**CMOS 是保存设置参数的 RAM 芯片，靠主板电池维持；断电后设置会丢失。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "安装内存条时，正确的做法是（　）",
          options: [
            "A. 对准防呆缺口垂直插入，听到卡扣声即到位",
            "B. 用力按压直到插进去",
            "C. 任意方向插入均可",
            "D. 不需要卡扣固定"
          ],
          correctIndex: 0,
          answer: "答案：A。内存有防呆缺口，应对准后垂直插入，卡扣自动扣紧；不能蛮力按压。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "BIOS 的本质是（　）",
          options: ["A. 一块存储芯片", "B. 固化在 ROM 中的程序", "C. 操作系统的一部分", "D. 一种硬盘分区格式"],
          correctIndex: 1,
          answer: "答案：B。BIOS 是固化在主板 ROM 芯片上的程序，负责自检、初始化与引导。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "用 U 盘安装操作系统前，通常需要在 BIOS 中调整（　）",
          options: ["A. 屏幕亮度", "B. 启动顺序（Boot）", "C. 键盘灵敏度", "D. 硬盘容量"],
          correctIndex: 1,
          answer: "答案：B。需要把 U 盘设为第一启动项，即调整启动顺序。"
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
          type: "judge",
          question: "操作计算机内部部件前，通过触摸接地金属可以释放人体静电。",
          answer: "**正确。**释放静电是防静电损坏元件的重要措施，也可佩戴防静电手环。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "BIOS 断电后其设置参数会立即丢失。",
          answer: "**错误。**BIOS 程序在 ROM 中不会丢失；丢失的是 **CMOS 中保存的设置参数**（若无电池供电）。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列组装步骤中，顺序正确的是（　）",
          options: [
            "A. 先装硬盘，再装 CPU",
            "B. 先装 CPU 与散热器，再装内存，然后固定主板",
            "C. 先固定主板，再装 CPU",
            "D. 先接线缆，再装电源"
          ],
          correctIndex: 1,
          answer: "答案：B。通常先在机箱外装好 CPU、散热器与内存，再将主板固定到机箱，然后装电源、硬盘与显卡并接线。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "开机自检（POST）是由哪个部分完成的（　）",
          options: ["A. 操作系统", "B. BIOS", "C. 硬盘分区表", "D. 显卡驱动"],
          correctIndex: 1,
          answer: "答案：B。BIOS 负责开机自检、硬件初始化并引导操作系统。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "BIOS 设置错误导致计算机无法正常启动，最快捷的恢复方法是（　）",
          options: [
            "A. 更换 CPU",
            "B. 重新分区硬盘",
            "C. 在 BIOS 中选择恢复默认设置",
            "D. 重新安装操作系统"
          ],
          correctIndex: 2,
          answer: "答案：C。选择 Load Default Settings 恢复出厂默认值，可快速解决因设置错误导致的启动问题。"
        },
        {
          difficulty: "sprint",
          type: "single",
          question: "关于 BIOS 与 CMOS 的关系，正确的是（　）",
          options: [
            "A. CMOS 是程序，BIOS 是存储芯片",
            "B. BIOS 是程序，CMOS 存放 BIOS 的设置参数",
            "C. 二者完全相同",
            "D. BIOS 由电池供电，CMOS 不需供电"
          ],
          correctIndex: 1,
          answer: "答案：B。BIOS 是程序（在 ROM 中），CMOS 是用来保存 BIOS 设置参数的芯片（需电池维持）。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "一页速记",
      points: [
        "拆装三要点：**断电、防静电、轻拿轻放**",
        "组装顺序：CPU+散热 → 内存 → 固定主板 → 电源 → 硬盘/显卡 → 接线 → 整理检查",
        "防呆缺口：内存、显卡对准后垂直插入，听到卡扣声到位，**不可蛮力**",
        "**BIOS = 程序（ROM）**；**CMOS = 存参数的芯片（RAM，靠电池）**",
        "BIOS 常见设置：系统时间、启动顺序、硬件参数、密码、恢复默认"
      ],
      mustKnow: [
        "严禁带电操作内部部件",
        "BIOS 与 CMOS 的定义对调是最常见设错方式",
        "U 盘装系统要改启动顺序（Boot）"
      ]
    }
  ]
}
