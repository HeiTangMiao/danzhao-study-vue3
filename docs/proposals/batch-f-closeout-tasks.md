# 批 F 收尾核实与最小收尾卡（Fc1 + F-3 清单逐项）

> 角色：架构师（Bob）｜仓库 `danzhao-study-vue3`
> 方法：**只读核实**——以**当前工作树实测**为准（不复述任务卡旧行号），逐项对照 `docs/proposals/batch-f-tasks.md`（含 §8 拍板记录）与 `implementation-roadmap.md` §2 批 F 小节。
> 基线：HEAD = **`e5e3e57`**（远端已推送）；工作树**干净**；批 F 第二波 Fc2–Fc6 全落地，独立 QA 两轮 **0 缺陷**（Round1 73 文件/841、Round2 76 文件/875）。
> 纪律：**未改任何产品代码 / 测试**；本文仅为核实结论与收尾卡。

---

## 1. 结论

**批 F 功能侧可标 ✅。** 逐项核实见 §2：

- **Fc1–Fc6 全部落地**（Fc1 = 文档吸收式归档，见 §2 / §3）。
- **F-3 清单 6 项**：第 1–4 项**已完成**；第 5、6 项按拍板**「只登记不实施」**（触发式，非遗留缺陷）。
- **仅剩 1 项实质遗留**：F-3.3 子项 `formulas/lines` 的内容迁移 **19 块 / 9 文件**——按 §8 P-F09 裁定 **交内容侧执行**，功能侧处于「validator 兼容期保留」的**等待内容侧**状态（`validate:content` 全绿，非红）。
- **2 项实机验证挂起**（沙箱无 Tauri 运行时）：外链实机点击、三勾跨会话回看——属**用户侧**，非代码遗留。

> 因此本收尾卡**没有「功能侧立即必做」项**；剩余项分「等待内容侧 1 项 + 触发式登记 2 项 + 实机验证 2 项」。

---

## 2. 逐项核实（依据 = 当前工作树实测）

### 2.1 Fc1（任务卡 §6 原定义）——**已满足（文档吸收）**

- **原定义**（`batch-f-tasks.md` §6 表）：`Fc1 | 查证归档（零代码）：AGENT_BROWSER_ARGS 结论 + MindMap 竞态登记（可并入文档 commit）`。
- **现状**：其为**零代码归档项**，已**吸收进** `docs/proposals/implementation-roadmap.md` §2「**F-3 备案小项清单**」：
  - 第 **4** 项（roadmap `:274`）：`AGENT_BROWSER_ARGS`「✅ 已查证归档——全仓仅 roadmap 本行出现、零代码/CI 引用、无需改任何代码」。
  - 第 **5** 项（roadmap `:275`）：`MindMapBlock` 竞态「修法已定位（await 后补 `if (!container.value) return`）……低优先，触发条件 = 用户实测/崩溃日志复现即升级」。
- **结论**：Fc1 **无独立 commit 必要**，已由文档吸收；**应并入的文档 = `implementation-roadmap.md` §2 F-3 清单第 4/5 项**（已就位）。

### 2.2 F-3 清单逐项（roadmap §2.F-3，`:264-276`）

