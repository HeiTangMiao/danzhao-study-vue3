# 批 S4 独立 QA 验证报告（校验与回滚）

> 角色：QA（严过关）｜仓库 `danzhao-study-vue3`
> 基线 HEAD **`bca7b3e`**（4 笔：`706370c` 任务卡 → `15e4ecd` CI/产物自检 → `ba34985` 同版本自愈+P-S47 → `bca7b3e` runbook；上游 `69e81c7`）
> 方法：**对抗性独立验证**（防橡皮图章）——自写用例攻击 + 变异证伪 + Python/Node 复核（本仓 shell `grep` 有漏命中前科）。
> 纪律：仅新增 `tests/**` 与本文报告；**不改 S4 代码**（发现缺陷只报告）；**不 commit**；临时工作树 `/tmp/qa-s4` 跑完删除。
> 环境：Node **v22.22.2**；`vitest --pool=threads --maxWorkers=1`；干净检出 `git worktree /tmp/qa-s4 @ bca7b3e`（**不在主树验证**，主树有内容侧在制改动）。

**性质**：本批动的是运行时核心路径（`contentClient.js: computeRetrySet/doRefresh`）+ CI 发布闭环 + SOP；含一处闸门口径收紧（P-S47）与一处旧断言改写。

> **基线说明**：全部验证在 `bca7b3e` 上完成。验证期间内容侧提交了 `ba0c473`（3 个计算机页补题 + 题库重建，**与 S4 无关**）；我在该新 HEAD 上重跑我的 **15 例**探针 **15/15 全绿**，`src/` 仍零改动。

---

## 结论速览

| # | 攻点 | 判定 | 证据强度 |
|---|---|---|:--:|
| 1 | **自愈闸门完整性**（本地 v2 + 远程 v1 + pending；结构坏；同一次 put；上限 warn；兼容路径） | **成立**（R-1 已消解） | 15 例 + 2 组变异证伪 |
| 2 | P-S47 收紧的连带面（全仓有无传字符串版本的调用点） | **成立**（无连带误杀） | Python 全仓扫描 |
| 3 | CI 接线静态断言的**真实性**（独立重做变异） | **成立** | 独立变异：删 rsync 行 → **4 红**；md5 还原一致 |
| 4 | 断言改写是否**悄悄弱化** | **未弱化**（覆盖反而增加） | diff 逐条核对 |
| 5 | runbook 静态断言 vs 实物 + 与 ci.yml 命令一致性 | **成立** | 13 断言逐条 + ci↔runbook 命令对照 |
| 6 | 全量回归 + validate:content + lint + build/check:content-remote | 见 §全量关口 | 干净树 |
| 7 | 工程师自报偏离 vs 实现 | 见 §7（1 处**超集**已登记） | 源码比对 |

**新增测试 1 文件 / 15 例**（`tests/s4-verify-heal.test.js`），全通过。

> **探针归属（应 team-lead 询问）**：`tests/s4-verify-heal.test.js` 是**本次 QA 验证的产物**（我写的对抗性探针），不属于 S4 交付代码。结论见 §1（自愈闸门成立 + 1 脆弱点登记）。**已由 team-lead 收编于 `7400d50`**（本文件同批收编）；本报告后续追加的「变异 2 / 探针归属 / 关口数字」为收编后的增量修订。
>
> **验证基准**：`bca7b3e`（S4 HEAD）。主树后续的 `ba0c473`（内容侧补题，与 S4 无关）不影响本报告；我在该新 HEAD 上重跑本探针 14/14 绿。
>
> **干净树预期空转（非缺陷）**：`public/search-body/*`、`public/search-meta.json` 是 gitignored → 干净检出缺失 → `batch-e-verify-search` 等产物类用例走 `skipIf` 跳过（本报告 6 跳过即此）。要其真跑需先 `npm run build:index`。`public/practice-bank/*` 是 **tracked** → 照常跑。

**智能路由判定**：**NoOne（无功能性缺陷）**。全部攻点成立；残留风险中 **R-1 已消解**（工程师不变量证明 + 我的端到端验证），余 R-2 / R-3 为观察项/登记项，均不阻断、不需返工。

