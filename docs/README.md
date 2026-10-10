# 文档地图（docs index）

> 这份文件解决一个问题：**新来的人（或 agent）不知道该读哪一份。**
> 用法：**先看第一节找到你的角色，再跳到对应入口**——不要从头翻目录。

---

## 一、按角色找入口

| 你是… | 先读这一份 | 再读 |
|---|---|---|
| **写内容的老师 / 教育专家团** | `content-authoring-guide.md` | `layout-primitives-guide.md`（想用高级排版时） |
| **改渲染层 / 区块组件的人** | `system_design.md` | `layout-primitives-guide.md`、`COMPONENTS.md`（⚠️ 部分过时，以源码为准） |
| **接批次任务的人 / agent** | `proposals/implementation-roadmap.md` | 对应的 `proposals/batch-?-tasks.md` |
| **想搞清「这个需求哪来的」** | `功能与布局改进需求_内容侧提出.md` | `proposals/implementation-roadmap.md`（编排） |
| **做移动端 / 交互 / 动效** | `prd-mobile.md` | `system_design.md` 的视觉与交互章节 |
| **查历史决策「当初为什么这么定」** | `../协同交流/大事记.md` | `archive/README.md`（已失效文档的索引） |
| **做内容扩展（远程内容层）** | `proposals/content-extension-dual-track.md` | 同上两份 mermaid |

---

## 二、权威源（文档之间冲突时，以谁为准）

**这一节很重要——项目里有多处「注解 vs 源头」的关系，冲突时一律以源头为准。**

| 事实类型 | 唯一真相源 | 注解性文档（可能滞后） |
|---|---|---|
| 内容字段的**形状与取值域** | `schema/content-schema.json` | `content-authoring-guide.md`、`layout-primitives-guide.md` |
| **系统架构与任务清单** | `system_design.md` | `COMPONENTS.md` |
| **批次排期与硬约束** | `proposals/implementation-roadmap.md` | 本文档 |
| **内容侧往来与决策** | `../协同交流/大事记.md` | `../协同交流/README.md` |
| **代码事实（行号、函数签名）** | 源码本身 | 任何文档（行号会漂移） |

> ⚠️ **关于行号**：所有任务卡里的「第 N 行」都是**写作当时实测**的。代码一改就漂。引用前先用 Python/编辑器确认，别当作永久事实（本项目已多次因此踩坑）。

---

## 三、全部文档清单

### 现行（✅）

| 文档 | 行数 | 说明 |
|---|--:|---|
| `content-authoring-guide.md` | 2112 | **内容作者的唯一入口**：写作教程（五分钟上手 / 页面构成 / 四范例 / 写作技巧）+ 22 种区块的字段参考手册 |
| `layout-primitives-guide.md` | 263 | 布局原语（hero / bleed / rail / grid / columns / split / group）的作者说明——什么时候用哪个、props 怎么填 |
| `prd-mobile.md` | 1023 | 移动端产品需求：交互约定、动效分级、性能预算、与复习 Tab 的数据流 |
| `system_design.md` | 1002 | **系统设计主文档**：架构、视觉规范、§10 任务总表、§13 CSP 护栏处置结论 |
| `功能与布局改进需求_内容侧提出.md` | 212 | 内容侧提出的 17 项需求**原文**（需求编号 P0-1…P2-17 的权威出处） |
| `proposals/implementation-roadmap.md` | 374 | **实施路线图**：批次编排、硬约束 H1–H7、**进度看板**、待拍板点 |
| `proposals/batch-a-tasks.md` | 612 | 批 A 任务卡（判分与归因前哨）✅ 已完成 |
| `proposals/batch-b-tasks.md` | 675 | 批 B 任务卡（填空规整判分 + cloze 输入默写）✅ 已完成 |
| `proposals/batch-c-tasks.md` | 941 | 批 C 任务卡（复习闭环：复习器 + 卡点本）✅ 已完成 |
| `proposals/batch-d-tasks.md` | 811 | 批 D 任务卡（限时仿真 / 学习计划 / kp 组卷 / 句级 strict）✅ 已完成 |
| `proposals/content-extension-dual-track.md` | 506 | 内容扩展双轨方案（内置基线 + 远程快照 S1–S5），**已定稿待实施** |
| `proposals/desktop-ux-discussion.md` / `-round2.md` | 159 / 215 | 桌面端 UX 讨论记录（历史决策依据） |

> 批次任务卡每份都配两张图：`同名前缀.class.mermaid`（结构）与 `.sequence.mermaid`（调用流）。

### 部分过时（⚠️）——保留原位，因为有引用

| 文档 | 状态 | 为什么要留 |
|---|---|---|
| `COMPONENTS.md` | ⚠️ 组件清单，**列了已删除的组件**（`FormulaEditor.vue` 等） | 被 `src/components/LayoutRenderer.vue`、`src/components/blocks/registry.js`、`tests/validate-layout.test.js` 的注释引用；挪动会打断引用链 |
| `csp-guard-plan.md` | ⚠️ CSP 防复发护栏方案 + 测试骨架，**任务未落地**（见 `system_design.md` §10 的 P1-T5） | 被 `system_design.md` §13 引用；方案本身仍有效，落地后再评估归档 |

### 已归档（📦）

| 文档 | 说明 |
|---|---|
| `archive/CONTENT-REFACTOR-HANDOFF.md` | 内容系统重构交接（阶段 0–7.4 已完成，零引用） |
| `archive/architecture-audit.md` | 架构审计报告，发现项已逐条处置完毕 |
| `archive/csp-eval-fix-review.md` | 几何画板 CSP 缺陷的方案选型记录，方案已实施 |

**归档判据与例外规则**见 `archive/README.md`。

---

## 四、文档纪律（新增文档时遵守）

1. **放哪**：新方案文档一律放 `docs/proposals/`；批次任务卡命名为 `batch-?-tasks.md`，并配 `batch-?.class.mermaid` / `batch-?.sequence.mermaid`
2. **状态标记**：本索引的表格里必须登记（✅ 现行 / ⚠️ 部分过时 / 📦 已归档）——**没登记等于不存在**
3. **归档规则**：只搬「**工作已完成** 且 **零引用**」的文档；**有引用的不搬**，改为在原地文件头加状态标注（本项目已有两次教训：`COMPONENTS.md` 与 `csp-guard-plan.md` 都属于这一类）
4. **写行号要留痕**：任务卡里引用代码行号时，标注「实测于 HEAD=xxxxxxx」——行号必然漂移，读者需要知道基准点
5. **不要另起一份平行文档**：同一主题优先就地更新既有文档（避免出现两份"看起来都对"的说明）

---

## 五、本仓库之外的文档

| 位置 | 内容 |
|---|---|
| `../协同交流/` | **双团队协同区**：`01_内容侧来件/`、`02_功能侧回函/`、`03_共同决策/`、`大事记.md`（决策时间线，权威） |
| `../*.md`（工作区根） | 教育/培训/评估方案、浙江省资料汇编等——**面向教学方案**，与软件实现无直接关系 |
| 仓库根 `CLAUDE.md` | 给 AI agent 的工作约定（硬约束、命令、纪律） |
| 仓库根 `MIGRATION-README.md` | 历史迁移说明（部分写法已废弃，见 `README.md` 的说明） |
