# 内容系统重构 · 交接文档

> 面向接手的 agent。**读完这一份就能开工，不需要先读任何对话历史。**
> 最后更新：2026-09-11，对应 `main` 分支 `bb576a2`。

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
| 3 | **效率双重欠账** | **生产侧**：139 个文件各手写一份元信息（已修）；编辑器只支持 9/14 种类型（已修）。**运行侧**：KaTeX 523 KB / 155 KB gz 在内容页关键路径上；搜索索引 139/139 条的 keywords 恰好被截断到 800 字符，中位页面正文 3503 字符 → **77% 内容搜不到且静默无告警** |

**目标调性（用户已确认）：极简留白** —— 大量留白、靠分层与字号对比而非阴影和颜色建立层次、动效克制。

**执行顺序（用户已确认）：先生产侧（内容模型），再运行侧。**

完整原始计划在 `~/.claude/plans/schema-shimmying-muffin.md`（本仓库之外，仅供参考；
**其中若干处已被事实推翻，见第九节**）。

---

## 二、当前进度

### 已完成并合入 `main`

```
bb576a2  deepseek修改                                    ← 用户自己提交的 GeoGebra 自托管文件（与本重构无关）
1720949  refactor(blocks): 卡片外框收敛为 .block-card 类族 + 设计 token 阶梯      ← 阶段3 第一步
259c4a4  feat(editor): 编辑器改为 schema 驱动，覆盖全部 14 种区块类型            ← 阶段2
8760dc7  refactor(content): 元信息与类型清单收敛为单一真相源                    ← 阶段0+1
66a8683  feat: 认证强化 + keyset 同步升级 + 完成态由 page_progress 推导
```

**三个提交已逐个验证**：每个提交单独 checkout 后 lint / test / validate / build 四项全过，
且各自保留 139 个内容 chunk。测试数 70 → 102 → 148 逐级递增。

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

### 阶段 3 第二步：视觉降噪改版（**下一步就该做这个**）

**这是有意为之的视觉 Breaking change**，也是「极简留白」真正落地的地方。

**做什么**（来自计划 3.2–3.5）：

1. **引入 `BlockShell.vue`** —— 到这一步它才有发挥空间（见第六节第 1 条的约束与边界）。
2. **消除重复卡片样式**：`.block-card` 族已就位，第二步要**去掉大部分卡片**：
   - `knowledge`：删掉整个卡片外框，纯靠标题与留白分段，正文 `max-width: 68ch`；
     `definition` 变体用 2px 左侧细线；`aside` 变体降字号降色
   - `formula`：**唯一保留浅底色**的类型；删边框、删阴影、圆角降一档；label 改小字号 + 加字距
   - `tip` / `warning`：共用一个 `.shell--note` 规则（`border-left: 2px solid var(--tone)`），
     彻底删掉 `rgba()` 填充、1px 描边、圆角 —— 目前这两个文件的规则逐字重复
   - `quiz`：题目去掉卡片外框，改 `border-top: 1px solid var(--line)` 发丝线分隔；
     **只有选项选中态用底色**
   - `example` / `exam`：靠发丝线分隔，不用卡片
   - `mindmap` / `diagram` / `desmos`：视口需**保留边框**
3. **block 间距 8px → 32px**（`UnitView.vue:550` 的 `.page-content`）：
   ```css
   .page-content { display: flex; flex-direction: column; gap: 0; }
   .block-anchor + .block-anchor { margin-top: var(--gap-block, 32px); }
   ```
   ⚠️ 注意现在**间距有两个来源**：`.page-content` 的 `gap: 8px` **加上**各区块自己的
   `margin-bottom`（8/10/12/16px 不一）。改版时要把两者一起处理，否则会得到意外结果。
4. **色彩降噪**：`--bg` 由 `#f6f7fb`（偏蓝）改近白暖灰 `#fbfbfa`；新增 `--line`（发丝线）/
   `--line-strong`；语义色统一降饱和（`--warning: #f08c00` → `--tone-warn: #b26a00`）；
   `--primary` 保持品牌蓝但**只用于文字/图标/1px 线**。
5. **阴影只留 3 档**：`none` / `--shadow-xs`（只给 sticky 顶栏）/ `--shadow-pop`（只给浮层：
   desmos 遮罩、搜索下拉、TOC 面板）。**区块本身不再有阴影。**