---

## 1. 攻点① 自愈闸门完整性（最高风险）

文件：`src/utils/contentClient.js`（`computeRetrySet` / `doRefresh`）。用例：`tests/s4-verify-heal.test.js`。

| 子攻点 | 预期 | 实测 |
|---|---|---|
| **A** 本地 v2 + 远程 v1（更旧）+ pending 非空，分片 version **≠** captured | 被 `buildShardEntry` 版本比对挡下 → **不写更旧内容** | ✅ 未写；缓存仍本地内容；`attempts=1`；版本不前进 |
| **A′** 分片 version **==** captured（同代） | 允许自愈写入 | ✅ `reason='healed'`、`units=['math/02']`、版本仍 2 |
| **B** 同版本 + pending + 分片可达但**结构坏**（块缺 type） | 算失败 `attempts++`、**不写坏数据** | ✅ 未写；`attempts=1` |
| **C** `units` 与 `pendingUnits` **同一次 put** | `saveContentMeta` 恰好 1 次、同时带两键；body 写全在其前 | ✅ 1 次；含 `units`+`pendingUnits`；`lastCache < metaIdx` |
| **D** attempts 达上限 | 移除 + **一次性** warn（不刷屏） | ✅ 第 5 次移除 + warn 一次；再刷新 `not-newer` 且 **warn 仍 1 次** |
| **E** 兼容：旧 pending 无 `version` | 回落 `meta.contentVersion`，分片须同代才放行 | ✅ `targets[0].version===2` |
| **F** ★ 无 pending + 同版本（端到端） | **零分片请求**（只拉 manifest） | ✅ `urls===[manifest]`、`reason='not-newer'`、pending 仍空 |
| **纯函数** | newer 丢旧 pending / 过滤无 path / attempts 归零；heal 过滤畸形条目；skip | ✅ 全过 |

### ★ 变异证伪（防假绿）

**变异 1 —— 移除版本守卫**：删 `buildShardEntry` 的 `if (Number(shard.contentVersion) !== Number(unit?.version)) return null` → **攻点 A 的 ★ 用例红**（其余 10 例仍绿，证明只针对该守卫）；md5 精确还原（`a30c4c36…`）后全绿。
> 即「自愈不会写更旧内容」是**被证伪尝试过的性质**，不是没测到。

**变异 2 —— 禁用 heal 分支**（独立复核工程师自报口径）：把 `if (pending.length > 0)` 改为恒假 →
| 测试文件 | 红/总 | 备注 |
|---|---|---|
| `content-client-pending.test.js`（工程师） | **5 / 13** | **与工程师自报「删 heal 分支 → 5 条红」精确一致** ✅ |
| `s4-verify-gate.test.js`（工程师，源码锚） | 0 / 11 | 预期：它锚的是「isNewer 仍被使用」，非 heal 存在性 |
| **`s4-verify-heal.test.js`（本探针）** | **8 / 14** | 我的探针覆盖更密 |
| `s2-verify-stale.test.js` | 1 / 6 | 自愈那条 |

md5 精确还原（`a30c4c36…`）后全部回绿。

**验证入口复核**：跑工程师给的 8 文件入口 → **8 文件 / 121 例 / 0 失败** ✅（与全量关口一致）。

### ★ 附加发现（已登记，见 §残留风险 R-1）
- 验证了**不变量**：任何一轮刷新后 `pending.version === meta.contentVersion`（连跑 v1→v2 两轮实测成立）。
- 构造**人为**状态 `pending.version=2 < meta.contentVersion=5` → heal **会**接受 contentVersion=2 的旧同号分片并写入（用例记录了该事实）。**当前不可达**（提交点保证不变量），但说明该 guard 只比 captured、**不显式**比 `meta.contentVersion`。

## 2. 攻点② P-S47 收紧的连带面

`isValidManifest` 由 `Number(v)` 判有限 → 收紧为 `typeof v === 'number' && Number.isFinite(v)`（拒绝 `'2'`/`null`/`''`/布尔）。

