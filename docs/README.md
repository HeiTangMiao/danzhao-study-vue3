# 文档地图（docs index）

> 这份文件解决一个问题：**新来的人（或 agent）不知道该读哪一份。**
> 用法：**先看第一节找到你的角色，再跳到对应入口**——不要从头翻目录。
>
> 📌 **2026-10-18 清理后**：`docs/` 主浏览面从 **39 份 md 精简到 13 份**。已完工的批次任务卡、
> 已定稿方案与过时组件清单共 40 份移入 `archive/2026-10/`（**只搬不删**）。找历史批次材料请直接去
> `archive/2026-10/README.md`。

---

## 一、按角色找入口

| 你是… | 先读这一份 | 再读 |
|---|---|---|
| **写内容的老师 / 教育专家团** | `content-authoring-guide.md` | `layout-primitives-guide.md`（想用高级排版时） |
| **改渲染层 / 区块组件的人** | `system_design.md` | `layout-primitives-guide.md`（组件事实一律以**源码**为准） |
| **接批次任务的人 / agent** | `proposals/implementation-roadmap.md` | 已完工批次的任务卡在 `archive/2026-10/batches/`；**在办批次**看 `proposals/batch-p5-precheck.md` |
| **想搞清「这个需求哪来的」** | `功能与布局改进需求_内容侧提出.md` | `proposals/implementation-roadmap.md`（编排） |
| **做移动端 / 交互 / 动效** | `prd-mobile.md` | `system_design.md` 的视觉与交互章节 |
| **查历史决策「当初为什么这么定」** | `../协同交流/大事记.md` | `archive/README.md`（已失效文档的索引） |
| **做内容扩展（远程内容层）** | `remote-assets.md`、`远程内容链路验证清单.md` | 已完工的 S1–S5 设计依据在 `archive/2026-10/batches/`、`archive/2026-10/plans/content-extension-dual-track.md` |
| **要真机验证远程内容链路** | `远程内容链路验证清单.md` | `archive/2026-10/batches/batch-s2-workcard.md`（裁定与口径） |
| **写作品训练卡（workcard）内容** | `教学方案_作品训练卡三遍法_PS-PR.md` | `content-authoring-guide.md`（通用内容规范） |
| **发布 / 上线内容** | `content-release-runbook.md` | `远程内容链路验证清单.md` |

---

## 二、权威源（文档之间冲突时，以谁为准）

**这一节很重要——项目里有多处「注解 vs 源头」的关系，冲突时一律以源头为准。**

| 事实类型 | 唯一真相源 | 注解性文档（可能滞后） |
|---|---|---|
| 内容字段的**形状与取值域** | `schema/content-schema.json` | `content-authoring-guide.md`、`layout-primitives-guide.md` |
| **系统架构与任务清单** | `system_design.md` | 本文档 |
| **组件清单与区块实现** | **源码本身**（`src/components/blocks/`） | ~~`COMPONENTS.md`~~（已过时，2026-10-18 归档至 `archive/2026-10/audit/`） |
| **批次排期与硬约束** | `proposals/implementation-roadmap.md` | 本文档 |
| **内容侧往来与决策** | `../协同交流/大事记.md` | `../协同交流/README.md` |
| **CSP 护栏的可执行口径** | `tests/csp-guard.test.js` + `tests/helpers/csp-lock.js` | `archive/2026-10/plans/csp-guard-plan.md`（设计依据，**已落地**） |
| **代码事实（行号、函数签名）** | 源码本身 | 任何文档（行号会漂移） |

> ⚠️ **关于行号**：所有任务卡里的「第 N 行」都是**写作当时实测**的。代码一改就漂。引用前先用 Python/编辑器确认，别当作永久事实（本项目已多次因此踩坑）。

---

## 三、全部文档清单

### 现行（✅）—— 共 13 份

**`docs/` 顶层（11 份）**

| 文档 | 行数 | 说明 |
|---|--:|---|
| `content-authoring-guide.md` | 2198 | **内容作者的唯一入口**：写作教程（五分钟上手 / 页面构成 / 四范例 / 写作技巧）+ 22 种区块的字段参考手册 |
| `system_design.md` | 1009 | **系统设计主文档**：架构、视觉规范、§10 任务总表、§13 CSP 护栏处置结论 |
| `prd-mobile.md` | 1023 | 移动端产品需求：交互约定、动效分级、性能预算、与复习 Tab 的数据流 |
| `远程内容链路验证清单.md` | 322 | 远程内容链路的**真机验证清单**（⚠️ 被测试 `readFileSync` 读取，**禁止移动**） |
| `remote-assets.md` | 277 | 远程素材（图片/资源）的命名、放置与引用约定（⚠️ 被测试读取，**禁止移动**） |
| `layout-primitives-guide.md` | 263 | 布局原语（hero / bleed / rail / grid / columns / split / group）的作者说明——什么时候用哪个、props 怎么填（⚠️ 被测试读取，**禁止移动**） |
| `功能与布局改进需求_内容侧提出.md` | 212 | 内容侧提出的 17 项需求**原文**（需求编号 P0-1…P2-17 的权威出处） |
| `project-assessment-2026-10-17.md` | 163 | 项目评估（2026-10-17） |
| `content-release-runbook.md` | 159 | 内容发布流程 runbook（⚠️ 被测试读取，**禁止移动**） |
| `教学方案_作品训练卡三遍法_PS-PR.md` | 151 | workcard（作品训练卡）三遍法的教学方案 |
| `README.md` | 120 | 本文档——文档地图 |