6. **动效 token**：`--dur-1/2/3`(100/160/240ms) + `--ease-standard` / `--ease-out`，
   加 `prefers-reduced-motion` 兜底。只有 5 处交互有动效：折叠展开、悬停、浮层进出、
   阅读进度条、迷你顶栏。**明确不做**：路由切换过渡（建议删掉 `UnitView.vue:515` 的
   `.fade-enter-active`）、列表 stagger、滚动视差、hover 位移放大、
   `main.css` 的全局 `transition: background .3s`（主题切换会闪）。

**验收**：
- 全站门禁四条命令全过 + 139 个内容 chunk 不变
- **必须人工在浏览器里看**，覆盖每种区块类型 × 明暗双主题 × 移动端 375px：
  - `/#/unit/math/01/0`（knowledge / tip / warning / formula / table / quiz / example / mindmap 全出现）
  - `/#/unit/math/03/2`（含 diagram + desmos）
  - `/#/unit/math/01/6`（18 页同构复习页之一）、`/#/unit/math/01/7`（16 页同构冲刺页之一）
- 明暗主题下检查对比度：正文 ≥ 4.5:1、次要文字 ≥ 3:1

---

### 阶段 4：版式层（依赖阶段 3）

**目标**：新增 `columns` / `group` 两个容器型区块，让页面能编排而不只是纵向堆叠。

**为什么是容器而不是 `span`/grid**：`span` 需要父级是 grid，而 grid 的统一 gap 会夺走
「留白节奏」的控制权。容器方案让作者管编排、容器管间距。

**schema 新增两个分支**（`schema/content-schema.json`）：

```jsonc
{ "if": { "properties": { "type": { "const": "columns" } } },
  "then": { "required": ["items"], "properties": {
    "cols": { "type": "number", "enum": [2, 3], "description": "桌面端列数；窄屏自动降单列" },
    "gap":  { "type": "string", "enum": ["normal","tight"] },
    "items": { "type": "array", "items": { "type": "array", "items": { "$ref": "#/definitions/block" } } }
  } } },

{ "if": { "properties": { "type": { "const": "group" } } },
  "then": { "properties": {
    "variant": { "type": "string", "enum": ["band","collapse"], "description": "band=分组带；collapse=可折叠分组" },
    "collapsed": { "type": "boolean" },
    "items": { "type": "array", "items": { "$ref": "#/definitions/block" } }
  } } }
```

同时给 `knowledge` 加 `variant: plain|definition|aside`、`example` 加 `variant: full|compact`。
（`knowledge.kind` 是 0 使用且从未被读取的死字段，用 `variant` 取代它。）

**⚠️ 递归渲染必须在 `BlockRenderer.vue` 内部自引用**（SFC 支持按文件名自引用）——
不要让 `ColumnsBlock.vue` 去 import `BlockRenderer`，那会形成循环依赖且模块求值顺序会让
`resolver` 拿到 `undefined`。未知类型分支保持**显式提示**，不要退回静默空白。

**⚠️ 必须一并处理的隐患（漏掉会让 96 个含导图的页面点击联动失效）**：
本仓库有**两条互不相同**的「跳到某个区块」链路：

1. **本页目录（TOC）** —— `UnitView.vue:286` 的 `document.getElementById('block-' + index)`，
   靠 `v-for` 挂在每个区块外层 div 上的 `id="block-{i}"`，**按索引**定位。
2. **思维导图点击节点跳正文** —— `MindMapBlock.vue:157` 的 `navigateToBlock()`，
   **不认索引**：`querySelectorAll('.block-anchor')` 取出所有锚点，再逐个读锚点内
   `h3.block-title, .knowledge-title, .block h3` 的**文字**，与导图节点标签做归一化后的
   互相包含匹配。**只匹配 `h3.block-title`** —— 用 `<h2 class="block-title">` 的
   `ExampleBlock` / `ErrorFocusBlock` / `StrategyBlock` / `QuizBlock` 本来就匹配不到。

引入容器后，子区块不再有 `.block-anchor` 外层，链路 2 的 `querySelectorAll` 只会取到顶层
容器，而容器上大概率没有 `h3.block-title`，匹配随即失效（**不报错，只是点了没反应**）。
修复方向是「容器内也参与匹配」或「导图直接拿子区块标题表」，**不是改 id**。

