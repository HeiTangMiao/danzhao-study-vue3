/**
 * 内容页面数据（content-schema 的实例）
 * 页面：职业素养 · 复习测验
 * 依据《杭州市高校招生职业技能操作考试 计算机类考试说明》职业素养模块编制
 */
export default {
  id: "computer-01-03",
  unitNum: "01",
  subject: "computer",
  title: "职业素养 · 复习测验",
  subtitle: "本单元知识综合检测",
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "建议用时 30 分钟，满分 100 分。请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、判断题（每题4分，共40分） ----------
    {
      type: "quiz",
      title: "一、判断题（每题 4 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "开机时应先开主机，再开显示器。",
          answer: "**错误。**开机应先开显示器等外设，再开主机；关机顺序相反。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "Windows 文件名中可以使用 `*` 号。",
          answer: "**错误。**`*` 是 Windows 文件名禁用字符之一。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "操作设备时力度适合、轻拿轻放是职业素养的基本要求。",
          answer: "**正确。**爱护设备、操作力度适合是职业素养合格标准之一。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "程序无响应时，应第一时间长按电源键强制关机。",
          answer: "**错误。**应先尝试用 Ctrl+Alt+Del 打开任务管理器结束无响应的程序。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "考试中保存文件时，扩展名可以随意更改。",
          answer: "**错误。**扩展名决定文件类型，随意更改会导致文件无法打开或程序无法运行。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "重要文件应定期备份，防止数据丢失。",
          answer: "**正确。**数据备份是文件安全管理的重要措施。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "发现机房插座冒烟，应继续使用并观察情况。",
          answer: "**错误。**发现异常应立即断电并报告，不得继续使用。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "考试结束后，应按规定操作，不得随意关闭计算机。",
          answer: "**正确。**考试说明明确要求：考试结束不得关闭计算机，否则后果自负。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "文件名\"成绩/统计.xlsx\"在 Windows 中是合法的。",
          answer: "**错误。**`/` 是 Windows 文件名禁用字符。"
        },
        {
          difficulty: "advanced",
          type: "judge",
          question: "职业素养不合格时，技能操作考试整体判为不合格。",
          answer: "**正确。**技能操作考试合格必须满足必考模块职业素养和程序设计技能均为合格。"
        }
      ]
    },
    // ---------- 二、单选题（每题5分，共40分） ----------
    {
      type: "quiz",
      title: "二、单选题（每题 5 分，共 40 分）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "下列文件名中，最规范的是（　）",
          options: ["A. 新建文档1.docx", "B. 111111.txt", "C. 期末成绩统计.xlsx", "D. a b c.docx"],
          correctIndex: 2,
          answer: "答案：C。\"期末成绩统计\"见名知意，能反映文件内容。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "下列字符中，不属于 Windows 文件名禁用字符的是（　）",
          options: ["A. \\", "B. :", "C. _", "D. *"],
          correctIndex: 2,
          answer: "答案：C。下划线 `_` 是合法字符，`\\`、`:`、`*` 均为禁用字符。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "关于开关机顺序，下列说法正确的是（　）",
          options: ["A. 开机先开主机再开显示器", "B. 关机先关显示器再关主机", "C. 开机先开显示器再开主机", "D. 开关机顺序无关紧要"],
          correctIndex: 2,
          answer: "答案：C。开机先开外设再开主机；关机先关主机再关外设。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "考试中新建考生文件夹，最合适的名称是（　）",
          options: ["A. 新建文件夹", "B. 准考证号", "C. 我的文件夹", "D. 考试"],
          correctIndex: 1,
          answer: "答案：B。考试说明要求：考试前新建以准考证号为名称的考生文件夹。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列行为中，符合计算机操作职业道德的是（　）",
          options: ["A. 盗用他人账号", "B. 使用正版软件并遵守授权协议", "C. 传播盗版软件", "D. 随意删除他人文件"],
          correctIndex: 1,
          answer: "答案：B。尊重知识产权、使用正版软件符合职业道德。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "标准指法中，双手食指应放在的定位键是（　）",
          options: ["A. A 和 L 键", "B. F 和 J 键", "C. D 和 K 键", "D. S 和 L 键"],
          correctIndex: 1,
          answer: "答案：B。F 和 J 键上有定位凸点，是标准指法的基准。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "考试中程序运行出错，下列做法最恰当的是（　）",
          options: ["A. 直接放弃该题", "B. 检查代码逻辑并修改后重新运行", "C. 反复重启计算机", "D. 删除程序文件重新创建"],
          correctIndex: 1,
          answer: "答案：B。应先分析错误原因，检查代码逻辑，修改后重新运行。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "关于文件安全管理，下列说法错误的是（　）",
          options: ["A. 重要文件应设置权限保护", "B. 定期查杀病毒", "C. 打开来历不明的邮件附件", "D. 重要数据定期备份"],
          correctIndex: 2,
          answer: "答案：C。打开来历不明的邮件附件可能感染病毒，属于不安全行为。"
        }
      ]
    },
    // ---------- 三、简答题（共20分） ----------
    {
      type: "example",
      title: "三、简答题（共 20 分）",
      items: [
        {
          title: "第1题（10分）",
          question: "简述正确的开机顺序和关机顺序，并说明考试结束后应如何操作计算机。",
          solution: "**解：**\n① 开机顺序：先开显示器等外设，再开主机。\n② 关机顺序：先关主机，再关显示器等外设。\n③ 考试结束后：不得关闭计算机，应按规定交卷后离开，否则后果自负。",
          answer: "开机先外设后主机；关机先主机后外设；考试结束不得关闭计算机。"
        },
        {
          title: "第2题（10分）",
          question: "考试要求将程序保存到\"考生文件夹\\程序设计\\试题一\"文件夹中。请写出完整的保存与提交前校对步骤。",
          solution: "**解：**\n① 打开\"考生文件夹\\程序设计\\试题一\"文件夹；\n② 在代码编辑器中执行\"文件→另存为\"；\n③ 选择目标文件夹，按题目要求命名（如 `试题一.py`），确认扩展名正确；\n④ 保存后运行测试，确认程序功能正确；\n⑤ 提交前打开文件夹，校对所有文件是否存在、内容是否完整。",
          answer: "选择目标文件夹 → 规范命名 → 确认扩展名 → 保存并测试 → 提交前校对。"
        }
      ]
    }
  ]
}
