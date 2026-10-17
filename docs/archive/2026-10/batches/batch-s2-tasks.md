# 批 S2「客户端加载层 + 缓存」实施任务卡

> 状态：**规划定稿（未写代码）**。本文把 `docs/proposals/content-extension-dual-track.md` 已定稿方案中的 **S2** 转成可直接开工的实施卡。
> 角色：架构师（Bob）产出；供工程师照单实现，供 team-lead 裁决 §5 待拍板项。
> 上游（已读并内化）：
> - `docs/proposals/content-extension-dual-track.md` §2.3（客户端加载优先级链）+ §8（6 个方案级决策点**已拍板**：B1 / 静态目录 / 内容层优先 / 协议共用实现延后 / 前进式回滚 / 启动检查+后台静默）
> - **`src/content/contentManifest.js`（S1 已落盘，120 行，HEAD=`904847a` 工作树）** —— S2 的**形状唯一真相源（H7）**
> - `docs/proposals/batch-s1-tasks.md`（本卡格式与其对齐）
> - 源码实测：`src/content/loadPage.js` / `src/content/index.js` / `src/stores/studyDb.js` / `src/utils/practiceBankClient.js` / `src/sync/apiBase.js` / `src/content/pageMeta.js` / `src/sync/engine.js` / `src/views/UnitView.vue` / `src/components/SearchPanel.vue` / `vitest.config.js` / `package.json` / `src-tauri/tauri.conf.json`
>
> **纪律**：只读核实，不写产品代码；行号一律以**当前工作树实测**为准（HEAD = **`904847a`**）；数字一律用 Node/Python 脚本复核（本环境 `grep` 漏命中，已有多次实证）。

---

## 0. 读码更正（dual-track 旧说 vs 实测 vs 对 S2 的影响）

> 本轮共更正 **8 条**（其中 3 条为上游已知漂移，另 5 条为本次新发现）。

