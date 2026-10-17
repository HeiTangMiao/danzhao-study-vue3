# 批 S4「校验与回滚」实施任务卡

> 状态：**规划定稿（未写代码）**。本文把 `docs/proposals/content-extension-dual-track.md` 排期表的 **S4** 行，加上 `docs/远程内容链路验证清单.md` 记录的 **2026-10-15 真实事故**，转成可直接开工的实施卡。
> 角色：架构师（Bob）产出；供工程师照单实现，供 team-lead 裁决 §10 待拍板项。
> 上游（已读并内化）：
> - `docs/proposals/content-extension-dual-track.md` §3.1（发布前校验）/ §3.2（客户端兜底校验）/ §3.3（内容版本回滚）与 S4 排期行（`:253`）
> - `docs/proposals/batch-s2-tasks.md`（S4 划界来源：`:62`「前进式回滚流程文档化」归 S4；`:54` 红线 5）
> - **事故输入**：`docs/远程内容链路验证清单.md` §2.4（`:206-220`）—— 线上 v1 快照不含新内容、`CONTENT_VERSION` 漏 bump → 闸门（`contentClient.js:176`）在单元哈希比对**之前**返回 `not-newer` → 已缓存客户端**永久拉不到且不报错**
> - 源码实测（HEAD = `69e81c7`）：`src/content/mergeContent.js` / `src/utils/contentClient.js` / `src/stores/studyDb.js` / `src/content/contentManifest.js` / `src/content/loadPage.js` / `src/utils/fetchJson.js` / `scripts/build-content-remote.mjs` / `scripts/clean-content-remote.mjs` / `scripts/lib/load-content.mjs` / `.github/workflows/ci.yml` / `package.json` / `tests/{build-content-remote,content-client,merge-content,s2-verify-gate,s2-verify-stale}.test.js`
> - `docs/proposals/batch-s2-workcard.md` §5（Web 发布链 + `CONTENT_VERSION` 操作流程）/ `docs/proposals/batch-s2-qa-report.md`（R-1/R-2/R-3 残留风险）
>
> **纪律**：只读核实，不写产品代码；行号一律以**当前工作树实测**为准（HEAD = **`69e81c7`**）；数字一律用 Node/Python 脚本复核（本环境 `grep` 漏命中，已有多次实证 —— 见 `batch-s2-qa-report.md:249-252`）。

---

## 0. 读码更正（上游旧说 vs 实测 vs 对 S4 的影响）

> 本轮共更正 **8 条**（其中 3 条为「上游已记但未成体系」，5 条为本次新发现）。**第 1 条是本卡最高价值的发现。**

| # | 旧说（dual-track / workcard） | 实测（HEAD=`69e81c7`） | 对 S4 的影响 |
|---|---|---|---|
| **1** | S3 已落地「服务器静态目录发布 + CI 集成」，S4 只剩「校验内嵌」；`content-extension-dual-track.md:252` 称「CI 集成」 | ⚠️ **CI 自动部署不发布远程内容**：`ci.yml` 的 `deploy` job（`:141-160`）rsync 清单只有 `dist/assets/`、`dist/vendor/`、`dist/index.html`+`favicon.ico`+`search-meta.json`、`dist/search-body/` —— **没有 `dist/content-remote/`，也没有 `dist/practice-bank/`**。线上那两份是**手工**部署的（与验证清单 §1 备份记录 `2026-10-15 01:51` 一致）。 | **范围 4「发布脚本闭环」有一个真实缺口**：跑一次 `git push main` 的自动部署，**不会**发布 `manifest.json` / 分片 / 题库 → 网页端远程更新静默失效（正是 404→回退内置那一类「看不出错」的失效）。这条**不是**「已完成」，是 S4 应当收口的头号落点 |
| **2** | `batch-s2-workcard.md:121` 称 `CONTENT_VERSION`「当前 = **1**」 | 实测 `contentManifest.js:40` `CONTENT_VERSION = 2`（10-15 已 1→2）；且 `:33-38` 的注释**已把 2026-10-15 事故与 `contentClient.js:176` 闸门写进代码注释** | 范围 3（回滚 SOP 文档化）的「纪律文字」**部分已存在**，但**散落三处**（workcard §5.4 / `contentManifest.js:33-38` 注释 / 验证清单 §2.4）、**无单一可执行 SOP**。S4 要做的是**收敛成一份**，不是从零写 |
| **3** | （未提）本轮才知 | **`pendingUnits` 已在代码里被点名但未实现**：`contentClient.js:184-188` 注释明写「若将来需要**同版本自愈**，需另存 `pendingUnits` 在闸门之外单独重试（**本批不做**）」；`batch-s2-qa-report.md:241`（R-1）已闭合为 **注释-only**（commit `6ca781d`），并把 `pendingUnits` 登记为后续方案 | 范围 2 是**真·未做**，且**设计线索与文案现成**（工程师已写好意图注释）；事故正好实证了它的危害 → 本批**应做** |
| **4** | S4 = 「发布前校验关卡内嵌」（`content-extension-dual-track.md:253`） | **大部分已实现**：`build-content-remote.mjs:31` import CI 同款 `createBlockValidator`；`:47-48` 构建校验器；`:121-123` 逐块校验；`:141-145` 有错即 `throw`、**不落盘任何分片**；`build()` `:210-232` 只在 `collectSnapshot` 成功后才写盘；且 `package.json` 的 `prebuild = build:index && build:content-remote` → `npm run build` 失败即中断 | 「内嵌」**剩余** = ① CI **显式**挂接（当前靠 `build` 经 prebuild 隐式触发，无具名步骤、无清单形态/版本自检）② 部署闭环（更正 1）③（可选）「线上版本对比」守卫。S4 不必重做校验器 |
| **5** | `mergeContent.js:14-25` 标注「S4 若要加强再议」 | 注释已**锁定不重算 sha256 的三条理由**（canonicalJSON 搬运违反 H7 / `crypto.subtle` 在 Tauri `tauri://localhost` 下是否 secure context 无法自证 / 静默退化成「永不校验」比现在更糟）；`batch-s2-qa-report.md:243`（R-3）记录 team-lead 已按 **P-S17 a** 裁定「不重算、**非缺陷**」 | 范围 1 是**已裁定项**：S4 要做的是**「是否翻案」的显式决策**（§4 给 A/B + 推荐），不是从零设计 |
| **6** | 未提 `crypto.subtle` 的仓库现状 | 全仓 `.js/.mjs/.vue` 扫描：`subtle` **仅**出现在 `src/content/mergeContent.js` 的**注释**里；`crypto` 只出现在 `scripts/build-content-remote.mjs`(node:crypto 哈希)/`scripts/migrate-content-meta.mjs`/`server/src/auth.js`/`studyDb.js`(注释)/`mergeContent.js`(注释)。**`isSecureContext` 全仓零使用** | 方案 A1（`crypto.subtle`）是**全新能力引入**：无先例可循、无 `isSecureContext` 探测代码、Tauri 下的可用性纯属**未验证假设**（真机才能定）。这直接支撑 §4 的推荐 |
| **7** | 未提 `canonicalJSON` 的位置与登记纪律 | `canonicalJSON` **目前只存在于 Node 侧**（`scripts/build-content-remote.mjs:56-62`；`tests/build-content-remote.test.js` 引用它）→ 浏览器侧**无**实现。`scripts/lib/load-content.mjs:37-49` 的 `NON_PAGE_FILES` 现有 **11** 个登记项；`collectFiles`（`:68-78`）会把未登记的 `src/content/*.js` **当内容页**处理 | 方案 A **必须**先把 `canonicalJSON` 提升为**两端共用零依赖模块**；若落点在 `src/content/`，**必须**同步登记 `NON_PAGE_FILES`，否则 `validate:content` 报孤儿（H6 门禁直接红） |
| **8** | S2 卡记「内容页 182」（`batch-s2-tasks.md:22`） | 实测已 **183 页 / 27 单元**（`implementation-roadmap.md:29` 看板；`contentManifest.js` 注释与 `build-content-remote.mjs` 无页数硬编） | 任何 S4 测试的 fixture **不得硬编 182/183**；用注入式 fixture（与 S2 同款纪律：`public/content-remote/` 已 gitignore，干净树无产物） |

