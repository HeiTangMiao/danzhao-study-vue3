# 批 E 独立 QA 验证报告

> 角色：QA（严过关）｜仓库 `danzhao-study-vue3`｜基线 HEAD `d486b8a`（工作树干净）
> 轮次：Round 1（本轮**无独立 QA 前置**，工程师中途被配额打断，E-3 由 team-lead 接手提交）
> 方法：**独立证伪** —— 不复跑既有用例当结论；自写新用例攻击 + 对 E-0 做**变异测试**。
> 纪律：仅新增 `tests/**` 与本文报告；未改任何 `src/` 生产代码；未 commit/push；变异改动全部精确还原。

## 0. 结论速览

| 攻击点 | 判定 | 新用例 | 要点 |
|---|---|:--:|---|
| E-0 CSP 护栏 | **验证成立**（含 3/3 变异全命中） | 14 | 三层复发全被真实护栏拦下；独立实现对照一致 |
| E-1 自评三档 H3 + 权重 | **验证成立** | 9 | 混合会话二分不污染；减半只在聚合层；3 路径齐 |
| E-3 分科同源 + 真实计数 | **验证成立** | 10 | Σ分科==全局 恒等；番茄数解耦；旧行兜底 |
| E-4 搜索覆盖题干 | **验证成立**（1 项风险） | 8 | 题干全覆盖；标题不退化；体积贴近预算 |
| 全量关口 | **通过** | — | 652 用例绿 + lint 0 + validate:content 绿 |

新增测试文件（4 个，共 **41** 个用例，全部通过）：
- `tests/batch-e-verify-csp.test.js`（14）
- `tests/batch-e-verify-practice.test.js`（9）
- `tests/batch-e-verify-pomodoro.test.js`（10）
- `tests/batch-e-verify-search.test.js`（8）

---

## 1. E-0 CSP 防复发护栏 —— 变异测试（必做项）

**结论：验证成立。** 三层复发（devCsp 复原 eval / 代码注入外主机 / 运行时拼接 import）**全部被真实护栏拦下**，还原后护栏复绿。

**方法与证据**（harness：`/tmp/qa-mutate-csp.py`，每次变异→跑**真实** `tests/csp-guard.test.js`→精确还原→校验 md5）：

| 变异 | 动作 | 真实护栏结果 | 命中层 |
|---|---|---|---|
| 基线 | 无 | `exit=0` `17 passed` | — |
| MUT-1 | `devCsp` 塞回 `'unsafe-eval'` | `exit=1` `2 failed` | L2 两条（「未登记」+「dev script-src 不得含 unsafe-eval」） |
| MUT-2 | 新建 `src/__qa_probe_evil_host.js` 含 `https://evil.example` | `exit=1` `1 failed` | L4（`src/__qa_probe_evil_host.js → evil.example`） |
| MUT-3 | 新建 `src/__qa_probe_dynamic_import.js` 含 `import(name)` | `exit=1` `1 failed` | L6（运行时拼接 import 违规） |
| 收尾 | 还原 | `exit=0` `17 passed` | — |

还原校验：`tauri.conf.json` md5 `1c8de7d03bd7bbf3ce81b7c0e246a5dc`（改动前==还原后）；两个 probe 文件 `os.path.exists` 均为 `False`；`git status` 事后干净。**无残留。**

**独立实现对照**（`tests/batch-e-verify-csp.test.js`，另一套 CSP 解析/遍历/判定实现，14 用例全绿）：
- 独立算出 `dev - prod` 能力差 **恰为预期 4 条**（`script-src 'unsafe-inline'` + 3 条 connect-src 本地源），无第 5 条；
- 独立全网扫描「字符串转代码」**0 命中**；`import()` 实参**0 违规**；
- 合成反向锚（`https://evil.example`、`import(n)`）均被独立实现命中。
- ⚠️ 我的独立实现初版把 `//` 行注释去注释写成非锚定 `//.*`，**误吃 `https://` 的 `//`** → 反向锚失败。已修正为锚定 `^[ \t]*//`。此坑正说明「去注释实现」本身是护栏的敏感面（既有护栏用了正确的锚定写法）。