| # | 旧说（dual-track / 上游） | 实测（HEAD=`904847a`） | 对 S2 的影响 |
|---|---|---|---|
| **1** | §2.3「`studyDb.js` 新增 `content_cache`/`content_meta`；`DB_VERSION` 由 **6 → 7**」（引 `:29,50-118`） | **已提前完成**：`studyDb.js:33` `DB_VERSION = 7`（`DB_NAME` `:32` 不变）；`:17`/`:27` 注释明写「S2 内容双轨**预留空表**（v7 建、当前不含数据）……避免 S2 再升 v8」；`:180-191`（`oldVersion < 7` 段）已 `createObjectStore` 两表（`keyPath:'key'`；`:54` 为 `onupgradeneeded` 起点） | **S2 不升 DB 版本、不建表**。只需补**访问器方法**（实测无任何 `get/saveContentCache/Meta`）。⚠️ 行号 `:50-118` 漂移 → 实为 `:180-191` |
| **2** | §0/§2.3「内容源 **139** 页 / 139 chunk」 | `collectFiles` 实得 **182** 页；学科单元数 **27**（math 12 / chinese 7 / computer 8；页数 82/46/54），对应 **27 个分片** | 兜底链须对 182 页全成立；分片 27 个 → 后台静默更新按单元**增量**拉取才有意义 |
| **3** | §2.3「启动：先用内置基线即时渲染 → 读缓存 → 后台拉远程」——**未涉及进页时机** | 实测 `loadPage.js:31-36` `loadPage()` **每次进页都执行一次**、**无任何缓存**；且 `UnitView.vue` 有**两条**加载路径：① `:399` 本地 `loadPage()`（首载/跨单元，`:414`/`:657` 调用）② `:543-567` `transitionedLoad()`（滑动翻页，**400ms 竞速**：`Promise.race([dataPromise, sleep(400)])`，超时先入场、数据后到再换 `page.value`） | **S2 不能简单把 `loadPage` 改成 await 远程**——会拖慢 400ms 竞速、劣化翻页转场。远程层须**可失败即退化**，并保证「超时先入场」分支不被破坏。见 §5 **P-S11** |
| **4** | §2.3 客户端 loader 名 `contentClient.js`（落 `src/utils/`）；附 A classDiagram 中 `contentClient` 含 **`getResolvedSite(subject)`** | B1 阶段 **`sitePatch` 恒为空结构**（`contentManifest.js:41` `OPTIONAL_SECTIONS` 只预留 `search`/`practice`；`OP.APPEND` 仅协议预留 `:106`） | **S2 不实现 `getResolvedSite` / `mergeSite`**——B1 无 site 合并需求；实现它会误导 B2 已可用，且触碰导航派生层（红线 4）。`mergeContent.js` 只出 `pickPage` / `verifyHash` / `isNewer` |
| **5** | §2.3「沿用 `practiceBankClient.js:19-23` 的『首次 fetch 后不再重复请求』缓存纪律，**扩展为持久化**」 | 实测该纪律存在但**仅内存级**：`practiceBankClient.js:11` `let indexCache = null`（`:18` 命中即返）、`:26` `const shardCache = new Map()`（`:34` 命中即返）。**无 IndexedDB 落盘** | S2 才是「持久化」这一步：缓存须落 `content_cache`（IndexedDB）；内存 Map 只作**进程内二级缓存**（避免每次读 IDB） |
| **6** | §2.5「Web 生产同源 `/content-remote/`；Tauri 从 `VITE_API_BASE` 源派生绝对地址」 | 实测静态产物消费方**全部用相对路径 `./`**：`practiceBankClient.js:19/:35`、`SearchPanel.vue:124/:153`。`apiBase.js:24` `IS_ABSOLUTE_API` 判定分支存在 ✅（`:21` 去尾斜杠） | 相对路径在 **Tauri（`tauri://localhost`）下是否可用**属**待核实**（现成检索/题库亦如此）。S2 须按 `IS_ABSOLUTE_API` 派生，见 §5 **P-S16** |
| **7** | §0「`SUBJECTS`/`getSubjectConfig` 被 **9+ 处**消费」 | 实测 `getSubjectConfig(` 命中 **9 个文件**：`src/content/index.js`（定义 `:41-43`）、`loadPage.js:32`、+ **7 个视图**（`DashboardView`/`ErrorBookView`/`HomeView`/`ProfileView`/`UnitView`/`practice/PracticeConfig`/`practice/PracticeHome`）→ **8 处外部消费** | B1 **零改动**这 8 处 + `index.js` + `site.js`（红线 4），由测试钉死 |
| **8** | §0「`loadPage` 走 Vite 动态 import」；未提**命名冲突** | `UnitView.vue:158` 因本组件已有同名 `loadPage`（`:399`）而用**别名** `loadPage as loadContentPage`；`loadPage.js:20-22` `importPageModule` 依赖**字面量前缀** `@/content/${subject}/${folder}/${name}.js`（`:14-18` 注释明写：改成变量拼接会把 182 页打成同一巨型 chunk） | S2 改 `loadPage.js` 时**不得**动 `importPageModule` 的模板前缀（H1/打包资产）；UnitView 侧注意别名命名，勿误改本地 `loadPage` |

> **另注（非更正，但影响测试）**：S1 已把 `public/content-remote/` 写入 `.gitignore`（工作树 diff 已确认）→ **干净工作树 / CI 里没有远程产物**。**S2 测试不得依赖读盘产物**，须用注入式 fixture/mock（与批 F QA「干净树 6 跳过」同款环境性陷阱）。见 §6。

---

## 1. 目标与范围

### 1.1 S2 做什么（交付物）

建立「**远程缓存(IndexedDB) > 远程拉取(fetch) > 内置打包(dynamic import)**」的优先级链，把远程 `blocks` 交给**现有** `hydratePage` + `BlockRenderer` 渲染。

| 交付物 | 说明 |
|---|---|
| **客户端 loader** | `contentClient.js`：基址派生 → 拉 manifest → **版本闸门** → 增量拉变更分片 → 哈希 + 轻量结构校验 → **原子写 IndexedDB** → 供 `loadPage` 查询。全程 **`fetch + JSON.parse`**（H1） |
| **合并纯函数** | `mergeContent.js`：页面级优先级裁决（`pickPage`）、哈希比对（`verifyHash`）、版本闸门（`isNewer`）。**纯函数、易测** |
| **IndexedDB 持久化** | 复用**已存在的** `content_cache` / `content_meta` 两表（**不升版**），补齐访问器 |
| **`loadPage` 接入** | 在**唯一入口**插入远程优先，内置兜底**路径原样保留** |
| **单测** | 优先级链 / 版本闸门 / 哈希不符回退 / 离线兜底 / 导航零改动守卫 |

