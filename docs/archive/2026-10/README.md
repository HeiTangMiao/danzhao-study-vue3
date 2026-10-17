# 2026-10 归档区

> 本目录是 **2026-10-18 文档清理**的产物：把 `docs/proposals/` 里**已完工批次**的任务卡与配套图、
> 两份已定稿的设计方案、`csp-guard-plan.md`、以及 `docs/COMPONENTS.md` 整体搬到这里。
> **一律用 `git mv` 搬运，未删除任何文件**（`git log --follow <文件>` 可查完整历史）。

---

## 一、归档判据

同时满足以下两条才搬到这里：

1. **工作已完成** —— 批次任务卡对应的批次已交付（有 QA 报告或 closeout 佐证），方案类文档对应的决策已落地或已被后续方案取代。
2. **引用的失效风险可接受** —— 全仓**没有可执行路径**（代码 / 测试断言 / CI）依赖其路径；仅存的引用是散文式提及（如注释里写「batch-b-tasks §0.1」），移动后语义仍成立。

**不搬的三类**：

- 仍有硬引用的常设文档（`docs/content-release-runbook.md`、`docs/远程内容链路验证清单.md`、`docs/remote-assets.md`、`docs/layout-primitives-guide.md`）—— 被测试 `readFileSync` 实际读取
- 仍是活跃进度看板的 `docs/proposals/implementation-roadmap.md`
- 唯一未完工批次的 `docs/proposals/batch-p5-precheck.md`（P5 尚未完成，仍在推进）

---

## 二、为什么另起 `2026-10/` 一层，而不是直接放进 `archive/` 根目录

**`archive/` 根那 4 份与 `archive/2026-10/` 是两代归档，判据不同，因此并存而非合并**：

| | `archive/` 根（旧层级） | `archive/2026-10/`（本区） |
|---|---|---|
| 归档时间 | 2026-10-10 | 2026-10-18 |
| 归档对象 | **单份**失效文档（重构交接、架构审计报告、方案评审记录） | **成批次**搬移（33 份任务卡 + 6 份方案 + 1 份组件清单） |
| 判据侧重 | 「文档本身已失效」 | 「工作已完成 + 无硬引用」 |
| 组织方式 | 平铺，无子目录 | 按性质分 `batches/` `plans/` `audit/` 三类 |

保留旧层级不动的原因：**不要为了整齐而重排已归档的东西**。旧层级的 4 份文档已在
`archive/README.md` 里逐份登记了「归档日期 / 为什么归档 / 结论去哪了」，重排会让那份索引失效。
新层级用**时间段 + 性质**二维组织，是为了让「某一批清理到底动了什么」可一次性回看——
这在跨团队协作里比扁平结构更容易追责。

---

## 三、本区内容

### `batches/`（33 份）—— 已完工批次的任务卡与配套图

| 批次 | 文件 | 主题 |
|---|---|---|
| 批 A | `batch-a-tasks.md` | 判分与归因前哨 |
| 批 B | `batch-b-tasks.md` + `.class/.sequence.mermaid` | 填空规整判分 + cloze 输入默写 |
| 批 C | `batch-c-tasks.md` + `.class/.sequence.mermaid` | 复习闭环（复习器 + 卡点本） |
| 批 D | `batch-d-tasks.md` + `.class/.sequence.mermaid` | 限时仿真 / 学习计划 / kp 组卷 / 句级 strict |
| 批 E | `batch-e-tasks.md`、`batch-e-qa-report.md` + 两图 | CSP 护栏（P1-T5，并入 E-0） |
| 批 F | `batch-f-tasks.md`、`batch-f-qa-report.md`、`batch-f-closeout-tasks.md` + `.sequence.mermaid` | 志愿填报文案 / 作品训练卡 / lines 迁移 |
| 批 F0 | `batch-f0-tasks.md`、`batch-f0-qa-report.md`、`batch-f0-addendum.md` + `.sequence.mermaid` | 解析缩进 + 选项前缀清洗 |
| 批 S1 | `batch-s1-tasks.md`、`batch-s1-workcard.md` | 远程内容层骨架（contentManifest） |
| 批 S2 | `batch-s2-tasks.md`、`batch-s2-qa-report.md`、`batch-s2-workcard.md` | 远程内容链路真机验证 |
| 批 S4 | `batch-s4-tasks.md`、`batch-s4-qa-report.md` | 远端 hash 是否重算（A/B 对比，定论：不重算） |
| 批 S5 | `batch-s5-tasks.md`、`batch-s5-qa-report.md` + 两图 | 远程内容层收尾 |

> ⚠️ **唯一硬引用**：`batch-s4-tasks.md` 被 `src/content/mergeContent.js:37` 的注释与
> `tests/s4-verify-gate.test.js` 的断言**按路径**引用。搬运时两处已同步改为
> `docs/archive/2026-10/batches/batch-s4-tasks.md`（必须一字不差，否则测试红）。

### `plans/`（6 份）—— 已定稿或已落地的设计方案

| 文件 | 归档理由 |
|---|---|
| `content-extension-dual-track.md` + 两张 mermaid | 内容扩展双轨方案，**已定稿并实施完毕**（S1–S5 全部归档） |
| `desktop-ux-discussion.md` / `desktop-ux-discussion-round2.md` | 桌面端 UX 讨论记录，**决策已并入** `docs/system_design.md` |
| `csp-guard-plan.md` | CSP 五层护栏方案，**任务已于批 E·E-0 落地**（`tests/csp-guard.test.js` + `tests/helpers/csp-lock.js` 均已在盘） |

### `audit/`（1 份）

| 文件 | 归档理由 |
|---|---|
| `COMPONENTS.md` | 文件头作者自述「部分过时，以源码为准」。它声称被 `LayoutRenderer.vue` / `blocks/registry.js` / `validate-layout.test.js` 引用，**实测这 3 处引用已随组件删除消失**，全仓零代码 / 零测试 / 零 CI 引用 |

---

## 四、读这些文档时的两条警告

1. **不要照它开工** —— 文件路径、行号、数量统计大概率已漂移。
2. **结论以现行文档为准** —— 架构看 `docs/system_design.md`，内容写法看 `docs/content-authoring-guide.md`，
   批次进度看 `docs/proposals/implementation-roadmap.md`，决策时间线看 `../协同交流/大事记.md`。
