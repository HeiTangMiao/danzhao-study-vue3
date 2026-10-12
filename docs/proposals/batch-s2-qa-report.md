# 批 S2 独立 QA 验证报告（客户端加载层 + 缓存）

> 角色：QA（严过关）｜仓库 `danzhao-study-vue3`
> 基线 HEAD **`d8723cc`**（4 笔：`a965fd9` → `acac80f` → `399263c` → `d8723cc`；上游基线 `54300fa`）｜工作树干净
> 方法：**独立证伪** —— 自写对抗用例攻击（换形状/反例/变异），不复跑既有用例当结论；关键结论用 Python/Node 复核（**本环境 Bash `grep` 实测漏命中，已全部改用 Python，见 §附 1**）。
> 纪律：仅新增 `tests/**` 与本文报告；**未改 `src/`**；**未 push**；临时工作树跑完删除。
> 环境：Node **v22.22.2**；`vitest --pool=threads --maxWorkers=1`；独立 `git worktree /tmp/qa-s2 @ d8723cc`。

**性质**：本批动了 `loadPage.js` 运行时核心加载路径，是本项目风险最高的一批。

---

## 结论速览

| # | 攻击点 | 判定 | 新用例 | 要点 |
|---|---|---|:--:|---|
| ① | 版本闸门严格大于 | **成立** | 12 | 等值/更旧一律不写；首次允许；NaN 一律不写；**字典序陷阱**（`'9'` vs `'10'`）未退化成字符串比较 |
| ② | 单片失败不静默陈旧 | **成立**（附 1 处残留） | 5 | ★失败片在 meta 里**保留旧哈希**（非新哈希）；缓存仍是旧版可用内容；版本前进后必重拉 |
| ③ | B1 导航零改动 | **成立** | 3 | diff 13 文件，**不含**任何 `site.js` / `src/content/index.js`；`importPageModule` 模板字面量一字未动 |
| ④ | 内置兜底不受闸门（**变异验证**） | **成立** | —（变异） | 注入闸门后 **3/5 红且含行为锚**（非仅源码锚）→ 锚点咬得住；md5 精确还原 |
| ⑤ | 回退链五种失败场景 | **成立** | 8 | 五种场景全部回落内置且 **blocks 恒非空**；含**正对照**证明远程优先真的生效（排除假绿） |
| ⑥ | H1 零 import()/eval；L6 仍绿 | **成立** | 4（+3 关口） | 4 个新模块去注释后 0 处；`loadPage.js` 唯一 `import()` 是既有 glob（diff 未动）；csp-guard+studyDbV7+registry **46/46** |
| ⑦ | P-S16 基址派生 `.origin` | **成立** | 5 | `https://520305.top/api → https://520305.top/content-remote`；**显式反例**排除 `/api/content-remote`；端口保留 |
| ⑧ | P-S15 不迁移 | **成立** | 1 | `practiceBankClient.js` / `SearchPanel.vue` 均未在 diff 中 |
| ⑨ | 缓存不进同步；DB 仍 v7 | **成立** | 3 | ENTITIES 无 content_cache/meta；`DB_VERSION=7`；S2 diff **未新增建表、未改版本号** |
| ⑩ | P-S19 非 UPSERT 静默忽略 | **成立** | 5 | `append` 与未知 op 均静默忽略；整片全 append → 整片 null（回落内置） |
| ⑪ | **P-S11 进页零网络** | **成立** | 14 | ★缓存命中/未命中/哈希不符/IDB抛异常/拔网 —— **fetch 调用数恒为 0**；**拔掉网络仍出页面**；网络只在 `startBackgroundRefresh()`（fire-and-forget，同步返回 boolean）；含**变异验证**（注入 fetch → 7 条红） |
| A | 假绿排查（替身 vs 替身） | **无假绿** | 1 | `loadpage-remote-fallback.test.js` **零真实 `vi.mock`**（仅注释里出现），比对走真实内置；页模块替身只存在于 `loadpage-builtin-passthrough.test.js` |
| B | 测试卫生 | **干净** | 2 | 5 份新用例 0 `.only` / 0 `.skip` / 0 `todo`；`public/content-remote` 仅出现在**注释**，无读盘依赖 |
| C | P-S17a 哈希缺口注释如实 | **成立** | 1 | 注释写明「不重算 sha256」+ 能检出什么 + **检不出**什么 + 发布期兜底 |
| 全量 | 干净树关口 | **通过** | — | 基线态 **88 文件 / 1025+6（1031）/ 0 失败**（与工程师口径吻合）；合入我的 66 例后 **93 文件 / 1091+6（1097）/ 0 失败** |

