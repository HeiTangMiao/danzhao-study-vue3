/**
 * 内容页面数据（content-schema 的实例）
 * 页面：数据库基础 · 复习测验
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"数据库"模块编制
 * 说明：该模块在理论考中约占 15 分（10%），此前为零命中
 */
export default {
  blocks: [
    // ---------- 测验信息说明 ----------
    {
      type: "warning",
      text: "本测验覆盖「数据库基础」单元全部 3 页内容（数据库基本概念、数据表与字段、SQL 基础语句）。建议用时 20 分钟。请先独立作答，再点击「查看答案」核对解析。"
    },
    // ---------- 一、选择题 ----------
    {
      type: "quiz",
      title: "一、单项选择题（共 12 题）",
      items: [
        {
          difficulty: "basic",
          type: "single",
          question: "在数据表中，用于唯一标识每条记录的字段（或字段组合）称为（　）",
          options: ["外键", "主键", "索引", "视图"],
          correctIndex: 1,
          answer: "答案：B。主键用于唯一标识记录，且不允许重复与为空。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "数据库管理系统（DBMS）属于（　）",
          options: ["应用软件", "系统软件", "硬件设备", "数据库文件"],
          correctIndex: 1,
          answer: "答案：B。DBMS 属于系统软件，位于用户与操作系统之间。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "下列软件中，属于数据库管理系统的是（　）",
          options: ["WPS 文字", "Access", "Photoshop", "浏览器"],
          correctIndex: 1,
          answer: "答案：B。Access 是关系型数据库管理系统；其余三项均非数据库软件。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "在关系模型中，用二维表表示数据，其中\"一行\"称为（　）",
          options: ["字段", "属性", "记录（元组）", "主键"],
          correctIndex: 2,
          answer: "答案：C。一行是一条记录（元组）；一列是一个字段（属性）。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "关于主键的特点，下列说法**错误**的是（　）",
          options: [
            "主键值不能重复",
            "主键值不能为空",
            "主键值可以随意重复以方便统计",
            "主键用于唯一标识一条记录"
          ],
          correctIndex: 2,
          answer: "答案：C。主键具有唯一性与非空性，不能重复。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "下列字段中，最不适合单独作为主键的是（　）",
          options: ["学号", "身份证号", "姓名", "订单编号"],
          correctIndex: 2,
          answer: "答案：C。姓名可能重名，不满足唯一性；学号、身份证号、订单编号均具有唯一性。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "外键的作用是（　）",
          options: [
            "唯一标识本表记录",
            "建立两张表之间的关联关系",
            "加快查询显示速度",
            "自动为字段赋默认值"
          ],
          correctIndex: 1,
          answer: "答案：B。外键指向另一张表的主键，用于建立表间关联并保证引用完整性。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "存储金额、成绩等需要精确计算的数值，应选用（　）",
          options: ["INT", "DECIMAL", "VARCHAR", "DATE"],
          correctIndex: 1,
          answer: "答案：B。DECIMAL 是定点小数类型，适合金额与成绩等需精确计算的场景。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "用于从表中查询（检索）数据的 SQL 语句是（　）",
          options: ["INSERT", "SELECT", "UPDATE", "DELETE"],
          correctIndex: 1,
          answer: "答案：B。SELECT 用于查询数据。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "将 student 表中学号 1001 的成绩改为 90，正确的语句是（　）",
          options: [
            "UPDATE student SET score = 90;",
            "UPDATE student SET score = 90 WHERE id = 1001;",
            "MODIFY student SET score = 90 WHERE id = 1001;",
            "ALTER student score = 90 WHERE id = 1001;"
          ],
          correctIndex: 1,
          answer: "答案：B。UPDATE ... SET ... WHERE ... 修改指定记录；A 会改全表。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "删除 student 表中学号为 1003 的记录，正确的语句是（　）",
          options: [
            "DELETE student WHERE id = 1003;",
            "DELETE FROM student WHERE id = 1003;",
            "DROP student WHERE id = 1003;",
            "REMOVE FROM student WHERE id = 1003;"
          ],
          correctIndex: 1,
          answer: "答案：B。DELETE FROM 表名 WHERE 条件 用于删除指定记录。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "关于 DELETE 与 DROP TABLE 的区别，正确的是（　）",
          options: [
            "二者完全相同",
            "DELETE 删除记录（结构保留），DROP TABLE 删除整张表",
            "DELETE 删除整张表，DROP 只删记录",
            "DELETE 只能删一张表，DROP 可删多张表"
          ],
          correctIndex: 1,
          answer: "答案：B。DELETE 删除的是记录（数据），表结构保留；DROP TABLE 删除表结构与全部数据。"
        }
      ]
    },
    // ---------- 二、判断题 ----------
    {
      type: "quiz",
      title: "二、判断题（共 8 题）",
      items: [
        {
          difficulty: "basic",
          type: "judge",
          question: "一个数据库中可以包含多张数据表，表与表之间可以通过主键与外键建立联系。",
          answer: "**正确。**数据库可含多表，主外键用于建立表间关联，减少数据冗余。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "数据库系统的特征之一是数据冗余度高。",
          answer: "**错误。**数据库系统的特征是**冗余度低**（通过统一存储减少重复数据）。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "关系模型是目前最主流的数据模型，用二维表组织数据。",
          answer: "**正确。**关系模型结构清晰、操作方便，被广泛使用。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "VARCHAR 是定长字符串类型，不足部分会自动补空格。",
          answer: "**错误。**VARCHAR 是**变长**字符串；**CHAR** 才是定长、不足补空格。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "UPDATE 语句若遗漏 WHERE 条件，会修改整张表的所有记录。",
          answer: "**正确。**遗漏 WHERE 时 UPDATE 作用于全表，这是最危险也最高频的错误。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "DELETE 语句若不加 WHERE 条件，只会删除第一条记录。",
          answer: "**错误。**不加 WHERE 的 `DELETE FROM 表名;` 会**删除表中所有记录**（结构保留）。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "SQL 的 SELECT 语句用于查询数据，WHERE 子句用于指定查询条件。",
          answer: "**正确。**SELECT 负责查询，WHERE 用于筛选满足条件的记录。"
        },
        {
          difficulty: "medium",
          type: "judge",
          question: "本模块考纲要求的 SQL 操作包含多表连接查询。",
          answer: "**错误。**考纲明确 SQL 语句应用**仅限单表操作**，多表连接不在要求范围内。"
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
          question: "查询 student 表中成绩及格（≥60）的学生姓名与成绩，正确的语句是（　）",
          options: [
            "SELECT name, score FROM student;",
            "SELECT name, score FROM student WHERE score >= 60;",
            "SELECT name WHERE score >= 60 FROM student;",
            "FIND name, score FROM student WHERE score >= 60;"
          ],
          correctIndex: 1,
          answer: "答案：B。SELECT 字段 → FROM 表 → WHERE 条件，顺序与格式均正确。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "向 student 表插入记录（学号 1005、姓名 王芳、成绩 76.5），正确的是（　）",
          options: [
            "INSERT INTO student (id, name, score) VALUES (1005, 王芳, 76.5);",
            "INSERT INTO student (id, name, score) VALUES (1005, '王芳', 76.5);",
            "ADD INTO student (id, name, score) VALUES (1005, '王芳', 76.5);",
            "INSERT student VALUES (id=1005, name='王芳', score=76.5);"
          ],
          correctIndex: 1,
          answer: "答案：B。INSERT INTO ... VALUES ... 格式正确，且字符串'王芳'带有单引号（A 缺少引号）。"
        },
        {
          difficulty: "sprint",
          type: "single",
          question: "某 SQL 语句为 `UPDATE student SET score = 100;`，其执行结果是（　）",
          options: [
            "语句错误，无法执行",
            "把全表所有学生的成绩都改为 100",
            "只修改第一条记录",
            "删除全表成绩"
          ],
          correctIndex: 1,
          answer: "答案：B。缺少 WHERE 条件时，UPDATE 会把整张表的 score 字段全部改为 100。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "本单元核心结论速记",
      points: [
        "DB = 数据集合；DBMS = 系统软件（核心）；DBS = 整个系统",
        "五特征：结构化、共享高、**冗余低**、独立高（物理 + 逻辑）、统一管理",
        "**行 = 记录，列 = 字段**；主键唯一且非空（姓名不适合做主键）",
        "外键 = 指向另一表主键，建关联；主键 = 标识本表记录",
        "类型：INT / DECIMAL（精确小数）/ CHAR（定长）/ VARCHAR（变长）/ DATE",
        "SQL 五句：CREATE 建表、INSERT 插记录、SELECT 查、UPDATE 改、DELETE 删",
        "**UPDATE / DELETE 必须带 WHERE**；DELETE 删记录、DROP 删整表",
        "考纲范围：**仅限单表操作**"
      ],
      mustKnow: [
        "DBMS 是系统软件（不是应用软件）",
        "UPDATE/DELETE 漏 WHERE 是最高频设错点",
        "DELETE 与 DROP 的区别：删数据 vs 删表"
      ]
    }
  ]
}