**建议先改造 3 个代表性内容页**（覆盖最集中的同构结构，收益/风险比最高）：
1. `src/content/math/01-集合与逻辑/01-集合的概念与表示.js` —— 13 块 → 9 块 + 2 容器
2. 数学任一单元的 `07-复习测验.js`（18 页共享模板）—— 一处改动覆盖 18 页
3. 数学任一单元的 `08-易错专项与冲刺.js`（16 页共享模板）

**验收**：`npm run validate:content`；`npm test`（补递归用例）；三档宽度（1440/1024/375）
下降列行为；**重点验证 `/#/unit/math/01/0` 点思维导图节点仍能滚到对应块**。

---

### 阶段 5：结构扩充（依赖阶段 4）

按优先级：

| 优先级 | 类型 | 形态 | 预期复用度 | 理由 |
|---|---|---|---|---|
| **P1** | `steps` | 编号步骤条（序号圆点 + 发丝竖线串联） | **60+ 页** | 数学「解题通法」、计算机「操作步骤」、语文「文言翻译四步法」现在被塞进 `knowledge.paragraphs` 手写「1. 2. 3.」，无法折叠、无法进 TOC、搜索片段命不中 |
| **P1** | `summary` | 「一页速记」卡（`points` / `formulas` / `mustKnow`） | **139 页** | 单招备考的核心场景是考前回看；现在复习要滚完 9 个块 |
| **P2** | `compare` | 双栏中性对照（`left`/`right`/`aspects`） | **40+ 页** | 「列举法 vs 描述法」「借代 vs 借喻」「栈 vs 队列」。**与 `errorfocus` 语义不同**（后者是错↔对），不能复用 |
| **P2** | `vocab` | 术语卡（`term`/`pinyin`/`meaning`/`example`/`note`） | **25+ 页** | 语文 33 页现在硬塞进 `table`，撑不住四字段 |
| **P3** | `code` | `<pre>` 等宽 + 复制按钮（**不引 Prism/Shiki**） | **15+ 页** | 计算机 26 页；零依赖版即可交付 80% 价值 |
| **P3** | `cloze` | 挖空 + 点击展开 | **10+ 页** | 可先用 `quiz.fill` 顶 |

**不做**：`timeline`（仅语文文学史少数页面，收益不抵成本）；`mindmap` 不加变体（96 页已充分覆盖）。

**新增一个类型的净成本已经很低**（阶段 0–2 把这件事铺平了）：
`schema` 加一个分支 + 一个新 `.vue` + `registry.js` 加一行 + `blockTypes.js` 加一行。
编辑器表单与校验白名单会**自动跟随**。`.d.ts` 由 `tests/block-registry.test.js` 守护。

**内容回填建议**：先只回填 `summary`。可从现有 `warning`/`tip` 抽取初稿，
但**必须是人工确认的草稿，不要自动发布**。

---

### 阶段 6：编辑器写回与序列化统一（任意时机）

- 新增 `scripts/lib/serialize-page.mjs` —— 固定手写风格（无引号键、2 空格缩进、块间空行、
  保留文件头注释模板）。**迁移脚本与编辑器导出差共用**，从此不再产生「引号键风格」的新文件。
  （背景：实测 144 个内容文件中，**62 个的顶层 `blocks` 键带引号**、77 个不带、5 个是含注释的
  其他形态 —— 后 5 个不是纯 JSON，无法机械改写，需人工。阶段 1B 刻意跳过了引号归一化，
  留到这里做。）
- 新增 `scripts/vite-plugin-content-write.mjs`（**仅 `apply: 'serve'`**）——
  开发期把编辑器内容写回 `src/content/`。**安全约束必写**：只允许写 site.js 注册表中
  已存在的页面；`subject`/`folder`/`name` 白名单比对，拒绝 `..`；非 DEV 不注册中间件。
- `EditorView.exportContent()` 加「复制 .js」按钮（`navigator.clipboard`，比下载更常用）。
- **不做 File System Access API**（Firefox/Safari 不可用、Tauri WebView 行为不确定）。
  Tauri 侧写回应走 Rust fs，属独立议题。

**验收**：`npm run build`（`apply:'serve'` 不应出现在产物）；`npm run dev` 手测编辑 → 保存 →
`git diff` 只含 blocks 且风格与手写一致 → `validate:content` 绿 → 热更新可见。
**导出前先跑校验，有错不允许写回。**

---

### 阶段 7：运行时性能（可独立并行，与版式无关）

#### 7.1 KaTeX 移出关键路径（收益最大：523 KB / 155 KB gz）