新增测试 **5 文件 / 66 用例，全通过**（eslint `--max-warnings 0` = 0）：
- `tests/s2-verify-gate.test.js`（25）—— 攻点 ①⑦⑩ + 形态判定/裁决底座 + 清单闸门
- `tests/s2-verify-stale.test.js`（5）—— 攻点 ②
- `tests/s2-verify-fallback.test.js`（8）—— 攻点 ⑤
- `tests/s2-verify-boundaries.test.js`（14）—— 攻点 ③⑥⑧⑨ + A/B/C
- `tests/s2-verify-p-s11.test.js`（14）—— **攻点 ⑪**（补做，见 §10）

**智能路由判定：NoOne（无源码 Bug）。** 全部攻击点成立；§残留风险 2 条为观察项，非缺陷，不需工程师返工。

---

## 1. 攻点④ 变异验证（最优先，工程师自曝过误判，我自行复现）

目的：确认 `tests/loadpage-builtin-passthrough.test.js` 的锚点**真的咬得住**，而不是「源码字符串对上了就算过」。

| 步骤 | 操作 | 结果 |
|---|---|---|
| 基线 | `vitest run tests/loadpage-builtin-passthrough.test.js` | **5/5 绿** |
| 变异 | 把 `loadPage.js` 的 `hydratePage(mod.default, meta)` 改回 `hydratePage(pickPage(mod.default, null), meta)` | md5 `b8616efb…` → `81bc2aa3…` |
| 复跑 | 同上 | **3 红 / 2 绿** |
| 还原 | 反向替换 | md5 **回到 `b8616efb922063bd5a53c54395cb1d90`**；`git status` 仅剩 `node_modules` 软链；复跑 **5/5 绿** |

**变红的 3 条（关键：含行为锚，不只是源码锚）**：
1. `内置兜底 · 原样透传 > 畸形内置页仍按原样 hydrate，不被判不可用变空` ← **行为锚**
2. `源码锚 > 内置兜底是 hydratePage(mod.default, meta)，不加闸门`
3. `源码锚 > 不得把内置模块再喂给 pickPage`

> **判定**：锚点有效，**非假绿**。`d8723cc` 的纠正（内置路径原样透传、闸门只作用于远程）是真实生效的行为约束。

## 2. 攻点① 版本闸门（红线 3，严格大于）

`isNewer` 边界矩阵（`tests/s2-verify-gate.test.js`）：

| 输入 | 期望 | 实测 |
|---|---|---|
| `isNewer(5,5)` 等值 | 不写 | ✅ false |
| `isNewer(4,5)` 更旧 | 不写 | ✅ false |
| `isNewer(6,5)` 更新 | 写 | ✅ true |
| `isNewer(1,null/undefined)` 首次 | 允许 | ✅ true |
| `'abc'/NaN/Infinity/{}/[]/null/undefined` | 一律不写 | ✅ 全部 false（含「无本地记录」时也 false） |
| **`isNewer('9','10')`** | **false** | ✅ **字典序陷阱未退化** |
| `isNewer('10','9')` | true | ✅ |
| 本地记录为字符串 `'4'/'6'` | 按数值比 | ✅ |

