# 架构审计 —— 大改造开工前的「真实功能与冗余」盘点

> 审查人：高见远（software-architect-2）　日期：2026-10-07
> 基线：commit `338c119`（D10 演练场下线已实施后的 main）
> 方法：只读源码 + 逐条实测取证（文件:行号）；数字用脚本实数，不估算。**未改任何源码。**
> 口径：`src/content/**/*.js` 共 **147 个文件**（139 个数据页 + 8 个基建），正文一律按 139 个数据页计。

---

## 0. 结论速览（TOP 10 按影响排序）

| # | 发现 | 性质 | 处置建议 |
|---|---|---|---|
| 1 | **编辑器全链 1428 行 + `FormulaEditor.vue` 333 行 = 1761 行可删代码仍在仓库**（`FormulaEditor` 已是零引用死组件；"迁移脚本仍用 serializePage"经实测为假） | 死代码 | 开工前删（P2-T4 扩围，见 §5-1） |
| 2 | **"最近学习"同一事实两套存储**：`progress.lastStudiedAt`（store 派生，**0 消费者**）vs `localStorage.last_study`（UnitView 写 / HomeView 读，活的） | 死输出 + 双存储 | 删 store 死输出，或统一走它并删 localStorage（§3-1） |
| 3 | **完成状态 4 处渲染、其中 3 处是永远 disabled 的按钮**（ContentSidebar :41/:93/:191 + UnitView :52） | 冗余 + 交互异味 | P1-T3 重排时收敛为状态徽章（§2-3） |
| 4 | `errorCapture.getErrorLogs/clearErrorLogs`（:67/:72）**零消费者**；文件头注释"无后端"已过时（server/src 存在 11 个端点） | 死导出 + 过时注释 | 修注释；死导出随可观测方案定夺（§2-6） |
| 5 | `MathJaxRender.vue` **名不副实**：实现是 KaTeX（文件头自述"使用 KaTeX 替代 MathJax"），被 5 个区块 + useKatex 引用 | 命名债（非双实现） | 改名 `KaTeXRender`，P2 批次顺手做（§4-1） |
| 6 | `context` prop 无条件传给全部 21 种区块，实际仅 3 种声明消费（MindMap/Quiz/Exam） | 数据过传（轻微） | 记录不重构（成本低于收益，§3-2） |
| 7 | 21 种区块类型**全部有真实实例、零死类型**；quiz 的 4 个题型（single/judge/fill/solve）只是数据标签，渲染统一无分支 | **非冗余**（确认项） | 保持，防误删（§6） |
| 8 | `asyncBlock` 懒加载仅 2 处（diagram/exam）且注释写明反例决策（knowledge/quiz 刻意同步） | **非冗余**（确认项） | 保持（§6-1） |
| 9 | stores 三分（auth/progress/studyDb）职责清晰无重叠：auth=localStorage persist、studyDb=IndexedDB 唯一事实源、progress=纯派生快照 | **非冗余**（确认项） | 保持（§6-2） |
| 10 | localStorage 六处各自独立键（theme/pomodoro/last_study/auth persist/app_error_log/sync_meta），无互相拷贝同步 | **非冗余**（确认项） | 保持，但 last_study 例外（见 #2） |

---

## 1. 功能清单总表（1:1 映射）

### 1.1 路由可达的 UI 功能（`src/router/index.js`，8 条路由）

