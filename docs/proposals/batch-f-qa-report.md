# 批 F 独立 QA 验证报告

> 角色：QA（严过关）｜仓库 `danzhao-study-vue3`
> 方法：**独立证伪** —— 不复跑既有用例当结论；自写对抗用例（换形状/反例/真序）+ 独立复扫（Python/Node，勿用 grep）。
> 纪律：仅新增 `tests/**` 与本文报告；未改任何 `src/`；未 commit/push；未触碰内容侧在制文件；跑完删除临时工作树。
> 环境：Node v22.22.2（`/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node`）；`vitest --pool=threads --maxWorkers=1`。

---

## Round 1（批 F）—— Fc2 抽屉锁 / Fc3 断点 / Fc4 schema

> 对象三笔：`9b20a70`（Fc2）/ `a7bb96e`（Fc3）/ `bb4b1d4`（Fc4）。
> ⚠️ 内容侧正在全库大改（~160 个 `src/content/**` + `public/practice-bank/*` 未提交在制）→ **全量关口在干净工作树**（`git worktree add --detach /tmp/qa-verify-batchF bb4b1d4`）执行，隔离在制污染。
> 主树中三笔涉及的所有 `src/**` 文件实测**均干净**（未被在制改动），故对抗探针在主树即可测到提交版本。

### 结论速览

| 攻点 | 判定 | 新用例 | 要点 |
|---|---|:--:|---|
| 1 Fc2 抽屉锁归属 | **成立**（1 处对称边角已记录） | 7 | 真序「先 NP 后 CS」不误清他人锁；自己锁关即清；卸载只清自己；反向锚（从未加锁不改写 body）通过 |
| 2 Fc3 断点 | **成立** | 9 | `min-width:1151`/`max-width:1150` 各 **0**；JS/CSS 同口径同值；带 `and` 两处未漏；与既有规范处一致 |
| 3 Fc4 schema 5 处 | **成立** | 33 | 5 项逐一反例命中；兼容期 lines-only（19 块）不误伤；diagram 新字段可选；table 修正只碰 3 行 |
| 4 数字复核 | **成立** | — | 18 CSS + 1 JS；改动 10 CSS + 1 JS；其余 8 处本已规范 |
| 全量关口 | **通过** | — | 干净树 **73 文件 / 841 通过 + 6 跳过**；validate:content 182 绿；block-registry 26 绿 |

新增测试（3 个文件，共 **49** 用例，全通过）：
- `tests/batch-f-verify-lock.test.js`（7）—— Fc2
- `tests/batch-f-verify-breakpoints.test.js`（9）—— Fc3
- `tests/batch-f-verify-schema.test.js`（33）—— Fc4

---

### 1. Fc2 抽屉滚动锁归属感知（`src/components/ContentSidebar.vue`）

**结论：验证成立。** 攻击点 ①–⑤ 全覆盖；另发现 1 处**对称边角**（见下 R-1）。

实现核对（`:299-311`）：`lockOwned` 布尔 + `watch(sheetOpen)`，仅当 `open && overflow!=='hidden'` 时才加锁并置 `lockOwned=true`；仅 `lockOwned` 为真时才在关闭/卸载清锁。

| 攻击点 | 用例证据 | 结果 |
|---|---|---|
| ① 他人持锁不被清（真序） | **真序**：mount NotesPanel(open:false)→setProps(open:true)（NP 持锁）→ mount ContentSidebar → openSheet→closeSheet → body 仍 `hidden`；cs.unmount 后仍 `hidden`；NP 关才 `''` | ✅ |
| ② 自己持锁关闭即清 | CS openSheet→`hidden`；closeSheet→`''` | ✅ |
| ③ 卸载只清自己的 | 自己持锁→unmount→`''`；他人持锁→unmount→仍 `hidden` | ✅ |
| ④ 反向锚（从未加锁不改写 body） | body=`'visible'` 哨兵 → 从未开抽屉 → closeSheets()/unmount 后仍 `'visible'` | ✅ |
| ④ 反向锚（他人锁下开→关→卸载） | 他人锁 `hidden` → CS openSheet（不夺锁）→ closeSheet → unmount → 仍 `hidden` | ✅ |
| ⑤ 与 UnitView 键盘守卫联动 | 静态：`onKeydown` 内 `document.body.style.overflow === 'hidden'` 守卫位于 `pagingGo(` 之前 return（`:534` 早于 `:536`） | ✅ |

> ⚠️ jsdom 未实现 `matchMedia`：NotesPanel 加锁以 `matchMedia(MOBILE_MQ).matches` 为前提，用例**显式 stub 为移动端命中**以走通真实加锁路径（不 stub 则 NotesPanel 永不加锁 → 假绿）。此为该环境的「假绿陷阱」，已规避。

### 2. Fc3 1150 断点统一化

**结论：验证成立。** 独立复扫（自写递归扫描器，非 grep）：

- **反例锚**：`src/**` 内 `min-width: 1151px` = **0 处**；`max-width: 1150px` = **0 处**；且无 `min-1149`/`max-1151` 错值。✅
- **断点族形状**：18 处 CSS 命中**全部**为 `max-width: 1149px` 或 `min-width: 1150px`。✅
- **JS/CSS 同口径**：`NotesPanel.vue:64` `MOBILE_MQ = '(max-width: 1149px)'`，与同文件 CSS 移动边界（`max-width: 1149px`）**同值**；桌面边界 `min-width: 1150px` = js+1。**不存在 1150 处 JS 判移动/CSS 判桌面的撕裂**。✅
- **带 `and` 的两处未漏改**：`ContentSidebar :776 max-width: 1149px and (orientation: landscape)` ✅；`UnitView :710 min-width: 1150px and (max-width: 1456px)` ✅。
- **与既有规范处一致**：`App.vue` / `AppTabBar.vue` 均 `max-width: 1149px` + `min-width: 1150px`。✅

