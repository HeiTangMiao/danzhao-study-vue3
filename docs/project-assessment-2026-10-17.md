# danzhao-study-vue3 项目评估报告

> 评估日期：2026-10-17 ｜ 基线：`ab351dd`（tag v0.3.1，工作树干净）
> 方式：架构师技术体检 + QA 质量体检双线并行，**全程只读**（未修改源文件、未 commit；所有变异已还原，收尾 `git status` = 0 处改动）
> 纪律：每条结论回到源码核实，不采信文档描述（本项目文档漂移已被多次证实）

## 0 总体判断

项目**质量基线比预期好**：1406 个用例全绿、0 skipped，弱断言仅 3.1%，判分、SM-2、组卷、查重经变异验证是**真守卫**。

但存在 **1 个阻断性隐私缺陷**（换账号数据污染）、**1 个「没有任何自动化能拦住、只有上真机才暴露」的移动端失效模式**（`build.target` 缺失），以及 **11 道填空目前无法自动判对**（性质是内容标注错配，见 §3）。

**最薄弱的环节是同步链路**——架构线与 QA 线独立得出、相互印证：它既**没有用户维度隔离**，又**没有任何行为测试**（两处变异 100% 逃逸）。

---

## 1 风险总表（按严重度排序）

| # | 风险 | 等级 | 来源 | 关键证据 |
|---|---|---|---|---|
| 1 | 换账号/登出不清本地数据与同步游标 → **跨用户数据污染** | 高（阻断·隐私） | 架构 Top1 | `auth.js:88-101`；登出入口 `App.vue:114-118`、`ProfileView.vue:134-137`；`sync/engine.js:14/56-84`；`server/src/sync.js:15-16,54-62` |
| 2 | `src/sync/*` **零行为测试**（LWW/墓碑/游标全裸奔） | 高 | QA R1 | M1a/M1b 双变异后**全量 1406 例仍全绿** |
| 3 | `minSdkVersion=26` 但**无 `build.target`** → 老 WebView 白屏 | 高（移动端） | 架构 Top3 + 主理人复核 | `vite.config.js` 唯一的 target 是 `:65` dev proxy；`?.`/`??` **45 文件 212 处** |
| 4 | 同步**全量重推** + 服务端 N+1 + study_log 无保留策略 | 高 | 架构 Top2 | `sync/engine.js:56-84`；`server/src/sync.js:39-63`；`PULL_LIMIT=5000` 但无 drain 循环 |
| 5 | **11 道填空目前无法自动判对**（学员答对也判 miss） | 高（但**非代码缺陷**，见 §3） | QA R2 + 主理人复核 | `answerNorm.js:161`；164 道填空中 11 道 `extractCandidates()` 为空 |
| 6 | `correctIndex` 越界规则**无测试守卫** | 高 | QA | 变异 M6w：判据改 `if (false)` 后 16 文件 247 用例**仍全绿** |
| 7 | `validate:content` 放过 4 类判分缺陷；大量主观题无门禁 | 中高 | QA R4 | `check-single-choice.mjs:307` 的 `continue`；不在门禁内的条目两版口径为 **486 道（20.6%）/ 917 条（39%）**，需以脚本复核 |
| 8 | 查重脚本失效**无人知晓**（`check:dup` 无自检） | 中高 | QA R3 | M5：L1 分组键加唯一字段后查重器事实失效，仍 0 命中 / exit 0 / CI 绿 |
| 9 | 远程资产链：搜索/题库**无内置兜底** | 中高 | 架构 Top4 | `docs/remote-assets.md:20`、`:71-84`；`minVersion` 仅由内容层写入 |
| 10 | `release.yml` 门禁**弱于** `ci.yml`，且 release.yml 零测试引用 | 中 | QA R5 | 4 个 job 只跑 `validate:content` + `npm test`，不跑 lint/check:dup/check:single |
| 11 | 产物级用例 `skipIf` 静默蒸发 + `build:index` 步骤无守卫 | 中 | QA R4 | `batch-e-verify-search.test.js:47/73/113`；M8b 删掉该步骤后 18 例仍全绿 |
| 12 | `studyDb.js` god module（1056 行 / 55 方法） | 中 | 架构 Top5 | 12 个域分段塞在一个 Pinia store |

**改进项（不阻断）**：认证端点无限流（`server/src/auth.js:30/55/76`）；CORS 空表即放行（`server/src/app.js:26`，应改为空表=拒绝）；搜索正文预算已用 1602KB/2048KB，注释已写明触顶转设计；coverage 只 include 2 文件且 CI 从不跑（等于没有覆盖率门禁，建议启用或删掉免得误导）。

---

## 2 头号问题：同步链路（两线交叉印证）

### 2.1 跨用户数据污染（阻断性）

单设备单 IndexedDB（`study_game_db`）无用户维度隔离，登出只清 Pinia 里的 token/user，本地 7 个同步仓库与同步游标原样保留。