> 我额外打了「字典序陷阱」这一形状：若实现退化为 `remoteVer > maxSeen` 的字符串比较，`'9' > '10'` 会为真 → **旧版被误判为新版并写库**。实测按 `Number()` 比较，安全。

## 3. 攻点② 单片失败不静默陈旧（本批最危险的一类）

用**另一套 fixture** 独立复现（v1 成功 → v2 时 `math/02` fetch reject）：

| 断言 | 期望 | 实测 |
|---|---|---|
| ★ `meta.units['math/02'].hash` | **仍是 v1 旧哈希**，不是新哈希 | ✅ `H('b')`，且 `not.toBe(H('b2'))` |
| `meta.units['math/01'].hash` | 前进为新哈希 | ✅ `H('a2')` |
| `meta.contentVersion` | 前进到 2 | ✅ 2 |
| 失败片缓存内容 | 仍是 v1 正文，**非空** | ✅ `[{type:'text',text:'v1-02'}]` |
| 版本前进到 v3 | 失败片**被重拉** | ✅ `r3.units === ['math/02']`，正文变为 `v3-02` |

> **结论**：「失败片被记成新哈希 → 从此永不重拉」这个致命缺陷**不存在**。见 §残留风险 R-1 记录一处边界。

## 4. 攻点⑤ 回退链（红线 2 · 永不变砖）

五种场景（`tests/s2-verify-fallback.test.js`），每种都断言「回落内置」且「blocks 非空」：

| 场景 | 结果 |
|---|---|
| 正对照：远程可用 | **优先用远程** ✅（证明远程路径真的接上，排除「全都回落」的假绿） |
| ① 远程不可用（无缓存） | 回落内置 ✅ |
| ② 哈希不符 | 丢弃该页 → 回落内置 ✅ |
| ③ `blocks` 非数组 | 回落内置 ✅ |
| ④ 块缺 `type` | 回落内置 ✅ |
| ⑤ IDB 抛异常 | 静默吞掉、不冒泡 → 回落内置 ✅ |
| ★ 汇总红线 | 五种场景下 `blocks.length > 0` **全部成立**（内置基准本身非空，断言非空转） ✅ |

> ⚠️ **踩坑记录**：`fake-indexeddb` 在**同一文件内跨用例持久**。初版「① 无缓存」用例实际读到了上一条用例注入的缓存 → 该例退化。已在 `beforeEach` 显式 `clearContentCache()` 修正。**这类污染会让用例静默失真，值得写进团队记忆。**

## 5. 攻点⑦ P-S16 基址派生（team-lead 强制修正）

| 输入 | 期望 | 实测 |
|---|---|---|
| 相对模式 | `./content-remote` | ✅ |
| `'https://520305.top/api'` 绝对 | `https://520305.top/content-remote` | ✅ |
| 同上，**显式反例** | `!== 'https://520305.top/api/content-remote'` 且不含 `/api/` | ✅（误拼会落 nginx 反代给 Fastify → 稳定 404） |
| `'http://localhost:3000/api'` | 端口保留 → `http://localhost:3000/content-remote` | ✅ |
| `'https://520305.top:8443/api/v2'` | `https://520305.top:8443/content-remote` | ✅ |
| 无路径 / 尾斜杠 / 多级路径 | 一律归到 origin | ✅ |
| 非法 URL | 走兜底**不抛** | ✅ |

## 6. 攻点③ ⑧ ⑨ —— 边界事实钉死（Python 复核）

`git diff --name-only 54300fa d8723cc` = **13 个文件**（4 个新模块 + loadPage/studyDb/App.vue/load-content.mjs + 5 份新测试）。

