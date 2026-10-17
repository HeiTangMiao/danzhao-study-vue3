# 归档文档（archive）

> 这里的文档**已完成使命或已失效**，保留仅为追溯决策依据。**不要照它开工**——其中的文件路径、行号、数量统计大概率已经漂移。
>
> 判断一份文档该不该归档，看两条：① 它描述的工作是否已完成；② 是否还有活文档/代码引用它。**有引用的不归档**（否则会打断引用链）。

| 文档 | 归档日期 | 为什么归档 | 它的结论去哪了 |
|---|---|---|---|
| `CONTENT-REFACTOR-HANDOFF.md` | 2026-10-10 | **内容系统重构交接文档**（阶段 0–7.4，对应 v0.3.0，2026-09-23 定稿）。重构已完成、已发布，且全文**零引用**。文中「139 个内容文件」等统计已漂移到 179 | 架构与约定沉淀进了 `docs/system_design.md`；内容写法沉淀进了 `docs/content-authoring-guide.md` |
| `architecture-audit.md` | 2026-10-10 | **架构审计报告**（2026-10-07，基线 `338c119`）。**审计发现已逐条处置完毕**：死代码 `FormulaEditor.vue` / `EditorView.vue` / `serializePage.js` 均已删除（2026-10-10 实测确认） | 未了结项（如 CSP 护栏 P1-T5）已并入 `docs/system_design.md` §10 任务表 |
| `csp-eval-fix-review.md` | 2026-10-10 | **几何画板 CSP 缺陷的方案评审**（选型过程的记录）。**方案已实施**：最终走了「零 CSP 放宽」路线（构建期转换 initCode），生产 CSP 保持 `script-src 'self'` | 设计依据仍有效，被 `csp-guard-plan.md` 继承（后者是防复发护栏方案，**已于 2026-10-18 归入 `2026-10/plans/`**） |

---

## 归档不等于删除

- 所有文件都还在仓库里（`git log --follow` 可查完整历史）
- 「有引用就不搬」指的是**可执行引用**（代码读取、测试断言、CI）。若引用只是散文式提及（注释里写「见某某文档 §N」），**搬运后语义仍成立**，可以搬 —— 2026-10-18 就是按这条把 `csp-guard-plan.md` 与 `COMPONENTS.md` 搬进 `2026-10/` 的（详见下节）

---

## 2026-10 归档区（`2026-10/`）

**2026-10-18 文档清理**：把 `docs/proposals/` 的已完工批次任务卡与配套图、两份已定稿方案、
`csp-guard-plan.md`、以及 `docs/COMPONENTS.md` 共 **40 份**整体搬入本目录。详见 **`2026-10/README.md`**（归档判据、与本文档旧层级并存的原因、逐份清单）。

| 子目录 | 份数 | 内容 |
|---|--:|---|
| `2026-10/batches/` | 33 | 已完工批次（A / B / C / D / E / F / F0 / S1 / S2 / S4 / S5）的任务卡、QA 报告与配套 mermaid |
| `2026-10/plans/` | 6 | `content-extension-dual-track.md`（+2 图）、`desktop-ux-discussion.md` / `-round2.md`、`csp-guard-plan.md` |
| `2026-10/audit/` | 1 | `COMPONENTS.md` |

**本轮归档纠正了两处此前「留在原位」的判断**：

- `csp-guard-plan.md` —— 此前因其被 `system_design.md` §13 引用而留在原位并加状态标注；**2026-10-18 实测 P1-T5 已于批 E·E-0 落地**（`tests/csp-guard.test.js` + `tests/helpers/csp-lock.js` 均在盘），且该引用是散文式提及而非可执行读取，故**归档**并把 3 处路径引用同步改指归档区。
- `COMPONENTS.md` —— 此前称其被 `src/components/LayoutRenderer.vue`、`src/components/blocks/registry.js`、`tests/validate-layout.test.js` 引用；**实测这 3 处引用已随组件删除消失**，全仓零代码 / 零测试 / 零 CI 引用，故**归档**（用户裁定：归档不删）。

**唯一需要处理的可执行引用**：`batch-s4-tasks.md` 被 `src/content/mergeContent.js` 的注释与
`tests/s4-verify-gate.test.js` 的断言**按路径**引用 —— 两处已同步改为
`docs/archive/2026-10/batches/batch-s4-tasks.md`（一字不差，否则测试红）。

**协同交流往来件同步归档**（不在 git 仓库内，位于工作区 `../协同交流/`）：53 份往来件移入
`../协同交流/archive/2026-10/`，**`README.md` 与 `大事记.md` 留在根目录不动**（后者被 `docs/README.md`
以相对路径 `../协同交流/大事记.md` 引用）。