### 1.2 六条红线（本卡钉死）

1. **H1 CSP**：远程内容**只能** `fetch + JSON.parse`，**禁止**远程 ESM 动态 `import()` / `eval`；产物是纯 JSON。
2. **轨道 A 零回归**：182 页内置 + `import.meta.glob` 懒加载 chunk **原样保留**；远程拿不到 / 解析失败 / 哈希不符 → **一律回退内置**，永不变砖。
3. **页面级优先级**：同坐标 **远程 > 内置**。**版本级闸门**：仅当 `远程 contentVersion > 本地 maxSeen` 才整批替换缓存；**旧的/等值的一律不写**（杜绝回退事故）。
4. **B1 边界**：只 upsert **既有坐标**的 blocks；`sitePatch` 在 B1 **恒为空结构** —— **不消费、不改导航、不改 `site.js`、不改 `fileIndex`**（fileIndex 是 URL 与历史进度的身份，位移 = 全部用户进度与分享链接错位）。
5. **纯新增坐标**（B1 不产出，仅协议预留）若加载失败 → 该页显示「内容加载失败」占位，**不崩溃**。
6. **离线优先**，失败**静默跳过**（沿用 `practiceBankClient` 缓存纪律，扩为持久化）；**内容缓存刻意不进 `sync` 的 LWW 同步**。

### 1.3 边界（明确 out of scope）

| 非目标 | 归属 |
|---|---|
| rsync / CI 发布 | **S3** |
| 前进式回滚**流程**文档化（S2 只需实现「只认更新的一版」闸门） | **S4** |
| 搜索 / 题库远程化 | **S5+**（`contentManifest.js:41` 键位已预留，S2 不消费） |
| 远程新增单元 / 页面（导航派生层改造） | **B2**（`OP.APPEND` 仅协议预留） |
| 改 `src/content/site.js` / `index.js` / `fileIndex` | **永不**（红线 4） |

---

## 2. 落点（读码核实的文件）

| 动作 | 路径 | 说明 |
|---|---|---|
| **新增** | `src/utils/contentClient.js` | **客户端 loader**。基址派生（见 P-S16）→ `loadManifest()` → 版本闸门（`isNewer`）→ 增量拉变更分片 → `verifyHash` + 轻量结构校验 → 写 `content_cache` / `content_meta` → `getPage()` 供 `loadPage` 查。**全程 `fetch`+`JSON.parse`，零 `import()`/eval** |
| **新增** | `src/content/mergeContent.js` | **纯函数**（易测）：`pickPage(builtin, remote)`（远程优先、null 回落内置）、`verifyHash(page, expected)`（`HASH_PREFIX` 比对）、`isNewer(remoteVer, maxSeen)`（严格大于）。**不实现 `mergeSite`/`getResolvedSite`**（更正 4） |
| **改（核心）** | `src/content/loadPage.js` | 在 `loadPage()`（`:31-36`）内插入远程优先；**`importPageModule`（`:20-22`）与其 `@/content/...` 字面量前缀原样不动**。`prefetchPage`（`:45-58`）/ `clearPrefetch`（`:61-63`）保持内置语义（是否远程预热见 P-S18） |
| **改** | `src/stores/studyDb.js` | **只补访问器**（`getContentCache/saveContentCache/getContentMeta/saveContentMeta`），复用已建两表 `content_cache` / `content_meta`（`:187-191`）。**绝不改 `DB_VERSION`（`:33` = 7）** |
| **改（视 P-S13）** | `src/stores/content.js`（新增 Pinia）**或** 事件总线 | 更新通知（见 §5 P-S13） |
| **改（视 P-S11）** | `src/App.vue`（或 `main.js`） | 「启动检查 + 后台静默更新」触发点（已拍板；落点待 P-S11） |
| **改（小）** | `src/views/UnitView.vue` | 纯新增坐标失败 → 「内容加载失败」占位（红线 5）；**不得**破坏 `:543-567` 的 400ms 竞速与 `:399` 本地 `loadPage`；**不得**改 `:158` 的别名导入语义 |
| **新增** | `tests/merge-content.test.js` | 纯函数：优先裁决 / 哈希比对 / 版本闸门（严格大于，等值与更旧**不写**） |
| **新增** | `tests/content-client.test.js` | mock `fetch`：离线兜底、解析失败、哈希不符、版本闸门、原子写、静默跳过 |
| **新增** | `tests/loadpage-remote-fallback.test.js` | 端到端（mock 层）：远程命中→用远程；任一步失败→回退内置；**内置 182 页零回归** |
| **复用（不改）** | `src/content/contentManifest.js`（S1）、`src/content/pageMeta.js`（`resolvePageMeta` `:31-53` / `pageFileKeyOf` `:63-65` / **`hydratePage` `:77-79`**）、`src/sync/apiBase.js`（`:21`/`:24`）、`src/content/index.js`、`src/content/site.js` | H7 单一来源，**禁止**复制其逻辑 |