> **另注（非更正，但影响范围 2 的测试）**：`content_meta` 是**单记录**存储（`keyPath:'key'`，`studyDb.js:190-191`），`saveContentMeta(record)` 整体 `put`（`:694-696`）→ 扩展 `pendingUnits` 字段**零 DDL、零升版**（仍 v7）。这是范围 2 选型的技术前提。

---

## 1. 目标与范围

### 1.1 S4 要做的事（四项，按价值排序）

| # | 范围项 | 现状 | 缺口 | 本卡处置 |
|---|---|---|---|---|
| **①** | **发布脚本闭环**（更正 1） | CI 自动部署**不发**远程内容 | 一条 `git push` 不会让网页端拿到新内容 | **S4-4a**（本批最高价值） |
| **②** | **pendingUnits 同版本自愈** | 失败片同版本内**永不重试**（`contentClient.js:184-188`） | 版本一旦滞后（事故），失败片**长期陈旧** | **S4-2** |
| **③** | **前进式回滚 SOP 文档化** | 纪律散落三处、无单一 SOP | 回滚无手册 → 人会「同号覆盖」再踩事故 | **S4-3** |
| **④** | **客户端哈希兜底**（是否重算 sha256） | P-S17 a 已裁定**不重算**，注释锁死理由 | 决策未在 S4 卡内正式翻案/维持 | **S4-1**（**推荐维持不重算**，见 §4） |
| **⑤** | **发布前校验关卡内嵌** | 校验器已内嵌于构建脚本（更正 4） | 缺 CI **显式**挂接 + 清单形态/版本自检 | **S4-4b** |

> **本卡对事故的定性**：2026-10-15 事故的**根因是版本闸门 + 发布纪律**，**不是**哈希校验。正确解药是 **①（部署闭环）+ ②（自愈）+ ③（SOP）**；④（重算哈希）与事故**无因果关系**，强行上马反而引入新失效模式（见 §4）。这一点是本卡与「S4 = 客户端哈希兜底」的直觉认知**相反**的关键判断。

### 1.2 六条红线（本卡钉死）

1. **CSP（不引新依赖）**：S4 全程不新增 npm 依赖；远程内容仍只 `fetch + JSON.parse`；不得出现 `eval` / 运行时 `import()`（`tests/csp-guard.test.js` L3/L4/L6 会拦）。若走 §4 方案 A，sha256 必须是**仓内纯 JS 零依赖**或 `crypto.subtle`（DOM 内建，非依赖）。
2. **H7 单一真相源**：`canonicalJSON` / 形状 / 键 / op / 协议常量**只有一处实现**。任何提升、任何新模块，必须让旧位置**改为 import**（不得留第二份）；`src/content/*` 新模块**必须**登记 `NON_PAGE_FILES`。
3. **轨道 A 零回归 / 永不变砖**：内置兜底路径**原样不动**（`loadPage.js:76-78` 的 `importPageModule` + `hydratePage(mod.default, meta)` 透传）；任何 S4 改动都不得让「远程拉不到」从「静默回退内置」变成「抛错 / 空白」。
4. **闸门语义不变**：`isNewer` 仍「**严格大于**才写、等值与更旧不写」（`mergeContent.js:110-117`）；pendingUnits 自愈**不得**放宽闸门（只能在闸门**之外**对**已确认的**同版本待重试片单独重试）。
5. **DB 仍 v7**：`studyDb.js:33` `DB_VERSION = 7` **不动**。范围 2 只扩 `content_meta` 记录字段（更正 8 附表注），**不新增 store、不升版**。
6. **离线优先 + 静默**：一切远程失败静默跳过；**唯一例外**是本卡 §5 定义的「pendingUnits 达重试上限」与「哈希不可算（若选 A）」—— 允许**一次性** `console.warn` 点名（`超限必报告` 纪律，禁止**永久**静默陈旧）。

### 1.3 边界（明确 out of scope）

| 非目标 | 归属 |
|---|---|
| 搜索 / 题库远程化（`OPTIONAL_SECTIONS`） | **S5+** |
| Tauri / Android 真机验证（`crypto.subtle` 是否可用、绝对基址实际放行） | **S5 / P5**（S4 只留**探测桩 + 降级**，不做真机断言） |
| 远程新增单元 / 页面（导航派生层改造） | **B2** |
| 改 `site.js` / `index.js` / `fileIndex` | **永不** |
| 改 `validateBlock.js` / `content-schema.json` / 22 种块语义 | **永不**（本批零 schema 改动） |

---

## 2. 落点（读码核实的文件）

| 动作 | 路径 | 说明 |
|---|---|---|
| **改** | `src/utils/contentClient.js` | 范围 2 主战场。`doRefresh`（`:168-229`）增 pendingUnits 分支；`getRemotePage`（`:242-266`）不变；`isValidManifest`（`:95-101`）视 P-S47 决定是否收紧 |
| **改** | `src/stores/studyDb.js` | 仅 `saveContentMeta`（`:694-696`）的调用**方**扩字段（`pendingUnits`）；store 本身**只读不写**（结构在 `content_meta` 记录内，无需改 store 代码）→ **可能零改动**（视是否加断言） |
| **改（视 §4 决策）** | `src/content/mergeContent.js` **或** 新增 `src/content/contentHash.js` | 仅当 S4-1 选方案 A：提升 `canonicalJSON` + 纯 JS sha256 + `recomputeHash` 比对；**推荐不选**，则本项不动 |
| **改** | `.github/workflows/ci.yml` | 范围 4：`deploy` job（`:141-160`）rsync 增 `dist/content-remote/`（+ `dist/practice-bank/`）；`quality` job（`:26-52`）增**具名**「内容快照校验」步骤 |
| **改** | `scripts/build-content-remote.mjs` | 视 P-S46 决定是否加「构建后清单自检 / 线上版本对比」；**校验器部分（`:31/47-48/121-123/141-145`）不动** |
| **新增** | `docs/content-release-runbook.md` | 范围 3：发布/回滚 SOP（§6）。落点视 P-S45 |
| **新增** | `tests/content-client-pending.test.js` | 范围 2：pendingUnits 自愈（离线/失败/版本前进/上限） |
| **改/新增** | `tests/s2-verify-gate.test.js`（改）或 `tests/s4-verify-gate.test.js`（新增） | 范围 1/2：闸门语义**不变量守卫**（反向锚） |
| **新增（视 P-S46）** | `tests/content-remote-manifest.test.js` | 范围 4：产物清单形态 + 版本单调性自检 |
| **复用（不改）** | `src/content/contentManifest.js`、`src/content/loadPage.js`、`src/utils/fetchJson.js`、`src/utils/validateBlock.js`、`scripts/validate-content.mjs`、`scripts/clean-content-remote.mjs`、`scripts/lib/load-content.mjs`（除 `NON_PAGE_FILES` 视 §4 决策追加登记） | H7 单一来源，**禁止**复制其逻辑 |