核心手法：从「模块图静态依赖」改为「路由守卫并行预取 + 就绪后重渲染」。

- `useKatex.js` 顶层 `import katex` 改为**幂等的 `warmKatex()`** 动态加载
  （模块级 `katex`/`loading`/`cssInjected` 三态，与 `useMermaid.js` 现有模式一致）。
- `renderMath` **保持同步**（这是 KaTeX 相对 MathJax 的核心优势，不要丢），
  未就绪时返回 `renderPlainFallback(text)` —— 剥掉 `\( \) $$ \[ \]` 定界符的纯文本，
  避免闪出乱码。新增短路径：不含数学定界符且非 `forceBlock` 的文本直接返回，
  跳过正则扫描。
- `MathJaxRender.vue` 用**显式版本号** `engineVersion` 驱动就绪后的重渲染 ——
  因为 `renderMath` 读的是非响应式模块变量，必须把这个隐式依赖暴露出来，
  否则会出现「莫名其妙不更新」。
- 预取三处：`main.js` 的 `requestIdleCallback`（回退 `setTimeout`）、
  `router/index.js` 的 `beforeEach`（目标为内容页时，让 523 KB 与路由/内容 chunk **并行**下载）、
  `MathJaxRender.onMounted` 兜底。

**FOUT 的诚实结论**：523 KB 引擎不可能既零阻塞又零 FOUT，选择是「让哪些页面承担」。
正常导航路径下引擎早已就绪、**无 FOUT**；冷启动深链会有约 100–300ms 的纯文本窗口，
但闪的是普通文字而非乱码，且块级公式容器有 `min-height` 不产生布局跳动。
**不建议**把 `katex.min.css` 挪进入口换零 FOUT。

**度量口径**：`ANALYZE=1 npm run build` 后 `dist/assets/UnitView-*.js` 里搜 `vendor-katex`
应为 **0 次**，且 `vendor-katex-*.js` 仍是独立 chunk。

#### 7.2 `renderMath` memo

按字符总量限界的 **FIFO Map**（不用 LRU：内容文本运行时不可变，是时间局部性，无访问偏斜）。
上限 512 KB HTML 字符串。key 用 `(forceBlock?'B':'I') + '\0' + text`。
导出 `clearMathCache()` 供测试与编辑器用。

#### 7.3 区块异步化的取舍（**只动 3 个，不要贪**）

| 组 | 类型 | 依据 |
|---|---|---|
| **保持同步** | `objectives` `knowledge` `tip` `warning` `formula` `table` | 覆盖 86–115 页；`formula` 依赖 KaTeX 同步性；组件本身仅 33–53 行，异步化只增加往返与占位闪烁 |
| **保持同步** | `mindmap` | **96 页里 78 页首块就是它**，异步化会在最显眼位置加占位 |
| **保持同步** | `quiz` `example` | 128/115 页，且带交互状态（选项选中、展开态），异步重挂载会**丢状态** |
| **改异步** | `exam`（597 行，最大单文件，带计时器）、`desmos`、`diagram`（已是） | 合计仅 11 页用到 |

另：`UnitView.vue:182` 与 `HomeView.vue` 的 `GeoGebraPlayground` 改 `defineAsyncComponent`。

**Mermaid 的 CLS 用 CSS 解，不要全局预热**：mermaid 是 636 KB + cynefin 691 KB +
cytoscape 444 KB 等一堆图类型 chunk，**全员预热是灾难**。

⚠️ 但计划里那条具体做法（「给 `.mindmap-viewport` 加 `min-height: 320px`」）
**很可能已经不需要了** —— `MindMapBlock.vue:243` 的 `.mindmap-viewport` 现在已经是
**固定 `height: 460px`**，占位→SVG 本来就不改变页面总高度。给一个固定高度的元素加
`min-height` 不产生任何效果。**先测量再动手**：用 DevTools 的 Layout Shift 区域
实测一次，确认 CLS 到底还存不存在、来源是不是这里，不要照抄计划里的处方。

#### 7.4 搜索索引两级化

- `build-search-index.mjs` 输出改为 `public/search-meta.json`（约 20 KB）+
  `public/search-body/{math,chinese,computer}.json` 分片。
- 正文上限 800 → **12000**（覆盖实测 max 8797），且**对任何仍被截断的页面 `console.warn`
  列出文件名** —— 把静默失败变成构建日志。
