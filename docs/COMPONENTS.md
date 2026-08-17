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
│   ├── MathJaxRender.vue        # MathJax 公式渲染
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
│   ├── useMathJax.js            # MathJax 加载
│   ├── useMermaid.js            # Mermaid 渲染
│   ├── usePomodoro.js           # 番茄钟
│   ├── useNotes.js              # 笔记
│   ├── useBookmarks.js          # 书签
│   └── useSpacedReview.js       # 间隔复习（SM-2）
├── content/                     # 多学科内容数据
│   ├── index.js                 # 多学科索引（SUBJECTS / getSubjectConfig）
│   ├── site.js                  # 数学站点配置
│   ├── math/                    # 数学内容（11 单元 55 页）
│   └── chinese/                 # 语文内容（5 单元 26 页）
│       └── site.js              # 语文站点配置
├── stores/
│   ├── progress.js              # 学习进度（多学科隔离）
│   ├── studyDb.js               # IndexedDB 数据层
│   └── gameEngine.js            # 游戏引擎（多学科进度）
└── types/
    ├── content.d.ts             # 内容 Schema 类型
    ├── site.d.ts                # 站点配置类型（含 Subject 联合类型）
    ├── store.d.ts               # Store 类型（Progress / GameEngine / StudyDB）
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

渲染 LaTeX 数学公式，支持行内 `\(...\)` 和块级 `$$...$$`。

```vue
<MathJaxRender :text="content" />
```

| Prop | 类型 | 默认 | 说明 |
|------|------|------|------|
| text | String | '' | 含 LaTeX 的文本 |
| className | String | '' | 附加 CSS 类名 |

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

IndexedDB 数据层，7 个对象仓库的 CRUD + 导入导出。所有记录均含 `subject` 字段用于区分学科。

```js
const db = useStudyDbStore()
await db.init()
await db.getNote('math_01_01-集合的概念与表示')
await db.saveNote({ pageKey: 'math_01_01-集合的概念与表示', subject: 'math', content: '...' })
const backup = await db.exportAllData()
await db.importAllData(backup)
```

对象仓库：study_log / daily_stats / achievements / page_progress / error_book / notes / bookmarks

`daily_stats` 仓库的记录额外含 `subjects` 字段，按学科分别统计每日 XP、文件访问数和答题数。

### useGameEngineStore

游戏化引擎：XP / 等级 / 连击 / 成就 / 学科进度 / 仪表盘数据。支持多学科（数学/语文）。

```js
const game = useGameEngineStore()

// 追踪学习行为（subject 参数区分学科）
await game.trackVisit('math', '01', '集合与逻辑', 'math_01_01', '集合的概念', false)
await game.trackVisit('chinese', '01', '语言文字运用', 'chinese_01_01', '字音字形', false)
await game.trackAnswer('math', '01', 'math_01_01')
await game.recordTest('chinese', '01', 90, 100)

// 仪表盘数据（含按学科汇总的进度）
const dashboard = await game.getDashboardData()
// dashboard.subjects = { math: { total, visited, xp, units }, chinese: { ... } }

const quick = await game.getQuickStats()  // 带 30s 缓存
```

**多学科辅助方法**：

| 方法 | 说明 |
|------|------|
| `_getUnitFileCount(subject, unitNum)` | 从 `getSubjectConfig()` 动态获取某学科某单元的文件总数 |
| `_getSubjectTotalFiles(subject)` | 从配置计算某学科全部文件总数 |
| `getDashboardData()` | 聚合数据，`subjects` 字段按学科汇总完成数和 XP |
| `checkAchievements(subject)` | 成就检测，包含学科通关和双修判定 |

**成就体系**（14 个）：

| 成就 ID | 名称 | 条件 |
|---------|------|------|
| `first_step` | 初入书海 | 完成第一次学习 |
| `streak_7` / `streak_30` / `streak_100` | 一周不辍 / 月度坚持 / 百日筑基 | 连续学习 7/30/100 天 |
| `math_unit_1` | 集合达人 | 完成数学第1单元 |
| `chinese_unit_1` | 文字达人 | 完成语文第1单元 |
| `all_math` | 数学通关 | 完成数学全部 11 单元 |
| `all_chinese` | 语文通关 | 完成语文全部 5 单元 |
| `dual_study` | 双修先锋 | 同日学习数学和语文 |
| `perfect_test` | 满分测验 | 复习测验正确率 100% |
| `fast_learner` | 速度之星 | 10 分钟内完成一个知识点 |
| `level_10` / `level_20` / `level_30` | 小有所成 / 学有所成 / 学海状元 | 达到 10/20/30 级 |

XP 规则：阅读页面 +10 / 答题 +5 / 测验 +50 / 高分 +30 / 满分 +20

等级体系（30 级）：学徒 → 书童 → 秀才 → 举人 → 贡士 → 进士 → 探花 → 榜眼 → 状元

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

学习仪表盘，展示游戏化数据与学科进度。

- 数据来源：`game.getDashboardData()`
- 学科进度区块：遍历 `data.subjects`，展示各学科完成百分比、已访问页面数（`visited/total`）和 XP
- 热力图（最近 90 天）、成就墙、今日统计、等级与 XP 概览

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