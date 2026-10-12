# 批 S2 派工单：客户端加载层 + 缓存（裁定 + 实施规格）

> 作者：team-lead（据 `docs/proposals/batch-s2-tasks.md` 架构任务卡 + 本人实测复核）
> 裁定日期：2026-10-12 ｜ 基线 HEAD = `904847a`
> 目标读者：software-engineer（实施）→ software-qa-engineer（独立验证）
> **完整设计见** `docs/proposals/batch-s2-tasks.md`；本单只钉死**裁定结论 + 我的独立复核 + 修正项**。

---

## 0. 裁定结论（P-S11…P-S19）

架构师 9 项推荐**全部采纳**，其中 **P-S16 附一处强制修正**（见 §1）。

| # | 事项 | 裁定 | 备注 |
|:-:|---|---|---|
| **P-S11** | 进页时机与首屏策略 | **(a) 缓存优先 + 内置兜底 + 后台静默** | 网络**不进关键路径**。实测依据：`UnitView.vue:551` `Promise.race([dataPromise.catch(()=>null), sleep(400)])` —— 进页一旦 await 网络必然劣化翻页转场 |
| **P-S12** | 缓存键粒度 | **(a) `unitKey` 整片** | 27 分片 1:1 原子替换；反对逐页（182 次读写、事务碎片化） |
| **P-S13** | 更新通知方式 | **(a) 轻量 Pinia `src/stores/content.js`** | 只存 `version`/`hasUpdate`/`updatedUnits`，**不接管渲染** |
| **P-S14** | 远程失败重试/退避 | **(a) 不重试、静默跳过** | 下次启动自然再试；真机若发现弱网频繁失败再议 |
| **P-S15** | 是否共用 fetch 封装 | **(a) 抽极薄 `src/utils/fetchJson.js`，仅新代码消费，不迁移既有两处** | ⚠️ **不得**迁移 `practiceBankClient`/`SearchPanel`（既有语义不同，有回归风险）；迁移登记为备案 |
| **P-S16** | 基址派生 | **(a) 方向采纳 + 强制修正（见 §1）** | 绝对源**必须剥离 `/api`** 取站点根 |
| **P-S17** | 客户端校验粒度 | **(a) 轻量**（`blocks` 是数组 + 每项 `type` 是字符串 + 逐页 hash 比对） | 哈希为主、结构为辅；**不得**把 Node 校验器拖进浏览器包（体积 + H7） |
| **P-S18** | `prefetchPage` | **(a) 不动** | 仍预热内置 `import()` chunk |
| **P-S19** | `OP.APPEND` | **(a) 不实现渲染分支** | 未知/新增 op 一律静默忽略 → 回退内置，代码留一行注释登记 B2 |

---

## 1. ⚠️ P-S16 强制修正：绝对源必须剥离 `/api`

架构师原推荐「`IS_ABSOLUTE_API ? 绝对源 + REMOTE_DIR : './' + REMOTE_DIR`」——**方向对，但"绝对源"若直接取 `API_BASE` 会错**。

**实测证据**（`src/sync/apiBase.js`）：
```js
:18  const RAW = import.meta.env.VITE_API_BASE || '/api'
:21  export const API_BASE = RAW.replace(/\/+$/, '')      // Tauri 下 = 'https://520305.top/api'
:24  export const IS_ABSOLUTE_API = /^https?:\/\//i.test(API_BASE)
```
`.env.tauri` 注入的是 **`https://520305.top/api`**（**带 `/api` 后缀**）。若直接 `API_BASE + '/content-remote/'` → `https://520305.top/api/content-remote/manifest.json`，而 **`/api` 在 nginx 是反代给 Fastify 后端的路由前缀**，静态内容目录并不挂在它下面 → 请求会被转发给后端、**返回 404**（不是网络错误，是路由错）。这类失败极难排查：CSP 没拦、网络没断、就是 404。