**关键接口（伪代码级）**

```js
// src/utils/contentClient.js —— 只给签名 + 要点
import { API_BASE, IS_ABSOLUTE_API } from '@/sync/apiBase'        // 基址派生（P-S16）
import { REMOTE_DIR, MANIFEST_PATH, shardPath, unitKeyOf, pageKeyOf, OP, HASH_PREFIX } from '@/content/contentManifest'
import { pickPage, verifyHash, isNewer } from '@/content/mergeContent'

export async function refreshIfNewer() { /* 拉 manifest → isNewer 才增量拉分片 → 校验 → 原子写 IDB；失败静默跳过 */ }
export async function getRemotePage(subject, unitNum, fileIndex) { /* 读 content_cache → PageEntry|null（B1 只认 OP.UPSERT 的既有坐标） */ }

// src/content/loadPage.js —— 远程优先 + 内置兜底
export async function loadPage(subject, unitNum, fileIndex) {
  const meta = resolvePageMeta(getSubjectConfig(subject), unitNum, fileIndex)
  if (!meta) return null
  try {
    const remote = await getRemotePage(subject, unitNum, fileIndex)   // 远程缓存（离线优先）
    if (remote) return hydratePage({ blocks: remote.blocks }, meta)   // ← 复用同一 hydratePage（H7）
  } catch { /* 静默：任何异常都走内置 */ }
  const mod = await importPageModule(subject, meta.folder, meta.name) // 内置兜底，原样
  return hydratePage(mod.default, meta)
}
```

> **`hydratePage` 可直接吃远程页**：`pageMeta.js:78` 只读 `rawModule?.blocks` → 传 `{ blocks }` 即产出同一形状，`BlockRenderer` 零改动。这是「远程块交给现有渲染链」的**关键实现点**，勿另写第二套 hydrate（H7）。

---

## 3. 依赖

| 依赖 | 标注 | 说明 |
|---|---|---|
| **S1 产物** | **硬依赖** | `contentManifest.js` 已落盘（`SCHEMA_VERSION=1` / `shardPath` / `unitKeyOf` / `pageKeyOf` / `OP` / `HASH_PREFIX`）；`scripts/build-content-remote.mjs` 与 `public/content-remote/**` 待 S1 完成（**测试须 mock，不依赖盘上产物**） |
| **内容侧** | **无** | S2 消费 S1 快照，不要求内容侧新增字段/页；内容侧改内容后重跑 `build:content-remote`（S3 发布）即可 |
| **外部 / 工具链** | **无新增** | `fetch` 浏览器原生；IndexedDB 已 v7 就绪；**无新 npm 依赖** |
| **待核实** | **Tauri 下相对路径可用性** | 现成消费方全用 `./`（`practiceBankClient.js:19/:35`、`SearchPanel.vue:124/:153`）；Tauri（`tauri://localhost`）下是否可达需**真机/打包实测**。见 §5 P-S16 |
| **待核实** | **CSP 是否需要改** | 预期**不改**：Web 同源走 `'self'`；Tauri 走 `https://520305.top`，已在 `connect-src`。若 S3 改用**另一域名**则须同步 CSP + devCsp（L2 登记）。核实方法：`grep connect-src src-tauri/tauri.conf.json` 比对发布域名 |