| 功能 | 路由/入口 | 实现（文件） | 依赖 | 状态 |
|---|---|---|---|---|
| 登录/注册/鉴权 | `/login` + 全局守卫（router/index.js:74-99） | `LoginView.vue`(194行) + `stores/auth.js`（pinia persist→localStorage）+ `sync/api.js` | server `/api/auth/*` 5 端点 | **活** |
| 学习导航（首页） | `/` | `HomeView.vue`(442行) + `content/index.js`(site.js) + `utils/search.js` + `SearchPanel.vue` + `scripts/build-search-index.mjs`（prebuild） | `localStorage.last_study`（:177 读） | **活** |
| 内容阅读 | `/study/:subject/:unitNum/:fileIndex?` | `UnitView.vue`(690行) + `content/loadPage.js`（139 个独立懒加载 chunk）+ `BlockRenderer` + 21 区块组件 | studyDb/progress/sync 生态 | **活** |
| 公式渲染 | （内嵌于内容页） | `MathJaxRender.vue`(55行，**实为 KaTeX**) + `composables/useKatex.js`(293行，warmKatex 预热) | 无外部资源 | **活**（名字失真，§4-1） |
| 几何画板 | （diagram 区块） | `blocks/GeometryBlock.vue` + `components/JsxGraphBoard.vue` + `src/geometry/boards/` 20 模块(544行) | jsxgraph（asyncBlock 懒加载） | **活** |
| 测验/考试 | （quiz/exam 区块） | `QuizBlock.vue` / `ExamBlock.vue`(597行，asyncBlock) | `provide('examState')`(UnitView) + `guardLeave`(:419-424) | **活** |
| 学习记录 | （横切） | `stores/studyDb.js`(IndexedDB 6 库) + `stores/progress.js`(纯派生快照) | `markPageVisited`/`recordTest`/`recordAnswered` | **活** |
| 错题 + 间隔复习 | `/error-book` | `ErrorBookView.vue`(371行) + `composables/useSpacedReview.js`(198行，SM-2) | `error_book` 库 | **活** |
| 数据洞察 | `/dashboard` | `DashboardView.vue`(314行) | page_progress/daily_stats | **活**（将并入"我的"，D3/D18） |
| 个人/主题 | `/profile` | `ProfileView.vue`(185行) + `useTheme.js`(71行，localStorage) | — | **活** |
| 管理后台 | `/admin`（meta.admin） | `AdminView.vue`(215行) | server `/api/admin/*` 4 端点 + PATCH | **活** |
| 笔记/书签 | （内容页内） | `useNotes.js`(137行) / `useBookmarks.js`(73行) → IndexedDB | notes/bookmarks 库 | **活** |
| 番茄钟 | （内容页 FAB，UnitView:144） | `usePomodoro.js`(289行，localStorage 恢复) | — | **活** |
| **低代码编辑器** | `/editor`（router/index.js:31-36） | `views/editor/` 3 文件(790行) + `contentWrite.js` + `contentSchema.js` + `serializePage.js`(147行) + `vite-plugin-content-write.mjs`(130行) + **`FormulaEditor.vue`(333行，零引用)** | — | **死（D7 已拍板删除）** |
| 旧路由兼容 | `/unit/:unitNum/:fileIndex?` → redirect math（router/index.js:29-32） | 路由重定向 | — | **疑似死**（§2-7） |

### 1.2 服务端功能（`server/src/`，8 文件 607 行；API 11 端点，客户端 `sync/api.js` 全覆盖）

| 功能 | 端点 | 实现文件 | 客户端消费方 | 状态 |
|---|---|---|---|---|
| 注册/登录/刷新/登出/me | `/api/auth/*` ×5 | `server/src/auth.js` | `stores/auth.js`（fetch :14/:66/:95） | **活** |
| 学习数据同步（LWW + 墓碑） | `/api/sync` POST | `sync.js` + `sync-core.js` + `db.js` | `sync/engine.js:108` | **活** |
| 用户管理/角色/删除 | `/api/admin/users`、`PATCH .../role`、`DELETE .../:id` | `admin.js` | `AdminView.vue:128/147`（api.adminUsers/setUserRole/deleteUser） | **活** |
| 管理统计 | `/api/admin/stats/overview`、`/stats/pages` | `admin.js` | `AdminView.vue:128` | **活** |
| 健康检查 | `/api/health` | `app.js:46` | 无前端消费方（运维用） | **活**（合理保留） |

### 1.3 横切基建

| 功能 | 实现 | 状态 |
|---|---|---|
| 全局错误采集 | `utils/errorCapture.js`(initErrorCapture/main.js:11) → localStorage 环形 50 条 | **活**，但 `getErrorLogs/clearErrorLogs`(:67/:72) **0 消费者**；注释"无后端"过时 |
| 内容校验（CI） | `utils/validateBlock.js` + `scripts/validate-content.mjs`（schema/content-schema.json 21 枚举） | **活** |
| 内容导入导出备份 | `studyDb.js:686-687`（6 库全量） | **活** |
| 同步游标 | `sync/engine.js` META_KEY `sync_meta_v1` | **活** |
| 一次性迁移脚本 | `scripts/migrate-content-meta.mjs`、`migrate-content-style.mjs`、`codemod-initcode.mjs` | **已完成使命**（§2-8） |
| 部署/签名 | `scripts/deploy-backend.sh`、`setup-android-signing.mjs` | **活** |