**裁定口径**：
- 绝对模式 → **站点根** `https://520305.top` + `/content-remote/`（即剥离 `API_BASE` 末尾的 `/api` 路径段，**保留 origin**）
- 相对模式（dev / Web 生产）→ `./` + `content-remote/`（沿用 `practiceBankClient.js:19/:35`、`SearchPanel.vue:124/:153` 的既有相对路径纪律）
- **不新增 `VITE_CONTENT_BASE`**（避免双源违背 H7）

**派生方式建议**（避免硬编码字符串处理）：从 `API_BASE` 取 origin（`new URL(API_BASE).origin`），再拼 `/${REMOTE_DIR}/`。这样即使将来换部署域也自动跟随，且**无需改 CSP**（`520305.top` 的 `connect-src` 已放行）。

**登记待核实（部署侧，S3 前置）**：`content-remote/` 在服务器上的**实际落点**与 nginx location 配置，必须与本口径一致。这条属**部署事实**，代码侧无法自证 → 请 S3 时实测一次 `curl` 确认。

---

## 2. 我的独立复核记录（抽查架构师 §0 的 4 条新发现，全部属实）

| 更正 | 我的复核方式与结论 |
|---|---|
| **3（决定性）** | `src/views/UnitView.vue:551` 实测确有 `Promise.race([dataPromise.catch(() => null), sleep(400)])`；`:543 transitionedLoad()`、`:652` 调用点；`:158` 别名 `loadPage as loadContentPage`。**属实** → 直接支撑 P-S11 (a) |
| **8** | `src/content/loadPage.js:14-21` 注释明写「模板字符串前缀 `@/content/` 必须保持字面量……一旦改成变量拼接，全部页面会被打进同一个巨型 chunk」；`:20-22 importPageModule` 用字面量前缀。**属实** → S2 改动**不得**动该前缀 |
| **1** | `src/stores/studyDb.js`：`content_cache` 4 处（`:17`/`:27` 注释 + `:187-188` 建表）、`content_meta` 4 处（`:17`/`:27` + `:190-191`）、`DB_VERSION` `:33`。**且实测无任何 `get/save/put/read` + Content/Snapshot/Manifest 访问器（`False`）**。**属实** → S2 只补访问器，**不升版、不建表** |
| **5** | `src/utils/practiceBankClient.js:11 indexCache = null`、`:26 shardCache = new Map()` —— 纯内存，**无 IDB 落盘**。**属实** → 「持久化」确实属于 S2 |

**架构师的交叉核对也成立**：它已读过工程师在制的 `scripts/build-content-remote.mjs`，确认其产出形状（`pageHash = sha256(canonical({subject,unitNum,fileIndex,fileKey,op,blocks}))`、`units[k].hash = sha256(canonical(pages))`、`units[k].path` 相对 `content-remote/`、`sitePatch` 恒空）与 S2 的消费口径**一致** —— 两条线无需返工。

---

## 3. 顺带登记（低优先，不阻塞）

- `src/content/loadPage.js:15` 与 `:41` 的注释仍写「**139** 个内容文件」，实测 **182** 页。属过时注释，下次触碰该文件时顺手更正。
- 架构师提醒：**S2 测试不得依赖读盘产物**——S1 已把 `public/content-remote/` 写进 `.gitignore`，干净工作树/CI **没有远程产物**，须用注入式 fixture/mock（与批 F QA「干净树 6 跳过」同款环境陷阱）。

---

## 4. 派工前置条件

**S2 依赖 S1 产物落地**。当前 S1 六件已全部落盘但**尚未 commit**（工程师仍在跑关卡）。**等 S1 收编并 commit 后，方可派工程师实施 S2。**

S2 实施落点（详见 `batch-s2-tasks.md` §2）：`src/utils/contentClient.js`（新）、`src/content/mergeContent.js`（新，`pickPage`/`verifyHash`/`isNewer` 纯函数）、`src/utils/fetchJson.js`（新，极薄）、`src/stores/content.js`（新，轻量 Pinia）、改 `src/content/loadPage.js`（**唯一入口插入远程优先，内置兜底原样保留**）+ 补齐 `studyDb.js` 的 content 访问器；测试若干（`fake-indexeddb` 已是 devDependency）。

> 本文件为功能实现侧技术规划，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。