---

## 3. 逐任务分解

> 任务编号 `S4-1`…`S4-4`（不超过 5 个；本批**无**「项目基础设施」类任务，因为 S1/S2/S3 已建好全部基础设施）。
> 每任务含：**改哪些文件/函数（行号锚）/ 契约与不变量 / 测试要求（含变异验证）/ 验收口径 / 依赖 / 工作量**。

### S4-1 —— 客户端哈希兜底：决策（推荐维持「不重算」）

- **改哪些文件/函数**：
  - **推荐路径（B）**：**零代码改动**。只把决策写进 `src/content/mergeContent.js:14-25` 的注释（把「S4 若要加强再议」改为「S4 已复议，维持不重算；触发条件见 §4」）+ 更新本卡 §4。**这是本任务的交付物本体**。
  - **备选路径（A2，见 §4）**：新增 `src/content/contentHash.js`（纯 ESM 零 import：`canonicalJSON` + 纯 JS `sha256hex` + `hashOf`）；`scripts/build-content-remote.mjs:56-72` 改为 import 该模块（删除本地 `canonicalJSON`/`sha256hex`/`hashOf`）；`scripts/lib/load-content.mjs:37-49` `NON_PAGE_FILES` 追加 `'contentHash.js'`；`src/content/mergeContent.js` 增 `recomputeAndVerify(page)`（用**相对路径** import，非 `@/`，因纯函数层零 alias）。
- **契约与不变量**：
  - 不变量①：`verifyHash` 的语义**不变**（仍比对「写入时登记的哈希」）；方案 A 是**新增第二道**，不是替换。
  - 不变量②（方案 A2）：纯 JS sha256 对同一 UTF-8 输入必须**逐字节**等于 `node:crypto` 的 `sha256`（跨实现等价，用反向锚钉死）。
  - 不变量③（方案 A1，**不推荐**）：`crypto.subtle` 不可用时**绝不允许**「跳过校验并接受内容」；必须 fail-safe（整批不消费 + 一次性 warn + 回退内置）。
- **测试要求（含变异验证 / 反向锚）**：
  - 维持 B：无需新测试；但**须有一条守卫**证明「客户端确实未引入重算」不是「漏实现」——即在 `tests/s4-verify-gate.test.js` 断言 `mergeContent.js` **不含** `crypto.subtle` / `createHash` 引用（反向锚：守卫会咬住「偷偷加重算」的改动）。
  - 若选 A2：`tests/content-hash.test.js`（新增）——
    - 正向：`hashOf(fixture)` 等于预置的 `sha256:<hex64>` 常量（fixture 由 Node 侧 `build-content-remote.mjs` 的 `hashOf` 预生成，**不硬编**）。
    - **反向锚（变异）**：把纯 JS sha256 的轮常量或初始向量**改一个字节** → 断言**必须**失败（证明断言真的在校验值，而非恒真）；再复原 → 通过。
    - 跨实现等价：对 100 组随机 fixture 断言 `contentHash.sha256hex(x) === nodeCrypto.sha256hex(x)`。
    - 键序：`canonicalJSON({b:1,a:2}) === canonicalJSON({a:2,b:1})`（顺序不变性），且 `undefined` 值被剔除。
- **验收口径**：`merge-content.test.js` + `s2-verify-*` 全绿；若走 A2，`content-hash.test.js` 全绿且 CI `lint --max-warnings 0` 通过；**无**新增 npm 依赖（`package.json` diff 为空）。
- **依赖**：无。**工作量**：**S**（推荐路径几乎零代码；A2 为 **M**）。

### S4-2 —— pendingUnits 同版本自愈

- **改哪些文件/函数**：
  - `src/utils/contentClient.js`：`doRefresh`（`:168-229`）重构为「**闸门判定 → 选出待拉集（changedKeys ∪ pendingUnits）→ 逐片拉 → body 先落 → meta 提交（含 pendingUnits 结余）**」。新增纯函数 `computeRetrySet(manifest, meta)`（可测，建议放 `contentClient.js` 顶层导出）。
  - `src/stores/studyDb.js`：**零改动**（`content_meta` 单记录整体 put，字段自由扩展；见更正 8 附注）。
  - `src/stores/content.js`：**零改动**（`applyUpdate` 语义不变；自愈成功仅是「更新了某片」）。
- **契约与不变量**（逐条钉死，全部可测）：
  1. **闸门不放宽**：`isNewer` 严格大于语义不变（红线 4）。pendingUnits 只在 `!isNewer && pendingUnits.length > 0` 时进入**自愈分支**，且**不**用远程版本号覆盖本地 `contentVersion`。
  2. **自愈目标须自带坐标**：`pendingUnits` 存**结构化引用**（在失败那轮的 manifest 里捕获），这样同版本重试**不依赖**远程 manifest 的 `units` 段取坐标（其内容可能滞后）。⚠️ **实施口径（2026-10-15，team-lead 已追认）**：实际字段为 `[{unitKey, path, hash, version, attempts}]`——`version` 为实现期增补的**超集**字段（供 `buildShardEntry` 的分片代次守卫，QA 报告 R-3）。⚠️ **前提**：自愈发生在 `doRefresh` 内、闸门判定之后，仍需**能拉到合法 manifest** 才进入——覆盖「清单可达但版本滞后」，**不**覆盖「清单完全不可达」（QA 报告 R-2）。
  3. **写库原子性不变**：分片 body 先写 `content_cache`（`:200-204` 模式），全部成功后才写 `content_meta`（提交点，`:205-217`）。`pendingUnits` 是 meta 的一部分 → 与 `units` **同一次 put**，不存在「body 落了但 pending 没落」。
  4. **失败片哈希口径不变**：失败片在 `units` 里仍**保留旧哈希**（`s2-verify-stale.test.js` 已钉死）；只有**本次成功**的片才前进。
  5. **自愈成功后**：把该片从 `pendingUnits` 移除、`units[unitKey]` 更新为引用里的 hash、写回 `content_cache`；**已发布的 `contentVersion` 不变**（因为内容代次没变，只是补拉）。
  6. **上限与可见性**（P-S44）：`attempts++` 每轮一次；达上限（建议 **5**）→ 从 `pendingUnits` 移除并**一次性** `console.warn` 点名 stale 单元（禁止永久静默）。上限**不是**退避（不做时间戳持久化）。
  7. **每会话至多一次**：沿用 `backgroundStarted`（`:43`）/ `inflight`（`:40`）—— 自愈只随「每会话一次的后台刷新」触发，**无重试风暴**。