### 3. Fc4 schema 口径 5 处收敛

**结论：验证成立。** 自造反例（不依赖工程师用例）：

| Item | 反例 → 期望 | 实测 |
|---|---|---|
| 1 formula 兼容期 | 仅 `lines`（无 formulas）→ 通过 | ✅（另：`formulas`-only 通过；二者皆无→报错；`lines`/`formulas` 末孤立反斜杠**仍拦**，兼容分支不漏语义） |
| 2 table | 缺 headers→报错；`headers` 非数组→报错；`rows` 非数组→报错；行宽≠表头（首/末行）→报行号 | ✅（合规表通过） |
| 3 solve 双向 | `quiz` 带 solve → 报「题目[0] 未知题型: solve」；`exam` 带 solve → **通过** | ✅（另：`exam` 带未知题型→报「模拟卷题目[0]…」；schema enum 独立核对：`quizItem` 不含 solve、`examItem` 含 solve） |
| 4 columns | `cols:4/1/0`→报「只支持 2/3」；`cols:2`+3 列 / `cols:3`+2 列→报不一致；缺 items→报错；`cols` 缺省→兼容不报 | ✅（`cols:2`+2、`cols:3`+3 通过；容器内子区块仍被递归校验） |
| 5 diagram | 仅 `boardId`（无几何字段）→ 通过；带 `boundingbox/height/fixed`→通过 | ✅ |

**兼容期红线（独立取证）**：干净树内容侧 `lines:` 块 = **19 处**（与团队口径一致）；validator 对 lines-only 返回 `[]`（不误伤未迁移内容）。✅

**diagram 新字段可选（独立取证）**：schema `diagram` 分支 `required === ['boardId']`（**未新增必填**）；真实内容抽检 **20 个 diagram 块**（其中仅 1 个含 `boundingbox`），**几何字段从不触发错误**，无几何字段的块全部通过。✅

**table 数据修正只碰 3 行（越权核查）**：`git show bb4b1d4 -- "src/content/math/06-数列/01-数列基础.js"` hunk = **6 变更行（3 删 3 增）= 恰好 3 行**；**不含**任何 `options:` 前缀改动 → **无内容侧越权**。✅

### 4. 独立数字复核（1150 断点）

| 口径 | 团队值 | 我的独立复核 | 一致 |
|---|---|---|---|
| 全站 1150 断点 | 18 CSS + 1 JS | 18 CSS（`@media`）+ 1 JS（`MOBILE_MQ`） | ✅ |
| 本次改动 | 10 CSS + 1 JS | `git show a7bb96e` 新增断点行 11 = 10 CSS + 1 JS | ✅ |
| 其余本已规范 | 8 处 | 18−10=8：App.vue×2、reader.css×3（:55/:321/:334）、AppTabBar×2、UnitView×1（:671） | ✅ |

---

### 全量关口（干净工作树 `/tmp/qa-verify-batchF @ bb4b1d4`）

| 关口 | 命令 | 结果 |
|---|---|---|
| 全量测试 | `npx vitest run --pool=threads --maxWorkers=1` | **73 文件 / 841 通过 + 6 跳过（847）**；无失败 ✅（期望 ≥70 文件 / 798 通过，实际超出） |
| 内容 Schema | `npm run validate:content` | 182 内容文件 + 3 站点配置，全部通过 ✅ |
| 区块注册表 | `npx vitest run tests/block-registry.test.js` | 26 通过 ✅ |
| lint（探针文件） | `eslint tests/batch-f-verify-*.test.js --max-warnings 0` | exit 0 ✅ |

> **6 跳过说明（非回归）**：`tests/batch-e-verify-search.test.js` 的 6 条依赖构建产物（`public/search-body/*.json`、`public/practice-bank/*`）——这些是 `.gitignore` 的未跟踪构建产物，干净工作树未构建 → `artifactsReady` 为假 → 跳过。属环境性，非代码缺陷。（在主树构建产物就绪时会实跑。）

---

### 新遗留风险

| # | 等级 | 项 | 说明 |
|---|---|---|---|
| R-1（批F） | **低（对称边角，可能不可达）** | Fc2 锁归属的对称方向 | 探针实测：**CS 先开（持锁）→ NP 后开（不夺锁）→ CS 关 → body 变 `''`**，此时 NP 仍开却失去背景滚动锁。这是「单一 body 锁 + lockOwned」模式的固有限制（NotesPanel 自身同款），**非本次引入**。真实可达性存疑：移动端从抽屉内开笔记的路径是「先关抽屉（`sheetOpen=false`）再 emit toggle-notes」，二者不重叠 → 该边角很可能不可达。**建议**：若未来两抽屉可同时开，改为「引用计数锁」或「DOM 顺序防重叠」；当前不阻断。 |
| R-2（批F） | 信息 | 干净树 6 跳过 | 见上，环境性；如需覆盖，干净树需先 `npm run build:index`。 |

**其余：0**。三笔均无功能性缺陷；Fc3/Fc4 数字与口径与团队一致；table 内容修正无越权。

---

_报告人：QA 严过关｜Round 1（批 F）｜基线 `bb4b1d4`（Fc2/Fc3/Fc4 末笔）｜方法：独立证伪 + 换形状对抗 + 反例_