| # | 项（roadmap 原题） | 状态 | 当前工作树实测依据 |
|:--:|---|:--:|---|
| **1** | 1150 断点统一化 | ✅ **已完成**（Fc3） | 全站 **18 处 CSS + 1 处 JS** 现**全部**为 `max-width:1149px` / `min-width:1150px`：`App.vue:134/141`、`ContentSidebar.vue:583/776`、`NotesPanel.vue:64`(JS `MOBILE_MQ`)`/254/268/271`、`PomodoroPanel.vue:410`、`AppTabBar.vue:275/280`、`UnitView.vue:671/710`、`reader.css:55/123/132/321/331/334`。**`min-width:1151px` / `max-width:1150px` 残留 = 0**（脚本复扫）。 |
| **2** | `ContentSidebar` 抽屉锁归属感知 | ✅ **已完成**（Fc2） | `ContentSidebar.vue:298-310`：`lockOwned` 布尔 + 仅 `open && overflow!=='hidden'` 才加锁、仅 `lockOwned` 才清锁（`onBeforeUnmount` 亦判 `lockOwned`）。与 `NotesPanel.vue` 同款。 |
| **3** | schema 口径差异 5 处 | ✅ **已完成**（Fc4）<br/>（**子项 1 内容迁移**除外，见 §3） | ① `solve`：validator 改**按块派生**（`validateBlock.js:39-40` `QUIZ_TYPES`/`EXAM_TYPES`，`:131/:154` 分别传入）；② `table`：补「headers 必填 + 行宽一致」（`:119-124`）；③ `columns`：补「cols∈{2,3} 且 ==items.length」（`:219-223`）；④ `diagram` 几何字段入 schema（`content-schema.json:44` 含 `boundingbox`/`height`/`fixed`）+ `content.d.ts:123-125`；⑤ `formula` 兼容期保留（`:101-103`，见 §3）。**1 处表格数据不符已随修**（`tableMismatch` 实测 **0**）。 |
| **4** | `AGENT_BROWSER_ARGS` 传参查证 | ✅ **已查证归档** | roadmap `:274` 已就地标注；本轮复扫全仓（含上层 `danzhao/`）**零代码/CI 引用**。**零代码**。 |
| **5** | `MindMapBlock` 高频导航竞态 | ⊘ **只登记不实施**（拍板 P-F12） | 修法已定位；**实测仍未改**（`MindMapBlock.vue:201` 空守卫在 await **之前**，`:210` await 后于 `:212` 直接 `container.value.querySelector`）。**触发式**（roadmap `:275`）。 |
| **6** | 两抽屉 body 锁**对称边角** R-1 | ⊘ **只登记不实施**（QA R-1，低/可能不可达） | roadmap `:276` 已登记；`batch-f-qa-report.md:105/251` 独立探针实证边角（CS 先持锁→NP 后开→CS 关→body 解锁但 NP 仍开）。**属「单一 body 锁 + lockOwned」固有对称边角（NotesPanel 同款，非 Fc2 引入）；真实路径很可能不可达**（抽屉内开笔记是「先关抽屉再 emit toggle-notes」）。**触发条件 = 真出现两抽屉可同开 → 改引用计数锁**。 |

### 2.3 其余批 F 交付物（Fc2–Fc6 文件级核实）

| 交付 | 状态 | 依据 |
|---|:--:|---|
| Fc2 抽屉锁 | ✅ | `ContentSidebar.vue:298-310`（lockOwned） |
| Fc3 断点 | ✅ | 见 §2.2-1 |
| Fc4 schema 5 处 | ✅ | 见 §2.2-3（validator / schema / d.ts） |
| Fc6 志愿填报 + 外链 | ✅ | `src/utils/openExternal.js`、`src/views/GuideView.vue`、`src/content/guide/01-志愿填报.js`、`router/index.js:73-75`（`/guide`）、`HomeView.vue` 入口；`tests/csp-guard.test.js:197` `HOST_ALLOWLIST = Set(['www.zjzs.net'])`（带理由注释 `:193`），`isContentPageFile` 边界**未改**（反向锚 `:250-256` 在） |
| Fc5 作品训练卡 | ✅ | `src/components/blocks/WorkCardBlock.vue`、`src/composables/useCountdown.js`、`blockTypes.js`/`registry.js`/`content.d.ts`（`workcard`）；三勾落 `page_progress.workcards[id]`（浏览态不写库） |
| DB 零升版 | ✅ | `studyDb.js:33` `DB_VERSION = 7`（未升） |

---

## 3. 最小可执行收尾卡（剩余项）

