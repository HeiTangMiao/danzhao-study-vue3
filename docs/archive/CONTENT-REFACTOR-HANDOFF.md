# 内容系统重构 · 交接文档

> 面向接手的 agent。**读完这一份就能开工，不需要先读任何对话历史。**
> 最后更新：2026-09-23，对应 `main` 分支 `6b50e6c`（**阶段 0–7.4 全部完成**，
> 已提交并推送到 origin，随 **v0.3.0** 发布）。

---

## 一、项目与目标

**浙江单招单考学习打卡**（Vue 3 + Vite + Pinia + Tauri 2）。核心架构是**内容即数据**：
139 个内容文件（数学 / 语文 / 计算机）只描述数据，由 `schema/content-schema.json`
约束形状、由 `src/components/blocks/` 下的组件渲染。

用户在 2026-09-11 提出：*"当前 Schema 渲染页面太单一，而且没有效率和高级感。"*
经全库探索，确认这是**三个同源问题**，三者都要解决：

| # | 问题 | 实测证据 |
|---|---|---|
| 1 | **版式单一** | 全站唯一布局是 `.page-content` 的纵向 flex 流；schema **零**布局字段；139 页高度同构 —— 78 页以 `mindmap > objectives` 开场，另有 18 页共享 `warning>quiz>quiz>example`、16 页共享 `errorfocus>quiz` |
| 2 | **视觉单一** | 设计 token 齐全但用得浅：9 个区块组件各写一遍卡片外框（共 14 处），实测聚成 8 个家族；区块间距只有 8px，视觉上就是「一摞白卡片」；全站**没有字号 token**，散落 31 种硬编码字号 |
| 3 | **效率双重欠账** | **生产侧**：139 个文件各手写一份元信息（已修）；编辑器只支持 9/14 种类型（已修）。**运行侧**：KaTeX 523 KB / 155 KB gz 在内容页关键路径上；搜索索引 139/139 条的 keywords 恰好被截断到 800 字符，中位页面正文 3503 字符 → **77% 内容搜不到且静默无告警**（阶段 7.4 已修：两级索引 + 超限告警） |

**目标调性（用户已确认）：极简留白** —— 大量留白、靠分层与字号对比而非阴影和颜色建立层次、动效克制。

**执行顺序（用户已确认）：先生产侧（内容模型），再运行侧。**

完整原始计划在 `~/.claude/plans/schema-shimmying-muffin.md`（本仓库之外，仅供参考；
**其中若干处已被事实推翻，见第九节**）。

---

## 二、当前进度

### 已完成并合入 `main`

下列提交均已推送到 `origin/main`（此前文档里标注的「本地，未推送」已全部同步）：

```
164b055  feat(editor): 阶段6 编辑器写回与序列化统一                            ← 阶段6
938d91c  docs: 交接文档标记阶段 5 完成（三个提交号与状态）
7cad750  feat(blocks): 阶段5 P3 结构扩充——新增 code/cloze 区块                ← 阶段5 P3
b93ac84  feat(blocks): 阶段5 P2 结构扩充——新增 compare/vocab 区块             ← 阶段5 P2
fa7c237  feat(blocks): 阶段5 P1 结构扩充——新增 steps/summary 区块             ← 阶段5 P1
081a9c7  feat(blocks): 阶段4 版式层——新增 columns/group 容器区块              ← 阶段4
5c7c16b  refactor(blocks): 视觉降噪改版（极简留白）                          ← 阶段3 第二步
bb576a2  deepseek修改                                    ← 用户自己提交的 GeoGebra 自托管文件（与本重构无关）
1720949  refactor(blocks): 卡片外框收敛为 .block-card 类族 + 设计 token 阶梯      ← 阶段3 第一步
259c4a4  feat(editor): 编辑器改为 schema 驱动，覆盖全部 14 种区块类型            ← 阶段2
8760dc7  refactor(content): 元信息与类型清单收敛为单一真相源                    ← 阶段0+1
66a8683  feat: 认证强化 + keyset 同步升级 + 完成态由 page_progress 推导
```

**阶段 0–3 的四个提交已逐个 checkout 验证**：lint / test / validate / build 四项全过，
且各自保留 139 个内容 chunk。测试数 70 → 102 → 148 → 125（阶段 3 第二步把
`block-card.test.js` 的框架快照从 14 个收缩到 5 个，测试总数随之下降）逐级演进；
阶段 4 后为 **135**。

### 阶段 0+1：元信息与类型清单收敛（`8760dc7`）

**解决的问题**：页面元信息（id / unitNum / subject / title / subtitle）在 139 个内容文件里
各手写一份、又在 `site.js` 各写一份，**实测漂移 19 页** —— 同一页的页头显示文件版本、
侧边栏显示 site.js 版本。

**现在的模型**：`site.js` 是唯一真相源。页面文件**只导出 `blocks`**，元信息由
`resolvePageMeta(学科配置, 单元号, fileIndex)` 推导并在加载时注入；页面文件里写了同名字段也被忽略。

关键文件：
- `src/content/pageMeta.js` —— 零 import 的纯 ESM，浏览器与 Node 两端共用
- `src/content/loadPage.js` —— 浏览器侧唯一加载入口
- `scripts/lib/load-content.mjs` —— Node 侧共用
- `scripts/migrate-content-meta.mjs` —— 剥离脚本（默认干跑，`--write` 才落盘）
- `src/components/blocks/blockTypes.js` —— 类型 → 中文名/图标（零组件依赖）
- `src/components/blocks/registry.js` —— 类型 → 渲染组件绑定
- `src/utils/blockMeta.js` —— 难度映射（原先 4 处逐字重复）

**类型清单现在有三份，由 `tests/block-registry.test.js` 钉死一致**：
schema（白名单，validator 从它派生）→ blockTypes.js（中文名/图标）→ registry.js（组件绑定）。

### 阶段 2：编辑器 schema 驱动化（`259c4a4`）

**解决的问题**：编辑器手写字段表，只覆盖 9/14 种类型，35 处 `errorfocus`/`strategy`/`exam`
内容完全不可编辑，题目的 `options`/`correctIndex` 也编不了。

关键文件：
- `src/views/editor/schemaForm.js` —— 从 schema 推导字段描述（纯函数，schema 由调用方注入）
- `src/views/editor/BlockForm.vue` —— 递归表单组件，`objectList` 分支按文件名自引用递归
- `src/utils/validateBlock.js` —— **与 CI 共用同一份**语义校验，编辑器内实时提示
- `src/utils/contentSchema.js` —— schema 的浏览器侧加载入口

**注意**：schema 两端加载方式天生不同（Node 用 `fs`，浏览器用 Vite JSON 导入），
所以 `schemaForm.js` / `validateBlock.js` 都是**接收 schema 作参数的纯函数**，零 import。
新增区块类型时**只需改 schema**，编辑器表单自动出现 —— 不要去写字段表。

### 阶段 3 第一步：`.block-card` 框架族 + token 阶梯（`1720949`）

**解决的问题**：14 处手写卡片外框 → 收敛为 1 个类族；间距与字号有了阶梯。