---

## 4. 约束影响（H1–H7 逐条）

| 硬约束 | S2 是否触及 | 说明 / 保证 |
|---|---|---|
| **H1** CSP `script-src 'self'`（禁 eval / 运行时动态 import） | **是（核心红线）** | 远程内容**只能** `fetch + JSON.parse`（纯 JSON 数据）；**禁止**远程 ESM 动态 `import()` / `eval` / `new Function`。⚠️ `contentClient.js` **不得**出现任何 `import()`（含拼接）——`tests/csp-guard.test.js` **L6** 会扫 `src/**`。**预期不改 CSP**：Web 同源走 `'self'`；Tauri 走 `https://520305.top` 已在 `connect-src`（若 S3 换域名须同步 prod+dev 并过 L2 登记）。 |
| **H2** `site.js` `files[]` 只允许末尾追加（顺序即 fileIndex） | **是（需钉死）** | B1 **不消费** `sitePatch`（恒空）；**不改** `src/content/site.js`、**不改** `src/content/index.js`、**不改** `fileIndex`、不实现导航合并。→ 由 `tests/loadpage-remote-fallback.test.js` 静态断言「`resolvePageMeta` 输入仍是内置 `getSubjectConfig` 原对象」+ 人工复核 git diff 无 `index.js`/`site.js`。 |
| **H3** 判分 ↔ 自评二歧 | **否（但需知悉）** | S2 只搬 `blocks`，不涉判分/自评。⚠️ 知悉项：**远程更新内容后，题库（`public/practice-bank/*`，构建期产物）不会跟着变** → 过渡期「看得到新内容、练不到新题」，此项已由方案 §5 拍板「可接受，S5+ 接入」。**不得**为消除该分裂而在运行期重算题库。 |
| **H4** Node v22 | **是** | 跑测用 Node v22（`/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node`）；IndexedDB 用 **已存在的** devDependency `fake-indexeddb`（`vitest.config.js` `environment:'node'`，22 个既有测试在用，先例充分）。 |
| **H5** schema 白名单流程 | **否（本阶段）** | S2 **不新增** block 类型/字段；远程 `blocks` 复用**现有** schema 语义（服务端已把关，客户端只做轻量结构校验，见 P-S17）。 |
| **H6** `validate:content` + `lint --max-warnings 0` | **是** | 新文件落在 `src/utils/`、`src/content/`、`tests/`——`lint` 已覆盖三者；每 commit 必跑 `npm run validate:content`（内置 182 页仍合规）。 |
| **H7** 单一真相源 | **是（核心）** | 形状**只在 `contentManifest.js`**（S1 落盘，S2 **不复制**路径/键常量）；合并裁决**只在 `mergeContent.js`**；**复用** `pageMeta.hydratePage`（`:77-79`）而非新写第二套 hydrate；**不新写第二套序列化器**。 |

---

## 5. 待拍板项（编号 P-S11…；每项 2–3 选项 + 推荐 + 理由）

> 6 个**方案级**决策点已拍板；下表是 **S2 实施层**新增决策点。