**`docs/proposals/`（2 份，均为活跃文档）**

| 文档 | 行数 | 说明 |
|---|--:|---|
| `proposals/implementation-roadmap.md` | 390 | **实施路线图**：批次编排、硬约束 H1–H7、**进度看板**、待拍板点（⚠️ 被测试读取，**禁止移动**） |
| `proposals/batch-p5-precheck.md` | 241 | 批 **P5**（唯一未完工批次）的预检方案 —— **仍在推进，不归档** |

### 已归档（📦）—— 共 44 份，`docs/archive/`

**`archive/` 根（4 份，2026-10-10 归档）**

| 文档 | 说明 |
|---|---|
| `archive/CONTENT-REFACTOR-HANDOFF.md` | 内容系统重构交接（阶段 0–7.4 已完成，零引用） |
| `archive/architecture-audit.md` | 架构审计报告，发现项已逐条处置完毕 |
| `archive/csp-eval-fix-review.md` | 几何画板 CSP 缺陷的方案选型记录，方案已实施 |
| `archive/README.md` | 归档区索引（判据 + 逐份「为什么归档」） |

**`archive/2026-10/`（40 份，2026-10-18 归档）** —— 详见 **`archive/2026-10/README.md`**

| 子目录 | 份数 | 内容 |
|---|--:|---|
| `archive/2026-10/batches/` | 33 | 已完工批次 A / B / C / D / E / F / F0 / S1 / S2 / S4 / S5 的任务卡、QA 报告与配套 mermaid |
| `archive/2026-10/plans/` | 6 | `content-extension-dual-track.md`（+2 图）、`desktop-ux-discussion.md` / `-round2.md`、`csp-guard-plan.md` |
| `archive/2026-10/audit/` | 1 | `COMPONENTS.md`（过时组件清单，零引用） |

> 批次任务卡每份都配两张图：`同名前缀.class.mermaid`（结构）与 `.sequence.mermaid`（调用流）。

**归档判据与例外规则**见 `archive/README.md`；2026-10 这一批的判据与逐份清单见 `archive/2026-10/README.md`。

---

## 四、文档纪律（新增文档时遵守）

1. **放哪**：新方案文档一律放 `docs/proposals/`；批次任务卡命名为 `batch-?-tasks.md`，并配 `batch-?.class.mermaid` / `batch-?.sequence.mermaid`
2. **状态标记**：本索引的表格里必须登记（✅ 现行 / 📦 已归档）——**没登记等于不存在**
3. **归档规则**（2026-10-18 修订）：搬「**工作已完成**」的文档；引用要分两类看——
   - **可执行引用**（代码 `readFileSync`、测试断言、CI 脚本）→ **不搬**，或搬的同时把引用路径同步改对（如 `batch-s4-tasks.md`）
   - **散文式提及**（注释里写「见某某文档 §N」）→ 可以搬，语义仍成立
   - ⚠️ 本项目两次教训（`COMPONENTS.md`、`csp-guard-plan.md`）都是**把散文式提及误判成硬引用**、从而不敢搬。**搬运前请用 Grep/Python 实测引用是否真的可执行**——`grep` 在此沙箱不可靠，会漏命中
4. **只搬不删**：一律用 `git mv`，保证 `git log --follow` 可查完整历史
5. **写行号要留痕**：任务卡里引用代码行号时，标注「实测于 HEAD=xxxxxxx」——行号必然漂移，读者需要知道基准点
6. **不要另起一份平行文档**：同一主题优先就地更新既有文档（避免出现两份"看起来都对"的说明）

---

## 五、本仓库之外的文档

| 位置 | 内容 |
|---|---|
| `../协同交流/` | **双团队协同区**：`大事记.md`（决策时间线，权威）、`README.md`（入口说明）、`archive/2026-10/`（2026-10-09~15 的 53 份往来件，2026-10-18 归档） |
| `../*.md`（工作区根） | 教育/培训/评估方案、浙江省资料汇编等——**面向教学方案**，与软件实现无直接关系 |
| 仓库根 `CLAUDE.md` | 给 AI agent 的工作约定（硬约束、命令、纪律） |
| 仓库根 `MIGRATION-README.md` | 历史迁移说明（部分写法已废弃，见 `README.md` 的说明） |