| 项 | 事实 |
|---|---|
| ③ 导航 | **不含** `src/content/site.js`、`src/content/index.js`、三学科 `site.js` 任一 ✅；`importPageModule` 模板 `@/content/${subject}/${folder}/${name}.js` **一字未动** ✅ |
| ⑧ 不迁移 | `src/utils/practiceBankClient.js` / `src/components/SearchPanel.vue` **均不在 diff** ✅ |
| ⑨ 同步 | `ENTITIES` = `study_log/daily_stats/page_progress/error_book/notes/bookmarks/question_attempt`，**无** content_cache/content_meta ✅；`DB_VERSION = 7` ✅；S2 对 `studyDb.js` 的 diff **未新增 `createObjectStore`、未改 `DB_VERSION`** ✅（两表是 S1 在 v7 预留的空表） |

## 7. 攻点⑥ H1 —— 零 import() / eval

去注释后扫描（Python，锚定行首的 `//` 以免误吃 `https://`）：

| 文件 | 结果 |
|---|---|
| `src/content/mergeContent.js` | 干净 ✅ |
| `src/utils/fetchJson.js` | 干净（仅 `fetch(` + `.json()`）✅ |
| `src/utils/contentClient.js` | 干净；**无硬编码主机**（基址一律由 apiBase 派生）✅ |
| `src/stores/content.js` | 干净 ✅ |
| `src/content/loadPage.js` | 唯一 `import()` 是既有 `importPageModule` 的 **glob**，且在 S2 diff 中为**上下文行（未改动）** ✅ |

**关口**：`csp-guard.test.js` + `studyDbV7.test.js` + `block-registry.test.js` = **46/46 通过** ✅

## 8. 攻点⑩ P-S19 非 UPSERT 静默忽略

| 输入 | 期望 | 实测 |
|---|---|---|
| 一页 `append` + 一页 `upsert` | 只保留 upsert | ✅ `pages` 只剩 upsert，且 `pageHashes` 同步只剩该页 |
| 整片全 `append` / 未知 op | 整片 → `null`（回落内置，不写空片） | ✅ |
| 未知 op 字符串 `'delete'` | 忽略，不崩 | ✅ |
| `fileIndex` 非数值 / 块缺 `type` / 哈希形态非法 | 逐页丢弃，不影响同片其它页 | ✅ |

## 9. 额外排查 A/B/C

**A · 假绿（替身 vs 替身）**：逐行区分「注释里的示例」与「真实代码行」后确认——
- `loadpage-remote-fallback.test.js`：**零真实 `vi.mock`**（`vi.mock('@/content/<某页>.js')` 只出现在文件头注释里）→ 它的「与内置模块逐块比对」「27 单元零回归」走的是**真实内置模块**，未退化 ✅
- `loadpage-builtin-passthrough.test.js`：2 处真实替身（`contentClient.getRemotePage→null` + 单个内置页模块）。该页替身**只存在于这一个文件**，且本文件内没有「与真实内置比对」的用例，故无自我对照退化 ✅
- 与 §1 的变异验证互为印证：行为锚可被真实打破 → 不是源码字符串自证。

**B · 测试卫生**：5 份新用例 **0 `.only` / 0 `.skip` / 0 `todo`** ✅；`public/content-remote` **仅出现在注释**（说明性警示），实际读盘只有 `readFileSync('src/content/loadPage.js')` 这类源码锚，**无产物依赖** ✅（该目录已 gitignore，CI 不存在）。

**C · P-S17a 哈希缺口**：`mergeContent.js` 注释如实写明「客户端**不重算** sha256」+ 能检出（写坏/半写/旧版覆盖）+ **检不出**（服务端发错但自洽）+ 由发布期 `validate-content.mjs` 兜底 + 不重算的两条理由。**符合 team-lead 裁定，登记为残留缺口而非缺陷** ✅

---

## 10. 攻点⑪ P-S11(a) 进页路径零网络（补做）

> 说明：该点见于 team-lead 第二条派单消息（我当时已开工未看到），Round 1 报告遗漏，本节为补做。