| # | 事项 | 选项 | **推荐** | 理由 |
|:-:|---|---|---|---|
| **P-S11** | **进页时机与首屏策略**（更正 3：进页有 400ms 竞速，不能 await 网络） | (a) **缓存优先 + 内置兜底 + 后台静默**：进页读 IDB 缓存（有则用、无则走内置 import），**网络不进关键路径**；manifest 刷新放启动/后台<br/>(b) 进页等远程 manifest+分片<br/>(c) 启动时阻塞等一次 manifest | **(a)** | (b) 把网络延迟引入进页关键路径，直接破坏 `UnitView:543-567` 的 400ms 竞速与「离线优先」；(c) 拖慢首屏。(a) 与已拍板「启动检查 + 后台静默更新」一致，且天然满足红线 2/6 |
| **P-S12** | **缓存键粒度** | (a) **`unitKey` 整片**（一片一条 `{key:'math/01', version, payload, hash, updatedAt}`）<br/>(b) 逐页（`pageKeyOf` = `01/0`）<br/>(c) 两者都存 | **(a)** | 与 `manifest.units` 分片 **1:1**：原子整片替换、哈希校验对齐分片 hash、写次数最少（27 片 vs 182 页）。(b) 写放大 6.7 倍且与分片校验粒度不一致，版本闸门易半新半旧 |
| **P-S13** | **更新通知方式** | (a) **轻量 Pinia store**（`src/stores/content.js`，暴露 `contentVersion` ref；`UnitView` watch 后复用 `fetchPageData` 重取当前页）<br/>(b) 事件总线 / 自定义事件<br/>(c) 不通知，下次进页才生效 | **(a)** | 用户正看某页时内容已更新，「下次进页才生效」会让人以为没更新；Pinia 是全站既有模式（`src/stores/` 已有 6 个）。(b) 无既有先例、难追踪。⚠️ 缓解：watch 重取**只**在 version 变化时触发，不进 400ms 竞速路径（与 `transitionedLoad` 互斥由 `pagingGo` 现有状态机保证） |
| **P-S14** | **远程失败后的重试 / 退避** | (a) **不重试**（静默跳过；下次启动/进页自然再试）<br/>(b) 指数退避重试 N 次<br/>(c) 仅 manifest 重试、分片不重试 | **(a)** | 红线 6「失败静默跳过」+ 已拍板「启动检查 + 后台静默」已提供下一次机会；重试会引入退避状态机、弱网流量与测试复杂度，收益低。若真机实测发现弱网频繁失败，再升级 (b) 并登记 |
| **P-S15** | **是否与 `practiceBankClient` 共用一套 fetch 封装** | (a) 抽极薄 `src/utils/fetchJson.js`，**仅新代码消费，不迁移**既有两处<br/>(b) 抽共用并**迁移** `practiceBankClient`/`SearchPanel`<br/>(c) 独立实现（不抽） | **(a)** | 与批 F **P-F06(a′)** 同款裁定（新代码用共享原语、旧处不动）：(b) 会动 `practiceBankClient.js`/`SearchPanel.vue` 两条既有路径，超出 S2 范围且增回归面；(c) 复制纪律易漂移。迁移登记为备案：下次触碰那两处时再并入 |
| **P-S16** | **基址派生策略**（更正 6） | (a) **`IS_ABSOLUTE_API` ? 绝对源 + `REMOTE_DIR` : `./` + `REMOTE_DIR`**（dual-track §2.5 已拍板口径）<br/>(b) 恒用相对 `./`<br/>(c) 新增独立 env `VITE_CONTENT_BASE` | **(a)** | (a) 与已拍板一致，且 Tauri 绝对地址域 `https://520305.top` **已在 CSP `connect-src`** → 免改 CSP。(b) 在 Tauri 下面临 `tauri://localhost` 解析风险（**待核实**：现成检索/题库也用相对路径，可借其真机表现佐证）。(c) 多一处配置且与 `apiBase` 双源，违背 H7 |
| **P-S17** | **客户端校验粒度** | (a) **轻量**：`blocks` 是数组 + 每块 `type` 是字符串 + 逐页 `hash` 比对（方案 §3.2 已定）<br/>(b) 完整复用 `createBlockValidator`<br/>(c) 不校验 | **(a)** | 服务端已把关 + 内置兜底，客户端只做「防崩溃」最低检查；(b) 运行期跑全量校验（182 页×块）性能/体积不值当，且把 Node 校验器拖进浏览器包 |
| **P-S18** | **`prefetchPage` 是否改为预热远程** | (a) **不动**（仍预热内置 `import()` chunk）<br/>(b) 远程命中时改为预热远程分片 | **(a)** | `prefetchPage`（`loadPage.js:45-58`）是 P4-T5 已调优的「预热 import 缓存」路径；改它会动翻页性能预算。远程命中时本就不需要内置 chunk，(b) 无收益 |
| **P-S19** | **`OP.APPEND`（纯新增坐标）分支如何处理** | (a) **不实现渲染分支**：未知/新增 op 一律**静默忽略 → 回退内置**，代码留一行注释登记 B2<br/>(b) 预留解析分支 + 「内容加载失败」占位 UI | **(a)** | B1 **恒不产出** `APPEND`（`contentManifest.js:106` 明写仅协议预留）→ (b) 属 YAGNI，且占位 UI 无内容可触发、无法测真。红线 5 的占位需求在 B1 不可达；B2 立项时再补（届时 `mergeContent`/`contentClient` 单点扩展即可） |