---

## 2. 冗余与死代码清单（确定项，每条含证据与建议）

### 2-1 编辑器全链 + 零引用的 FormulaEditor（**删，1761 行**）

- **证据**：`grep -rn "FormulaEditor" src tests scripts` → 仅 `src/components/FormulaEditor.vue` 自身，**0 外部引用**（333 行）；`contentWrite.js`(12行)/`contentSchema.js`(16行)/`serializePage.js`(147行) 的唯一消费者是 `views/editor/EditorView.vue`；`scripts/`、`tests/` 内 **0 引用**。
- **重要更正**：`system_design.md` P2-T4 原表述「**保留** `src/content/serializePage.js`（迁移脚本仍用）」经实测**不成立**——迁移/校验脚本（`validate-content.mjs`、`build-search-index.mjs`、`migrate-*.mjs`）均不引用它。P2-T4 删除清单应扩为：`views/editor/` 三件套 + `contentWrite.js` + `contentSchema.js` + **`serializePage.js`** + `vite-plugin-content-write.mjs` + `FormulaEditor.vue` + 路由 `/editor` + 相关测试。
- **建议**：删。这也是 system_design.md 需要顺手修正的一处（见 §5）。

### 2-2 「最近学习」双存储，其中一套是死输出（**二选一收敛**）

- **证据**：①`stores/progress.js:41-45` 从 `page_progress.visitTime` 推导 `lastStudiedAt` 并放入 store state（`store.d.ts:15/21` 声明），但 **views/components 全目录 grep 0 消费者**；②`UnitView.vue:356` 每次 `loadPage` 写 `localStorage.last_study`，`HomeView.vue:177` 读它做"继续学习"——这是**活的**实现。
- **判断**：同一事实（最近学习的页）两个来源、一套死一套活。死的那套还每次 refresh 全量重算。
- **建议**：**删 `localStorage.last_study`，HomeView 改读 `progress.lastStudiedAt`**（page_progress 已是事实源，IndexedDB + 同步链已覆盖换设备场景，localStorage 版做不到）。反向（删 store 版）也可，但会把事实源留在 localStorage、与同步体系脱节。

### 2-3 完成状态 4 处渲染，3 处是永远 disabled 的按钮（**收敛为状态展示**）

- **证据**：`ContentSidebar.vue:41`（桌面快捷操作）、`:93`（移动 mini-bar）、`:191`（更多菜单）三处 `<button ... disabled title="完成状态自动记录...">`；`UnitView.vue:52` 第四处 `.done-chip`。按钮永远不可点（组件头注释 :19 自述"无手动标记"），是把**状态展示**伪装成**可交互元素**——触屏上用户会去点它。
- **判断**：不是"多余功能"而是**同一展示的 4 份拷贝 + 错误的控件语义**。
- **建议**：P1-T3 结构性重排时改为纯状态徽章（`<span class="status-badge">`），每端一份；v4 页眉本就承载 `[返回][标题][页码]`，完成态放页码旁即可，ContentSidebar 三处合并为一处。

### 2-4 一次性迁移脚本（**归档或删**）

- **证据**：`scripts/migrate-content-meta.mjs`（头注释"阶段 1B"）、`migrate-content-style.mjs`（"阶段 6"）、`codemod-initcode.mjs`（csp-guard-plan §5 已列删，2026-10-07 复核仍在）。三者均为一次性历史使命，且 migrate-content-style 头注释自述"145 个 .js 中 62 个"——数字已过时（现 147）。
- **建议**：删或移 `scripts/archive/`。它们不被 CI 引用，留着只会让"哪些脚本是活的"变模糊。

### 2-5 `errorCapture` 死导出 + 过时注释（**修注释，导出待定**）