- **测试要求（含变异验证 / 反向锚）**：`tests/content-client-pending.test.js`（新增，`jsdom` + `fake-indexeddb/auto`，mock fetch，**不读盘产物**）
  - 正向①：v2 时 `math/02` 拉失败 → meta 记 `pendingUnits=[math/02]`，`units['math/02']` 仍为旧哈希。
  - 正向②：**同版本**再刷新（manifest 仍是 v2，`math/02` 这次可达）→ **成功补拉**、`pendingUnits` 清空、`getRemotePage` 返回 v2 内容。**这条是本任务的核心验收**（现有 `s2-verify-stale.test.js:195-226` 断言的是**旧行为** not-newer；S4 后该断言须**改写**并注明「S4-2 起同版本可自愈」）。
  - 正向③：同版本再刷新仍失败 → `pendingUnits` 保留、`attempts=2`。
  - 正向④：版本**前进**到 v3 → 走正常 changedKeys 路径，旧 `pendingUnits` 被新一轮结果**取代**（不得两处并存导致重复拉取）。
  - **反向锚（变异）**：把「`!isNewer && pendingUnits.length`」的分支**删掉** → 正向②**必须**失败（证明自愈逻辑真的被触发，而非被既有闸门侥幸放过）；再把 `attempts` 上限判断反转 → 上限用例必须失败。
  - 守卫：`getRemotePage` 在**无** pending 时行为与 S2 完全一致（零回归）。
- **验收口径**：新旧 `tests/content-client*.test.js` + `tests/s2-verify-*.test.js` 全绿；**DB 仍 v7**（`studyDb.js:33` diff 为空）；`studyDbV7.test.js` / `studyDbMigration.test.js` 不受影响；`lint --max-warnings 0` 通过。
- **依赖**：无（S2 已合入）。**工作量**：**M**。

### S4-3 —— 前进式回滚 SOP 文档化

- **改哪些文件/函数**：新增 `docs/content-release-runbook.md`（落点视 **P-S45**）；在 `docs/proposals/implementation-roadmap.md` 看板 S4 行、`src/content/contentManifest.js:33-38` 注释、`docs/远程内容链路验证清单.md` §2.4 **各加一处**指向该 SOP 的链接（**消除三处散落**）。
- **契约与不变量**（SOP 必须写死，作为「不可协商条款」）：
  1. **回滚 = 发一版号更大的旧内容**。**严禁**降 `CONTENT_VERSION`、**严禁**同号覆盖（事故根因）。
  2. **`CONTENT_VERSION` 与内容改动一一对应**：只要 `src/content/**` 有改动且要发布 → 必 `+1`。（`contentManifest.js:33-38` 已有同款文字，SOP 复用并升级为**流程步骤**。）
  3. **发布前必备份**：部署前记录当前线上 `manifest.json`（`curl`）与备份路径（沿用验证清单 §2.4 的 `/tmp/danzhao-backup-<ts>-*` 惯例）。
  4. **验证闭环**：部署后**必须**探测线上 `manifest.json` 的 `contentVersion` / `contentHash` / 单元数 / 页数四项。
- **测试要求**：**无单测**（纯文档）。改为**静态断言**（可测的文档不变量）：`tests/content-release-runbook.test.js`（新增，轻量）—— 断言 SOP 文件存在、含「bump」「重建」「部署」「验证」**四段小标题**、含「严禁同号覆盖」字样、且被 `contentManifest.js:33-38` 注释**引用**（用 Python/Node 读文本断言，**不**用 grep——本环境 grep 漏命中）。反向锚：删掉 SOP 的「严禁同号覆盖」一句 → 该断言必须失败。
- **验收口径**：SOP 四段齐 + 反事故条款齐 + 三处链接齐；文档测试全绿；`lint` 覆盖 `tests/**`（`eslint src tests scripts`）不报。
- **依赖**：无。**工作量**：**S**。

### S4-4 —— 发布前校验关卡内嵌（CI 显式挂接 + 部署闭环）

- **改哪些文件/函数**：
  - **S4-4a 部署闭环（更正 1，最高价值）**：`.github/workflows/ci.yml` `deploy` job（`:141-160`）——
    - 新增 rsync：`./dist/content-remote/` → `<root>/content-remote/`（**先分片后 manifest**：分片用不带 `--delete` 的增量传，最后单独传 `manifest.json`，与既有「零停机 + 最后切入口」纪律同款，见 `:150-160`）；
    - 新增 `dist/practice-bank/`（补齐线上缺口，验证清单 §1 `:28` 已记「既有题库产物也未部署」）；
    - `--delete` 策略：`content-remote/` **谨慎**（单元下线时旧分片残留无害，但会累积；建议**不上** `--delete`，或按 `search-body` 同款在切片后单独 delete——交 P-S46 裁决）。
    - 部署后验证（`:162-168`）追加：`curl -s .../content-remote/manifest.json` 断言 `application/json` + 打印 `contentVersion`。
  - **S4-4b CI 显式挂接 + 产物自检**：`ci.yml` `quality` job（`:26-52`）在「生产构建」后（`:35-36`）新增**具名**步骤 `npm run check:content-remote`（新 npm script）→ 跑产物清单自检；`scripts/build-content-remote.mjs` 视 P-S46 决定是否新增 `assertManifestInvariants(manifest)`（**纯函数、可测**，不改既有校验器）。
- **契约与不变量**：
  1. **校验器复用不变**：`build-content-remote.mjs:31/47-48/121-123/141-145` **一行不改**（已达标）。
  2. **产物不变量**（`assertManifestInvariants`）：`schemaVersion === SCHEMA_VERSION`；`contentVersion` 为有限数且 `≥` `CONTENT_VERSION`（构建期即应相等）；`units` 键数 = 分片数；`sitePatch` 为空结构（B1）；`OPTIONAL_SECTIONS` 键存在且为 `null`。
  3. **部署不变量**：`dist/content-remote/manifest.json` 必须**存在且为 JSON**（若缺失 → 部署 job **失败**，而不是静默跳过——避免重现「网页端远程静默失效」）。
  4. **不引网络进 CI 门禁**（P-S46）：CI 断言**只**针对本地产物；「与线上版本对比」**不做成** CI 步骤（CI 里 curl 生产域名脆弱、且需网络），而是放进 SOP（S4-3）作为**人工/脚本**步骤。
- **测试要求（含变异验证 / 反向锚）**：
  - `tests/content-remote-manifest.test.js`（新增）：对**注入式** fixture manifest 断言 4 条不变量；每条各一个**反向锚**（把 `contentVersion` 改 `null` / `units` 改空 / `sitePatch` 填非空 / 删 `search` 键 → 对应断言必须失败）。
  - `tests/build-content-remote.test.js`（既有，扩展）：新增「`collectSnapshot` 合法时 `assertManifestInvariants` 通过；构造 version 不符 → 抛」用例。
  - 静态断言（可选）：`tests/content-remote-ci-wiring.test.js` 读 `ci.yml` 文本，断言 rsync 含 `content-remote` 与 `practice-bank`、且存在具名「内容快照」步骤（反向锚：删该行 → 断言失败）。
- **验收口径**：`npm run build` 仍产出 `dist/content-remote/`（S1 链未破）；`npm run check:content-remote` 绿；`ci.yml` YAML 可解析（本地 `python -c yaml.safe_load`）；`validate:content` + `lint` + `vitest` 全绿；`dist/` rsync 步骤经**空跑**（`rsync --dry-run` 本地模拟）确认路径正确。
- **依赖**：无（S1 产物已就绪）。**工作量**：**M**（4a 为主）。

---

## 4. 方案 A/B 对比：客户端是否重算 sha256（范围 ④）

