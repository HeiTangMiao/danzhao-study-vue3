# 组件文档

> 本文档描述 Vue3 重构版的所有组件、composables 和 stores 的用法。

---

## 目录结构

```
src/
├── components/
│   ├── BlockRenderer.vue        # 区块分发器
│   ├── FormulaEditor.vue        # 公式可视化编辑器（含模板面板）
│   ├── JsxGraphBoard.vue        # JSXGraph 几何画板
│   ├── MathJaxRender.vue        # 公式渲染（KaTeX 引擎）
│   └── blocks/                  # 区块渲染组件
│       ├── MindMapBlock.vue     # 思维导图
│       ├── ObjectivesBlock.vue  # 学习目标
│       ├── KnowledgeBlock.vue   # 知识点
│       ├── FormulaCard.vue      # 公式卡片
│       ├── TableBlock.vue       # 表格
│       ├── WarningBlock.vue     # 警告
│       ├── TipBlock.vue         # 提示
│       ├── ExampleBlock.vue     # 例题
│       └── QuizBlock.vue        # 练习题
├── composables/
│   ├── useTheme.js              # 主题切换
│   ├── useKatex.js              # KaTeX 公式渲染
│   ├── useMermaid.js            # Mermaid 渲染
│   ├── usePomodoro.js           # 番茄钟
│   ├── useNotes.js              # 笔记
│   ├── useBookmarks.js          # 书签
│   └── useSpacedReview.js       # 间隔复习（SM-2）
├── content/                     # 多学科内容数据
│   ├── index.js                 # 多学科索引（SUBJECTS / getSubjectConfig）
│   ├── site.js                  # 数学站点配置
│   ├── math/                    # 数学内容（12 单元）
│   ├── chinese/                 # 语文内容（6 单元）
│   ├── computer/                # 计算机内容（5 单元）
│   └── site.js                  # 各学科站点配置
├── stores/
│   ├── progress.js              # 学习进度（多学科隔离）
│   ├── studyDb.js               # IndexedDB 数据层 + 学习工具接口（无游戏化）
│   └── auth.js                  # 账号与会话管理
└── types/
    ├── content.d.ts             # 内容 Schema 类型
    ├── site.d.ts                # 站点配置类型（含 Subject 联合类型）
    ├── store.d.ts               # Store 类型（Progress / StudyDB）
    └── composable.d.ts          # Composable 类型（7 个组合式函数）
```

---

## 核心组件

### BlockRenderer

内容区块分发器，根据 `block.type` 动态渲染对应组件。

```vue
<BlockRenderer :block="block" />
```

| Prop | 类型 | 说明 |
|------|------|------|
| block | Object | 区块数据，必须含 `type` 字段 |

支持的区块类型：`mindmap` / `objectives` / `knowledge` / `formula` / `table` / `warning` / `tip` / `example` / `quiz` / `diagram` / `divider`

### MathJaxRender

基于 KaTeX 同步渲染 LaTeX 数学公式，支持行内 `\(...\)` 和块级 `$$...$$`。

```vue
<MathJaxRender :text="content" />
```

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| text | String | '' | 含 LaTeX 的文本 |
| block | Boolean | false | 块级居中展示（用于公式卡片） |

### JsxGraphBoard

封装 JSXGraph 交互式几何画板，自适应暗色主题。

```vue
<JsxGraphBoard board-id="myBoard" :init-code="code" caption="图示" />
```

| Prop | 类型 | 说明 |
|------|------|------|
| boardId | String | 画板唯一 ID |
| initCode | String | JSXGraph 初始化代码（字符串） |
| caption | String | 图注（可选） |

### FormulaEditor

公式可视化编辑器，提供公式模板面板 + 符号快捷面板 + LaTeX 输入 + 实时预览。

```vue
<FormulaEditor v-model="latexStr" />
```

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| modelValue | String | '' | LaTeX 字符串（v-model） |
| placeholder | String | '输入 LaTeX 公式...' | 占位提示 |

**公式模板面板**（16 个常用公式，可通过 `模板` 按钮切换显隐）：

| 模板 | LaTeX | 用途 |
|------|-------|------|
| 二次公式 | `x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}` | 求根公式 |
| 判别式 | `\Delta = b^2 - 4ac` | 判别根的情况 |
| 韦达定理 | `x_1 + x_2 = -\frac{b}{a}, \quad x_1 x_2 = \frac{c}{a}` | 根与系数关系 |
| 基本不等式 | `a + b \geq 2\sqrt{ab} \quad (a > 0, b > 0)` | 均值不等式 |
| sin²+cos² | `\sin^2\alpha + \cos^2\alpha = 1` | 同角三角函数关系 |
| 二倍角 | `\sin 2\alpha = 2\sin\alpha\cos\alpha` | 倍角公式 |
| 余弦定理 | `a^2 = b^2 + c^2 - 2bc\cos A` | 解三角形 |
| 正弦定理 | `\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C} = 2R` | 解三角形 |
| 等差通项 | `a_n = a_1 + (n-1)d` | 等差数列 |
| 等差求和 | `S_n = \frac{n(a_1 + a_n)}{2}` | 等差数列求和 |
| 等比通项 | `a_n = a_1 \cdot q^{n-1}` | 等比数列 |
| 等比求和 | `S_n = \frac{a_1(1 - q^n)}{1 - q} \quad (q \neq 1)` | 等比数列求和 |
| 对数换底 | `\log_a b = \frac{\log_c b}{\log_c a}` | 对数运算 |
| 排列数 | `A_n^m = \frac{n!}{(n-m)!}` | 排列 |
| 组合数 | `C_n^m = \frac{n!}{m!(n-m)!}` | 组合 |
| 二项式 | `(a+b)^n = \sum_{k=0}^{n} C_n^k a^{n-k} b^k` | 二项式定理 |