- **证据**：`errorCapture.js:67/72` 导出 `getErrorLogs/clearErrorLogs`，src 全目录 **0 消费者**；`:5` 注释"不引入网络上报（无后端）"——但 `server/src/` 已有 11 个端点（含 `/api/sync` 带鉴权通道）。
- **判断**：采集本体（window.onerror/unhandledrejection，main.js:11 挂载）是活功能；死的是两个导出 + 过时的前提注释。
- **建议**：注释先修正（防误导）；导出要么在 AdminView/调试面板接上（它天然是管理后台的一块），要么删。**这条留给 PM/工程定**，不阻塞开工。

### 2-6 `MathJaxRender` 名不副实（**改名，低优先**）

- **证据**：`MathJaxRender.vue:1-8` 文件头自述"使用 KaTeX 替代 MathJax…字体内嵌无外部资源依赖"；引用方 5 个区块（Summary/FormulaCard/Warning/Table/Compare）+ `useKatex.js`。
- **判断**：**不是双实现**（全仓只有一个公式引擎，已确认无 MathJax 残留），是迁移遗留的命名债——新人会以为存在两套公式方案。
- **建议**：P2 视觉批次顺手改名 `KaTeXRender`（触面 6 文件，纯 rename）。

### 2-7 旧路由重定向 `/unit/:unitNum/:fileIndex?`（**疑似死，先验证再删**）

- **证据**：`router/index.js:29-32`，redirect 到 math 学科。hash 模式应用、无站外分享链接机制、`src/content` 与 docs 内 grep 不到 `#/unit/` 链接。
- **建议**：【疑似】——验证方法：grep 仓内全部 `#/unit/` 与历史分享/文档模板；确认 0 来源后删。风险极低但按"不臆造"留待确认。

### 2-8 其他小项

| 项 | 证据 | 建议 |
|---|---|---|
| `copyText.js` 编辑器删除后仅剩 1 消费者（CodeBlock） | `grep -rln copyText` → CodeBlock + EditorView | 保留（单消费点 ≠ 冗余） |
| `App.vue` 站点式 header（:8-19） | R3/IA 已列删除 | 已在 P1-T3/P1-T2 计划内，非新发现 |
| `Server: /api/health` 无前端消费 | `app.js:46` | 保留（运维探针，惯例） |

---

## 3. 数据流问题清单

### 3-1 「最近学习」双写双源（同 §2-2，数据流视角）

- **路径**：事实源 A = IndexedDB `page_progress.visitTime`（markPageVisited 写，studyDb.js:530-546）→ progress.refresh() 全量重算 → `lastStudiedAt`（**无人读**）；事实源 B = `localStorage.last_study`（UnitView:356 每次 loadPage 写）→ HomeView:177 读。
- **跳数**：A 链 3 跳（写入→全量重建→state）结果无人消费；B 链 2 跳但是旁路存储。
- **最短方案**：删 B（localStorage），HomeView 直接 `progress.lastStudiedAt`（已有同步/换设备能力）。删 A 则保留现状缺点（事实源脱离同步体系）。

### 3-2 `context` prop 全量下传，仅 3/21 消费

- **路径**：`UnitView`（pageContext computed，:258-265）→ `BlockRenderer.vue:22`（无条件 `:context="context"`）→ 21 种区块；**仅 MindMapBlock:52、QuizBlock:84、ExamBlock:141** 声明该 prop。
- **为什么这么多跳**：无——单跳，但传给了不用的组件。
- **判断与方案**：改 `provide/inject` 可以省掉"每加一种交互区块都要记得接 prop 线"，但代价是隐式契约（§1.5 禁 provide 滥用）。**推荐保持现状**（显式 props 是项目约定，多余 prop 的运行时成本≈0），仅作记录；若 P0 引入 LayoutRenderer 后区块层级变深（context 要穿 layout 一层），再改 provide。

### 3-3 `progress.refresh()` 全量重建的触发频率（性能注记）

- **路径**：`markPageVisited`（每页 1 次）与 `recordTest`（交卷 1 次）后调 `progress.refresh()`（UnitView loadPage 内、studyDb recordTest 内）→ `buildSnapshot` 遍历 **3 学科全部 unit/files**（progress.js:27-44，~139 页 × 3）重建 Map。
- **判断**：每页 2 次以内、O(417) 量级，**可接受，不动**。但 `recordAnswered`（studyDb.js:513，每次作答调）**不触发** refresh（只更新 daily_stats + page_progress）——P6 练习会话高频作答时这个"不刷新"反而是对的。**给 P6 的提醒**：练习结算页若要即时反映错题/进度，走局部更新，勿引入"每题 refresh"。

