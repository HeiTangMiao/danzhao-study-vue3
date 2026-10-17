# 批 F0 追加小项 F0c5：例题解析入库可达（题库导出 `solution` + 练习/复习流渲染）

> 状态：**规格定稿（待实施）**；team-lead 2026-10-12 追加。
> 上游：内容侧 10-11 来件 §3 + 共享记忆登记（「22 道解析只在 `solution`、练习流不可达」）。
> team-lead 独立复核并**扩大扫描**后定案：采纳「导出入库」，不采纳「搬进 answer」（后者会造成浏览态重复展示，违背内容侧字段分工）。
> 行号基准：HEAD `b3d56a9`（实施时以实际读码为准）。

## 0. 已复核事实（team-lead）

- 全库 425 处 `solution` 全在 `example` 块（浏览态已渲染，见 F0-3）；**题库产物不导出 `solution`**（`public/practice-bank/*.json` 字段全集无它）。
- 练习/复习流只读产物：`PracticeSession.vue:87`、`PracticeResult.vue:96-97` 仅渲染 `answer`；`practice.js:364-370` 把 `` `练习解析：${q.answer}` `` 传进错题本 → 复习卡（`ReviewView.vue:69` 的解析位**本就存在**）也只拿到 answer。
- **影响面（非仅 22 道）**：答案短式（练习场景只看到「答案：X」）且解析只在 `solution` 的例题 = **51 道**（语文带选项 22〔=内容侧清单〕+ 数学无选项 27 + 语文无选项 2）；另 ~374 道 answer 自带解析、不受影响。
- `practiceBank.js:72` 原注释「`a`:『答案 + 解析』整段」与实际内容口径不符（例题把二者拆为 answer/solution 两字段）——本小项按「**分字段导出**」补齐该缺口。

## 1. 改动（四点）

1. **构建脚本** `scripts/build-practice-bank.mjs`（entry 构造段 ~:225-243）：`item.solution` 非空时增紧凑键 `x`（=solution 文本），与 `a` 同规——`capText(…, ANSWER_LIMIT)` 截断 + `truncated` 登记点名；无 solution 的条目（quiz/exam 天然为无）不写该键。
2. **形状定义** `src/content/practiceBank.js`：`BANK_ITEM_KEYS` 增 `x: 'explanation'`（注释说明来源）；`normalizeBankItem` 保证缺省 `explanation = ''`。
3. **练习流渲染**：
   - `src/views/practice/PracticeSession.vue`（~:87 答案卡）：在 `q.answer` 之下增 `<MathJaxRender v-if="q.explanation" :text="q.explanation" />`（轻量弱化样式；注释写「为什么」）。
   - `src/views/practice/PracticeResult.vue`（~:96-97）：同款，`item.explanation`。
4. **错题本解析**：`src/stores/practice.js:369` → `` `练习解析：${q.explanation || q.answer}` ``（有解析用解析、缺省行为不变）。`ExamBlock` / `ClozeBlock` 不动。

## 2. 测试

- `tests/practice-bank.test.js`：① `normalizeBankItem({ k:'x', x:'解：…' }).explanation === '解：…'`、缺省 `''`；② `collectBank()`（内存实时构建，读工作树内容）中的例题条目带 `x`。
- `tests/practice-store.test.js`：新增「条目带 `explanation` 时 `rec.explanation` 优先取解析（不再 `练习解析：答案`）」；既有 `练习解析：` 相关断言语义不变。
- 渲染两态（有/无 explanation）由 QA 复核。

## 3. 不做 / 注意

- **不动产物**：`public/practice-bank/*` 由内容侧下一轮重建自动带上 `x`；缺失时运行时优雅降级（`explanation=''` → 渲染隐藏、错题本回落 answer——与旧行为一致）。
- 不做「answer ← solution 合并」（浏览态重复展示；违背字段分工）。
- 不碰 schema / `engine.js` / `QuizBlock.vue`（F0c3 在改该文件）。
- 关卡：`npx vitest run tests/practice-bank.test.js tests/practice-store.test.js tests/csp-guard.test.js --pool=threads --maxWorkers=1`（Node v22）+ `npm run lint`。
- commit：`feat(practice): 例题解析入库可达（F0c5：题库导出 solution + 练习/复习流渲染）`