> **背景**：`mergeContent.js:14-25` 的注释已把「不重算」的三条理由写死，且 `batch-s2-qa-report.md:243`（R-3）记录 team-lead 按 **P-S17 a** 已裁定「不重算、非缺陷」。故本节**不是**从零设计，而是**显式复议**：在 2026-10-15 事故之后再判一次，并给出**可推翻**的推荐。

### 4.1 威胁模型与现有防线（决定「重算能多买到什么」）

| 威胁 | 现有防线（无需重算） | 重算能否加码 |
|---|---|---|
| 缓存被写坏 / 半写 | 逐页 `verifyHash`（`mergeContent.js:92-97`）+ **单元级** `content_cache.units[k].hash !== manifest.units[k].hash → 重拉`（`contentClient.js:181-182`） | 否（已在更粗粒度覆盖） |
| 旧版本覆盖新内容 | 版本闸门 `isNewer`（`mergeContent.js:110-117`） | 否 |
| 半写分片（body 落、meta 未落） | body-先-后-提交点（`contentClient.js:200-217`） | 否 |
| **服务端发布了错误内容、但与其自带 hash 自洽** | **仅**发布期校验（`build-content-remote.mjs:121-145`） | **是**（唯一增量） |
| 域名被接管 / 发布链被不可信者使用 | 无（超出当前威胁模型） | 部分（但 HTTPS 已在上游，重算只是补一层） |

**结论**：重算的**唯一**增量是「服务端自洽但错误」。而该场景恰恰是**发布期校验**的职责，且构建脚本已把 `hash` 与 `blocks` **同源计算**（`build-content-remote.mjs:133`：`hash: hashOf({...base, blocks})`）→ 二者**不可能**在无篡改时失配。故重算的收益窗口**极窄**。

### 4.2 方案 A —— 客户端重算 sha256

两个子方案：

| | **A1：`crypto.subtle.digest('SHA-256', …)`** | **A2：仓内纯 JS sha256（零依赖）** |
|---|---|---|
| 实现 | DOM 内建，异步 Promise | 仓内新增 ~100–140 行（`contentHash.js`） |
| Tauri 可用性 | **未知**（`tauri://localhost` 是否算 secure context 无法自证；全仓 `isSecureContext` 零使用，更正 6） | **确定可用**（纯 JS，无环境依赖） |
| 满足「绝不静默退化」 | ❌ 不满足：不可用时若「跳过校验」= 永不校验；若「降级纯 JS」= 那不如直接 A2 | ✅ 满足：算不出 → fail-safe |
| 新增失效模式 | `crypto` 不可用导致的静默失效 | **JS 哈希实现自身有 bug → 全页误判哈希不符 → 全站回退内置 → 远程层实质失效**（比现在更糟：现在是「能拉即用」，A2 变成「能拉但因实现 bug 全弃」） |
| 需提升 `canonicalJSON` | 是 | 是 |
| 依赖 | 无（DOM 内建） | 无（自实现） |

**共同的 H7 前置**：`canonicalJSON` 现仅存于 Node 侧（`scripts/build-content-remote.mjs:56-62`）。要两端共用，**必须**提升为**纯 ESM、零 import** 的模块，并让旧位置改为 import（H7）。落点二选一（**P-S42**）：
- **(a) `src/content/contentHash.js`** —— 与 `contentManifest.js` / `mergeContent.js` 同族；**但必须在 `load-content.mjs:37-49` 的 `NON_PAGE_FILES` 追加 `'contentHash.js'`**，否则 `collectFiles`（`:68-78`）把它当内容页 → `validate:content` 报孤儿（H6 直接红）。**推荐 (a)**（形状相关口径集中在 `src/content/`，与既有 6 个「纯 ESM 形状模块」一致）。
- **(b) `src/utils/canonicalJson.js`** —— 无需登记（utils 不在内容目录）；且 `build-content-remote.mjs:31` 已有「Node 脚本直接 import `src/utils/*`」先例（`validateBlock.js`）。缺点是「内容形状口径」散到两处目录。

### 4.3 方案 B —— 维持不重算（强化发布期把关 + 文档化威胁模型）

- **代码**：零改动；仅更新 `mergeContent.js:14-25` 注释为「S4 已复议：维持不重算，触发条件见 `docs/proposals/batch-s4-tasks.md` §4」。
- **把关补强**：全部落在 **S4-4**（发布前校验内嵌 + CI 门禁 + 部署闭环）与 **S4-3**（SOP）。
- **代价**：无法检出「服务端自洽但错误」；但该场景由发布期校验**在设计上**排除，且我们的发布链是「自己的 CI + 自己的域名」。

### 4.4 ✅ 推荐：**B（维持不重算）**，A2 登记为「加强版备案」

**理由（四条，按权重）**：

1. **与事故无关**：2026-10-15 事故的根因是「版本闸门 + 漏 bump + CI 不发远程内容」，**哈希重算一条都治不到**。S4 应把力气花在 S4-2 / S4-3 / S4-4-a。
2. **收益窗口极窄**：重算唯一增量（服务端自洽但错误）在无篡改时**不可能**发生——因为 `hash` 与 `blocks` 由构建脚本**同源计算**（`:133`）。真出问题只能是「构建脚本 bug」，那应在**发布期**用测试拦，而非客户端再算一遍。
3. **A1 硬伤**：不满足「绝不静默退化」（Tauri secure context 未知）；A2 硬伤：**新增「哈希实现 bug → 全站回退内置」**这一比现状更严重的失效模式。二者都**增大**了「远程层实质失效」的概率——与「永不变砖」的方向相反（砖是没变，但功能白做了）。
4. **P-S17 a 已裁定**，且 QA 已按此闭合 R-3；翻案需要更强证据，本次复议**未发现**。

**若将来触发翻案（登记触发条件）**：出现**真实**「服务端自洽但错误」事故；或发布链使用者不再可信（如引入管理 API 让非技术者发布，`content-extension-dual-track.md:174` 方案 B）；或威胁模型升级（域名/证书信任被打破）。届时**只走 A2**（A1 因硬伤排除），且必须带上 §4.2 的 fail-safe 守卫与 §S4-1 的反向锚测试。

---

## 5. 范围 ② 详述：pendingUnits 同版本自愈设计

> 落点任务 = **S4-2**；此处给完整设计（实现者照此写，测试照 §3 的 S4-2 段写）。

### 5.1 为什么需要（事故实证）

现状（`contentClient.js:176-188`）：单片拉失败 → 跳过该片、`units` 保留旧哈希；但**同版本不重试**（`isNewer(remoteVer, maxSeen)` 等值 → `not-newer` 直接返回，**根本不进刷新流程**）。`s2-verify-stale.test.js:195-226` 已把这一行为**固化为测试**。事故证明：**版本闸门一旦滞后（漏 bump），失败片会长期陈旧**，且**不报错**——「永不变砖」掩盖问题的另一面。

### 5.2 与闸门的关系（**闸门之外**重试，不放宽闸门）

```js
// doRefresh 重构后（伪代码，红线 4：isNewer 语义不变）
const meta = await db.getContentMeta(CONTENT_META_KEY)
const pending = Array.isArray(meta?.pendingUnits) ? meta.pendingUnits : []
const newer = isNewer(manifest.contentVersion, meta?.contentVersion ?? null)

if (!newer && pending.length === 0) {
  return { updated: false, version: meta?.contentVersion ?? null, units: [], reason: 'not-newer' }
}

// 待拉集：新版 → changedKeys；同版自愈 → pending 自带的坐标（不依赖远程 manifest 可达）
const targets = newer
  ? changedKeysFromManifest(manifest, meta)          // 现有 :181-182 逻辑
  : pending.map((p) => ({ unitKey: p.unitKey, path: p.path, hash: p.hash }))
```