**后果**：用户 A 退出、用户 B 登录同一设备后 ——
1. A 的 error_book / notes / bookmarks / study_log / question_attempt **立即在本机对 B 可见**；
2. 首次同步时这批数据**全量以 B 的 user_id 推上服务端**，进而扩散到 B 的其它设备。

**修复**：登出或 `user.id` 变化时清两类东西 —— ① `localStorage['sync_meta_v1']`；② IndexedDB 的 7 个同步仓库；并把 meta key 改为 `sync_meta_v1:<userId>`。
⚠️ **清库前必须先跑一次同步或明确提示用户**，否则未上传的本机进度会丢失。

### 2.2 同步引擎零行为测试（变异 100% 逃逸）

`src/sync/engine.js`（128 行）承载 LWW 裁决、墓碑删除、游标推进，但全仓只有 2 处对它做**文本**断言，没有行为测试。QA 做了两组变异：

| 变异 | 后果 | 实跑 |
|---|---|---|
| `:91` 墓碑分支 → `if (false && ch.deleted)` | 远端删除不传播，已删数据复活 | **1406 全绿，RC=0** |
| `:97` `record.updatedAt = ch.updatedAt` → `new Date()` | LWW 失效，远端旧版本盖掉本地新版本 | **1406 全绿** |

**建议**：新建 `tests/sync-engine.test.js`，`vi.mock('@/sync/api')` + fake-indexeddb，钉 5 条：① `ch.deleted` → `removeSynced` 被调用 ② 远端 updatedAt 更旧 → 不落库 ③ 更旧但本地无记录 → 落库 ④ `runSync` 未登录短路 ⑤ 未知 entity 跳过。这 5 条可同时咬住上述两处变异。

---

## 3 ⚠️ 11 道填空无法判对 —— 但**不是代码缺陷**，别放宽守卫

**现状**：运行期按「填空」自动判分的 164 道中，**11 道 `extractCandidates()` 抽取为空** → `answerMatches` 恒 `matched:false` → **学员答对也判 miss**。构成为：

- 5 道 computer 命令序列填空（`03/6/2/0`–`03/6/2/4`，答案用 `→` 串多步）
- 4 道 math 解答型填空（`12/2/0/12`–`14`、`01/6/1/3`、`05/2/1/2`，答案是整段推导）
- 2 道开放题 / example

**根因（主理人已复核源码）**：`src/content/answerNorm.js:161`

```js
if (raw.includes('→') || /_{3,}/.test(raw)) return []
```

**⚠️ 但这行是有意设计，不是 bug。** 紧随其后的注释写得很清楚：复合答案（如「\(16\pi\)。由 \(V=…=8\) …」）若整串逐段抽取候选，**会把解析里的 8、9 当成候选答案 → 学员填错反而被判对**（该项目 §0.1 严禁）。这是「宁可判不出来，不可误判对」的取舍，属于**保护性守卫**。

**因此正确修法是改内容标注，不是放宽守卫**：

1. 把 11 道改标 `solve`（走自评）；或把命令序列答案改用 `；` 分隔并让 `extractCandidates` 支持多空序列。
2. **绝不能删掉这行守卫** —— 那会把更严重的「误判对」放进来。
3. 新增 `scripts/check-fill-gradable.mjs`（或在 `check:single` 加 A13 规则）：对 `isFillItem()` 为真但 `extractCandidates()` 为空的条目报错，CI 具名步骤卡 exit 1，防止同类错配再溜进内容。

---

## 4 移动端唯一「无自动化能拦」的风险（主理人已复核）

`src-tauri/tauri.conf.json` 设了 `bundle.android.minSdkVersion = 26`（Android 8.0），但 `vite.config.js` **没有 `build.target`**（全文唯一的 `target` 是第 65 行 dev proxy 地址）。

Vite 6.4.3 默认 `build.target` 为 `baseline-widely-available`（约 Chrome 107 基线），**不会把 `?.` / `??` 降级**。实际用量：

| 文件 | `?.`/`??` 次数 |
|---|---|
| `src/components/blocks/ExamBlock.vue` | 27 |
| `src/views/AdminView.vue` | 23 |
| `src/views/UnitView.vue` | 22 |
| `src/utils/validateBlock.js` | 21 |
| `src/components/blocks/QuizBlock.vue` | 11 |
| `src/utils/contentClient.js` | 10 |
| **合计** | **45 文件 / 212 处** |

Android 8 出厂 WebView 约 Chromium 58–70；国内无 Play Store 的设备上 WebView 常停留在 ROM 预装版本。`?.` / `??` 属语法级不支持 → **启动白屏，无任何降级路径**。架构师原报「8+ 文件」，复核后实际范围更大，且集中在**内容加载与考试答题主流程**。