关键文件：
- `src/assets/css/blocks.css` —— `.block-card` 族（**卡片外框的唯一真相源**）
- `src/assets/css/main.css` —— `--space-1..9` / `--fs-2xs..3xl` / 行高字重阶梯
- `tests/block-card.test.js` —— 46 条契约断言

### 阶段 3 第二步：视觉降噪改版（`5c7c16b`）

**解决的问题**：「一摞白卡片」+ 间距拥挤 + 全站无统一标题。

**做的内容**：
- 新增 `src/components/blocks/BlockShell.vue`（统一标题 + 外壳族）；
  `.block-title` 收敛到 blocks.css 全局一份
- 区块去卡片：`knowledge`/`objectives` 纯留白（正文 68ch），`tip`/`warning`
  共用 `.shell--note`（左 2px 细线），`quiz`/`example`/`exam` 改发丝线分隔，
  `formula` 唯一保留浅底色（`.shell--formula`），`mindmap`/`diagram`/`desmos`
  视口保留边框（`.shell--viewport`）；`strategy`/`errorfocus` 保卡片去阴影
- 间距双来源收敛：`.page-content` gap 归零，`.block-anchor + .block-anchor`
  `margin-top: var(--gap-block)`（32px），各区块自身 margin-bottom 已移除
- 色彩降噪：`--bg → #fbfbfa`，新增 `--line`/`--line-strong`，`--tone-warn: #b26a00`
- 阴影三档：`--shadow-xs`（sticky 顶栏）/ `--shadow-pop`（浮层），区块无阴影
- 动效 token：`--dur-1/2/3` + `--ease-standard/out` + `prefers-reduced-motion`
- `block-card.test.js` 快照收缩到 5 个框架并做了变异测试

**验收**：门禁全过 + 139 chunk；浏览器实测明暗双主题 × 移动端 375px 通过。
⚠️ 文档里此前写的验收 URL `/#/unit/...` 实际路由是 `/#/study/...`
（`/unit/` 仅作旧路由重定向），验证时按实际路由访问。

### 阶段 4：版式层（`081a9c7`）

**解决的问题**：全站唯一布局是纵向堆叠、schema 零布局字段；顺带修掉导图联动隐患。

**新增两个容器型区块**（`schema/content-schema.json`）：
- `columns`：`items` 是**数组的数组**（每列一个区块数组），`cols` 枚举 2/3，
  `gap` normal/tight；`@media (min-width: 1024px)` 才分列，窄屏自动降单列
  （子元素 `min-width: 0` 防撑破）
- `group`：`variant` band（发丝线分组带）/ collapse（可折叠，`collapsed` 给初值），
  `items` 是区块数组

**同时**：`knowledge.kind`（0 使用且从未被读取的死字段）→ `variant: plain|definition|aside`；
`example` 加 `variant: full|compact`。