---

## 6. 验证方式

### 6.1 测试落点（`tests/`）

| 文件 | 断言要点 |
|---|---|
| `tests/merge-content.test.js`（新增） | `pickPage`：远程存在→用远程；远程 null→用内置；`verifyHash`：前缀/摘要不符→false；`isNewer`：**严格大于**（更新→true；**等值→false**；更旧→false，**旧版一律不写**） |
| `tests/content-client.test.js`（新增） | mock `fetch`：① 离线/网络失败→**静默跳过**、不抛；② 解析失败→跳过；③ 哈希不符→丢弃该页 + 回退内置；④ 版本闸门：等值/更旧**不写** `content_cache`；⑤ 原子写后 `getRemotePage` 命中 |
| `tests/loadpage-remote-fallback.test.js`（新增） | 端到端（loader 层 mock）：远程命中→用远程 blocks；任一步失败→**回退内置**且结果与今日一致；**内置 182 页零回归**；`resolvePageMeta` 仍消费**内置** `getSubjectConfig`（B1 导航零改动守卫） |

> ⚠️ **硬约束**：`public/content-remote/` 已被 S1 写入 `.gitignore` → 干净工作树/CI **没有产物**。三份测试**一律用注入式 fixture / mock `fetch`**，**不得**读盘（否则重现批 F「干净树 6 跳过」的环境性假绿/假红）。
> IndexedDB 用既有 devDependency **`fake-indexeddb`**（22 个既有测试在用）。

### 6.2 关卡（Node v22；每 commit 本地必跑）

```
export NODE=/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node
$NODE --version                                   # 确认 v22
npm run validate:content                          # 内置 182 页仍合规
npm run lint --max-warnings 0                     # src/utils + src/content + tests 已覆盖
npx vitest run tests/merge-content.test.js tests/content-client.test.js tests/loadpage-remote-fallback.test.js --pool=threads --maxWorkers=1
# 回归闸门（沿用批 E/F 纪律）
npx vitest run tests/csp-guard.test.js tests/block-registry.test.js tests/studyDbV7.test.js --pool=threads --maxWorkers=1
npx vitest run --pool=threads --maxWorkers=1      # 全量
```

- vitest **必须**带 `--pool=threads --maxWorkers=1`（沙箱 forks 池坏）。
- **`tests/csp-guard.test.js` 必跑**：`contentClient.js` 新增后须确认 **L6**（无运行时拼接 `import()`）仍绿。
- **`tests/studyDbV7.test.js` 必跑**：证明 **DB 仍为 v7**（S2 不升版）。

### 6.3 是否需要真实浏览器 / 真机实测

**需要（但仅桌面一次）**：
- **Tauri 桌面实机 1 次**：验证 ① 基址派生（`IS_ABSOLUTE_API` → `https://520305.top/content-remote/...`）可达；② CSP `connect-src` 无 violation；③ 断网时**回退内置、功能不中断**（红线 2/6）。→ 沙箱无 Tauri 运行时，须**用户侧**执行。
- **Android 真机** 归 **S5/P5**（dual-track §6 已排定），不在 S2。
- 纯逻辑（优先级链/闸门/哈希/兜底）由 Node 单测覆盖，无需浏览器。

---

## 7. 工作量（S/M/L，不承诺日期）

| 项 | 工作量 | 依据 |
|---|:--:|---|
| **S2 整体** | **L** | 动**核心运行时路径**（`loadPage.js`，本批风险最高）+ 新 loader + IndexedDB 持久化 + 27 片增量 + 兜底链 + 3 份测试 + 桌面实机验证。与 dual-track §6 一致（S2 = **L**，风险「最高」） |

