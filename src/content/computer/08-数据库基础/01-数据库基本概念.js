/**
 * 内容页面数据（content-schema 的实例）
 * 页面：数据库基本概念
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"数据库"模块编制
 * 说明：该模块在理论考中约占 15 分（10%），此前为零命中
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
      N0["数据库基本概念"]
      N1["三个基本概念"]
      N0 --> N1
      N2["数据库DB"]
      N1 --> N2
      N3["数据库管理系统DBMS"]
      N1 --> N3
      N4["数据库系统DBS"]
      N1 --> N4
      N5["系统特征"]
      N0 --> N5
      N6["结构化与共享"]
      N5 --> N6
      N7["冗余低与独立高"]
      N5 --> N7
      N8["数据模型"]
      N0 --> N8
      N9["层次/网状/关系"]
      N8 --> N9
      N10["常见关系型数据库"]
      N0 --> N10`
        },
        // ---------- 学习目标 ----------
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能区分数据库（DB）、数据库管理系统（DBMS）与数据库系统（DBS）",
            "能说出数据库系统的 5 个基本特征",
            "能说出三种主要数据模型，并识别关系模型的特点",
            "能列举 3 种以上常见的关系型数据库管理系统"
          ]
        },
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "三个基本概念",
      paragraphs: [
        "**数据库（DB，Database）：**长期存储在计算机内、**有组织的、可共享的**相关数据集合。",
        "**数据库管理系统（DBMS）：**位于用户与操作系统之间的一层**系统软件**，负责数据库的建立、使用与维护（如 MySQL、SQL Server、Oracle）。",
        "**数据库系统（DBS）：**引入数据库后的整个计算机系统，包括**数据库 + 数据库管理系统 + 应用系统 + 数据库管理员和用户**。",
        "**三者关系：**DBS 包含 DBMS，DBMS 管理 DB。即 **DBS ⊃ DBMS ⊃（管理）DB**。"
      ]
    },
    {
      type: "warning",
      text: "高频考点：**DBMS 属于系统软件**（不是应用软件）；数据库系统的核心是 **DBMS**。题目常把 DBMS 说成应用软件来设错。"
    },
    {
      type: "knowledge",
      title: "数据库系统的基本特征",
      paragraphs: [
        "**数据结构化：**数据按一定的数据模型组织，面向整个组织而非单个应用。",
        "**数据共享性高：**多个用户与应用程序可同时访问同一数据。",
        "**冗余度低：**通过统一存储减少重复数据（但必要的冗余仍会保留以提高效率）。",
        "**数据独立性高：**包括**物理独立性**（存储结构变化不影响应用）与**逻辑独立性**（逻辑结构变化不影响应用）。",
        "**统一管理与控制：**由 DBMS 统一进行安全性、完整性、并发控制与故障恢复。"
      ]
    },
    {
      type: "tip",
      text: "记忆口诀：**结构化、共享高、冗余低、独立高、统一管理**——五个特征通常与\"文件系统\"对比考查。"
    },
    {
      type: "knowledge",
      title: "数据模型",
      paragraphs: [
        "**层次模型：**用**树形结构**表示实体及联系，每个结点只有一个父结点。",
        "**网状模型：**用**图结构**表示，允许一个结点有多个父结点，能表达更复杂的联系。",
        "**关系模型：**用**二维表**表示实体及联系，结构清晰、操作方便，是目前**最主流**的数据模型。",
        "**关系模型术语：**关系 = 表；元组 = 行（记录）；属性 = 列（字段）。"
      ]
    },
    {
      type: "table",
      title: "三种数据模型对比",
      headers: ["模型", "结构", "特点"],
      rows: [
        ["层次模型", "树形", "一个子结点只有一个父结点"],
        ["网状模型", "图形（网络）", "允许多个父结点，表达复杂联系"],
        ["**关系模型**", "**二维表**", "结构清晰、最主流、操作方便"]
      ]
    },
    {
      type: "knowledge",
      title: "常见的关系型数据库管理系统",
      paragraphs: [
        "**MySQL：**开源、免费，广泛用于 Web 应用与中小系统，是本单元示例使用的数据库。",
        "**SQL Server：**微软开发，与 Windows 平台集成良好。",
        "**Oracle：**大型商业数据库，功能强大，常用于企业级系统。",
        "**Access：**微软 Office 套件中的桌面型数据库，适合小型应用。",
        "**SQLite：**轻量级嵌入式数据库，常用于移动应用与小型工具。"
      ]
    },
    // ---------- 快速检测 ----------
    {
      type: "quiz",
      title: "快速检测",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "数据库管理系统（DBMS）属于应用软件。",
          answer: "**错误。**DBMS 属于**系统软件**，是用户与操作系统之间的数据管理软件。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "关系模型用二维表来表示数据及数据之间的联系。",
          answer: "**正确。**关系模型以二维表（行 + 列）组织数据，是目前最主流的数据模型。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "数据库系统的核心是（　）",
          options: ["A. 数据库", "B. 数据库管理系统（DBMS）", "C. 操作系统", "D. 应用软件"],
          correctIndex: 1,
          answer: "答案：B。DBMS 是数据库系统的核心，负责数据库的建立、使用与维护。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "下列三者关系中，正确的是（　）",
          options: [
            "A. DB 包含 DBMS",
            "B. DBS 包含 DBMS，DBMS 管理 DB",
            "C. DBMS 包含 DBS",
            "D. 三者完全相同"
          ],
          correctIndex: 1,
          answer: "答案：B。数据库系统（DBS）包含数据库（DB）、DBMS、应用系统与人员。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列属于关系型数据库管理系统的是（　）",
          options: ["A. Windows", "B. MySQL", "C. Photoshop", "D. Word"],
          correctIndex: 1,
          answer: "答案：B。MySQL 是典型的关系型数据库管理系统；其余均非数据库软件。"
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
          question: "数据库是长期存储在计算机内、有组织且可共享的数据集合。",
          answer: "**正确。**这是数据库（DB）的基本定义。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "层次模型中，一个子结点可以有多个父结点。",
          answer: "**错误。**层次模型是树形结构，一个子结点只有一个父结点；**网状模型**才允许多个父结点。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列不属于数据库系统特征的是（　）",
          options: ["A. 数据结构化", "B. 数据共享性高", "C. 数据冗余度高", "D. 数据独立性高"],
          correctIndex: 2,
          answer: "答案：C。数据库系统的特征是**冗余度低**，而非冗余度高。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "在关系模型中，表中的一行通常称为（　）",
          options: ["A. 字段", "B. 元组（记录）", "C. 属性", "D. 主键"],
          correctIndex: 1,
          answer: "答案：B。一行是一条记录（元组）；一列是一个字段（属性）。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "数据独立性高是数据库系统的重要特征，它包括（　）",
          options: [
            "A. 物理独立性与逻辑独立性",
            "B. 软件独立性与硬件独立性",
            "C. 网络独立性与存储独立性",
            "D. 用户独立性与系统独立性"
          ],
          correctIndex: 0,
          answer: "答案：A。数据独立性分为物理独立性（存储变化不影响应用）与逻辑独立性（逻辑结构变化不影响应用）。"
        },
        {
          difficulty: "sprint",
          type: "single",
          question: "某小型 Web 项目需要一款开源、免费的数据库，最合适的选择是（　）",
          options: ["A. Oracle", "B. MySQL", "C. Windows Server", "D. WPS"],
          correctIndex: 1,
          answer: "答案：B。MySQL 开源免费、轻量高效，是 Web 项目的常见选择；Oracle 是大型商业数据库。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "一页速记",
      points: [
        "DB = 数据集合；DBMS = 管理数据库的**系统软件**；DBS = 整个系统（含 DB + DBMS + 应用 + 人员）",
        "关系：**DBS ⊃ DBMS，DBMS 管理 DB**；数据库系统核心是 **DBMS**",
        "五特征：结构化、共享高、**冗余低**、独立高（物理 + 逻辑）、统一管理",
        "三种模型：层次（树）／网状（图）／**关系（二维表，最主流）**",
        "常见 DBMS：MySQL（开源）、SQL Server、Oracle、Access、SQLite"
      ],
      mustKnow: [
        "DBMS 是系统软件，不是应用软件",
        "冗余度**低**才是数据库系统的特征",
        "关系模型：行 = 元组（记录），列 = 属性（字段）"
      ]
    }
  ]
}