### 3-4 localStorage 六键盘点（结论：无冗余同步问题）

| 键 | 写入方 | 读取方 | 与 IndexedDB 重叠？ |
|---|---|---|---|
| 主题（useTheme） | useTheme.js:… | 同 | 否（UI 偏好） |
| 番茄钟（usePomodoro） | usePomodoro.js | 同 | 否（会话态） |
| `last_study` | UnitView:356 | HomeView:177 | **是**（§3-1，唯一例外） |
| auth persist（auth.js:32） | pinia 插件 | auth store | 否（token 类） |
| `app_error_log` | errorCapture | **无** | 否（日志） |
| `sync_meta_v1` | engine.js | 同 | 否（同步游标） |

各键独立、无手工互相拷贝——用户担心的"三处各存一份靠手动同步"**不成立**，唯一例外是 last_study（见上）。

### 3-5 emit 链与 store 回流

- `ContentSidebar` 8 个 emit → UnitView 单跳处理（:131-141），**无多层上抛**；`examState` 用 provide/inject 单层（UnitView provide :401 → ExamBlock inject :148），是 provide 的**正确**用法（跨多层只传一个可变状态）。
- **结论**：emit/provide 结构健康，无需事件总线。

---

## 4. 架构摆放问题

| # | 问题 | 证据 | 判断 |
|---|---|---|---|
| 1 | `MathJaxRender.vue` 在 `components/` 根，名实不符（实为 KaTeX 渲染基建） | §2-6 | P2 批次改名即可；位置（components 根）合理——它是被 blocks 消费的渲染基建，不是区块 |
| 2 | `errorCapture.js:5` 注释"无后端"与 `server/` 现实不符 | server/src 11 端点 | 注释修正；这属于"注释撒谎"类债务，会误导新人架构判断 |
| 3 | `scripts/deploy-backend.sh`、`setup-android-signing.mjs` 混在前端 scripts/ 里 | scripts/ 清单 | 轻微越界但同仓一体（monorepo 式），**不动**——拆目录的成本 > 收益 |
| 4 | `schema/content-schema.json` 在仓库根而非 src/ | find 实测 | **正确**：被前端（validateBlock）与 Node 脚本（validate-content.mjs）双端共用，放 src 会被 Vite 打包语义纠缠 |
| 5 | `src/sync/`（api/apiBase/engine 189 行）内聚良好，server 对应端点全被消费 | §1.2 | 无摆放问题 |
| 6 | stores 三分无重叠：auth（会话）/studyDb（唯一事实源）/progress（纯派生，只读缓存，写入侧收敛在 markPageVisited/recordTest） | progress.js:8-10 头注释 | **确认非冗余**；若未来 progress 快照维护成本上升，可降级为 composable + computed，但现在动它没有收益 |

---

## 5. P0-P6 开工前应先删/先改清单（给用户的行动项，按性价比排序）

| 序 | 行动 | 规模/收益 | 成本 | 挂靠 |
|---|---|---|---|---|
| 1 | **删编辑器全链**：`views/editor/`(790) + `contentWrite.js` + `contentSchema.js` + `serializePage.js` + `vite-plugin-content-write.mjs` + 路由 `/editor` + 相关测试；**外加 `FormulaEditor.vue`(333，零引用死代码)** | **−1761 行**，少维护 6 个文件；P2-T4 原清单需按此扩围（"保留 serializePage"依据已被实测否定） | 低（0 引用已验证） | P2-T4（可提前，无依赖） |
| 2 | **收敛「最近学习」**：删 `localStorage.last_study`（UnitView:356 / HomeView:177），HomeView 改读 `progress.lastStudiedAt` | 消灭双存储 + 删一个死输出；续学功能获得换设备能力 | 极低（2 文件） | P1-T3（HomeView 改造时顺手） |
| 3 | **归档 3 个一次性迁移脚本**（migrate-content-meta / migrate-content-style / codemod-initcode） | scripts/ 只剩活脚本，防误用 | 极低 | 任意时点 |
| 4 | **修 `errorCapture.js` 头注释**（"无后端"→"server 存在但未接上报"）；getErrorLogs 是否接管理后台由 PM 定 | 防注释误导 | 极低 | 任意时点 |
| 5 | **ContentSidebar 永久 disabled 按钮改状态徽章**（3 处 → 1 处/端） | 交互语义修正 + 去 3 份拷贝 | 低 | P1-T3 |
| 6 | **验证后删旧路由重定向** `/unit/...`（grep `#/unit/` 确认无来源） | 少一条无主路由 | 极低 | P1-T2 改路由时 |
| 7 | `MathJaxRender` → `KaTeXRender` 改名 | 消除命名误导 | 极低（纯 rename 6 文件） | P2 批次顺手 |

