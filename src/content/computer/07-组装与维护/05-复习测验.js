/**
 * 内容页面数据（content-schema 的实例）
 * 页面：组装与维护 · 复习测验
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"计算机组装与维护"模块编制
 * 说明：本模块在理论考中约占 20 分（13.3%），此前在项目中为零命中
 */
export default {
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "本测验覆盖「组装与维护」单元全部 4 页内容（主要部件与外围设备、硬件拆装与 BIOS、硬盘分区与软件安装、系统维护与故障处理）。建议用时 25 分钟。请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题 ----------
    {
      type: "quiz",
      title: "一、单项选择题（共 12 题）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "下列部件中，断电后信息**不会**丢失的是（　）",
          options: ["A. 内存（RAM）", "B. 高速缓存（Cache）", "C. 硬盘", "D. 寄存器"],
          correctIndex: 2,
          answer: "答案：C。硬盘是外存储器，断电后信息保留；RAM、Cache、寄存器断电后信息丢失。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "CPU 的主要组成是（　）",
          options: ["A. 运算器和控制器", "B. 内存和硬盘", "C. 显卡和声卡", "D. 主板和电源"],
          correctIndex: 0,
          answer: "答案：A。CPU 由运算器与控制器组成，合称中央处理器。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "下列全部属于输出设备的一组是（　）",
          options: [
            "A. 键盘、鼠标、扫描仪",
            "B. 显示器、打印机、音箱",
            "C. 硬盘、U 盘、光盘",
            "D. 摄像头、麦克风、手写板"
          ],
          correctIndex: 1,
          answer: "答案：B。显示器、打印机、音箱用于输出；A、D 为输入设备，C 为外存储器。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "BIOS 的本质是（　）",
          options: ["A. 一块存储参数的芯片", "B. 固化在 ROM 中的程序", "C. 一种文件系统格式", "D. 操作系统内核"],
          correctIndex: 1,
          answer: "答案：B。BIOS 是固化在主板 ROM 芯片上的程序，负责自检、初始化与引导系统。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "CMOS 的作用是（　）",
          options: [
            "A. 长期保存用户文件",
            "B. 保存 BIOS 的设置参数（靠电池维持）",
            "C. 负责图形运算",
            "D. 负责网络通讯"
          ],
          correctIndex: 1,
          answer: "答案：B。CMOS 是保存 BIOS 设置参数的 RAM 芯片，由主板电池供电。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "安装内存条的正确做法是（　）",
          options: [
            "A. 用力按压直到插入",
            "B. 对准防呆缺口垂直插入，卡扣扣紧即可",
            "C. 任意方向都能插入",
            "D. 不需要考虑方向"
          ],
          correctIndex: 1,
          answer: "答案：B。内存有防呆缺口，对准后垂直插入，听到卡扣声表示到位，不可蛮力。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "FAT32 文件系统对单个文件的大小限制是（　）",
          options: ["A. 2 GB", "B. 4 GB", "C. 8 GB", "D. 无限制"],
          correctIndex: 1,
          answer: "答案：B。FAT32 单个文件不能超过 4 GB；NTFS、exFAT 均支持更大文件。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "要在一块 U 盘上存放一个 10 GB 的文件，应选用的文件系统格式是（　）",
          options: ["A. FAT32", "B. NTFS 或 exFAT", "C. 只能是 FAT32", "D. 任意格式都可以"],
          correctIndex: 1,
          answer: "答案：B。FAT32 有 4 GB 上限，10 GB 文件需选用 NTFS 或 exFAT。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "在设备管理器中某设备出现黄色感叹号，通常说明（　）",
          options: ["A. 设备工作最佳", "B. 驱动程序未正确安装", "C. 网络连接正常", "D. 硬盘已满"],
          correctIndex: 1,
          answer: "答案：B。黄色感叹号表示驱动异常或未安装，设备无法正常工作。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "关于固态硬盘（SSD），下列做法正确的是（　）",
          options: [
            "A. 每天进行磁盘碎片整理",
            "B. 不需要频繁进行碎片整理",
            "C. 断电后数据会丢失",
            "D. 一定比机械硬盘容量大"
          ],
          correctIndex: 1,
          answer: "答案：B。SSD 无需频繁碎片整理（碎片整理针对机械硬盘）；它断电后数据仍保留。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "下列软件类型中，源代码公开、允许用户查看修改的是（　）",
          options: ["A. 正版软件", "B. 共享软件", "C. 免费软件", "D. 开源软件"],
          correctIndex: 3,
          answer: "答案：D。开源软件公开源代码；免费软件虽可免费使用但不一定开放源码。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "卸载软件最恰当的方式是（　）",
          options: [
            "A. 直接删除安装文件夹",
            "B. 使用系统卸载功能或软件自带卸载程序",
            "C. 格式化整个硬盘",
            "D. 重新安装操作系统"
          ],
          correctIndex: 1,
          answer: "答案：B。通过系统或自带卸载程序卸载最规范，直接删文件夹会留下残留。"
        }
      ]
    },
    // ---------- 二、判断题 ----------
    {
      type: "quiz",
      title: "二、判断题（共 10 题）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "拆装计算机内部部件前应先关机并拔掉电源线。",
          answer: "**正确。**严禁带电操作，否则可能造成短路并损坏硬件。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "扩展分区可以直接存放数据。",
          answer: "**错误。**扩展分区不能直接存放数据，必须再划分为逻辑分区后才能使用。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "格式化分区会清除该分区上的全部数据。",
          answer: "**正确。**格式化会重建文件系统并清空数据，操作前必须备份。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "免费软件不受版权保护，可以随意修改和分发。",
          answer: "**错误。**免费软件同样受版权保护；只有**开源软件**才开放源代码。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "补丁的作用是修复系统或软件中已发现的漏洞。",
          answer: "**正确。**补丁用于修复安全缺陷、提升稳定性。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "处理计算机故障应遵循\"先软后硬、先外后内\"的原则。",
          answer: "**正确。**先排查软件与连接等外部因素，最后再考虑拆机检查硬件。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "CPU 散热不良可能导致计算机频繁死机。",
          answer: "**正确。**过热会触发保护或直接死机，清灰检查风扇是有效维护手段。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "重要数据只需在本机同一硬盘中再复制一份即可保障安全。",
          answer: "**错误。**同一硬盘损坏时两者都会丢失，应遵循**多份、异地、定期**的备份原则。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "选购计算机时应先明确用途，再据此确定配置。",
          answer: "**正确。**用途决定配置重点，且各部件要匹配避免短板。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "BIOS 断电后其程序本身会丢失。",
          answer: "**错误。**BIOS 程序固化在 ROM 中不会丢失；断电丢失的是 **CMOS 中保存的设置参数**。"
        }
      ]
    },
    // ---------- 三、综合应用题 ----------
    {
      type: "quiz",
      title: "三、综合应用（共 3 题）",
      items: [
        {
          difficulty: "advanced",
          type: "single",
          question: "某计算机开机后主机风扇转动但屏幕无任何显示，最应优先检查的是（　）",
          options: [
            "A. 显示器信号线与内存、显卡接触情况",
            "B. 硬盘容量是否足够",
            "C. 操作系统是否激活",
            "D. 键盘是否损坏"
          ],
          correctIndex: 0,
          answer: "答案：A。风扇转说明已供电，无显示多与信号线或内存、显卡接触不良有关，应优先排查。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "某同学想用 U 盘给一台新计算机安装操作系统，需要（　）",
          options: [
            "A. 在 BIOS 中把 U 盘设为优先启动项",
            "B. 先格式化所有分区为 FAT32",
            "C. 更换 CPU",
            "D. 卸载原有驱动程序"
          ],
          correctIndex: 0,
          answer: "答案：A。用 U 盘装系统需调整 BIOS 的启动顺序（Boot），使 U 盘优先启动。"
        },
        {
          difficulty: "sprint",
          type: "single",
          question: "关于数据备份与系统还原，下列做法最合理的是（　）",
          options: [
            "A. 只在系统盘再存一份备份",
            "B. 定期备份到外置硬盘或云盘，并在异常时还原",
            "C. 从不备份，故障后重新安装一切",
            "D. 每天都对固态硬盘做碎片整理"
          ],
          correctIndex: 1,
          answer: "答案：B。备份应遵循多份、异地、定期原则，存于外置介质或云端；SSD 不需频繁碎片整理。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "本单元核心结论速记",
      points: [
        "主机内部：CPU（运算器+控制器）、主板、内存、硬盘、显卡、电源、散热器",
        "**内存断电丢失，硬盘断电保留**；CPU 定性能，内存定流畅，硬盘定容量",
        "BIOS = 程序（ROM）；CMOS = 存参数的芯片（靠电池）→ 最常对调设错",
        "**FAT32 单文件 ≤ 4 GB**；NTFS 主流；exFAT 适合闪存",
        "扩展分区 → 逻辑分区才能存数据；格式化 = 清空，先备份",
        "驱动异常 = 黄色感叹号；漏洞 → 补丁；**SSD 不频繁碎片整理**",
        "故障排查：先软后硬、先外后内；备份：多份、异地、定期"
      ],
      mustKnow: [
        "BIOS 与 CMOS 的区分是本模块最高频考点",
        "FAT32 的 4 GB 限制、SSD 不做碎片整理是两个常设错点",
        "免费 ≠ 无版权；开源 = 源码公开"
      ]
    }
  ]
}