**关键区别**：自愈分支**不**读远程 `manifest.units`（远程可能已不可达），而是用 `pendingUnits` 里**已捕获**的 `{unitKey, path, hash}`（在失败那轮的 manifest 里存下）。

### 5.3 写库原子性（`content_cache` 先落 / `content_meta` 提交点不变）

沿用 `contentClient.js:200-217` 的两段式：

1. 逐片拉 → `buildShardEntry` 校验 → 成功者写 `content_cache`（`:201-204`）。
2. **一次** `saveContentMeta({ key, contentVersion, contentHash, units: nextUnits, pendingUnits: nextPending })`（`:212-217` 扩展）——`pendingUnits` 与 `units` **同一次 put**，是**同一提交点**。
   - `nextPending` = 本轮仍失败的片（保留 attempts+1）；**本轮成功**的片从 pending 移除。
   - `nextUnits` 只把**本轮成功**的片前进（`s2-verify-stale` 已钉死的口径）。
3. 自愈分支下 **`contentVersion` 不前进**（仍为本地值）——因为内容代次没变。

### 5.4 失败路径与可见性

| 场景 | 行为 |
|---|---|
| 自愈拉取仍失败 | `attempts++`，保留在 `pendingUnits`，**静默**（本轮无 warn） |
| `attempts ≥ 上限(5)` | 从 `pendingUnits` 移除 + **一次性** `console.warn` 点名 stale 单元（`超限必报告`；避免**永久**静默陈旧） |
| 版本前进 | `pendingUnits` 被新一轮的 `changedKeys` 结果**取代**（不得并存导致重复拉取） |
| IDB 不可用 | 外层 `try/catch`（`:225-228`）照旧静默返回 `error` |
| 无 pending 且同版本 | 保持现行为：`reason: 'not-newer'`（`s2-verify-stale` 的既有断言**仅**在此场景成立，S4 后须注明） |

### 5.5 与 `isNewer` 的交互（红线 4 的守卫）

- `isNewer` 函数**不改**（`mergeContent.js:110-117`）；只多了一个**调用点分支**。
- 守卫测试：构造「远程 version = 本地 version，但 pending 空」→ 断言 `reason === 'not-newer'` 且**零分片请求**（沿用 `s2-verify-stale.test.js:214-225` 的 `fetch.mock.calls` 断言法）——证明自愈**没有**放宽闸门。

### 5.6 DB 仍 v7（为何不需要新表）

`content_meta` 是**单记录**存储（`keyPath:'key'`，`studyDb.js:190-191`），`saveContentMeta` 是**整体 put**（`:694-696`）。`pendingUnits` 最多 27 项（≤ 单元数），作为一个**记录内字段**零成本。**不需要**新 store、**不需要** `DB_VERSION` 变更 → **仍 v7**（红线 5）。**替代方案被否决**：新增 `content_pending` store 需升 v8，为一个 ≤27 项的小数组付一次全库迁移，不划算（且 S1 已刻意「预留 v7 避免 S2 再升版」，升 v8 会破坏该决策的一致性）。

---

## 6. 范围 ③ 详述：前进式回滚 SOP（写进哪份文档 + 四段步骤）

### 6.1 落点（**P-S45**）

**推荐：新建 `docs/content-release-runbook.md`**，并从三处加链接（`implementation-roadmap.md` S4 行 / `contentManifest.js:33-38` 注释 / `远程内容链路验证清单.md` §2.4）。

**为什么不并入现有文档**：
- `docs/远程内容链路验证清单.md` 是一次性**验证记录**（有明确时间戳、有「待办」段），SOP 是**长期可复用流程**——混在一起会随验证记录过时而腐化。
- `batch-s2-workcard.md §5.4` 是**批次施工文档**，会被后续批次覆盖/淹没；SOP 需要稳定 URL。
- 独立 SOP 文件可被 CI 静态断言（见 §3 S4-3 测试），是「把纪律变成可验证资产」的正确形态。

### 6.2 四段步骤（SOP 正文骨架）

**第 1 段 · Bump（改内容 → 版本 +1）**
1. 改 `src/content/**`（按 H5，若涉及新 schema 字段先走白名单）。
2. **`src/content/contentManifest.js` 的 `CONTENT_VERSION` +1**（`contentManifest.js:40`）。
3. **回滚同样走本段**：从备份/`git` 恢复旧好内容后，**也必须 +1**（回滚 = 发一版**号更大**的旧内容）。

**第 2 段 · 重建（构建 + 产物自检）**
4. `npm run build:content-remote`（产出 manifest + 27 分片）+ `npm run build:search`（题库/搜索同代次）。
5. 核对产物四项：`contentVersion`、`contentHash`、单元数（27）、页数（当前 183）。
6. 跑 `npm run check:content-remote`（S4-4b 新增的产物不变量自检）。

**第 3 段 · 部署（零停机 + 顺序）**
7. **备份**：`curl -s https://520305.top/content-remote/manifest.json > /tmp/danzhao-backup-<ts>-manifest.json`（记录当前线上版本）。
8. rsync **先分片后 manifest**：分片增量传（不带 `--delete`），`manifest.json` **最后**单独传（与 `ci.yml:150-160` 的「最后切入口」纪律同款）——保证任何时刻线上 manifest 指向的分片都已就位。
9. （Web 端）`dist/` 里 `content-remote/` 与 `practice-bank/` 必须随部署一起上线（S4-4a 修 CI 后的自动行为）。

**第 4 段 · 验证（部署后四项探测）**
10. `curl -sI .../content-remote/manifest.json` → **200 + `application/json`**（不是 `text/html`；`text/html` = SPA fallback = 文件不存在，验证清单 §1 `:18` 已记此法）。
11. 线上 `contentVersion` **等于**本地刚构建的值，且 **`>` 备份值**（证明是「向前」的一版）。
12. 域名侧实测 1 页（新内容可见）。
13. 已缓存客户端行为：清空请求日志 → 刷新 → `manifest.json` 恰好 1 次（沿用验证清单 §2.0 观察 1）。

### 6.3 SOP 必须写死的「反事故条款」

> **严禁**降 `CONTENT_VERSION`；**严禁**同版本覆盖发布；**必须**先 bump 再构建再部署。（2026-10-15 事故：线上 v1 不含新内容 + 漏 bump → `contentClient.js:176` 闸门返回 `not-newer` → 已缓存客户端**永久拉不到且不报错**。）
> **排查指引**：遇到「内容改了客户端没更新」→ **先查 `CONTENT_VERSION` 有没有 +1**。

---

## 7. 范围 ⑤ 详述：发布前校验关卡内嵌 —— 现状核实 + 剩余缺口

### 7.1 现状（已实现的部分，勿重做）