Python 全仓扫描结论：
- **生产调用点唯一**：`contentClient.js:247`（`doRefresh`）。其余全是测试/注释。→ 收紧不会误杀别的调用点。
- **清单产出方唯一**：`build-content-remote.mjs` 用源码常量 `CONTENT_VERSION`（数字），且其 `assertManifestInvariants` 用的是**同一收紧口径**（`typeof v !== 'number' || !Number.isFinite(v)` → 报错）。→ 构建期与消费期口径**一致**，不存在「构建放过字符串、客户端拒绝」的分叉。
- 结论：**无连带误杀**；`'2'` 这类字符串在真实链路上不会出现。

## 3. 攻点③ CI 接线静态断言的**真实性**（独立重做变异）

不信工程师的变异表，我自己做：拷贝 `ci.yml` → 删除 `rsync -avz --exclude manifest.json … ./dist/content-remote/` 行 → 跑 `tests/content-remote-ci-wiring.test.js`。

| 项 | 结果 |
|---|---|
| 变异前 md5 | `78f5c02bfb89c989e5e46ee488e827b4` |
| 变异后失败数 | **恰好 4**（与 team-lead 预期一致）：① rsync 要素缺失 ② 先分片后清单顺序 ③ `--delete` 用例（行数<3）④ 顺序反向锚 |
| 还原后 md5 | **回到 `78f5c02b…`**；`git status` 该文件干净 |

> 结论：CI 接线守卫**咬得住**，非恒真断言。且测试自带反向锚（合成变异文本证明 `missingIn` 会报缺）。

## 4. 攻点④ 断言改写是否悄悄弱化

S4 改写了我的两份 S2 QA 用例（`git diff 69e81c7^ bca7b3e`）：

- **`s2-verify-stale.test.js`**：旧用例「同版本再刷新 → 一律不拉」被**拆成两条**：
  - 新增①「**无待重试片**时同版本仍不拉」→ **完整保留**旧断言（`reason='not-newer'`、`updated=false`、URL 仅 manifest）✅
  - 新增②「**有待重试片**时同版本自愈」→ 因 S4-2 行为变更而新增
  - 另补 `beforeEach` 清表（fake-indexeddb 跨用例持久）——修复类，无覆盖损失
  - **判定：旧覆盖「无 pending 时 not-newer + 零分片请求」仍被钉住；无删除未替代的断言。覆盖净增。**
- **`s2-verify-gate.test.js`**：旧用例断言 `isValidManifest(contentVersion:null)===true`（记录旧偏松口径）→ 新用例断言 `===false`（收紧）+ **保留**「第二道闸仍在」（`isNewer(null,null)===false` 等三行）。覆盖净增。

**判定：未弱化。**

## 5. 攻点⑤ runbook 静态断言 vs 实物 + 与 ci.yml 一致性

- `tests/content-release-runbook.test.js` 共 **13 条** `it()`（与提交信息「13 例」一致），含四段顺序、反事故条款（严禁同号覆盖 / 严禁降版本号）、先分片后清单、回滚=号更大、Content-Type 判据、三处引用；且含反向锚（删条款/换段序必红）。
- **独立对照 runbook ↔ ci.yml 关键命令（Python）**：

| 关键点 | ci.yml | runbook | 一致 |
|---|:--:|:--:|:--:|
| 先分片（`--exclude manifest.json`） | ✅ | ✅ | ✅ |
| 清单单独 rsync | ✅ | ✅ | ✅ |
| 分片不带 `--delete` | ✅ | ✅ | ✅ |
| `Content-Type application/json` 判据 | ✅ | ✅ | ✅ |
| `text/html` = SPA 兜底 提示 | ✅ | ✅ | ✅ |
| `check:content-remote` 具名步骤 | ✅ | ✅ | ✅ |

- 三处引用实测存在：`contentManifest.js`(×1)、`implementation-roadmap.md`(×2)、`远程内容链路验证清单.md`(×2，§2.4 指向 SOP)。

**判定：runbook 与 CI 实现一致，断言有效。**

## 7. 工程师自报偏离 vs 实现