**修复（二选一，成本极低）**：`vite.config.js` 显式设 `build.target`（推荐 `'es2019'` 或至少 `'chrome80'`），或将 `minSdkVersion` 抬到 28+/30+。定完后必须在低端机实测冷启动。

---

## 5 测试体系体检（QA 实跑 + 18 组变异）

| 项 | 数据 |
|---|---|
| 前端 vitest | 111 文件 / **1406 用例 / 全绿 / 0 skipped**，784s（jsdom 环境占 486s） |
| 后端 `node --test` | 3 文件 / 21 用例 / 全绿，11s |
| `validate:content` | 183 内容文件 + 3 站点，exit 0 |
| `check:dup` | 2363 题，L1/L2 命中 0，exit 0 |
| `check:single` | 1446 道（934 单选 + 512 判断），A 类 0，exit 0 |
| 断言密度 | 3216 `expect` / 1351 `it` ≈ 2.4 条/用例，弱断言 99 条（**3.1%**） |

**变异验证（改坏判据看会不会红）**：

| 判定 | 变异点 |
|---|---|
| ✅ **真守卫**（改坏必红） | 判分 `answerNorm:268`（7 例红）、`DEFAULT_NUMERIC_TOL`（2 例）、SM-2 间隔（6 例）、EF 下限（1 例）、`isDue`（8 例）、组卷 `composePaper:226`（1 例）、`validate:content` 元信息回写（exit 1）、查重器实跑（报 L1）、ci.yml 具名步骤（3 例红） |
| ❌ **逃逸 / 无人守** | 同步墓碑 M1a、同步 LWW M1b、`correctIndex` 越界 M6w、查重器自检 M5、ci.yml `build:index` 步骤 M8b |

**结论**：判分、SM-2、组卷、validate:content、check:single 都是真守卫；**同步引擎、correctIndex 越界、查重器自检、release 门禁是四处盲区**。

---

## 6 做得好的地方（不要动）

- **内容层纯度守得住**：197 个 .js 中 194 个纯数据文件零 import，仅 3 个系统模块已登记 `NON_PAGE_FILES`。
- **`check-single-choice.mjs` 自带 `--selftest`**：注入 12 条人造坏样本逐条验证规则会触发，还有 7 条反向锚防假阳性 —— 本项目质量最高的守卫，建议作为其它校验脚本的模板。
- **`answerNorm.js:161` 的严格守卫**（见 §3）：宁可判不出来也不误判对，方向正确，别为了「让 11 道题能判」而拆掉它。
- **CI quality job 9 步都有实体脚本、都会真的非零退出**，没有形同虚设的步骤。
- 组件直接 import store（18/64）是 Vue/Pinia 常规做法，不算耦合缺陷。
- `src/utils/validateBlock.js` 422 行不进浏览器包（src 内无运行时 import），不算运行时负担。
- `vi.mock` 卫生良好：17 个文件用 mock，唯一「mock 自身模块」的是 `importOriginal` + 调用转发的**间谍包装**（真实行为仍执行），不是橡皮图章。

---

## 7 建议修复顺序

1. **#1 换账号数据污染**（阻断性隐私，任何规模化前必修；注意清库前先同步）
2. **#3 `build.target`**（打 Android 包前必须定，改动极小、收益极大）
3. **#2 同步链路**（补 `tests/sync-engine.test.js`，5 条用例同时咬住 LWW 与墓碑）
4. **#5 11 道填空**（改标 `solve` + 加 `check-fill-gradable` 守卫；**不要动 `answerNorm.js:161`**）
5. **#6 `correctIndex` 越界补 3 个用例**（`-1` / `=== options.length` / 正常 `0`）
6. **#8 给 `check-duplicates.mjs` 加 `--selftest`**（照 `check-single-choice.mjs:218-288` 的形态）
7. **#10 release 门禁对齐 CI + #11 `skipIf` 改 fail**
8. **#12 `studyDb.js` 拆分** —— 随 1、3 一起做，**不要单独立项**
9. **#7 / #9** 主观题校验与远程链可观测性（补位性质，可排后）

---

## 8 评估过程备注

- **变异纪律**：评估期间工作树出现过变异残留（`sync/engine.js`、`validateBlock.js:75`、`composePaper.js`、`check-duplicates.mjs`、`practice-bank/math.json`、内容页、`ci.yml`）。**已全部 `git checkout` 还原，收尾 `git status` = 0 处改动，未做任何 commit。** 建议给团队定硬纪律：变异前后各跑一次 `git status`，收尾必须为空。
- **口径差异待复核**：`check:single` 未覆盖的条目数，QA 两版报告分别为 486 道（20.6%）与 917 条（39%），建议以脚本实际输出为准复核一次。
- 前端全量 784s，其中 `tests/s5-qa-artifacts.test.js` 单文件 123s（占 16%，子进程真跑 CLI），如需优化 CI 时长可优先处理。
- 本次评估为**只读**，唯一新增文件是本报告。