| 环节 | 现状 | 证据 |
|---|---|---|
| 逐块语义校验（CI 同款） | ✅ 已内嵌 | `build-content-remote.mjs:31` import `createBlockValidator`；`:47-48` 建校验器；`:121-123` 逐页逐块校验 |
| 校验不过 → **不落盘** | ✅ 硬关卡 | `:141-145` 有错即 `throw`；`build()` `:210-232` 只在 `collectSnapshot` 成功后才写盘 |
| `npm run build` 失败即中断 | ✅ | `package.json` `prebuild = build:index && build:content-remote`（`&&` 短路） |
| 超限必报告 | ✅ | `build-content-remote.mjs:175-180`（分片超 `SHARD_WARN_BYTES` 点名 warn，不截断） |

### 7.2 剩余缺口（S4-4 要补的三条）

1. **CI 显式挂接缺失**：当前 `build:content-remote` 只在 `npm run build` 经 `prebuild` **隐式**触发；CI（`ci.yml:26-52`）**无具名**「内容快照校验」步骤；也**无**产物清单形态 / 版本单调性自检 → 清单格式若被改坏，CI 未必红。→ **S4-4b**。
2. **部署闭环缺失（更正 1，头号）**：`ci.yml` `deploy` job 的 rsync（`:141-160`）**不含** `dist/content-remote/` 与 `dist/practice-bank/` → 自动部署**不会**发布远程内容，网页端远程更新**静默失效**。→ **S4-4a**。
3. **「同号覆盖」无守卫**：发布脚本不会比对「本地 `contentVersion` vs 线上现存版本」。这是事故的**直接**机制（同号覆盖 → 客户端 not-newer）。**但**「CI 里 curl 生产域名」脆弱且需网络 → 建议**不做成 CI 步骤**，而是放进 SOP（§6 第 3 段第 7-8 步）+ 可选独立脚本 `scripts/preflight-content-remote.mjs`（人工运行，`curl` 线上 manifest，若本地 ≤ 线上则拒发）。→ **P-S46 裁决**。

---

## 8. 依赖

| 依赖对象 | 类型 | 状态 |
|---|---|---|
| S1（`contentManifest.js` / `build-content-remote.mjs` / 产物形状） | 上游批次 | ✅ 已合入（HEAD `69e81c7`） |
| S2（`contentClient.js` / `mergeContent.js` / `loadPage.js` / v7 两表） | 上游批次 | ✅ 已合入 |
| S3（部署 + `CONTENT_VERSION` 纪律 + `/tmp` 备份惯例） | 上游批次 | ✅ 已落地；⚠️ **CI 部署闭环未完成**（更正 1）→ 由 S4-4a 收口 |
| **内容侧** | — | **无**（S4 零内容侧依赖；不触碰 `src/content/**` 内容页） |
| **外部 / 工具链** | — | **无新增**。`crypto.subtle` 的真机可用性属 **S5/P5 待核实**（S4 只留探测桩 + 降级，不做真机断言） |
| **运维 / 部署** | 环境 | rsync + SSH 密钥（`ci.yml` 已有）；生产域名探测需网络（→ 放 SOP，不进 CI 门禁） |

---

## 9. 约束影响（H1–H7 逐条）

| 硬约束 | S4 影响 | 落实点 |
|---|---|---|
| **H1 CSP `script-src 'self'`** | 零新增运行时能力；不引 npm 依赖；远程仍只 `fetch + JSON.parse`。方案 A2 的纯 JS sha256 是**仓内代码**（非依赖、非 `eval`/`import()`），合规；A1 的 `crypto.subtle` 是 DOM 内建，亦合规但受 secure context 限制 | `tests/csp-guard.test.js` L3/L4/L6；S4-1 反向锚断言「未引重算」 |
| **H2 `site.js` append-only** | **不涉及**：S4 不消费、不产出 `sitePatch`（B1 恒空，`build-content-remote.mjs:192-193`） | — |
| **H3 判分↔自评二分** | **不涉及**（S4 不碰判分） | — |
| **H4 Node v22 + 沙箱测试口径** | 所有新测试跑 Node v22；`vitest --pool=threads --maxWorkers=1`（沙箱 forks pool 损坏）；Python/Node 复核数字 | §11 |
| **H5 schema 白名单** | **零 schema 改动**；不碰 `validateBlock.js` / `content-schema.json` | — |
| **H6 `validate:content` + `lint --max-warnings 0` 硬关卡** | S4 若把 `contentHash.js` 放 `src/content/` → **必须**登记 `NON_PAGE_FILES`（否则孤儿报错）；新脚本/新测试纳入 lint 范围（`eslint src tests scripts`） | `load-content.mjs:37-49`；§3 S4-1 |
| **H7 单一真相源** | `canonicalJSON` 若提升**必须**一处实现（旧位置改 import，不留副本）；闸门语义只在 `mergeContent.js`；pendingUnits 坐标口径只在 `contentClient.js`；SOP 只在 runbook 一份 | §4.2 / §3 |

> **本批对 H1–H7 的净变化**：**零新增硬约束**；仅当 §4 选 A2 时，`NON_PAGE_FILES` 增一项（`contentHash.js`，遵循既有登记纪律，非新约束）。

---

## 10. 待拍板项（编号 **P-S41…P-S47**）

> 编号段位说明：S1 用 `P-S0x`、S2 用 `P-S1x`（已成惯例）；S3 未出任务卡（走 workcard），故 S4 用 **`P-S4x`** 段位，与既往不冲突。每项 2–3 选项 + 推荐 + 理由。

| 编号 | 议题 | 选项 | ✅ 推荐 + 理由 |
|---|---|---|---|
| **P-S41** | 范围 ④：是否客户端重算 sha256 | (a) **维持不重算**（B）(b) A2 纯 JS sha256 (c) A1 `crypto.subtle` | **(a)**。与事故无因果；收益窗口极窄（hash 与 blocks 同源计算）；(c) 硬伤=不满足「绝不静默退化」，(b) 硬伤=新增「哈希实现 bug→全站回退」失效模式；且 P-S17 a 已裁定、QA 已闭合 |
| **P-S42** | `canonicalJSON` 若提升，落点 | (a) `src/content/contentHash.js`（登记 `NON_PAGE_FILES`）(b) `src/utils/canonicalJson.js`（免登记） | **(a)**（**仅当 P-S41 选 b/c 才生效**）。与 `contentManifest`/`mergeContent` 同族，内容形状口径集中在 `src/content/`；登记纪律是既有惯例（11 项） |
| **P-S43** | pendingUnits 存储位置 | (a) 扩 `content_meta` 记录字段（**仍 v7**）(b) 新增 `content_pending` store（升 v8） | **(a)**。`content_meta` 是单记录整体 put，扩字段零 DDL；(b) 为 ≤27 项数组付一次全库迁移，且破坏「S1 预留 v7 避免再升版」的一致性 |
| **P-S44** | pendingUnits 重试策略 | (a) 随「每会话一次后台刷新」自然重试 + `attempts` 上限 5 + 达上限一次性 warn (b) 不限次静默 (c) 指数退避（需持久化时间戳） | **(a)**。无重试风暴（`backgroundStarted` 保证每会话一次）；上限避免永久静默陈旧（`超限必报告`）；(c) 复杂且与本仓「离线优先、静默」基调不符 |
| **P-S45** | 回滚 SOP 落点 | (a) 新建 `docs/content-release-runbook.md` (b) 并入 `docs/远程内容链路验证清单.md` (c) 并入 `batch-s2-workcard.md §5.4` | **(a)**。SOP 需稳定 URL 且长期复用；(b) 是一次性验证记录（会过期），(c) 是批次施工文档（会被淹没） |
| **P-S46** | 范围 ⑤「内嵌」范围 | (a) CI 显式挂接 + **部署闭环**（含 `dist/content-remote/`+`practice-bank/` rsync）+ 产物自检 `check:content-remote`（`preflight` 线上对比为独立人工脚本）(b) 仅 CI 显式挂接 (c) 全交 SOP 人工 | **(a)**。部署闭环（更正 1）是**头号真实缺口**，不修则自动部署永远不发远程内容；「线上版本对比」**不**进 CI（避免 CI 依赖生产网络），降为人工/独立脚本 |
| **P-S47** | 是否顺带修 QA R-2（`isValidManifest` 对 `contentVersion` 偏松：`Number(null)===0` 会通过） | (a) 顺带收紧为 `typeof === 'number' && Number.isFinite()` (b) 不改（保持「纵深防御已够」） | **(a)**。一行改动、低风险、与 S4「校验」主题同族；`build-content-remote.mjs` 恒产出数字，收紧不会误杀。若求最小 diff 可选 (b) |