> **无「功能侧立即必做」项。** 下表为**剩余**事项，按处置归属分组；每项给「做什么 / 落点文件 / 验证方式 / 归属」。

### 3.1 等待内容侧（1 项，唯一实质遗留）

| 项 | 做什么 | 落点文件（实测，19 块 / 9 文件） | 验证方式 | 归属 |
|---|---|---|---|:--:|
| **C-1** `formulas`/`lines` 内容迁移 | 把 **19 个 `formula` 块**的 `lines:` 键改为 `formulas:`（**按块结构改，禁盲正则**——文本层另有 1 处 `lines:` 不在 formula 块上） | ① `src/content/math/01-集合与逻辑/01-集合的概念与表示.js`（1 块）② `…/02-集合间的基本关系.js`（4）③ `…/03-集合的基本运算.js`（4）④ `…/04-充分条件与必要条件.js`（3）⑤ `…/05-命题与逻辑联结词.js`（2）⑥ `…/06-量词与命题否定.js`（2）⑦ `src/content/math/03-函数与基本初等函数/06-幂函数.js`（1）⑧ `src/content/math/07-平面向量/04-空间向量.js`（1）⑨ `src/content/math/11-平面解析几何/07-曲线与方程.js`（1） | `npm run validate:content` 绿；复扫 `formula` 块 `lines`-only = **0** | **内容侧** |

> **功能侧配套（下一批，非本收尾）**：待 C-1 完成 + 复扫 0 后，**删 validator 兼容分支**（`validateBlock.js:101-103` 的 `block.lines` 回退），收敛为单一字段名 `formulas`（§8 P-F09 增补③）。**本收尾不改**。

### 3.2 触发式登记（2 项，非缺陷，不动）

| 项 | 触发条件 | 触发后的落点 + 修法 | 验证方式 |
|---|---|---|---|
| **T-1** `MindMapBlock` 导航竞态 | **用户实测 / 崩溃日志复现 `querySelector of null`** | `src/components/blocks/MindMapBlock.vue`：在 `renderMindmap` 的 `await`（`:210`）**之后**补 `if (!container.value) return`（或卸载标志） | 新增 `tests/mindmap-unmount-race.test.js`（卸载后 await 结算不抛） |
| **T-2** 两抽屉 body 锁对称边角（R-1） | **真出现两抽屉可同开** | `src/components/ContentSidebar.vue` + `src/components/NotesPanel.vue`：单一 `overflow` 布尔锁 → **引用计数锁**（或 DOM 顺序防重叠） | 新增/扩 `tests/*body-lock*.test.js`（两抽屉真序交替开合） |

### 3.3 实机验证清单（2 项，用户侧；沙箱无 Tauri 运行时）

| 项 | 验证内容 | 依据 |
|---|---|---|
| **V-1** 外链实机点击 | 桌面 Tauri 点「浙江省教育考试院官方入口」→ **系统默认浏览器**打开 `zjzs.net`（非应用内 webview 弹窗） | §8 P-F01 增补③ + §8 实施纪律 |
| **V-2** 三勾跨会话回看 | 作品训练卡勾选①②③ → 刷新/重进页面 → 勾选态由 `page_progress.workcards[id]` **读回** | §8 P-F05 + §8 实施纪律 |

---

## 4. 收尾判定

| 判定 | 依据 |
|---|---|
| **批 F 功能侧可标 ✅** | Fc1 吸收归档；F-3 第 1–4 项完成、第 5/6 项按拍板只登记；DB 零升版；两轮 QA 0 缺陷 |
| **批 F 全绿（含内容侧）** | 待 **C-1** 内容迁移完成 + 复扫 0（此后下一批删 validator 兼容分支） |
| **无功能侧遗留缺陷** | T-1/T-2 为触发式登记（非缺陷）；V-1/V-2 为实机验证（非代码） |

> 本文件为功能实现侧的技术核实，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。