**为什么这条必须钉死**：`UnitView.vue:551` 有 `Promise.race([数据, sleep(400)])` 的滑动翻页竞速 —— `loadPage` 一旦 await 网络，翻页转场就会被劣化。而这类回归**测试全绿也发现不了**（用例照过、体验变卡），故必须用「数 fetch 调用次数」直接钉，而不是靠静态核对。

**已知形状**：`loadPage` 先 `safeRemotePage()`（读 **IndexedDB**，不联网）→ `pickPage(null, remote)` 裁决 → 命中则 `hydratePage`；否则 `importPageModule()` 走内置。因此只要 `getRemotePage()` 内部偷发 fetch，本组断言就会红。

### 核心：进页期间 fetch 调用数恒为 0

| 场景 | 结果 | fetch 次数 |
|---|---|---|
| ★ 缓存命中 | 走了远程缓存（blocks = 远程正文） | **0** ✅ |
| ★ 缓存未命中 → 内置 `import()` | 正常出页面 | **0** ✅ |
| 哈希不符 → 回落内置 | 正常出页面 | **0** ✅ |
| IDB 抛异常 → 回落内置 | 正常出页面 | **0** ✅ |
| ★ **拔掉网络**（fetch 必抛）+ 无缓存 | **仍然出页面** | **0** ✅ |
| 连续进 3 页（命中+未命中） | 均出页面 | **0** ✅ |

> 最后一条即 team-lead 的验收标准：**拔掉网络也要能出页面**。

### 反向：网络只发生在后台刷新里

| 断言 | 实测 |
|---|---|
| `startBackgroundRefresh()` 确实会发网络（与进页形成对照） | ✅ 拉到 `manifest.json` |
| ★ **fire-and-forget**：**同步返回 boolean**，不返回 Promise | ✅ `typeof ret === 'boolean'` → 调用方无法 await，**天然不在关键路径** |
| P-S14 a：一次会话只触发一次 | ✅ 第二次返回 `false`，且**不再发起网络**（manifest 只被请求 1 次） |

### 副作用：`App.vue` 那 7 行未引入阻塞

`src/App.vue:98-111` 实测：
- `:103 startBackgroundRefresh()` —— **无 `await`、无接收返回值** ✅
- 位于 `onMounted` 内，**不在模块顶层**（不会阻塞求值）✅
- **`onMounted` 回调内无 `await`**（去注释后判定）→ 挂载期只「发起」不「等待」✅
- `loadPage.js` 源码内**不含 `fetch(` / `XMLHttpRequest`** → 结构上就不可能发网络 ✅

### ★ 变异验证（证明「0 次」不是空断言）

| 步骤 | 结果 |
|---|---|
| 基线 | 14/14 绿 |
| 注入变异：在 `safeRemotePage()` 里加 `await fetch('/probe-should-not-exist')` | md5 `b8616efb…` → 变更 |
| 复跑 | **7 红 / 7 绿** —— 红的**正是全部 6 条核心行为断言**（缓存命中/未命中/哈希不符/IDB抛异常/拔网/连续进页）+ 1 条源码断言 |
| 还原 | md5 **回到 `b8616efb922063bd5a53c54395cb1d90`**；复跑 14/14 绿 |

> **判定**：探针真实有效，「进页 0 次 fetch」是**被验证过的性质**，不是「没测到」。
> 另在用例首条加了**探针有效性正对照**：先证明同一套计数器能观察到 `refreshIfNewer` 的网络调用（≥1 次），否则「0 次」可能只是探针没接上。

### 本点踩坑（我的测试 Bug，已自修）

`App.vue` 注释里就有「**不 await**、失败静默跳过…」的说明文字 —— 初版 `onMounted` 去 await 判定**误命中注释**而报红。已改为**去注释后再判**。属测试自身问题，已修，不涉及源码。

---

## 全量关口（干净工作树 `/tmp/qa-s2 @ d8723cc`）