---

## 11. 验证方式

### 11.1 测试文件

| 文件 | 覆盖 | 新增/改 |
|---|---|---|
| `tests/content-client-pending.test.js` | 范围 ②：pendingUnits 自愈（含正向②、上限、版本前进取代、零回归） | 新增 |
| `tests/s4-verify-gate.test.js` | 范围 ①/②：闸门不变量 + 「未引重算」反向锚 | 新增 |
| `tests/s2-verify-stale.test.js` | 范围 ②：**改写**「同版本不重试」断言（S4 后同版本**可**自愈） | 改 |
| `tests/content-remote-manifest.test.js` | 范围 ⑤：产物清单 4 条不变量（各带反向锚） | 新增 |
| `tests/build-content-remote.test.js` | 范围 ⑤：`assertManifestInvariants` 正/负例 | 改（扩展） |
| `tests/content-release-runbook.test.js` | 范围 ③：SOP 四段 + 反事故条款 + 三处链接（静态文本断言） | 新增 |
| `tests/content-remote-ci-wiring.test.js`（可选，视 P-S46） | 范围 ⑤a：`ci.yml` rsync 含 `content-remote`/`practice-bank` | 新增 |
| `tests/content-hash.test.js`（**仅当 P-S41 选 b/c**） | 范围 ④：纯 JS sha256 跨实现等价 + 键序不变性 + 反向锚 | 新增（条件） |

### 11.2 门禁（CI 复现同款）

```
1. npm run validate:content        # H6，孤儿页/块语义
2. npm run lint                    # eslint src tests scripts --max-warnings 0
3. npm test                        # vitest run
4. npm run build                   # 经 prebuild → build:content-remote，产物就绪
5. npm run check:content-remote    # ← S4-4b 新增：产物清单不变量自检
6. npm run check:dup / check:single# 既有题库守卫（不受影响）
```

### 11.3 沙箱 / 环境口径（硬性）

- **Node v22**（`/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node`）。
- **vitest 必须** `--pool=threads --maxWorkers=1`（沙箱 forks pool 损坏；见既有纪律）。
- **不得读盘产物**：`public/content-remote/` 已 gitignore（S1），干净树/CI 无产物 → 一律**注入式 fixture / mock fetch / `fake-indexeddb`**（与 S2 同款）。
- **数字用 Python/Node 复核**，**不用** shell `grep`（本环境 grep 漏命中，已多次实证）。
- **不做真机断言**：`crypto.subtle` 在 Tauri 下的可用性属 S5/P5；S4 仅留探测桩 + 降级路径（且推荐 B 后基本不涉及）。

### 11.4 变异验证（反向锚）思路汇总

> 本仓惯例「**反向锚**」：**先证明守卫会咬**（把被测逻辑改坏 → 断言**必须**失败），**再证明实现通过**。S4 各任务的锚点：
- S4-1：断言 `mergeContent.js` / `contentClient.js` **不含** `crypto.subtle` / `createHash` 引用（防「偷偷加重算」）；若走 A2，改 sha256 轮常量一个字节 → 等价断言必失败。
- S4-2：删掉 `!isNewer && pending.length` 分支 → 自愈正向②**必失败**；反转 `attempts` 上限判断 → 上限用例必失败。
- S4-3：删 SOP 的「严禁同号覆盖」句 → 文档断言必失败。
- S4-4：把 `contentVersion` 改 `null` / `units` 清空 / `sitePatch` 填非空 / 删 `search` 键 → 对应不变量断言必失败；删 `ci.yml` 的 `content-remote` rsync 行 → 接线断言必失败。

---

## 12. 工作量（S/M/L，不承诺日期）

| 任务 | 范围 | 工作量 |
|---|---|---|
| **S4-1** 哈希兜底决策 | ④ | **S**（推荐路径≈零代码；A2 则 **M**） |
| **S4-2** pendingUnits 自愈 | ② | **M** |
| **S4-3** 回滚 SOP | ③ | **S** |
| **S4-4** 发布前关卡内嵌（CI 挂接 + 部署闭环） | ①⑤ | **M**（4a 部署闭环为主） |
| **合计** | — | **S–M**（与排期表 `content-extension-dual-track.md:253` 一致） |

**关键路径**：无（S4 无对 S5/P5 的前置依赖）。S4-4a 部署闭环是**最高价值且最独立**的一项，建议**先行**。

---

## 附：本文件核对过的代码事实（实测 HEAD=`69e81c7`）

| 事实 | 位置 |
|---|---|
| `DB_VERSION = 7`（不动） | `src/stores/studyDb.js:33` |
| `content_cache` / `content_meta` 建表（`keyPath:'key'`） | `src/stores/studyDb.js:187-191` |
| 缓存访问器（整体 put） | `studyDb.js:651/661/683/694` |
| 版本闸门（闸门在单元哈希比对**之前**） | `src/utils/contentClient.js:176` |
| 「失败片同版本不重试」+ `pendingUnits` 意图注释 | `src/utils/contentClient.js:184-188` |
| body 先落 / meta 提交点 | `src/utils/contentClient.js:200-217` |
| `isNewer` 严格大于 | `src/content/mergeContent.js:110-117` |
| 不重算 sha256 的三条理由（S4 复议点） | `src/content/mergeContent.js:14-25` |
| `CONTENT_VERSION = 2` + 事故注释 | `src/content/contentManifest.js:40` / `:33-38` |
| `NON_PAGE_FILES` 现 11 项 | `scripts/lib/load-content.mjs:37-49` |
| 校验器内嵌 + 不落盘硬关卡 | `scripts/build-content-remote.mjs:31/47-48/121-123/141-145` |
| `hash` 与 `blocks` 同源计算 | `scripts/build-content-remote.mjs:133` |
| `sitePatch` 恒空（B1） | `scripts/build-content-remote.mjs:192-193` |
| `prebuild` 含 `build:content-remote` | `package.json` scripts |
| CI `deploy` rsync **不含** `content-remote`/`practice-bank` | `.github/workflows/ci.yml:141-160` |
| 事故记录（v1 漏 bump → not-newer） | `docs/远程内容链路验证清单.md:206-220` |
| QA 残留 R-1/R-2/R-3 | `docs/proposals/batch-s2-qa-report.md:241-243` |
| 本环境 grep 漏命中实证 | `docs/proposals/batch-s2-qa-report.md:249-252` |

> 本文件为功能实现侧技术规划，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。