**符号快捷面板**分组：运算符、结构（分数/根号/上下标/求和/连乘/积分/极限）、集合符号、希腊字母、三角函数、箭头。

模板插入时支持在光标位置追加，若当前已有内容则用换行符分隔；符号插入时支持选中文本自动包裹（如分数 `\frac{}{}` 包裹选中表达式）。

---

## Composables

### useTheme

```js
const { theme, toggleTheme, setTheme } = useTheme()
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| theme | Ref\<'light' \| 'dark'\> | 当前主题 |
| toggleTheme | Function | 切换主题 |
| setTheme | Function | 设置指定主题 |

### usePomodoro

```js
const { mode, timeLeft, isRunning, completedSessions, start, pause, reset, skip } = usePomodoro()
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| mode | Ref\<'focus' \| 'break' \| 'longBreak'\> | 当前模式 |
| timeLeft | Ref\<Number\> | 剩余秒数 |
| isRunning | Ref\<Boolean\> | 是否运行中 |
| completedSessions | Ref\<Number\> | 已完成专注次数 |
| start / pause / reset / skip | Function | 计时控制 |

### useNotes(pageKey, subject, meta)

```js
const { content, status, statusType, wordCount, manualSave, scheduleAutosave } = useNotes('math_01_01-集合的概念与表示', 'math', { title: '集合的概念' })
```

| 参数 | 类型 | 说明 |
|------|------|------|
| pageKey | String | 页面唯一标识 |
| subject | String | 学科（`'math'` / `'chinese'`） |
| meta | Object | 页面元信息（title, unitTitle） |

| 返回值 | 类型 | 说明 |
|--------|------|------|
| content | Ref\<String\> | 笔记内容 |
| status | Ref\<String\> | 保存状态文案 |
| statusType | Ref\<'saved' \| 'saving' \| 'error'\> | 状态类型 |
| wordCount | Ref\<Number\> | 字数统计 |
| scheduleAutosave | Function | 触发自动保存（1.5 秒防抖） |
| manualSave | Function | 手动保存（支持 Ctrl+S） |

### useBookmarks(pageKey, subject, meta)

```js
const { isBookmarked, toggleBookmark, removeBookmark } = useBookmarks('chinese_02_01-记叙文阅读', 'chinese', { title: '记叙文阅读', unitNum: '02' })
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| isBookmarked | Ref\<Boolean\> | 是否已收藏 |
| toggleBookmark | Function | 切换收藏状态 |
| removeBookmark | Function | 移除书签 |

### useSpacedReview

```js
const { dueItems, loadDueItems, review } = useSpacedReview()
```

| 返回值 | 类型 | 说明 |
|--------|------|------|
| dueItems | Ref\<ReviewItem[]\> | 到期复习列表 |
| loadDueItems | Function | 加载到期错题 |
| review | Function | 评分复习（quality: 0=AGAIN / 3=HARD / 4=GOOD / 5=EASY） |

SM-2 间隔复习算法，评分等级：AGAIN(0) / HARD(3) / GOOD(4) / EASY(5)。

---

## Stores

### useProgressStore

学习进度管理，按学科隔离，Pinia 持久化到 localStorage。

进度数据结构：`completed[subject][unitNum][fileIndex]`（三层嵌套，学科 → 单元 → 页面索引）。

```js
const progress = useProgressStore()

// 按学科操作（subject: 'math' | 'chinese'）
progress.toggleComplete('math', '01', 0)        // 标记数学第1单元第0页完成
progress.isCompleted('chinese', '02', 1)         // 查询语文第2单元第1页是否完成
progress.completedCount('math', '01')           // 数学第1单元已完成页数

progress.subjectTotalCompleted('math')           // 数学全部已完成页面总数