**P-E1 边界核对**：
- `HOST_ALLOWLIST` / `EVAL_ALLOWLIST` **均为空集**（独立解析护栏源码确认）；`www.example.com` **未**出现在护栏文件里（`csp-guard.test.js`）——未采用「把示例主机记进白名单」的误导做法。
- 排除边界 = `src/content/{math,chinese,computer}/**`（`csp-guard.test.js:80-82`）。独立验证：`src/content/loadPage.js` / `searchIndex.js` 等真代码**仍在 L4 扫描范围内**（未被误伤）。
- 反向锚（护栏内 `:239-252`）证明「排除的只是数据目录，不是整类主机」。

**codemod 残留**：`scripts/codemod-initcode.mjs` 已删；**代码侧（src/ scripts/ package.json/ tests/）零引用**（`git grep` = none）。仅 **docs/** 仍有历史记述（`docs/csp-guard-plan.md:382`、`docs/archive/*`、本任务书 §7 P-E6）——属历史文档，非可执行路径，**低风险**。

**画板文件**：E-0 改动的 **21 个文件（20 画板 + GeometryBlock.vue）逐行核验，全部为注释内容**（含 Vue `<!-- -->` 块内散文），**零代码行改动**。

**分工边界**：`tests/jsxgraph-eval-guard.test.js` 14 用例通过（与全量同跑）。

> 观察（非缺陷）：L4 扫描根仅 `src/`，不覆盖 `scripts/`、`public/`。运行时用户可见的外部主机都在 `src/`，故范围合理；如后续有 `public/` 内的 HTML 加载外源，需另评估。

---

## 2. E-1 自评三档的 H3 红线 + 权重聚合

**结论：验证成立。**

**A. H3 二分在「混合会话」下不被污染**（novel：把自动判的三种入口与三档自评放进**同一会话**）：
构造 7 题（选择命中 / 选择错选 / 填空自动命中 / 自评 known / seen / unknown / **选择命中但被自评成 seen**）。
实测 `autoCount=4`、`autoCorrect=3`、`selfCount=3`、`selfKnown=1`、`selfSeen=1`，`autoCount+selfCount===answered`；且 `resultStats` **无** `accuracy/rate/percent/score/ratio/correctRate` 任一合并字段。
**边界锚**：自动判的题即使用户自评 `seen`，仍归「自动判」侧（`practice.js:551` 的 `picked!==null || autoMatched===true` 判据先行），H3 边界成立。

**B. 权重减半只在聚合层**（`composePaper.js:86` `w = selfTier==='seen' ? 0.5 : 1`）：
- **Top5 入选集合真的会变**（novel：6 组争 5 位）：`4×unknown(2.0) + 2×seen×3(各 1.5)` → Top5 = 四个 2.0 组 + **仅一个** 1.5 组；另一个 1.5 组被挤出。若无减半（按 1 计），两个 3 组都会入选——**证明显证减半改变排序/入选**。
- **单卡减半被地板抹平**（novel）：`weightedPick` 的 `Math.max(1,·)`（`composePaper.js:146`）使单卡 0.5 → 1。实测：`composePaper(seed=12345, weights={'math|01':0.5})` 与 `weights={}` 的抽题结果**逐题完全一致** → 单卡减半对抽取零影响，符合设计（作用点=聚合计数）。**与 §0.1a 口径一致。**

**C. seen 三路径齐全**：
- `redoErrors`（`practice.js:581-602`）：收 `seen` + 答错，**不收** `known` 与答对 → 断言重做题集合 == `{seen题, 答错题}`。
- 归因回写（`practice.js:382-383`）：`assess('seen')` 后 `pendingAttribution==={index:0}`；`setAttribution` 把 `reason/kp` 落到对应错题行。
- 去重升档（`studyDb.js:803-809`）：`seen→unknown` 升为 `unknown`；`unknown→seen` **不降级**；`wrongCount` 自增。

**D. 去重分支既有语义未被改动**：构造 `easeFactor=1.9 / interval=15 / repetitions=3 / legacyMastered=true / reviewed=true / lastReviewedAt=123456` 的旧行，再重复入本 → 实测 `legacyMastered=false`、`reviewed=false`、`repetitions=0`、`interval=0`、**`easeFactor` 仍 1.9**、`lastReviewedAt` 仍 123456。与 `51666dd` 的 diff（仅新增 `worse()` + `selfTier` 行，其余原样）**一致**。

**E. 校准率面板**：`selfCalibrationOf` 只做相对排序（`reviewCount>0` 行内 `repetitions>=1` 占比）；`DashboardView` 面板含「**相对比较**」且用「**不代表**得分预测」显式否定，无 `预计能得`/`预测分数`/`你预计` 等承诺表述。

> 边界（**有意不一致，非缺陷**）：`ExamBlock` 自评为布尔对/错，**未**三档化（`batch-e-tasks §4.14 / P-E3`）。已核对确为有意分离，未当缺陷处理。

---

## 3. E-3 分科同源 + 真实计数

**结论：验证成立。**

**A. Σ`studyMinutesBySubject` == `studyMinutes` 同源不变量**：
- 交错误操作（`recordStudyMinutes math` → `recordAnswered` → `bumpPomodoroCount` → `recordStudyMinutes computer` → `updateDailyStat filesVisited` → `recordStudyMinutes other`）后实测 `studyMinutes=65`、`{math:25,chinese:0,computer:25,other:15}`，**Σ分科==全局**恒等。
- **主动证伪**（关键）：直接调 `updateDailyStat({studyMinutes:40})`（**不配对** bySubject）→ Σ分科=0 ≠ 40，**等式被破坏**。这说明等式**依赖调用方配对**，而非数据层强制。
- 进而核对：生产侧 `studyMinutes` 的**唯一增量写入点**是 `usePomodoro.recordStudyMinutes`（`usePomodoro.js:198-205`），它**恒**同时传 `studyMinutes` 与 `studyMinutesBySubject`；`studyDb.updateDailyStat`（`:643-663`）在同一份 `stat` 上一次 `saveDailyStat` 完成两者累加（`:651` 注释声明的唯一保证点）。**全库扫描（Python）确认无第二条会破坏等式的写入路径**：`updateDailyStat` 的其余调用只带 `questionsAnswered` / `filesVisited` / `pomodoroCount`，均不碰 `studyMinutes`；`saveDailyStat` 在生产侧仅被 `updateDailyStat` 调用。**等式成立、无隐性破坏者。**

**B. 番茄数解耦与真实计数**：`recordStudyMinutes` / `recordAnswered` **不**改 `pomodoroCount`；仅 `bumpPomodoroCount` 递增（两次 → 2）。`loadTodaySessions` 读 `pomodoroCount`：`studyMinutes=500` 但真实值 1 ≠ `Math.floor(500/25)=20`。

**C. focus 真实完成 +1、skip 不计**（计时链路）：两次 focus 自然完成 → `pomodoroCount=2 / studyMinutes=50 / math=50`；skip → 均不变。

**D. 旧行/部分字段兜底**：完全旧行（无新字段）→ 补齐零结构不崩；**部分字段**（仅 `{math:20}`）→ 与零结构合并为 `{math:20,chinese:0,computer:0,other:0}`。

**E. PlanView 分科**：逐科展示 `数学 1.0 / 目标 …`、`语文 0.5 / …`；`待 P1-12` / `分科耗时待` **均已清除**。科目取值域单一来源 `SUBJECTS=['math','chinese','computer','other']`。

**F. 全库无 `studyMinutes/25` 反推残留**（Python 扫描）：仅出现在注释与测试文案（说明「已弃用」），**无活跃代码**。

> 观察（低风险，非本批缺陷）：`studyDb.js:113-131` 的 **v4→v5 迁移**会重写 `daily_stats` 行、**只保留** `date/filesVisited/questionsAnswered/studyMinutes`。该分支仅在 `oldVersion<5` 触发；批 E 的行内新字段（v7 零升版）对 v7 用户永不经过此路径，且旧用户从未拥有这些字段 → **当前无数据丢失**。仅登记为「未来若在 <5 迁移段内新增字段会被丢弃」的潜在耦合点。

---

## 4. E-4 搜索覆盖题库题干

**结论：验证成立（1 项需关注风险）。**

**A. 构建顺序（P-E5）**：`package.json` 已新增 `build:search`，`build:index = npm run build:practice && npm run build:search`，`prebuild` / `prebuild:tauri` 均走 `build:index` → **题库产物先于搜索索引**，规划期「补充 6」的无序问题已修复（独立解析 `package.json` 断言通过）。

**B. 题干覆盖完整性**（读真实产物）：对三学科，用 `groupBankQuestions`（复用构建期同一 `clean`，H7）取每条清洗后题干，**逐条**断言其出现在对应页正文的题干段（`【题目】` 之后）。**全部命中，0 缺失**。基线：题库 **2357** 题（math 1073 / chinese 530 / computer 754），可判分 1482。

**C. 检索行为**：题干专属 CJK 子串命中来源页且 `matchedQuestion===true`；**标题级命中不退化**（`search-meta.json` 层命中）；`【题目】` marker 本身**不可检索**（不产生噪音命中）。

**D. 体积闸门与实测增量**：

| 指标 | 实测 |
|---|---|
| `search-body/*` 合计（序列化字节） | **1,640,854 B（1602.4 KB）** |
| 预算 `BODY_BUDGET_BYTES` | 1,677,721.6 B（1.6 MB） |
| **剩余余量** | **36,868 B（≈36 KB / 2.2%）** |
| 题干贡献增量 | **+216 KB / +15.5%**（含题干页 175 页） |
| 静默截断（长度达 `BODY_LIMIT=18000`） | **0 页** |

**E. 无静默截断**：无页面长度达 `BODY_LIMIT`。

> ⚠️ **风险（最不确定项）**：体积**已贴近预算**——余量仅 ~36 KB。规划书 §E-4 的预算是按 **2102 题（+9%）** 推的；题库已增至 **2357+**，实际增量 **+15.5%**。内容侧仍在持续补题（内容侧并行工作中）。**建议**：向内容/架构侧提示——要么上调 `BODY_BUDGET_BYTES`，要么为题干入索引设分科上限；否则下一次内容批补题后 `build:search` 会触发 `console.warn` 超限点名（这是**设计内的告警**，非崩溃），且本报告的体积闸门用例将转红提示。

---

## 5. 全量关口（收尾必跑）

| 关卡 | 命令 | 结果 |
|---|---|---|
| Node | `node --version` | **v22.22.2**（`/Users/.../node/versions/22.22.2-6/bin/node`）✅ |
| 全量测试 | `vitest run --pool=threads --maxWorkers=1` | **59 文件 / 652 用例 全绿**（基线 611 + 本 QA 新增 41）✅ |
| Lint | `npm run lint`（`--max-warnings 0`） | **0 error / 0 warning** ✅ |
| 内容校验 | `npm run validate:content` | **182 内容文件 + 3 站点配置 全通过** ✅ |
| DB 版本 | `grep DB_VERSION src/stores/studyDb.js` | **v7**（未升版）✅ |
| schema 未动 | 5 个实施 commit 的改动文件名扫描 | **无 `schema/content-schema.json`**（`grep -i schema` = none）✅ |
| E-0 分工边界 | `vitest run tests/jsxgraph-eval-guard.test.js` | 14 通过 ✅ |

---

## 6. 发现的缺陷 / 已知问题

**无功能缺陷（0 bug）**。本批四张任务卡的实现均通过独立证伪。以下为**风险登记**（非缺陷）：

| # | 级别 | 事项 | 建议 |
|:-:|:-:|---|---|
| R1 | **中** | E-4 `search-body` 体积贴近预算（余量 ~36 KB / 2.2%），题干实际增量 +15.5% > 规划 +9% | 上调预算或设分科上限；内容侧继续补题前先评估 |
| R2 | 低 | 代码侧零 `codemod-initcode` 引用，但 **docs/** 仍有历史记述 | 可接受（历史文档）；如需洁癖可由文档侧清理 |
| R3 | 低 | `studyDb.js:113-131` 的 v4→v5 迁移重写行时只保留旧四字段 | 当前无影响；未来在 <5 迁移段新增字段需同步 |
| R4 | 低 | L4 CSP 扫描根仅 `src/` | 当前合理；`public/` 内若有外源加载需另评估 |

## 7. 我的独立复核中最不确定的一处

**R1（E-4 体积余量）** 是我最没把握的地方：闸门用例当前**通过**，但只剩 ~2.2% 余量，且题库处于**增长通道**。这不是「现在错了」，而是「很快就会由绿转红」——需要产品/架构侧对预算做一次有意决策，而非等它在 CI 上被动告警。

---

*本报告为功能实现侧的技术验证，不构成对考试成绩或录取结果的承诺。*
