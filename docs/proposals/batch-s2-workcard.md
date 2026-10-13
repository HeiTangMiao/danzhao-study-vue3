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

---

## 5. Web 发布链与 CONTENT_VERSION 操作流程

> 本节落实**用户裁定**：`build:content-remote` **只**并入 **Web 构建链**，**不**并进 **Tauri 链**。

### 5.1 改了什么

```diff
-  "prebuild": "npm run build:index",
+  "prebuild": "npm run build:index && npm run build:content-remote",
   "prebuild:tauri": "npm run build:index",        // ← 保持原样，不动
```

- `npm run build`（Web 入口）→ `prebuild` → 先 `build:index`（题库 + 搜索索引），再 `build:content-remote`（内容快照 + 清单）→ 一起进 `dist/`
- `npm run build:tauri` → `prebuild:tauri` → **仍只有** `build:index`

### 5.2 为什么只给 Web 链

分两端看 `contentRootFrom()` 的基址派生（P-S16）：

| 端 | 基址 | 快照从哪来 | 缺了会怎样 |
|---|---|---|---|
| **桌面端 / APK** | 绝对模式 → `new URL(API_BASE).origin` | 从**服务器**拉 `https://520305.top/content-remote/...` | **无所谓**（本来就不读本地），还省约 **1740 KB** 包体 |
| **网页端** | 相对模式 → `./content-remote/` | 读**部署出去的 dist 里的文件** | 404 → 静默回退内置（不崩溃，但远程更新能力失效） |

结论：桌面/APK **不需要**这份本地快照（且带了只会白白增大包体），网页端**必须要** → 只给 Web 链加。

### 5.3 ⚠️ 两个预期副作用（别当问题去"修"）

**(a) 内容非法会直接阻断 Web 构建。**
`scripts/build-content-remote.mjs` 内部复用 CI 同款 `createBlockValidator` 逐页逐块校验，
**校验失败就抛错、不产出任何分片**。进了 Web 构建链后，这个失败会表现为 `npm run build` 整体失败。
→ **排查指引**：构建报错先跑 `npm run validate:content` 定位到具体文件与区块；**修内容**，
   不要绕过（禁止给脚本加"跳过校验"开关）。

**(b) CI 此后也会产出 `content-remote`。**
`.github/workflows/ci.yml` 的「生产构建」步骤跑的就是 `npm run build`，配合
`actions/upload-artifact` 的 `path: dist/` → CI 产物里会带 `content-remote`。
这是**预期且有益**的（发布前置校验：内容非法在 CI 就红），**不要**为了「CI 不该产出它」
去拆脚本或加条件分支。

### 5.4 CONTENT_VERSION 操作流程（易错，务必按顺序）

`src/content/contentManifest.js` 的 `CONTENT_VERSION`（当前 = **1**）是**手填的单调号**，
与 release tag / package version **完全解耦**（P-S02 a：发布内容 ≠ 发布应用）。

**正确顺序：**

1. 改内容（`src/content/**`）
2. `CONTENT_VERSION` **+1**
3. 跑 Web 构建（`npm run build` → 产出 `public/content-remote/` 并打进 `dist/`）
4. 部署（ci.yml 的 rsync 步骤 / S3 发布）

**顺序错了会怎样：**
内容改了但版本号**没 +1** → 客户端 `isNewer(remoteVer, maxSeen)` 返回 **false** → 版本闸门
不前进 → **永远拉不到新内容**，而且**不报错、不崩溃**。这正是「永不变砖」掩盖问题的一面：
表现为「我改了但手机上没变」，排查时容易误判成缓存 / 网络 / 渲染问题。
→ **排查指引**：遇到「内容改了客户端没更新」，**先查 `CONTENT_VERSION` 有没有 +1**。

### 5.5 本地打包：自动清理残留快照（不需人记）

**落点是 `tauri:build`，不是 `prebuild:tauri`：**

```json
"clean:content-remote": "node scripts/clean-content-remote.mjs",
"tauri:build": "npm run clean:content-remote && tauri build"
```

`prebuild` / `prebuild:tauri` / `build:tauri` / `build` **全部保持现状不动** —— 只动
「人实际敲的入口」，且 **release.yml 桌面 job 走 `tauri-apps/tauri-action@v0`、android job
走 `tauri:android:build`，都不经过 `npm run tauri:build`** → **零发布面影响**。

**为什么清：**
Tauri 模式 `IS_ABSOLUTE_API` 为真 → `contentRootFrom()` 取 `new URL(API_BASE).origin`
→ loader 从**服务器**拉 `https://520305.top/content-remote/...`，
**永不读 dist 里那份**。所以本地残留的 `public/content-remote/` 是**纯死文件**，
清掉可省约 **1740 KB**。

**为什么不写成「文档里提醒一句」：**
它不影响正确性 → 打包的人**看不出来** → 靠人记住「打包前先删」= 迟早漏（与 §5.4
`CONTENT_VERSION` 同一类陷阱）。故做成**自动前置**，人不需要记得。

**脚本守卫（`scripts/clean-content-remote.mjs`）：**
因为要 `rmSync({ recursive: true })`，目标路径算错后果不可逆，故强制三层断言：
① 以 `<sep>public<sep><REMOTE_DIR>` 结尾；② 位于仓库根之下；③ 不等于 `public/` 或仓库根。
任一不成立 → 打印原因并 `process.exit(1)`，**一个字节都不删**。目录不存在 → 静默成功（退出码 0）。

---

### 5.6 已知边界（非阻断）

- **题库不跟随远程内容更新**：`public/practice-bank/*` 为构建期产物（H3 相关），过渡期会出现
  「看得到新内容、练不到新题」，已由方案 §5 拍板「可接受，S5+ 接入」。

---

> 本文件为功能实现侧技术规划，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。