- `SearchPanel`：挂载时**不加载任何索引**；改为 focus/首次输入时才 fetch meta，
  并在 `requestIdleCallback` 里预取 meta（**不是**正文）。查询词长度 ≥ 2 时按当前 subject
  取对应正文分片。`snippet` 改从正文取（现在从被截断的 keywords 取，命中后常常截不到上下文）。

**验收**：`dist/search-meta.json` < 30 KB；DevTools「Slow 4G」下冷启动 `/#/unit/math/01/0`，
确认非公式部分先出现、公式在引擎就绪后替换；**搜一个只出现在某页后半段的词**，
改造前搜不到、改造后能搜到。

---

## 五、验证方法

### 门禁四条（每次改动都要全过）

```bash
npm run validate:content   # 内容数据校验：139 个内容文件 + 3 个站点配置
npm run lint               # eslint src tests --max-warnings 0
npm test                   # vitest，13 个文件 148 个测试
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

`TipBlock` 的 `rgba(47,111,237,.08)`、`WarningBlock` 的 `rgba(240,140,0,.10)`、
`ErrorFocusBlock` 的 `ef-wrong`/`ef-right`、`ExamBlock` 的 11 处 rgba，都是写死的字面量。
**这是既有的不一致行为，迁移时应保持原样**，不要在抽取阶段「顺手修好」——
那会让暗色观感改变，属于另一个议题。

### 7. `ExamBlock` 的定位上下文很脆弱

`.exam-toolbar` 是 `position: sticky`，`.submit-confirm-overlay` 是
`position: fixed` + `z-index: 300`（**没有用 Teleport**）。两者都怕祖先有
`transform` / `filter` / `contain`。**不要在它们的祖先链上加动画 transform**。

### 8. `.exam-result` / `.objectives-box` 现在没有 CSS 规则了

它们的外框完全由 `.block-card` 提供，类名保留作为定位钩子。
**不要以为类被删了**，也不要顺手给它们补规则。

---

## 七、关键文件地图

| 文件 | 作用 | 改它的注意点 |
|---|---|---|
| `schema/content-schema.json` | **唯一真相源**：类型白名单 + 字段定义 | 加类型只需加一个 `allOf` 分支；validator 白名单与编辑器表单会自动跟随 |
| `src/components/BlockRenderer.vue` | 分发枢纽 | 阶段 4 的容器递归要在这里**自引用**，不要外部 import |
| `src/components/blocks/registry.js` | 类型 → 组件绑定 | 加类型加一行 |
| `src/components/blocks/blockTypes.js` | 类型 → 中文名/图标 | 加类型加一行；`icon: ''` 表示不进本页目录 |
| `src/components/blocks/asyncBlock.js` | 统一的异步组件工厂 | 共用占位/错误组件，保留 150ms delay |
| `src/assets/css/blocks.css` | **卡片外框的唯一真相源** + 难度标签 | 见第六节第 2 条的特异度约定 |
| `src/assets/css/main.css` | token 阶梯唯一全局定义处 | 旧 `--spacer-*` 是别名，取值不可改 |
| `src/utils/validateBlock.js` | 语义校验（编辑器与 CI **共用**） | 纯函数，schema 由调用方注入 |
| `src/views/editor/schemaForm.js` | 由 schema 推导编辑器表单字段 | 纯函数，零 import |
| `src/content/pageMeta.js` | 页面元信息推导（两端共用） | 改这里等于改所有页面的元信息语义 |
| `src/content/loadPage.js` | 浏览器侧唯一加载入口 | 动态导入的**字面量前缀**不可改成变量 |
| `src/views/UnitView.vue` | 内容页；TOC、锚点、`.page-content` 间距 | 290 行附近的加载点、286 行的锚点跳转、550 行的间距 |
| `src/components/blocks/MindMapBlock.vue` | 导图；157 行的文字匹配跳转 | 见阶段 4 的隐患说明 |

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
3. **人工在浏览器里看一遍现状**（`/#/unit/math/01/0` 与 `/#/unit/math/03/2`，明暗各一次），
   建立「改动前长什么样」的基准 —— 阶段 3 第二步是视觉改版，没有基准就无法判断改得好不好。
4. 找用户确认视觉方向后再开工，**不要**自行决定配色与间距的具体数值。
5. 动 CSS 时，**每一步都跑 `npx vitest run tests/block-card.test.js`**；
   若是有意改版，更新快照表 `FRAMES` 里的原值，**不要删测试**。