| 关口 | 命令 | 结果 |
|---|---|---|
| **全量测试**（基线态，不含我的探针） | `npx vitest run --pool=threads --maxWorkers=1` | **88 文件 / 1025 通过 + 6 跳过（1031）/ 0 失败** ✅ —— 与工程师口径 **88/1031 精确吻合** |
| **全量测试**（合入我的 5 份探针后，**最终值**） | 同上 | **93 文件 / 1091 通过 + 6 跳过（1097）/ 0 失败** ✅ —— 88+5 文件、1025+66 用例，**与基线态精确自洽** |
| CSP/DB/区块 | `vitest run tests/csp-guard.test.js tests/studyDbV7.test.js tests/block-registry.test.js` | **46/46 通过** ✅ |
| lint | `eslint tests/s2-verify-*.test.js --max-warnings 0` | **exit 0** ✅ |

> **6 跳过说明（非回归）**：`tests/batch-e-verify-search.test.js` 依赖 `.gitignore` 的构建产物（`public/search-body/*.json`），干净工作树未 `build:index` → 跳过。属**环境性**，与批 F 同款，非代码缺陷。

> **基线说明**：全量数字在 `d8723cc` 上测得。验证期间工程师补了 **`6ca781d`**（R-1 注释修正，纯注释、零行为变更），我已在该新 HEAD 上**重跑我的 5 份探针 = 66/66 全绿**，`src/` 仍零改动。

---

## 残留风险

| # | 等级 | 项 | 说明 |
|---|---|---|---|
| R-1（S2） | **低 → ✅ 已闭环** | 失败片在**同版本内不会重试** | 实测：v2 时 `math/02` 拉取失败后，再刷一次**同一份 v2** → 闸门等值 → `reason='not-newer'`，只拉 manifest、**不拉任何分片**。即失败片会一直保持 v1 内容，直到 `contentVersion` 前进（已证 v3 时会重拉）。**不会永久陈旧**（关键性质成立），但源码注释「下次刷新仍会判定为已变更再拉一次」仅在**版本前进**时成立，措辞失实。<br>**后续**：team-lead 已派工程师认领，落地为 **`6ca781d`**（纯注释修正，`src/utils/contentClient.js` +9/−4，**零行为变更**），改了 4 处同一主张的表述并写明「同版本内不重试是 P-S14(a) 预期行为，非缺陷」+ 自愈方案（`pendingUnits`，本批不做）。**我已复核：注释-only，我的 66 例在 `6ca781d` 上仍 66/66 全绿。** 本条关闭。 |
| R-2（S2） | **信息/低** | `isValidManifest` 对 `contentVersion` 偏松 | `Number(null)===0` 是有限数 → `contentVersion: null/''/false` 会**通过**形态校验。但下游 `isNewer` 是第二道闸（`0` 永远不大于任何已见版本 ≥0）→ 端到端仍不会写库，**纵深有效**。已在用例中以「纵深防御」名义固化该事实。建议：若想收紧，改为 `typeof === 'number' && Number.isFinite()`。**当前不阻断。** |
| R-3（S2） | 已裁定 | 客户端不重算 sha256 | team-lead 裁定（P-S17 a），注释已如实写明，见 §9-C。非缺陷。 |

**其余：0**。未发现功能性缺陷。

---

## 附 1：本环境 `grep` 漏命中（重要）

复核过程中，Bash 里的 `grep -n "<pattern>" src/stores/studyDb.js` **返回空**，而 `getContentCache`/`saveContentCache`/`getContentMeta`/`saveContentMeta` 实际存在于该文件 `:651/:661/:683/:694`（用 Grep 工具与 Python 复核确认）。**结论：本环境的 grep 结果不可信**，本次所有关键结论（diff 清单、ENTITIES、DB_VERSION、建表清单、import() 扫描、mock 清单、卫生扫描）**全部改用 Python 复算**。

---

_报告人：QA 严过关｜批 S2 独立验证｜基线 `d8723cc`｜方法：独立证伪 + 变异验证 + 正对照排除假绿 + Python 复核_