| 声明（提交信息） | 我的独立核对 |
|---|---|
| 删 rsync 行→4 红；还原 md5 一致→10/10 绿 | **独立复现一致**（见 §3；我另跑全绿 10/10 亦确认） |
| 全量 100 文件 / 1201 例全绿 | 见 §全量关口 |
| `rsync --dry-run` 实证 27 分片不含 manifest + 题库 6 文件 | ✅ **一致**：分片 dry-run `--exclude manifest.json` → manifest 命中 **0**；`Transfer starting: 31 files`（27 分片 + 4 目录）。题库 `rsync` 报 **6 files**（`_derived-audit/chinese/computer/index/math` **5 个真实文件** + 目录条目）。`ls \| wc -l` = 5 —— 工程师口径与 **rsync 自身计数**一致，非误报。 |
| `s2-verify-stale` 补 beforeEach 清表 | ✅ diff 属实 |
| `s4-verify-gate` 剥注释不含 `crypto.subtle`/`createHash` 反向锚 | ✅ 属实（含合成源码反向锚证明非恒真） |
| **`pendingUnits` 条目形状** | ⚠️ **超集**：任务卡 §5.2 规定 `[{unitKey, path, hash, attempts}]`，**实现多存 `version` 字段**（`stillPending.push({...t, attempts+1})`，`t` 含 `version`）。**见 §残留风险 R-3**。 |

---

## 残留风险

| # | 等级 | 项 | 说明 |
|---|---|---|---|
| R-1（S4） | **低 → ✅ 已消解（保持现状）** | 自愈的「不写更旧」依赖**不变量** `pending.version === meta.contentVersion` | heal 的 `buildShardEntry` 只比「分片版本 == captured 版本」，**不显式**比 `meta.contentVersion`。<br>**工程师给出结构证明，我已独立复核**：`doRefresh` 的 `stillPending`（`:260-275`）**只从本轮 `targets` 构建**，`nextPending = stillPending.filter(...)`（`:280`）**从不与上一轮 pending 合并** → 「pending 跨版本残留旧 version」结构性不可达（旧 pending 在 newer 轮被整体丢弃/重新捕获）。<br>**我的端到端验证**（探针新增用例）：v1 使 02 入 pending@1 → v2 时 02 被**重新捕获为 version=2**、无 @1 残留，且未变的 01 **不被重拉** ✅。legacy（无 version）与 `meta.contentVersion=null` 两条边界亦经复核成立。<br>**结论（工程师采纳我的修正后共同口径）**：显式检查**当前为死代码**（不变量已结构性成立），**且会给未来引入一条与不变量重复、可能各自漂移的判据**——当两个来源发散时（如 `version` 改取**分片自报版本**），该判据会**静默丢弃应重试的片**（既不 warn 也不进 attempts），比不加更坏。→ **维持现状**，最多在下次触碰该文件时补一行注释说明该不变量的结构性来源。<br>**通用口径（本项提炼）**：判断「要不要加防御性读侧检查」，关键不在「多一层保险」，而在**其取值来源与被保证的东西是否同源** —— 同源则恒真（死代码），异源则可能发散（有害）。故此处选「注释讲清不变量」而非「加 guard」。 |
| R-2（S4） | 信息 | 注释措辞略强 | §5.2 与源码注释称自愈「不读远程 `manifest.units`，因为线上清单可能**不可达**/旧」。实测 heal 仍需 `doRefresh` **先 fetch 到合法清单**方进闸门判定 → 覆盖的是「版本闸门滞后（清单**可达**、同号/更旧）」，**不覆盖**「清单不可达」（那在本设计中等于离线，分片也拉不到）。属措辞精度问题，非缺陷。 |
| R-3（S4） | **信息/需追认** | `pendingUnits` 条目含 `version`（超集） | 任务卡 §5.2 写 `[{unitKey, path, hash, attempts}]`，实现多一个 `version`。该字段被 heal 用作 captured 版本（**更精确**，且是不变量 R-1 的载体）→ 属**增强**而非缺陷。但**与任务卡字面不符**，请 team-lead 追认「超集即口径」或同步任务卡。**不阻断。** |

