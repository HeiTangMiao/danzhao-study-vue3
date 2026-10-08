/**
 * 内容页面数据（content-schema 的实例）
 * 页面：SQL 基础语句
 * 依据《浙江省高校招生职业技能考试大纲 计算机类理论知识》"数据库"模块编制
 * 说明：考纲明确"掌握 SQL 中 create、select、insert、delete、update 等语句的应用（**仅限单表操作**）"
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
      N0["SQL基础语句"]
      N1["SQL概述"]
      N0 --> N1
      N2["结构化查询语言"]
      N1 --> N2
      N3["CREATE建表"]
      N0 --> N3
      N4["INSERT插入"]
      N0 --> N4
      N5["SELECT查询"]
      N0 --> N5
      N6["WHERE条件"]
      N5 --> N6
      N7["UPDATE更新"]
      N0 --> N7
      N8["DELETE删除"]
      N0 --> N8
      N9["单表操作限定"]
      N0 --> N9`
        },
        // ---------- 学习目标 ----------
        {
          type: "objectives",
          title: "学习目标",
          items: [
            "能说出 SQL 的含义与作用",
            "能写出 CREATE TABLE 创建单表的语句",
            "能写出 INSERT 插入记录、SELECT 查询记录（含 WHERE 条件）的语句",
            "能写出 UPDATE 修改记录、DELETE 删除记录的语句",
            "能识别 SQL 语句中的常见错误（如 UPDATE/DELETE 遗漏 WHERE）"
          ]
        },
      ]
    },
    // ---------- 知识点 ----------
    {
      type: "knowledge",
      title: "SQL 概述",
      paragraphs: [
        "**SQL（Structured Query Language）：**结构化查询语言，是关系型数据库的标准语言，用于对数据库进行**定义、查询、更新与控制**。",
        "**特点：**语句简洁、非过程化（只需说明\"做什么\"，不必描述\"怎么做\"）。",
        "**书写约定：**关键字通常大写（如 SELECT、FROM），语句以**分号 `;`** 结束；关键字大小写一般不敏感。",
        "**考纲范围：**本次只要求掌握**单表操作**的 create、select、insert、delete、update，多表连接查询不在要求范围内。"
      ]
    },
    {
      type: "warning",
      text: "易错提醒：**UPDATE 与 DELETE 若不加 WHERE 条件，会作用于整张表的所有记录**——这是 SQL 最危险的常见错误。"
    },
    {
      type: "knowledge",
      title: "CREATE —— 创建表",
      paragraphs: [
        "**作用：**创建一张新的数据表，同时定义各字段的名称、数据类型与约束。",
        "**基本格式：**`CREATE TABLE 表名 (字段1 类型1, 字段2 类型2, ...);`",
        "**主键写法：**在字段定义后加 `PRIMARY KEY`。",
        "**示例说明：**下面创建一张 `student` 表，含学号、姓名、性别、成绩四个字段。"
      ]
    },
    {
      type: "code",
      title: "CREATE TABLE 示例",
      lang: "sql",
      code: `CREATE TABLE student (
  id     INT PRIMARY KEY,
  name   VARCHAR(20),
  gender CHAR(1),
  score  DECIMAL(5,2)
);`
    },
    {
      type: "knowledge",
      title: "INSERT —— 插入记录",
      paragraphs: [
        "**作用：**向表中**新增一条**记录。",
        "**基本格式：**`INSERT INTO 表名 (字段1, 字段2, ...) VALUES (值1, 值2, ...);`",
        "**注意：**字段列表与值列表必须一一对应；字符与日期类型的值要用**单引号**括起来，数值不需要。"
      ]
    },
    {
      type: "code",
      title: "INSERT 示例",
      lang: "sql",
      code: `INSERT INTO student (id, name, gender, score)
VALUES (1001, '张明', '男', 88.5);

INSERT INTO student (id, name, gender, score)
VALUES (1002, '李华', '女', 92.0);`
    },
    {
      type: "knowledge",
      title: "SELECT —— 查询记录",
      paragraphs: [
        "**作用：**从表中**检索**数据，是使用最频繁的语句。",
        "**基本格式：**`SELECT 字段列表 FROM 表名 [WHERE 条件];`",
        "**查询全部字段：**用 `SELECT * FROM 表名;`（`*` 表示所有字段）。",
        "**带条件查询：**用 `WHERE` 指定筛选条件，如 `WHERE score >= 60`。",
        "**去重：**`SELECT DISTINCT 字段 FROM 表名;` 可去掉重复值。"
      ]
    },
    {
      type: "code",
      title: "SELECT 示例",
      lang: "sql",
      code: `-- 查询全部字段与全部记录
SELECT * FROM student;

-- 只查姓名与成绩
SELECT name, score FROM student;

-- 带条件：查询成绩及格的学生
SELECT name, score FROM student WHERE score >= 60;

-- 带条件：查询学号为 1001 的学生
SELECT * FROM student WHERE id = 1001;`
    },
    {
      type: "tip",
      text: "写 SELECT 的顺序记忆：**SELECT 查什么 → FROM 从哪张表 → WHERE 什么条件**。"
    },
    {
      type: "knowledge",
      title: "UPDATE —— 修改记录",
      paragraphs: [
        "**作用：**修改表中**已有记录**的字段值。",
        "**基本格式：**`UPDATE 表名 SET 字段1 = 值1, 字段2 = 值2 WHERE 条件;`",
        "**务必加 WHERE：**不加 WHERE 会把整张表该字段全部改成同一个值。"
      ]
    },
    {
      type: "code",
      title: "UPDATE 示例",
      lang: "sql",
      code: `-- 把学号 1001 的成绩改为 90.0
UPDATE student SET score = 90.0 WHERE id = 1001;

-- 同时修改多个字段（务必带 WHERE）
UPDATE student SET name = '张明', score = 95.0 WHERE id = 1001;`
    },
    {
      type: "warning",
      text: "高频考点：`UPDATE 表名 SET ...` **遗漏 WHERE** 会导致**全表被修改**。考试常以此设错，务必检查。"
    },
    {
      type: "knowledge",
      title: "DELETE —— 删除记录",
      paragraphs: [
        "**作用：**从表中**删除**记录。",
        "**基本格式：**`DELETE FROM 表名 WHERE 条件;`",
        "**务必加 WHERE：**不加 WHERE 会**删除整张表的所有记录**（表结构仍在，但数据全清空）。",
        "**与 DROP 区别：**`DELETE` 删除的是**记录**（数据）；`DROP TABLE` 删除的是**整张表**（结构 + 数据）。"
      ]
    },
    {
      type: "code",
      title: "DELETE 示例",
      lang: "sql",
      code: `-- 删除学号为 1003 的记录
DELETE FROM student WHERE id = 1003;

-- 删除成绩不及格的记录
DELETE FROM student WHERE score < 60;`
    },
    {
      type: "table",
      title: "五类语句速查",
      headers: ["语句", "作用", "关键提醒"],
      rows: [
        ["CREATE TABLE", "创建表结构", "定义字段名与数据类型"],
        ["INSERT INTO", "插入新记录", "字段与值一一对应，字符加单引号"],
        ["SELECT ... FROM", "查询记录", "可用 WHERE 加条件、DISTINCT 去重"],
        ["UPDATE ... SET", "修改记录", "**必须带 WHERE**"],
        ["DELETE FROM", "删除记录", "**必须带 WHERE**；删表用 DROP"]
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
          question: "`DELETE FROM student;` 会删除 student 表中的所有记录。",
          answer: "**正确。**不带 WHERE 的 DELETE 会删除表中全部记录（表结构保留）。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "SQL 语句中，字符串类型的值需要用单引号括起来。",
          answer: "**正确。**字符与日期值用单引号；数值类型不需要。"
        },
        {
          difficulty: "basic",
          type: "single",
          question: "用于从表中检索数据（查询）的 SQL 语句是（　）",
          options: ["A. INSERT", "B. SELECT", "C. UPDATE", "D. DELETE"],
          correctIndex: 1,
          answer: "答案：B。SELECT 用于查询；INSERT 插入、UPDATE 修改、DELETE 删除。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "查询 student 表中成绩及格（≥60）的学生姓名，正确的语句是（　）",
          options: [
            "A. SELECT name FROM student;",
            "B. SELECT name FROM student WHERE score >= 60;",
            "C. SELECT * FROM student WHERE name >= 60;",
            "D. UPDATE student SET score >= 60;"
          ],
          correctIndex: 1,
          answer: "答案：B。用 WHERE 指定条件 score >= 60，并只查 name 字段。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "将学号 1001 的成绩改为 90，正确的语句是（　）",
          options: [
            "A. UPDATE student SET score = 90;",
            "B. UPDATE student SET score = 90 WHERE id = 1001;",
            "C. CHANGE student score = 90 WHERE id = 1001;",
            "D. SELECT score = 90 FROM student WHERE id = 1001;"
          ],
          correctIndex: 1,
          answer: "答案：B。UPDATE ... SET ... WHERE ... 是修改指定记录的正确写法；A 会改全表。"
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
          question: "`DROP TABLE` 与 `DELETE FROM` 的作用相同。",
          answer: "**错误。**DELETE 删除**记录**（结构保留）；DROP TABLE 删除**整张表**（结构 + 数据）。"
        },
        {
          difficulty: "basic",
          type: "judge",
          question: "`SELECT * FROM student;` 表示查询 student 表的全部字段与全部记录。",
          answer: "**正确。**`*` 代表所有字段，不带 WHERE 则查全部记录。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "向 student 表插入一条记录（学号 1005，姓名 王芳，成绩 76.5），正确的是（　）",
          options: [
            "A. INSERT student VALUES (1005, 王芳, 76.5);",
            "B. INSERT INTO student (id, name, score) VALUES (1005, '王芳', 76.5);",
            "C. ADD INTO student (id, name, score) VALUES (1005, '王芳', 76.5);",
            "D. SELECT INTO student VALUES (1005, '王芳', 76.5);"
          ],
          correctIndex: 1,
          answer: "答案：B。INSERT INTO ... VALUES ... 是标准写法，且字符串'王芳'需加单引号。"
        },
        {
          difficulty: "medium",
          type: "single",
          question: "删除 student 表中学号为 1003 的记录，正确的是（　）",
          options: [
            "A. DELETE student WHERE id = 1003;",
            "B. DELETE FROM student WHERE id = 1003;",
            "C. DROP FROM student WHERE id = 1003;",
            "D. REMOVE FROM student WHERE id = 1003;"
          ],
          correctIndex: 1,
          answer: "答案：B。DELETE FROM 表名 WHERE 条件 是删除记录的正确格式。"
        },
        {
          difficulty: "advanced",
          type: "single",
          question: "关于 UPDATE 与 DELETE 遗漏 WHERE 的后果，说法正确的是（　）",
          options: [
            "A. 语句会报错无法执行",
            "B. 会作用于整张表的所有记录",
            "C. 只影响第一条记录",
            "D. 不会有任何影响"
          ],
          correctIndex: 1,
          answer: "答案：B。遗漏 WHERE 时，UPDATE 会改全表、DELETE 会删全表，这是最需警惕的错误。"
        },
        {
          difficulty: "sprint",
          type: "single",
          question: "查询 student 表中不重复的性别值，应使用的语句是（　）",
          options: [
            "A. SELECT gender FROM student;",
            "B. SELECT DISTINCT gender FROM student;",
            "C. SELECT UNIQUE gender FROM student WHERE DISTINCT;",
            "D. SELECT gender FROM student WHERE DISTINCT;"
          ],
          correctIndex: 1,
          answer: "答案：B。DISTINCT 用于去除查询结果中的重复值。"
        }
      ]
    },
    // ---------- 一页速记 ----------
    {
      type: "summary",
      title: "一页速记",
      points: [
        "SQL = 结构化查询语言；语句以 `;` 结尾，字符串用**单引号**",
        "CREATE TABLE 建结构｜INSERT 插记录｜SELECT 查记录｜UPDATE 改记录｜DELETE 删记录",
        "SELECT 顺序记忆：**SELECT → FROM → WHERE**",
        "**UPDATE / DELETE 必须带 WHERE**，否则作用于全表",
        "DELETE 删**记录**，DROP TABLE 删**整张表**（结构 + 数据）",
        "考纲范围：**仅限单表操作**，不考多表连接"
      ],
      formulas: [],
      mustKnow: [
        "UPDATE/DELETE 漏 WHERE 是最高频设错点",
        "字符串要加单引号，数值不加",
        "DELETE 与 DROP 的区别：一个删数据，一个删表"
      ]
    }
  ]
}