**关键路径**：S1 → **S2** 是最长链；S2 自身依赖 S1 的 `contentManifest.js`（**已落盘**）与其产物（可 mock）。除 §5 待拍板项外无外部阻塞。

---

## 附：本文件核对过的代码事实（实测 HEAD=`904847a`）

| 事实 | 证据 |
|---|---|
| HEAD=`904847a`；工作树含 S1 在制：`M .gitignore`、`M package.json`、`?? src/content/contentManifest.js` | `git log --oneline -1` + `git status --short` |
| `contentManifest.js` **120 行**，导出 `SCHEMA_VERSION=1`(:24)/`CONTENT_VERSION=1`(:33)/`OPTIONAL_SECTIONS`(:41)/`SHARD_WARN_BYTES`(:51)/`REMOTE_DIR`(:54)/`MANIFEST_PATH`(:57)/`shardPath`(:70)/`unitKeyOf`(:81)/`pageKeyOf`(:98)/`OP`(:111)/`HASH_PREFIX`(:120) | 全文读取 |
| `loadPage.js`：`importPageModule` `:20-22`（`@/content/...` 字面量前缀，`:14-18` 注释禁改）；`loadPage` `:31-36`（无缓存）；`prefetchPage` `:45-58`；`clearPrefetch` `:61-63` | 全文读取 |
| `UnitView.vue`：`getSubjectConfig` `:195`；别名导入 `:158`；本地 `loadPage` `:399`（`:414`/`:657` 调用）；`fetchPageData` `:392-396`；`transitionedLoad` `:543-567`（**400ms 竞速**）；blocks 渲染 `:73` | 脚本逐行扫描 |
| `studyDb.js`：`DB_NAME` `:32`；**`DB_VERSION = 7`** `:33`；`onupgradeneeded` `:54`；`oldVersion<7` 段 `:180`；**`content_cache`/`content_meta` 已建** `:187-191`；注释 `:17`/`:27` | 脚本扫描 |
| `practiceBankClient.js`：`indexCache` `:11`/命中 `:18`/fetch `:19`；`shardCache` `:26`/命中 `:34`/fetch `:35`（**纯内存，非持久化**） | 全文读取 |
| `apiBase.js`：`RAW` `:18`；`API_BASE` `:21`（去尾斜杠）；**`IS_ABSOLUTE_API` `:24`** | 全文读取 |
| `pageMeta.js`：`PAGE_META_KEYS` `:22`；`resolvePageMeta` `:31-53`；`pageFileKeyOf` `:63-65`；**`hydratePage` `:77-79`**（只读 `rawModule?.blocks`） | 全文读取 |
| `sync/engine.js` `ENTITIES` `:18-27` = 7 个实体，**不含** `content_cache`/`content_meta`（内容刻意不进 LWW 同步） | 脚本扫描 |
| 内容 **182** 页；单元 **27**（math 12 / chinese 7 / computer 8；页 82/46/54） | Node（`collectFiles` + `loadSite`） |
| `getSubjectConfig(` 命中 **9 个文件** = `index.js`(定义 `:41-43`) + `loadPage.js:32` + 7 视图 → **8 处外部消费** | Python 正则全量扫描 |
| 静态产物 fetch 全部**相对 `./`**：`practiceBankClient.js:19/:35`、`SearchPanel.vue:124/:153` | Python 正则扫描 |
| CSP（prod）：`connect-src 'self' ipc: http://ipc.localhost https://520305.top`；`script-src 'self'` | `src-tauri/tauri.conf.json` |
| S1 已把 `public/content-remote/` 写入 `.gitignore`；`package.json` 已加 `build:content-remote`（**未**进 `prebuild`/`build:index`） | `git diff .gitignore` / `git diff package.json` |
| 测试基建：`vitest.config.js`（`environment:'node'`、`globals:true`、`include: tests/**/*.test.js`）；devDependency 含 **`fake-indexeddb`** | 配置文件 + `package.json` |

> 本文件为功能实现侧的技术规划，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。