// 批量操作
progress.setBatchComplete('math', '01', [0, 1, 2], true)  // 批量标记完成
progress.resetSubject('chinese')                 // 重置语文学科全部进度
progress.resetAll()                              // 重置全部进度
```

| 方法 | 参数 | 说明 |
|------|------|------|
| `toggleComplete` | `(subject, unitNum, fileIndex)` | 切换某学科某页面完成状态 |
| `isCompleted` | `(subject, unitNum, fileIndex)` → `boolean` | 查询某页面是否完成 |
| `completedCount` | `(subject, unitNum)` → `number` | 某学科某单元已完成页数 |
| `subjectTotalCompleted` | `(subject)` → `number` | 某学科全部已完成页数 |
| `setBatchComplete` | `(subject, unitNum, indices, done)` | 批量设置完成状态 |
| `resetSubject` | `(subject)` | 重置某学科全部进度 |
| `resetAll` | `()` | 重置全部进度 |

持久化键名：`vue3_progress_v2`

### useStudyDbStore

IndexedDB 数据层，7 个对象仓库的 CRUD + 学习工具接口 + 导入导出。所有学习记录均含 `subject` 字段用于区分学科。

```js
const db = useStudyDbStore()
await db.init()
await db.getNote('math_01_01-集合的概念与表示')
await db.saveNote({ pageKey: 'math_01_01-集合的概念与表示', subject: 'math', content: '...' })
await db.markPageVisited({ subject, unitNum, unitTitle, fileKey, fileTitle, isTest })  // 页面访问
await db.recordTest(subject, unitNum, earnedPoints, totalPoints)                        // 测验成绩
await db.recordError(subject, unitNum, question, correctAnswer, userAnswer, explanation) // 错题入库
await db.updateDailyStat({ filesVisited, questionsAnswered, studyMinutes })            // 今日统计
const overview = await db.getLearningOverview()                                        // 学习概况
const backup = await db.exportAllData()
await db.importAllData(backup)
```

对象仓库：study_log / daily_stats / page_progress / error_book / notes / bookmarks / user_progress

`daily_stats` 仓库记录仅含学习指标（`filesVisited` / `questionsAnswered` / `studyMinutes`），不含 XP、打卡等游戏字段（数据库 v5 已清理）。

---

## 页面视图（多学科）

### HomeView

首页，提供学科选择和单元导航。

- 学科选择卡片（数学 `math` / 语文 `chinese`），通过 `SUBJECT_LIST` 渲染
- 按阶段（phase）分组展示当前学科单元列表
- 通过 `localStorage` 键 `current_subject` 记忆用户选择的学科
- 单元卡片显示进度条（`progress.completedCount(subject, unit.num)` / `unit.files.length`）
- 点击单元跳转路由：`/study/:subject/:unitNum/0`

### UnitView

内容页，按学科动态加载内容并渲染。

- 从 `route.params.subject` 获取当前学科，通过 `getSubjectConfig()` 获取配置
- 动态导入内容文件：`import('@/content/${subject}/${unit.folder}/${fileMeta.name}.js')`
- 进度按学科隔离：`progress.toggleComplete(subject, unitNum, fileIndex)`
- 页面唯一标识：`${subject}_${unit.num}_${file.name}`（如 `math_01_01-集合的概念与表示`）
- 监听路由参数变化（subject / unitNum / fileIndex）自动重新加载
- 笔记和书签均通过 `useNotes(pageKey, subject, ...)` / `useBookmarks(pageKey, subject, ...)` 按学科隔离

### DashboardView

学习仪表盘（纯学习进度页），展示学习数据。

- 数据来源：`db.getLearningOverview()`
- 核心数据卡片：已学页面 / 答题总数 / 错题收录 / 今日待复习
- 今日学习：访问页面、答题数、学习时长
- 学科进度区块：遍历 `overview.subjects`，展示各学科完成百分比（`visited/total`）与答题数
- 学情分析与复习建议：基于错题本聚合薄弱知识点（跨语/数/计学科）

游戏化元素（等级、XP、连击、热力图、成就墙）已彻底移除。

### EditorView

低代码内容编辑器，支持多学科内容编辑。

- 顶部新增学科选择器（`editorSubject`）和单元选择器
- 切换学科时通过 `getSubjectConfig()` 重新加载单元列表，重置到第一个单元
- 动态导入：`import('@/content/${editorSubject}/${currentUnit.folder}/${curFile.name}.js')`
- 导出时 page ID 包含正确学科：`${editorSubject}-${unitNum}-${index}`
- 公式区块编辑嵌入 FormulaEditor（含模板面板）

---

## 内容数据格式

每个内容页面是一个 ES Module，导出符合 `content-schema.json` 的对象：

```js
export default {
  id: "math-01-01",
  unitNum: "01",
  subject: "math",
  title: "集合的概念与表示",
  subtitle: "理解集合三要素",
  blocks: [
    { type: "mindmap", title: "知识导图", mermaid: "graph LR\n  A-->B" },
    { type: "objectives", title: "学习目标", items: ["目标1", "目标2"] },
    { type: "knowledge", title: "知识点", paragraphs: ["段落1", "段落2"] },
    { type: "formula", title: "公式", formulas: ["a^2+b^2=c^2"] },
    { type: "table", title: "对比表", headers: ["A","B"], rows: [["1","2"]] },
    { type: "warning", text: "注意易错点" },
    { type: "tip", text: "记忆技巧" },
    { type: "example", title: "例题", items: [{ question: "...", solution: "...", answer: "..." }] },
    { type: "quiz", title: "练习", items: [{ difficulty: "basic", question: "...", answer: "..." }] },
    { type: "divider" }
  ]
}
```

校验：`npm run validate:content`