**关键实现**：
- [BlockRenderer.vue](file:///c:/Users/33073/Desktop/danzhao-study-vue3/src/components/BlockRenderer.vue)
  —— 容器分支在**模板内自引用递归**（`<BlockRenderer v-for="child in col" />`），
  **不是**让容器组件 import BlockRenderer（会循环依赖 + resolver 拿到 undefined）
- `src/components/blocks/ColumnsBlock.vue` / `GroupBlock.vue` —— 新建，slot 注入子区块
- `src/utils/validateBlock.js` —— 递归校验子区块，错误带「第N列 区块[i]」路径前缀
- `src/views/editor/schemaForm.js` —— 新增 `nestedObjectList` kind（数组的数组且内层 `$ref`）；
  `BlockForm.vue` 的嵌套容器目前是**只读清单**（深度编辑留待阶段 6）

**⚠️ 导图联动的两条链路差异（阶段 4 修掉的那条）**：容器内子区块**没有** `.block-anchor`
外层，原 `navigateToBlock()` 按锚点遍历必然**静默失效**。现改为遍历全部标题元素
（`.block-title, .knowledge-title, .formula-label, .block h3`），命中后
`closest('.block-anchor') || h` 取滚动目标；并加了序号前缀与「的/个/与/和/及/或」虚词归一化
（「集合三特性」↔「集合的三个特性」）。**未来任何「按锚点遍历」的新链路都要按这个模式写。**
TOC 链路（按索引 `#block-{i}`）不受影响。

**改造了 3 个代表性内容页**：
1. `01-集合的概念与表示.js` —— 13 块 → group band「核心概念」+ columns 双栏 + band「表示方法」
2. `07-复习测验.js`（18 页共享模板）—— 两个 quiz 包进 group band
3. `08-易错专项与冲刺.js`（16 页共享模板）—— columns 双栏（易错对比 | 冲刺题）

**验收**：门禁全过 + 139 chunk + 主包 47.3 KB + schema 未进主包；
新增 `tests/container-render.test.js`（jsdom，5 例：双栏 / 缺列兜底 / band / collapse / 嵌套容器）；
`tests/content-smoke.test.js` 改为递归 walk 容器子区块；
浏览器实测 columns 桌面双栏与 800px 单列、group band、导图点击 4 个节点跳转。

### 阶段 5 P1：编号步骤条 + 一页速记（已提交 `fa7c237`）

**新增两个结构型区块**（`schema/content-schema.json`）：
- `steps`：`items` 是 `stepItem` 数组（`title` 必填 / `content` 可选），
  **序号由渲染层按顺序生成** —— 内容里不要再手写「1. 2. 3.」，改顺序不用改文案
- `summary`：`points` / `formulas` / `mustKnow` 三段**皆可选**，但至少一段非空（JSON Schema
  表达不了，由语义校验兜住）

**关键实现**：
- `src/components/blocks/StepsBlock.vue` —— 序号圆点 + 发丝竖线串联
  （`.step:not(:last-child)::before`：线从本项圆点下沿连到下一项圆点上沿），
  `ol/li` 语义；标题与说明走 MathJaxRender（支持加粗与 LaTeX）
- `src/components/blocks/SummaryBlock.vue` —— 整块一张 `.block-card`（**不自造外框**），
  默认标题「一页速记」；空字符串 / 脏值在渲染前过滤，缺哪段不渲染哪段
- `src/utils/validateBlock.js` —— steps 校验 `items` 非空、`title` 非空、`content` 给空要删字段；
  summary 校验「三段至少一项非空」、字段须为数组、无空元素
- 测试：`tests/steps-summary.test.js`（9 例，jsdom）、`tests/block-card.test.js` 增 1 处框架快照
  （`.summary-card` 与基础框架零差异）、`tests/editor-schema-form.test.js` 增 2 例
  （编辑器字段推导与中文标签自动跟随，含 `stepItem` 走 objectList）
- **变异测试**：故意去掉 title 空校验 / 把序号改成常量 / 给 `.summary-card` 加 padding，
  三处守卫均如实失败，随后已还原

**内容回填（人工草稿，1 处 steps + 2 处 summary）**：
- `computer/03-计算机网络技术/02-网络拓扑搭建.js` —— 「考试拓扑搭建步骤」从
  `knowledge.paragraphs` 手写 ①–⑤ 改为 `steps`（文字无损迁移），并在页尾加 `summary`
- `math/01-集合与逻辑/01-集合的概念与表示.js` —— 页尾加 `summary`（三特性 / 数集链公式 / 互异性易错）

**验收**：门禁四条全过 + 139 chunk + 主包 47.3 KB（未变）；测试数 135 → **148**。

### 阶段 5 P2：双栏中性对照 + 术语卡（已提交 `b93ac84`）

**新增两个结构型区块**（`schema/content-schema.json`）：
- `compare`：**中性对照**，`left` / `right` 两侧名称 + `aspects`（`label` / `left` / `right`）
  维度列表，三者皆必填 —— 与 `errorfocus`（错↔对）语义不同，**不可互相顶替**
- `vocab`：术语卡，`items` 是 `vocabItem` 数组（`term` / `meaning` 必填，
  `pinyin` / `example` / `note` 可选）

**关键实现**：
- `src/components/blocks/CompareBlock.vue` —— ≥768px 三栏（维度 | 左 | 右），中缝用发丝线
  分隔（`.compare-cell--right` 的 `border-left`），行间也是发丝线；窄屏表头隐藏、
  每个格子用 `.compare-who` 自带名称 —— **两侧地位对等，不要用红/绿暗示对错**
- `src/components/blocks/VocabBlock.vue` —— per-item 卡沿用 `.block-card--md`（不自造外框），
  术语大字 + 读音小字 + 「例 / 注」小标签
- `src/utils/validateBlock.js` —— compare 校验两侧名称、`aspects` 非空、维度三字段非空；
  vocab 校验 `items` 非空、`term` / `meaning` 非空、可选字段给空串要删
- `src/views/editor/schemaForm.js` —— `meaning` / `example` 加入 `LONG_FIELDS`（多行文本域）
- 测试：`tests/compare-vocab.test.js`（10 例，jsdom）、`tests/block-card.test.js` 增 1 处框架快照
  （`.vocab-card` 用 `--md` 圆角）、`tests/editor-schema-form.test.js` 增 2 例
- **变异测试**：故意去掉 compare 的 `left` 空校验 / 给 `.vocab-card` 加 padding /
  把右侧格子的窄屏名称写成左侧名，三处守卫均如实失败，随后已还原

**内容回填（人工草稿，1 处 compare + 1 处 vocab，均为无损改写）**：
- `math/01-集合与逻辑/06-量词与命题否定.js` —— 「全称命题与特称命题的对比」由 `table`
  改为 `compare`（4 个维度：量词 / 形式 / 为真的条件 / 为假的条件）
- `chinese/03-古诗文阅读/02-文言文实词与虚词.js` —— 「虚词『何』的用法」由 `knowledge`
  改为 `vocab`（原文全句作 `meaning`，「固定结构」作 `note`）

**验收**：门禁四条全过 + 139 chunk + 主包 47.3 KB（未变）；测试数 148 → **162**。

### 阶段 5 P3：代码块 + 挖空默写（已提交 `7cad750`）

**新增两个结构型区块**（`schema/content-schema.json`）：
- `code`：`code` 必填 + `lang` 可选。**刻意不引 Prism / Shiki** —— `lang` 只做角标，
  不做语法高亮；零依赖版即可交付绝大部分价值
- `cloze`：`items` 是 `clozeItem` 数组，文本里用 `{{答案}}` 标出空位，点击揭晓
  （内容里**不要**再写 `______`，空位由标记决定）

**关键实现**：
- `src/components/blocks/CodeBlock.vue` —— 外壳复用 `shell--formula`（浅底色），
  `<pre>` 横向滚动不换行；复制优先 `navigator.clipboard`，
  非安全上下文 / 老 WebView（Tauri 可能命中）退回 textarea + `execCommand`，
  三种反馈：复制 / 已复制 / 复制失败
- `src/components/blocks/ClozeBlock.vue` —— 把文本切成「文字 / 空位」两种片段，
  空位是 `<button>`（默认虚线，揭晓后转主色实线），已揭晓集合用 `ref(new Set())` 记录
- `src/utils/validateBlock.js` —— code 校验 `code` 非空、夹带 ``` 围栏报错、`lang` 给空串要删；
  cloze 校验 `items` 非空、`text` 非空、`{{ }}` 配对、至少一处空位、不允许空挖空 `{{}}`
- `src/views/editor/schemaForm.js` —— `code` 加入 `LONG_FIELDS`（多行文本域）
- 测试：`tests/code-cloze.test.js`（10 例，jsdom）、`tests/editor-schema-form.test.js` 增 2 例
- **变异测试**：故意让空挖空检查恒不命中 / 把「已复制」改回「复制」/ 让空位始终显示答案，
  三处守卫均如实失败，随后已还原

**内容回填（人工草稿，1 处 code + 1 处 cloze）**：
- `computer/03-计算机网络技术/04-路由配置与RIP协议.js` —— 「RIP 动态路由」里的
  ``` 围栏命令拆成独立的 `code` 块（原先围栏只是当作普通文字渲染，反引号会原样显示）
- `chinese/05-文学常识/01-中国文学史.js` —— 新增「填空自测」，5 句全部取自本页
  已有的常识/练习题（六义、诗仙诗圣诗佛、乐府双璧、元曲四大家、王勃名句）

**验收**：门禁四条全过 + 139 chunk + 主包 47.3 KB（未变）；测试数 162 → **174**。

### 阶段 6：编辑器写回与序列化统一（已提交 `164b055`）

**风格定义搬到 `src/content/serializePage.js`**（原计划写 `scripts/lib/serialize-page.mjs`，
开工时按既有先例改成 `src/`：与 `pageMeta.js` 同理，两端共用的纯 ESM 放 src，Node 侧直接 import；
**新增此类模块必须登记进 `scripts/lib/load-content.mjs` 的 `NON_PAGE_FILES`**，否则会被判成孤儿页）。
固定手写风格 = 无引号键（仅非标识符才加引号）+ 2 空格缩进 + 对象一律多行 +
短标量数组单行（整行 ≤ 100 列）+ **顶层区块之间空一行** + 保留文件头块注释。
模块另导出 `extractHeader` / `buildHeader` / `stripKeyQuotes`。

**迁移脚本 `scripts/migrate-content-style.mjs`**（默认干跑，`--write` 才落盘）：
- 实测 139 个内容页里 **62 个是引号键风格**（全在语文 / 数学，计算机 26 页本来就是手写风格），
  77 个不动 —— 原计划里「5 个是含注释的其他形态」经复核为 **2 个**（`chinese/01`、`chinese/02`
  的 `07-复习测验.js`）：这类文件**只去引号、不重排**，因为行注释不在数据里，重排会丢
- 每条改写都先写临时文件 import 回来，与改前数据做深度比对，不一致就跳过（只允许格式变化）
- 结果：62 个文件全部改写成功，5019 增 / 6084 删（大量短数组由逐行展开变回单行）

**编辑器导出（`EditorView.vue`）**：
- `buildSource()` 统一走 `serializePage` + `buildHeader`（**不得再用 `JSON.stringify`**，
  它正是引号键风格的来源）；导出物只有 `blocks`，不带任何元信息
- 工具栏三按钮：**复制 .js**（新增，日常比下载更常用）/ 导出文件 / **写回文件**（`v-if="isDev"`）
- 复制能力抽成 `src/utils/copyText.js`（Clipboard API + execCommand 兜底），
  内容页的 `CodeBlock` 也改用它 —— 两处共用一份实现

**写回插件 `scripts/vite-plugin-content-write.mjs`**（`apply: 'serve'`，产物里不会出现）：
- 双重白名单：① `subject` 必须登记在 `SITE_FILES`，`folder`/`name` 不得含路径分隔符、`..`、盘符、通配
  ② 拼出的相对路径必须命中 `buildMetaIndex()` 的 key 集合（即只能覆盖已注册页面，
  不能新建文件、不能改 site.js 本身）
- 写前跑与 CI 同一份 `validateBlock`，有错 **422 不落盘**；写回用 `serializePage` 并保留原文件头
- 端点常量 `WRITE_ENDPOINT` 放在 `src/utils/contentWrite.js`，编辑器与插件共用（避免两边各写一份字面量）

**不做**：File System Access API（Firefox/Safari 不可用、Tauri WebView 行为不确定）；
Tauri 侧写回应走 Rust fs，属独立议题。

**已知取舍**：写回 = 按数据重排，**块间注释会丢**（46 个手写文件带有 `// ---------- 分区 ----------`），
文件头注释会保留。喜欢那些分区注释的话，写回后手工补一下。

**验收**：门禁四条全过 + 139 chunk + 主包 47.3 KB（未变）；测试数 174 → **200**。
除单测外还做了两轮真实验证（都不是纸上验收）：
1. 起 `npm run dev` 直接打中间件：正常写回 **200**（返回文件路径与行数）/
   路径穿越 **403** / 校验不通过 **422**（错误明细原样回传）/ 未登记学科 **403**
2. **幂等**：把一页真实内容原样写回，磁盘内容逐字不变（`serializePage` 输出 == 现状）
3. 变异测试：去掉注册表白名单 / 把 `apply` 改成 `'build'` / 让编辑器回退 `JSON.stringify`
   三处守卫均如实失败（`..` 字符过滤与白名单重叠，单独去掉不可观测，属冗余兜底）

**踩到的一个坑（复用注意）**：`dist` 里出现 `__content-write` 字样是**正常**的 ——
编辑器 chunk 里带着端点常量；判断插件是否进产物要看
`resolvePagePath` / `拒绝写入` 这类**插件专有字符串**（实测为 0 个）。

---

## 三、硬性约束（违反会破坏既有资产）

以下来自 `CLAUDE.md`，**必须遵守**：

1. **永远用中文回复/写注释/写提交信息。**（最高优先级）
2. **路由必须是 hash 模式，Vite `base: './'`** —— Tauri 本地文件协议所必需。不要改成 history 模式。
3. **`validate:content` + `lint --max-warnings 0` 是硬性 CI 关卡**，提交前本地跑一遍。
4. **`site.js` 的 `files[]` 数组顺序就是 `fileIndex`**，直接决定 URL 与历史进度语义 ——
   **绝不可重排，只能追加**。
5. **139 个独立页面 chunk 是最有价值的资产**。内容文件靠**字面量模板字符串前缀**的动态导入
   （`import(\`@/content/${subject}/${folder}/${name}.js\`)`）产生独立 chunk，
   这个前缀必须是字面量 —— 改成变量拼接，Vite 就无法静态分析，139 个 chunk 会塌掉。
   改动加载链路后**必须验证** `ls dist/assets | grep -cE '^[0-9]{2}-'` 仍是 139。
6. **重型库刻意懒加载，必须保持**：KaTeX（`useKatex`）、Mermaid（`useMermaid`）、
   JSXGraph（约 1 MB，仅动态导入）、GeoGebra（自托管在 `public/vendor`，不走 CDN）。
7. **`vite.config.js` 的 `manualChunks` 不要动。**
8. **IndexedDB 演进规则**：新增/重命名 store 时升 `DB_VERSION` 并按 `oldVersion` 加
   `onupgradeneeded` 分支；`DB_NAME`（`study_game_db`）保持不变以兼容旧数据。
9. **游戏化（XP / 成就 / 连续天数 / 热力图 / 打卡）已在 v0.2.0 刻意移除。
   不要复活该功能或那些字段。**
10. 生产环境必须设置 `JWT_SECRET`；**永远不要提交 `server/.env`**。
11. **测试的 `environment: 'node'` 保持默认不动** —— `tests/studyDb*.test.js` 依赖
    fake-indexeddb 在 node 环境工作。需要 DOM 的测试用文件级 docblock
    `// @vitest-environment jsdom` 覆盖（见 `tests/block-form.test.js`）。

---

## 四、剩余任务

### ~~阶段 3 第二步：视觉降噪改版~~（已完成，见第二节 `5c7c16b`）

---

### ~~阶段 4：版式层~~（已完成，见第二节 `081a9c7`）

---

### ~~阶段 5：结构扩充~~（已完成，六个类型分三个提交，见第二节）

按优先级：

| 优先级 | 类型 | 形态 | 预期复用度 | 理由 |
|---|---|---|---|---|
| ~~**P1**~~ ✅ | `steps` | 编号步骤条（序号圆点 + 发丝竖线串联） | **60+ 页** | 数学「解题通法」、计算机「操作步骤」、语文「文言翻译四步法」现在被塞进 `knowledge.paragraphs` 手写「1. 2. 3.」，无法折叠、无法进 TOC、搜索片段命不中（**已完成**，见第二节） |
| ~~**P1**~~ ✅ | `summary` | 「一页速记」卡（`points` / `formulas` / `mustKnow`） | **139 页** | 单招备考的核心场景是考前回看；现在复习要滚完 9 个块（**已完成**，见第二节） |
| ~~**P2**~~ ✅ | `compare` | 双栏中性对照（`left`/`right`/`aspects`） | **40+ 页** | 「列举法 vs 描述法」「借代 vs 借喻」「栈 vs 队列」。**与 `errorfocus` 语义不同**（后者是错↔对），不能复用（**已完成**，见第二节） |
| ~~**P2**~~ ✅ | `vocab` | 术语卡（`term`/`pinyin`/`meaning`/`example`/`note`） | **25+ 页** | 语文 33 页现在硬塞进 `table`，撑不住四字段（**已完成**，见第二节） |
| ~~**P3**~~ ✅ | `code` | `<pre>` 等宽 + 复制按钮（**不引 Prism/Shiki**） | **15+ 页** | 计算机 26 页；零依赖版即可交付 80% 价值（**已完成**，见第二节阶段 5 P3） |
| ~~**P3**~~ ✅ | `cloze` | 挖空 + 点击展开 | **10+ 页** | 可先用 `quiz.fill` 顶（**已完成**，见第二节） |

**不做**：`timeline`（仅语文文学史少数页面，收益不抵成本）；`mindmap` 不加变体（96 页已充分覆盖）。

**新增一个类型的净成本已经很低**（阶段 0–2 把这件事铺平了）：
`schema` 加一个分支（+ 子对象 definition）+ 一个新 `.vue` + `registry.js` 加一行 +
`blockTypes.js` 加一行 + 同步 `.d.ts`。
编辑器表单与校验白名单会**自动跟随**。`.d.ts` 由 `tests/block-registry.test.js` 守护。

**内容回填**：阶段 5 的六个类型都已各回填 1–2 处（见第二节，**全部为人工确认的草稿**；
共 3 处是无损改写：knowledge→steps / table→compare / knowledge→vocab，另 1 处把围栏命令
拆成 `code` 块，2 处是按页内既有内容新写的 `summary` / `cloze`）。
继续铺量时照此办理：**不要自动批量发布**。

---

### ~~阶段 6：编辑器写回与序列化统一~~（已完成，见第二节阶段 6）

---

### 阶段 7：运行时性能（可独立并行，与版式无关）

#### 7.1 KaTeX 移出关键路径（**已完成**，见 `501b713`）

核心手法：从「模块图静态依赖」改为「路由守卫并行预取 + 就绪后重渲染」。实际落地如下：

- `src/composables/useKatex.js`：顶层 `import katex` + `import 'katex/dist/katex.min.css'`
  改为 `warmKatex()` 里的**动态 import**（幂等：模块级 `katex` / `loadingPromise` 两态，
  与 `useMermaid` 同一模式）。**样式与 JS 一起按需加载**，没有把 `katex.min.css` 挪进入口。
- `renderMath` **仍是同步的**（KaTeX 相对 MathJax 的核心优势，没丢）：引擎未就绪 → 返回
  `renderPlainFallback(text)`（剥掉 `\( \) $$ \[ \]` 的纯文本，**仍走** 转义/加粗/高亮/换行那一套）；
  新增短路径：不含定界符且非 `forceBlock` 时直接 `processSegment`，跳过正则扫描。
- `MathJaxRender.vue`：`engineVersion`（模块导出的 `ref`）是 computed 里的**显式依赖**
  （`engineVersion.value === 0 ? renderPlainFallback(...) : renderMath(...)`）。
  ⚠️ 这是本次最容易写错的地方：`renderMath` 读的是模块级变量，Vue 追踪不到，
  少了这个分支，引擎就绪后公式**永远停在纯文本、且不报错**。
- 预取三处：`main.js` 的 `requestIdleCallback`（回退 `setTimeout` 1200ms）、
  `router/index.js` 的 `beforeEach`（`to.name === 'unit'` 时点火，与路由/内容 chunk 并行）、
  `MathJaxRender.onMounted` 兜底。三处都用**动态 import**，避免把 `useKatex` 拖进入口 chunk。
- `.mathjax-block` 加 `min-height: 1.6em`：引擎就绪前后块级公式容器不产生布局跳动
  （计划里写着「块级公式容器有 min-height」，实测**原本没有**，这次补上）。

**FOUT 的诚实结论**（与计划一致）：523 KB 引擎不可能既零阻塞又零 FOUT。
正常导航路径下引擎早已就绪、无 FOUT；冷启动深链有约 100–300ms 纯文本窗口，
闪的是普通文字而非乱码。

**度量口径实测**（`npm run build` 后）：
- `dist/assets/UnitView-*.js` / `BlockRenderer-*.js` / 入口 `index-*.js` 里
  `vendor-katex` 出现 **0 次**；`vendor-katex-*.js`（523.74 kB）仍是独立 chunk，
  只被 `useKatex-*.js`（2.2 kB）与 mermaid 自己的动态 katex 引用指向
- 入口 48.40 → **48.72 kB**（多了空闲预热那几行），139 chunk 不变
- ⚠️ **别用 PowerShell 的 `Select-String` 查产物**：压缩后单行几万字符，它会静默漏匹配
  （本次一度误判成「没有任何 chunk 引用 katex」）。用 `node -e` + `fs.readFileSync` 查。

**验收**：
- 测试 200 → **208**（`tests/useKatex.test.js` 重写 + 新增 `tests/math-render.test.js`：
  「冷启动 → 纯文本 → 预热完成自动换公式」的真实时序；另两个引用公式断言的测试文件
  在顶部 `await warmKatex()` 对齐正常导航路径）
- 变异测试三处均如实失败：去掉未就绪兜底 / 去掉 `engineVersion` 分支 / 去掉 `warmKatex` 幂等早退
- **真实浏览器实测**（`vite preview` + 假 token 绕过登录守卫）：`#/study/math/01/0`
  页面 `.katex` = 133、`.katex-error` = 0、正文无残留 `\(` 与 `\mathbb` 字面字符、
  控制台无 katex 报错；计算机页正常

#### 7.2 `renderMath` memo（**已完成**，见 `501b713`）

按字符总量限界的 **FIFO Map**（上限 512 KB HTML 字符串），key = `B|I + '\0' + text`，
导出 `clearMathCache()`。实际落地与计划一致，三点必须记住：

- **兜底结果绝不入缓存** —— 否则引擎就绪后会一直命中「纯文本」（这条是最容易埋的坑，
  已单独立测试 + 变异测试）
- 命中后**不调整顺序**：内容文本运行时不可变，命中分布是时间局部性、没有访问偏斜，
  LRU 的「移到队尾」纯属额外开销
- 淘汰按**累计 HTML 字符数**而非条数：单条从一行公式（几百字节）到整段解析（几 KB）
  差两个数量级，按条数限界会让小条目把大条目挤出去
- 编辑器 `EditorView.onUnmounted` 调 `clearMathCache()`：公式在编辑器里是逐字符变化的，
  每个中间态都是一个新键，退出时清一次最省事

**实测收益**（vitest + jsdom，把一页里所有字符串过一遍 `renderMath`，等价整页渲染一次）：

| 页面 | 首次（冷） | 再来一次（命中缓存） |
|---|---|---|
| 数学「集合的概念与表示」117 条 / 5284 字符（公式多） | 13.40 ms | **0.07 ms** |
| 计算机「循环结构程序设计」116 条 / 3878 字符（无公式） | 0.13 ms | 0.05 ms |

→ 收益集中在**公式密集页**（切回页面 / 区块重挂载时省掉一次整页 KaTeX 渲染）；
无公式页本来就走短路径，memo 只值 0.08 ms，别把它当性能银弹。

**顺带记录一个既有行为**（不是本次改的）：文本**含**定界符时 `forceBlock` 不改变输出
（`\(...\)` 始终按行内渲染），只有「纯 LaTeX 且无定界符」才走块级渲染分支。
缓存键仍区分两种模式，避免这两条路径的真实差异被串味。

**验收**：测试 208 → **213**；变异测试四处均如实失败 ——
①把兜底结果写进缓存 ②关掉命中判定 ③关掉淘汰 ④键里去掉模式位。
⚠️ 其中②会**遮蔽**①③（命中判定关掉后，缓存怎么写都测不出来），必须**单独**施加才能观测，
本次已逐一验证。

#### 7.3 区块异步化的取舍（**已完成**，见 `501b713`）

按计划只动 3 个（外加两处演练场），**没有贪**：
- `registry.js`：`exam`（597 行）与 `desmos` 改 `asyncBlock`（`diagram` 本来就是），静态 import 已删
- `UnitView` / `HomeView` 的 `GeoGebraPlayground` 改 `defineAsyncComponent`
  （两处本来就是 `v-if` 之后才挂载，组件代码与自托管脚本一起推迟）
- 刻意**保持同步**：`knowledge` / `objectives` / `formula` / `table` / `tip` / `warning` /
  `quiz` / `example` / `mindmap`（覆盖 100+ 页；quiz/example 带交互状态，异步重挂载会丢状态）

**实测收益**（`npm run build`）：

| chunk | 改造前 | 改造后 |
|---|---|---|
| BlockRenderer JS | 57.26 kB | **47.89 kB**（−9.4 kB） |
| BlockRenderer CSS | 26.09 kB | **17.39 kB**（−8.7 kB） |
| ExamBlock（新独立 chunk） | — | 9.64 kB + CSS 8.70 kB（仅 11 页用到时才下） |
| DesmosBlock / GeoGebraPlayground（新） | — | 0.55 kB / 5.44 kB（展开演练场才下） |

→ 不含模拟卷的页面少下约 18 kB；139 个内容 chunk 不变，入口 48.62 kB。

**Mermaid 的 CLS：实测后改的是「计划外的另一处」**
- 计划里的处方（给 `.mindmap-viewport` 加 `min-height: 320px`）确认**无用** ——
  它本来就是固定 `height: 460px`，占位→SVG 不改变页面总高度（已用测试钉死）
- 真正的位移源在**视口上方**：`.mm-legend` 与 `.mm-toolbar` 原本是
  `v-if="state === 'ready'"`，mermaid 渲染完成时这两行才插进 DOM，会把下方内容顶下去。
  改法仍按「**用 CSS 解，不全局预热 mermaid**」：保留元素，未就绪时
  `.mm-pending { visibility: hidden }` 占位 → 空间预留、内容不可见
- 无副作用：脚本只用 `viewport` / `canvas` / `container` 三个 ref，图例与工具栏不参与逻辑；
  `visibility: hidden` 下按钮不可点

**验收**：测试 213 → **220**；新增 `tests/block-async.test.js`（7 例）做**双向**守卫 ——
异步组必须异步且源码里无静态 import、同步白名单必须挂载即渲染，加上 CLS 的两条断言。
变异测试两个方向都如实失败（exam 改回静态 import / 把 knowledge 异步化 → 4 条断言挂掉）。

#### 7.4 搜索索引两级化（**已完成**，见 `4192358` + CI 同步 `56ca2d2`）

**索引形状定义收敛为一份**：`src/content/searchIndex.js`（零 import 纯 ESM，构建脚本与浏览器共用，
已登记进 `NON_PAGE_FILES`）导出 `BODY_LIMIT`(12000) / `META_FILE` / `bodyShardPath(subject)` /
`bodyKeyOf(meta)`。两端必须对这三件事看法一致（上限、分片文件名、正文键），
分叉的后果是前端 fetch 一个不存在的分片 —— 所以只写一次。

- `build-search-index.mjs`：输出 `public/search-meta.json` + `public/search-body/{学科}.json`；
  meta 只保留检索与结果条目要用的 7 个字段（id/folder/name 等运行时字段不进索引）；
  分片键 `${unitNum}/${fileIndex}`（= 路由身份，学科内唯一，已实测 0 重复）；
  正文上限 800 → **12000**，**超限必点名**（`capBody` 返回 `truncated`，
  由构建脚本 `console.warn` 列出文件与字符数）；落盘前清空 `search-body/`（学科下线不留残片）；
  旧的 `public/search-index.json` 已删除，`.gitignore` 同步改为两个新产物。
- `src/utils/search.js`：`prepareSearchIndex(items, bodies)` 把正文并进检索串，
  `matchSearch(items, query, { limit, bodies })` 的 **snippet 改从正文取**
  （旧实现从被截断的 keywords 取，命中后常常截不到上下文）；标题命中时 snippet 为空。
  ⚠️ 契约：prepare 与 matchSearch 必须传**同一份 bodies**，否则正文命中被静默漏掉
  （面板在分片到位后重新 prepare 一次，已有测试钉住）。
- `SearchPanel.vue`：**挂载时零请求**；`requestIdleCallback`（1.5s `setTimeout` 兜底）预取 meta，
  focus 也会补取；**查询词 ≥ 2 字**才按 `current_subject` 取该学科正文分片
  （一次按键不该拉一份整学科正文；拿到分片后若学科已切走，会重新按新学科取）；
  分片失败只降级为「仅按标题匹配」并在浮层里给重试入口，不再静默。

**实测体积**（旧单文件 241 KB →）：meta **23.2 KB**（gzip 后更小）+
分片 math 502.9 KB / chinese 237.2 KB / computer 157.5 KB（**按需**，只在 ≥2 字查询时取当前学科）。

**验收**（全部实测，非纸上验收）：
- 门禁四条全过 + 139 chunk + `dist/search-meta.json` 23.2 KB < 30 KB + 旧 `search-index.json` 已不在产物里
- 测试 220 → **244**：`tests/search-index.test.js`（10 例，含 139 页逐页取**正文尾部**的词回搜本页）、
  `tests/search-panel.test.js`（8 例，jsdom + mock fetch，钉住加载时机）、`tests/search.test.js`（12 例）
- **旧 vs 新对照**（脚本实测）：取每页正文 800 字符之后的连续短语回搜，
  旧索引（截断 800）命中 **1/84** → 新索引命中 **84/84**；样例 `math/01/4` 的
  「条件与结论互换」（正文第 863 字符）旧搜不到、新搜得到
- **真实浏览器**（`vite preview`）：首页输入「条件与结论互换」→ 浮层出现《命题与逻辑联结词》
  且摘要取自正文，点击跳转 `#/study/math/01/4` 成功；控制台无 search 相关报错
- 变异测试 7 处均如实失败：正文不进检索串 / 挂载即加载 meta / 去掉查询词长度门槛 /
  硬编码 math 分片 / 分片键规则分叉 / `capBody` 不截断不报告 / snippet 恒为空

**⚠️ CI 部署必须同步改**（`.github/workflows/ci.yml` 的 deploy 作业）：原步骤里 rsync 的是
`./dist/search-index.json`，文件删掉后这一步会直接失败（部署挂掉）；现已改为
`search-meta.json` + `search-body/`（分片按 assets 那套「先传不删、最后 `--delete` 清理」），
并在部署后验证里 `rm -f` 掉服务器上的旧单文件索引。

**记录一个既有行为**（不是本次改的）：meta 条目顺序 = **磁盘遍历序**（chinese → computer → math），
不是 `site.js` 的学科顺序；检索结果顺序历来如此，本次未改。

---

## 五、验证方法

### 门禁四条（每次改动都要全过）

```bash
npm run validate:content   # 内容数据校验：139 个内容文件 + 3 个站点配置
npm run lint               # eslint src tests --max-warnings 0
npm test                   # vitest，24 个文件 244 个测试
npm run build              # 生产构建；会先跑 build-search-index
```

**改动加载链路或 CSS 后，额外验证**：

```bash
ls dist/assets | grep -cE '^[0-9]{2}-'      # 必须是 139
ls -la dist/assets/index-*.js               # 主包应约 48.4 kB，不应该明显变大
grep -c 'correctIndex' dist/assets/index-*.js   # schema 不应进主包，应为 0
```

### 新增守卫时的纪律：**变异测试**

本仓库的 CSS **没有任何静态检查**（没有 stylelint，`npm run lint` 只覆盖 JS）。
所以「CSS 改错」目前唯一的机械防线就是 `tests/block-card.test.js`。
**写这类守卫时必须做变异测试** —— 故意把代码改错，确认守卫真的会失败。
不会失败的守卫等于没有守卫。

已经踩过的坑（**这是真实教训，不是假设**）：`tests/block-card.test.js` 初版只断言
「预期的声明存在且相等」，结果一条**多出来的** `white-space: nowrap` 完全溜过去了，
直到对抗式核查才发现。现在已改成按真实级联算最终值后做**全量相等**比对。

### 视觉验证只能人工

**jsdom 不做布局**，devDependencies 里没有 Playwright / Puppeteer。
`min-content` / flex 挤压 / 是否折行这类问题**只有真浏览器能验**。
任何声称「视觉零变化」的改动，最终都必须有人在浏览器里看一眼。

---

## 六、已知的坑（都是踩过的）

### 1. `BlockShell.vue` 不能接管 per-item 卡（阶段 3 第一步推迟它的原因）

原计划在阶段 3 第一步就抽出 `BlockShell.vue` 作为每个区块的单根包裹组件。
逐文件盘点 14 个区块后确认**在「视觉零变化」约束下做不到**，已推迟到第二步。两项硬约束：

- **外框挂在 `v-for` 的每一项上，不是挂在区块根上。** `ExampleBlock` / `ErrorFocusBlock` /
  `QuizBlock` / `StrategyBlock` / `ExamBlock` 的 N 张卡是 N 个**同级**元素；
  单根包裹组件包不出 per-item 卡，强行套用会把 N 张卡并成 1 张大卡。
  另外根元素 `section.block` **全仓库没有任何 CSS 规则**，把外框提到根上会同时改变
  DOM 层数与间距来源，没有兜底能缓冲。
- **标题有 4 种互不相同的形态**，统一就是视觉变化：`TipBlock`/`WarningBlock` 完全没有标题；
  `FormulaCard` 用框内的 `.formula-label`（灰色小字）；`QuizBlock` 的标题嵌在 flex 行内
  与进度 chip 并排；其余分散在 `h2`/`h3` 两种标签上。`.block-title` 更是只在 3 处定义
  且**三处取值互不相同**（`MindMapBlock` 是 `1.05rem/0 0 12px`，`DesmosBlock` 逐字复制全局
  `h3`，`ObjectivesBlock` 只覆盖 `margin-bottom`），其余 7 个靠全局 `h3` 兜底。

**所以第二步做 BlockShell 时也要记住**：它仍然**不能**接管 per-item 卡，那部分继续用
`.block-card` 类；统一标题是它这一步的**目标**（视觉改版允许），不是需要规避的问题。

### 2. `.block-card` 的特异度约定（改 `blocks.css` 前必读）

组件 scoped 样式编译后形如 `.ef-card[data-v-xxx]`，特异度 `(0,2,0)`；
`.block-card` 是 `(0,1,0)`。所以**组件里的差异声明永远胜出**，类只负责
「大家一样的那部分」。同一元素挂多个修饰符时，靠 `blocks.css` 内的**书写顺序**决定胜负
（修饰符必须排在基础规则之后）。

**边界：类里绝不放 `margin-bottom`。** 块间距是每个区块自己的事（实测各块不同：
8/10/12/16px），混进共用族会污染所有区块。这条由 `tests/block-card.test.js` 钉死。

### 3. 测试的盲区：`ORDER` 是硬编码的

`tests/block-card.test.js` 的 `ORDER` 数组是手工维护的。往 `blocks.css` 加一个新修饰符
**并用到某个框架元素上**时，如果没同步登记进 `ORDER`，级联比对就会看不见它。
已加一条断言封住这个口子（任何元素上的 `.block-card*` 类都必须在 `ORDER` 里）。

### 4. 间距有两个来源

`UnitView.vue:550` 的 `.page-content { gap: var(--spacer-8) }` **加上**各区块自己的
`margin-bottom`。实际块间距 = 8 + (8|10|12|16) = 16~24px 不等。改版时别只看一处。

### 5. `--spacer-6/10/14/20/40` 是待归并的字面量

新阶梯是 4px 基数的 9 档（4/8/12/16/24/32/48/64/96），上述五个旧档位在新阶梯里
**没有等价值**，所以保留了字面量并标注了归并目标（共 59 处使用）。
按「就近档位」强行映射会改动这 59 处间距 2~4px —— 那是设计改动，要单独做。

### 6. 硬编码 `rgba()` 在暗色主题下不随语义色变化

`TipBlock` / `WarningBlock` 的 `rgba()` 填充已在阶段 3 第二步随 `.shell--note` 改版
一起删除。仍存留的是 `ErrorFocusBlock` 的 `ef-wrong`/`ef-right`、`ExamBlock` 的 11 处 rgba。
**这些是既有的不一致行为，如无必要不要「顺手修好」** —— 那会让暗色观感改变，属于另一个议题。

### 7. `ExamBlock` 的定位上下文很脆弱

`.exam-toolbar` 是 `position: sticky`，`.submit-confirm-overlay` 是
`position: fixed` + `z-index: 300`（**没有用 Teleport**）。两者都怕祖先有
`transform` / `filter` / `contain`。**不要在它们的祖先链上加动画 transform**。

### 8. `.exam-result` / `.objectives-box` 现在的定位

阶段 3 第二步后：`.objectives-box` 外框仍完全由 `.block-card` 提供；`.exam-result`
已改为无卡片（`result-hero` 用 `border-top` 发丝线）。两者类名都保留作为定位钩子，
**不要以为类被删了，也不要顺手给它们补规则**。

---

## 七、关键文件地图

| 文件 | 作用 | 改它的注意点 |
|---|---|---|
| `schema/content-schema.json` | **唯一真相源**：类型白名单 + 字段定义 | 加类型只需加一个 `allOf` 分支；validator 白名单与编辑器表单会自动跟随 |
| `src/components/BlockRenderer.vue` | 分发枢纽 | 容器递归已在此**模板内自引用**（v-if 分支），新增容器照此办理，不要外部 import |
| `src/components/blocks/registry.js` | 类型 → 组件绑定 | 加类型加一行 |
| `src/components/blocks/blockTypes.js` | 类型 → 中文名/图标 | 加类型加一行；`icon: ''` 表示不进本页目录 |
| `src/components/blocks/asyncBlock.js` | 统一的异步组件工厂 | 共用占位/错误组件，保留 150ms delay |
| `src/assets/css/blocks.css` | **卡片外框的唯一真相源** + 难度标签 | 见第六节第 2 条的特异度约定 |
| `src/assets/css/main.css` | token 阶梯唯一全局定义处 | 旧 `--spacer-*` 是别名，取值不可改 |
| `src/utils/validateBlock.js` | 语义校验（编辑器与 CI **共用**） | 纯函数，schema 由调用方注入 |
| `src/views/editor/schemaForm.js` | 由 schema 推导编辑器表单字段 | 纯函数，零 import |
| `src/content/pageMeta.js` | 页面元信息推导（两端共用） | 改这里等于改所有页面的元信息语义 |
| `src/content/serializePage.js` | **内容文件风格的唯一真相源**（编辑器导出 / 迁移脚本 / 写回插件共用） | 纯 ESM、零 import；改风格要同步 `tests/content-style.test.js` 的快照 |
| `scripts/migrate-content-style.mjs` | 引号键风格归一化（干跑默认，`--write` 落盘） | 改写前必做「临时文件 import 回来 + 数据深度比对」；带行注释的文件只去引号 |
| `scripts/vite-plugin-content-write.mjs` | 开发期写回（`apply: 'serve'`） | `resolvePagePath` 是安全闸门（双重白名单），改动前读第三节安全约束；端点常量见 `src/utils/contentWrite.js` |
| `src/utils/copyText.js` | 复制到剪贴板（Clipboard API + execCommand 兜底） | 代码块与编辑器共用，别再各写一份 |
| `src/composables/useKatex.js` | 公式渲染（KaTeX 引擎，**异步预热** + 512 KB FIFO memo） | 引擎 523 KB 已移出关键路径：只能动态 import；`engineVersion` 是组件重渲染的显式依赖、**兜底结果绝不能进 memo** —— 两条都别删 |
| `src/content/loadPage.js` | 浏览器侧唯一加载入口 | 动态导入的**字面量前缀**不可改成变量 |
| `src/components/blocks/ColumnsBlock.vue` | 双/三栏容器（slot 注入子区块） | 只在 `@media (min-width: 1024px)` 分列；子元素需 `min-width: 0` |
| `src/components/blocks/GroupBlock.vue` | 分组带 / 可折叠容器 | `variant` 是 computed，不是函数；见阶段 4 小节 |
| `src/components/blocks/StepsBlock.vue` | 编号步骤条（序号圆点 + 发丝竖线） | 序号由渲染层生成，内容里**不要**手写「1. 2. 3.」；竖线是 `:not(:last-child)::before`，改间距时同步改 `bottom` |
| `src/components/blocks/SummaryBlock.vue` | 一页速记卡（三段可选） | 外框复用 `.block-card`，别自造；三段同时为空由 `validateBlock` 拦下；标题缺省时组件显示「一页速记」，但**本页目录只看内容里的 title** —— 想让速记进 TOC 就得显式写 title |
| `src/components/blocks/CompareBlock.vue` | 双栏中性对照（维度 × 左 / 右） | 与 `errorfocus` 语义不同：**两侧地位对等**，不要引入对错色；≥768px 才分栏，窄屏靠 `.compare-who` 自带名称 |
| `src/components/blocks/VocabBlock.vue` | 术语卡（term / pinyin / meaning / example / note） | 外框复用 `.block-card--md`；可选字段为空串时校验器报错（要求删字段而不是留空行） |
| `src/components/blocks/CodeBlock.vue` | 代码块（等宽 + 复制按钮） | 不引语法高亮库；复制优先 Clipboard API、失败退回 `execCommand`；`<pre>` 不换行（横向滚动） |
| `src/components/blocks/ClozeBlock.vue` | 挖空默写（`{{答案}}` 点击揭晓） | 空位语法是 `{{...}}`，与 Vue 插值无关（这里是纯字符串解析）；已揭晓集合用 `ref(new Set())` |
| `src/views/UnitView.vue` | 内容页；TOC、锚点、`.page-content` 间距 | 290 行附近的加载点、286 行的锚点跳转、550 行的间距 |
| `src/components/blocks/MindMapBlock.vue` | 导图；`navigateToBlock()` 文字匹配跳转 | 阶段 4 已改为「全部标题元素 + `closest('.block-anchor')`」，改动前先读第二节阶段 4 小节；图例/工具栏**不得改回 `v-if="ready"`**（会引入 CLS，见 7.3） |

---

## 八、环境注意

- 平台 **Windows 11 + git bash**。`/tmp` 在 bash 里可用，但 **Node 会把 `/tmp/x` 解析成
  `C:\tmp\x`** —— 脚本里读写临时文件用相对路径或 `os.tmpdir()`，别用 `/tmp`。
- 仓库有 `core.autocrlf`，`git add` 时会打印大量 `LF will be replaced by CRLF` 警告，
  **属正常现象**，不是错误。
- `git commit -i`（交互式 rebase / 交互式 add）在本环境**不可用**。
- 如果要把一段历史拆成多个提交，注意：**`git commit --amend` 吃的是当时的索引**。
  本仓库工作区可能同时存在与你的任务无关的暂存内容，amend 会把它们一起卷进去。
  拆分历史前先确认 `git diff --cached --name-only` 的内容。（这是真实踩过的坑：
  一次 amend 无意中把 204 个 GeoGebra 文件卷进了提交。）

---

## 九、计划中已被事实推翻的部分

原始计划（`~/.claude/plans/schema-shimmying-muffin.md`）是基于探索阶段的理解写的，
以下几处**已被后续逐文件核对推翻**，照做会出错：

| # | 计划原文 | 事实 | 影响 |
|---|---|---|---|
| 1 | 「10 个 block 组件各写一遍卡片外框，其中 5 处与全局 `.card` 逐条相同」 | 实测 **14 处、8 个家族**，只有 **3 处**与 `.card` 逐条相同 | 抽取方案从「一个组件」改为「一个类族」 |
| 2 | 「阶段 3 第一步抽 `BlockShell` 组件（视觉零变化）」 | **做不到** —— per-item 卡 + 4 种标题形态（见第六节第 1 条） | `BlockShell` 推迟到第二步 |
| 3 | 「`.block-title` 无全局定义各写一遍」 | 是 **3 处互不相同的定义 + 7 处靠全局 `h3` 兜底**，不是 10 份副本 | 统一标题 = 视觉变化，不能在「零视觉变化」步里做 |
| 4 | 「阶段 4 的 `#block-{i}` 锚点需改为对每个**顶层**块挂 id」 | 那条链路（TOC）确实是索引；但**导图跳转是文字匹配**，计划完全没提到 | 按原文修会改错地方，导图联动仍会失效 |
| 5 | 别名映射「4/6→4；8/10→8；14/16→16；20/24→24；40→48；48→64」 | 直接当别名用会改动 59 处间距 2~4px | 第一步只做**取值不变**的别名，归并留给第二步 |
| 6 | 「keywords 触顶 800，139/139 全部恰好 800」 | 属实，但**中位页面正文 3503 字符**，所以 77% 内容搜不到 | 阶段 7.4 的修法必须配两级索引，不能只调大上限 |

另外：计划里提到的 `DesmosBlock 是死代码可删` 是**错的** ——
`src/content/math/03-函数与基本初等函数/03-二次函数.js` 有 1 处真实使用，不能删。

---

## 十、交接检查清单

接手后建议按这个顺序做：

1. `npm run validate:content && npm run lint && npm test && npm run build` —— 确认起点是绿的。
2. 读 `CLAUDE.md`（项目约定）与 `docs/COMPONENTS.md`（组件清单）。
3. **人工在浏览器里看一遍现状**（`/#/study/math/01/0` 与 `/#/study/math/03/2`，明暗各一次），
   建立「改动前长什么样」的基准 —— 阶段 3 第二步是视觉改版，没有基准就无法判断改得好不好。
4. 找用户确认视觉方向后再开工，**不要**自行决定配色与间距的具体数值。
5. 动 CSS 时，**每一步都跑 `npx vitest run tests/block-card.test.js`**；
   若是有意改版，更新快照表 `FRAMES` 里的原值，**不要删测试**。