**其余：0**。未发现功能性缺陷。

---

## 6. 攻点⑥ 全量关口（干净工作树 `/tmp/qa-s4 @ bca7b3e`）

| 关口 | 命令 | 结果 |
|---|---|---|
| **全量测试**（含我的探针） | `npx vitest run --pool=threads --maxWorkers=1` | **101 文件 / 1208 通过 + 6 跳过（1214）/ 0 失败** ✅ |
| **全量测试**（基线态，扣除我的探针文件） | 同上 | **100 文件 / 1195 通过 + 6 跳过（1201）/ 0 失败** —— 与工程师口径 **100 文件 / 1201 例精确吻合** ✅ |
| 工程师 8 文件入口 | 见 §1「验证入口复核」 | **8 文件 / 121 例 / 0 失败** ✅ |
| 内容校验 | `npm run validate:content` | **183 内容文件 + 3 站点配置 全通过** ✅ |
| lint | `npm run lint`（`--max-warnings 0`） | **exit 0** ✅ |
| 产物构建 | `npm run build:content-remote` | **27 单元 / 27 分片 / 183 页**；contentHash `sha256:b76a40d4…` ✅ |
| 产物自检 | `npm run check:content-remote` | **exit 0**：`schemaVersion=1 contentVersion=2 单元=27 分片=27 页=183` ✅ |

> 数字口径：全量 101 文件 / 1214 例那次运行用的是**探针的 13 例版本**（测量时点）；探针现为 **15 例** → 等价 **101 文件 / 1210 通过 + 6 跳过（1216）**。基线（去掉探针整份文件）= **100 文件 / 1195 + 6（1201）**，与工程师「100/1201」逐位对齐。

> **6 跳过说明（非回归）**：`tests/batch-e-verify-search.test.js` 依赖 `.gitignore` 构建产物（`public/search-body/*.json`）——干净树未 `build:index` → 跳过。环境性，非代码缺陷。

### 产物自检的对抗性验证（S4-4b，我额外打的）
| 变异 | 预期 | 实测 |
|---|---|---|
| 删掉清单声明的 1 个分片 | check 失败（exit 1） | ✅ exit **1**，报「units 键数 27 与分片数 26 不一致」 |
| **删声明分片 + 塞 1 个 stray 分片**（计数仍 27） | 第二道「逐分片存在性」守卫须独立咬住 | ✅ exit **1**，报「清单声明了但盘上缺失的分片：chinese/01」——**未被计数守卫掩盖** |
| 还原 | check 通过 | ✅ exit 0 |

---

_报告人：QA 严过关｜批 S4 独立验证｜基线 `bca7b3e`｜方法：对抗性攻击 + 变异证伪 + Python 复核 + ci↔runbook 对照_

---

## team-lead 处置（2026-10-15，随收编）

| 议题 | 处置 | 说明 |
|---|---|---|
| **R-1**（heal 未显式比 `meta.contentVersion`） | **已消解，无需加固**（随 QA 增量更新） | QA 的端到端攻击 + 工程师的不变量结构证明共同确认：该状态依赖「提交点不变量被破坏」才可达，当前所有路径保证 `pending.version === meta.contentVersion`。触发条件：未来任何引入「pending 与 meta 版本可分离」的新写入路径 → 届时按 QA 建议加 `t.version >= meta.contentVersion` 守卫。 |
| **R-2**（注释措辞：heal 前提是清单可达） | **已修**（同步任务卡 §3.2，commit 随收编） | 原文「远程 manifest 可能已不可达」易读成覆盖该场景；已改为「不依赖 manifest 的 `units` 段取坐标 + 前提是 manifest 能拉到」。代码注释（`contentClient.js` computeRetrySet docblock）留待下次触碰该文件时顺手对齐（宁少勿多）。 |
| **R-3**（`pendingUnits` 条目多 `version` 字段） | **追认「超集即口径」** | `version` 为分片代次守卫的载体（亦是 R-1 不变量的锚），属增强；任务卡 §3.2 已同步为实际字段形态。 |