**明确不建议动的**（避免开工前做无用功）：stores 三分、asyncBlock 机制、BlockShell、长尾 6 区块组件、`copyText.js`、`schema/` 根目录位置、provide(examState)、`/api/health`——理由见 §6。

---

## 6. 「看似冗余、实测健康」防误删清单

| # | 项 | 证据 | 为什么不是臭抽象 |
|---|---|---|---|
| 1 | `asyncBlock` 懒加载工厂 | registry.js:47/54 仅 diagram/exam 两处使用；:37-42 注释给出**反例决策**（knowledge/quiz/example 覆盖 100+ 页且带交互状态，刻意同步） | 机制只有 2 个真实用户、决策有记录——这是"该懒才懒"的正确收敛，不是跟风 |
| 2 | quiz 题型 single(341)/judge(75)/fill(51)/solve(28) | 4 个题型标签只出现在 `content.d.ts:35/148`，渲染代码**无 per-type 分支** | 题型是数据标签不是代码分支——数据多样性与代码多样性被正确分离 |
| 3 | 长尾区块 6 组件 610 行服务 8 个实例（vocab/steps/compare/code/cloze 各 1、summary 2） | wc -l 实测（§附） | 内容表达多样性是内容型产品的真实需求；且 P4-T3 的 `data-kind` 五值域已把它们归并为 5 个"内容角色"，样式差异走 CSS 而非新增组件——**将来加表现形态优先用变体参数（方案 C），不加新组件** |
| 4 | `BlockShell.vue`（36 行） | 被 ≥6 个区块复用（Summary/FormulaCard/Warning/Compare/Tip/Steps…） | 有真实多消费点，是好的公共抽象 |
| 5 | `progress` store 作为"只读快照"独立于 studyDb | progress.js:8-10 | 写入侧单点（markPageVisited/recordTest），快照换 O(1) 读——分层有实义 |
| 6 | `provide('examState')` 单处使用 | UnitView:401 → ExamBlock:148 | 跨多层传一个可变状态，provide 的教科书场景；未滥用 |
| 7 | 服务端 11 端点 vs 客户端 api.js 8 方法 | 逐一对上（health 为运维探针） | 无"实现了没人调"的孤儿端点 |
| 8 | 139 个独立内容 chunk | loadPage.js:20-22 字面量前缀机制 | 不是冗余，是首屏/分包的核心资产（多轮体检确认） |

---

## 附：实测口径备忘

- 区块类型使用率（`grep 'type: "x"' src/content`）：knowledge 242 / quiz 171 / formula 131 / example 120 / warning 116 / table 105 / tip 104 / objectives 96 / mindmap 96 / diagram 20 / errorfocus 18 / strategy 10 / exam 6 / group 3 / summary 2 / columns 2 / vocab 1 / steps 1 / compare 1 / code 1 / cloze 1 —— **21 类型全部有实例**（single/judge/fill/solve 是 quiz 内题目类型标签，非区块类型）。schema 枚举（21）、registry（21）、blockTypes（21）三者一致（`338c119` 后）。
- 编辑器链行数：`views/editor` 790 + contentWrite 12 + contentSchema 16 + serializePage 147 + FormulaEditor 333 + vite-plugin-content-write 130 = **1428**。
- localStorage 键全量：theme、pomodoro、last_study、auth persist、app_error_log、sync_meta_v1（6 键，无互相拷贝）。
- 本文档只读源码取证，未修改任何源码/测试/配置；`docs/system_design.md` 与 `docs/prd-mobile.md` 未改动。
