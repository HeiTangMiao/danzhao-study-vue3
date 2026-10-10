# 归档文档（archive）

> 这里的文档**已完成使命或已失效**，保留仅为追溯决策依据。**不要照它开工**——其中的文件路径、行号、数量统计大概率已经漂移。
>
> 判断一份文档该不该归档，看两条：① 它描述的工作是否已完成；② 是否还有活文档/代码引用它。**有引用的不归档**（否则会打断引用链）。

| 文档 | 归档日期 | 为什么归档 | 它的结论去哪了 |
|---|---|---|---|
| `CONTENT-REFACTOR-HANDOFF.md` | 2026-10-10 | **内容系统重构交接文档**（阶段 0–7.4，对应 v0.3.0，2026-09-23 定稿）。重构已完成、已发布，且全文**零引用**。文中「139 个内容文件」等统计已漂移到 179 | 架构与约定沉淀进了 `docs/system_design.md`；内容写法沉淀进了 `docs/content-authoring-guide.md` |
| `architecture-audit.md` | 2026-10-10 | **架构审计报告**（2026-10-07，基线 `338c119`）。**审计发现已逐条处置完毕**：死代码 `FormulaEditor.vue` / `EditorView.vue` / `serializePage.js` 均已删除（2026-10-10 实测确认） | 未了结项（如 CSP 护栏 P1-T5）已并入 `docs/system_design.md` §10 任务表 |
| `csp-eval-fix-review.md` | 2026-10-10 | **几何画板 CSP 缺陷的方案评审**（选型过程的记录）。**方案已实施**：最终走了「零 CSP 放宽」路线（构建期转换 initCode），生产 CSP 保持 `script-src 'self'` | 设计依据仍有效，被 `docs/csp-guard-plan.md` 继承（后者是防复发护栏方案） |

---

## 归档不等于删除

- 所有文件都还在仓库里（`git log --follow` 可查完整历史）
- 若某份归档文档里的**设计依据**仍被活文档引用，我们**不移动它**——例如 `csp-guard-plan.md` 虽然大部分已落地，但它被 `system_design.md` §13 与本文档引用，所以**留在原位**，只在文件头加状态标注
- 同理 `COMPONENTS.md` 被 `src/components/LayoutRenderer.vue` 等代码注释引用，**留在原位**
