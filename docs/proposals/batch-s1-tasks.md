# 批 S1「内容快照格式 + 构建脚本」实施任务卡

> 状态：**规划定稿（未写代码）**。本文把 `docs/proposals/content-extension-dual-track.md` 已定稿方案中的 **S1** 转成可直接开工的实施卡。
> 角色：架构师（Bob）产出；供工程师照单实现，供 team-lead 裁决 §5 待拍板项。
> 上游（已读并内化）：
> - `docs/proposals/content-extension-dual-track.md`（双轨方案 S1–S5；**6 决策点已拍板**：B1 / 静态目录 / 内容层优先 / 协议共用实现延后 / 前进式回滚 / 启动检查）
> - `docs/proposals/implementation-roadmap.md` §「批 S」接口点（`:278-289`）
> - 源码实测：`scripts/lib/load-content.mjs` / `src/content/pageMeta.js` / `src/content/searchIndex.js` / `src/content/practiceBank.js` / `scripts/build-search-index.mjs` / `scripts/build-practice-bank.mjs` / `src/utils/validateBlock.js` / `schema/content-schema.json` / `src/stores/studyDb.js` / `src/sync/apiBase.js` / `vite.config.js` / `.env.tauri` / `.gitignore` / `package.json`
>
> **纪律**：只读核实，不写产品代码；行号一律以**当前工作树实测**为准（HEAD=`e5e3e57`，工作树干净）；数字以 Node/Python 脚本复核（本环境 grep 漏命中）。

---

## 0. 读码更正（对照 dual-track 方案原文；旧说 vs 实测）

| # | dual-track 旧说 | 实测（HEAD=`e5e3f57`） | 对 S1 的影响 |
|---|---|---|---|
| **1** | 「内容源 = **139** 个纯数据 ESM」（§0、§3、§4 多处） | `collectFiles(CONTENT_DIR)` 实测 **182** 个内容文件（三学科；`SITE_FILES` = `{math, chinese, computer}`） | 仅影响文档数字；S1 代码应**动态遍历**（不硬编码页数） |
| **2（关键，利 S2）** | 「`studyDb.js` `DB_VERSION` 由 **6 → 7**，`onupgradeneeded` 追加 `content_cache`/`content_meta`」（§2.3，引 `studyDb.js:29,50-118`） | **已提前完成**：`studyDb.js:33` `DB_VERSION = 7`；`:17/:27` 注释明写「content_cache / content_meta：S2 内容双轨**预留空表**（v7 建、当前不含数据）……**避免 S2 再升 v8**」；`:180-191`（`oldVersion < 7` 段）已 `createObjectStore` 两表 | **S1 不碰 DB**；且 **S2 的 DB 升版已预先满足**（无需再升版/建表）——移除 S2 一大风险 |
| **3** | 非学科顶层页概念未提 | 批 F 引入 `/guide` + `scripts/lib/load-content.mjs:63` `NON_PAGE_DIRS = new Set(['guide'])`，`collectFiles`（`:66-73`）已排除 | S1 发布脚本**继承同一遍历**即**自动不含 guide**，无需特判 |
| **4** | 「产物写 `public/**`」未言入库策略 | **先例不一致**：`public/search-meta.json` + `public/search-body/` 在 `.gitignore`（构建产物不入库）；但 `public/practice-bank/*.json` **已入库**（`git ls-files public/` = 6 文件） | **影响 `content-remote/**` 是否入库** → 见 §5 **P-S01** |
| **5** | 引用行号 `studyDb.js:50-118` | `onupgradeneeded` 的 `oldVersion<7` 段实为 `:180-191`（`req.onupgradeneeded` 起点 `:54`） | 行号漂移，已更正 |
| **6** | 引用 `validate-content.mjs:15-29` / `pageMeta.js:31-53` / `apiBase.js:18-24` / `tauri.conf.json:23` | **基本无漂移**（实测：`validate-content.mjs:15` 导入 createBlockValidator、`:24` 读 SCHEMA、`:29` 建校验器；`pageMeta.js:31-53` `resolvePageMeta`、`:63-65` `pageFileKeyOf`；`apiBase.js:18-24`；CSP 在 `tauri.conf.json` `app.security.csp`） | 可直接复用，无需改 |

> **结论**：dual-track 的方案骨架与现状一致，仅**数字/行号**漂移 + **DB 升版已提前满足**。S1 设计不受影响。

---

## 1. 目标与范围

### 1.1 S1 做什么（交付物）

**纯构建期**产出「内容快照（Content Snapshot）+ 清单（Manifest）」的形状定义与生成脚本，**零运行时影响**（不接 `loadPage`、不接 IndexedDB、不接 CSP 配置）。

| 交付物 | 说明 |
|---|---|
| **快照/清单形状定义** | 新纯 ESM 文件，把 manifest / 分片 / 键 / 路径**定义一次**，Node 脚本与（未来 S2）浏览器 loader 两端共用（防第二处漂移源） |
| **发布脚本** | 遍历 `src/content/**` → 产出 `public/content-remote/manifest.json` + 每单元分片 JSON；逐页 `hash`（sha256）；`contentVersion`；`sitePatch`（B1 预留）；**复用**现有校验器逐页逐块校验，**校验不过 → 不产出任何分片** |
| **单测** | 形状/路径/键 + `collectSnapshot()` 纯函数断言（分片形状、hash 稳定、sitePatch append-only、校验失败不产出、超限告警） |

### 1.2 边界（明确 out of scope）

| 非目标 | 归属 |
|---|---|
| 客户端优先级链 loader（远程缓存 > 远程拉取 > 内置 import 兜底） | **S2** |
| IndexedDB 缓存读写（`content_cache`/`content_meta` 的表**已建**，写入逻辑不在此） | **S2** |
| rsync 静态目录发布 + CI 集成 | **S3** |
| 客户端哈希兜底 / 前进式回滚**流程落地** | **S4**（S1 只产出 hash 供 S4 用） |
| 搜索/题库远程化 | **S5+**（S1 仅**协议预留**键位） |
| 远程新增单元/页面（导航派生层改造） | **B2**（S1 仅协议预留 `op:'append'`） |

> **B1 语义**（已拍板）：本轮只支持**更新既有坐标**的 `blocks`（`op:'upsert'`）；**不**做远程新增单元/页面。

---

## 2. 落点（读码核实的文件）

| 动作 | 路径 | 说明 |
|---|---|---|
| **新增** | `src/content/contentManifest.js` | **形状定义**（纯 ESM、**零 import**）。内容：`SCHEMA_VERSION`；清单/分片路径常量（`content-remote/manifest.json`、`content-remote/{subject}/{unitNum}.json`）；`unitKeyOf(meta)`/`pageKeyOf(meta)`；`sitePatch`/`op` 取值常量。**风格照 `src/content/searchIndex.js`（63 行，`META_FILE`/`bodyShardPath`/`bodyKeyOf` 同款）与 `src/content/practiceBank.js`（110 行，`BANK_DIR`/`practiceShardPath`/`practiceKeyOf` 同款）** |
| **新增** | `scripts/build-content-remote.mjs` | **发布脚本**。**复用**：`scripts/lib/load-content.mjs`（`ROOT`/`CONTENT_DIR`/`SITE_FILES`/`collectFiles`/`loadSite`/`buildMetaIndex`/`importFresh`/`relPathOf`）+ `src/utils/validateBlock.js`（`createBlockValidator`）+ `schema/content-schema.json` + `src/content/pageMeta.js`（`resolvePageMeta`/`pageFileKeyOf`）+ `src/content/contentManifest.js` + **`node:crypto`（sha256）**。**导出** `collectSnapshot()`（纯函数，不落盘，供测试）＋ `build()`（落盘）。**结构照 `scripts/build-search-index.mjs`**：`process.argv[1]` 守卫（`:255`）、`console.warn` 超限点名（`:222-244`） |
| **改** | `package.json` | 新增 script `"build:content-remote": "node scripts/build-content-remote.mjs"`；**是否纳入 `prebuild`/`build:index`** 见 §5 **P-S05**（默认独立、不纳入） |
| **新增** | `tests/content-manifest.test.js` | 形状定义：路径/键/常量断言（与 `searchIndex`/`practiceBank` 的测试同款） |
| **新增** | `tests/build-content-remote.test.js` | `collectSnapshot()` 纯函数：① 分片 `pages[]` 结构（坐标/`fileKey`/`blocks`）；② 同内容 `hash` 稳定、改一字节变号；③ `sitePatch` 只追加（B1 空）；④ **校验失败 → 不产出**；⑤ 超限 `console.warn` 点名 |
| **改（视 P-S01）** | `.gitignore` | 若定 `content-remote/**` 不入库，则追加 ignore 条目（对齐 `public/search-*` 先例） |
| **复用（不改）** | `scripts/lib/load-content.mjs`、`src/utils/validateBlock.js`、`schema/content-schema.json`、`src/content/pageMeta.js` | 单一来源，**禁止**复制其逻辑（H7） |

**关键接口（伪代码级）**

```js
// scripts/build-content-remote.mjs —— 只给签名 + 要点，不给实现
export async function collectSnapshot({ contentVersion }) {
  // 1) 复用 buildMetaIndex() 得 rel → meta；复用 collectFiles()/importFresh() 读 blocks
  // 2) 逐页：{ subject, unitNum, fileIndex, fileKey, op:'upsert', hash, blocks }
  //    hash = sha256(canonical(page))（规范化序列化，见 P-S06）
  // 3) 逐块 validateBlock(b)；任一错 → 抛错/返回 { errors }（调用方不落盘）
  // 4) sitePatch（B1：空/预留）——只追加语义，禁止重排/插入/删除既有坐标
  // 5) 按单元聚合分片；返回 { manifest, shards }（不写盘）
}
async function build() { /* collectSnapshot → 写 public/content-remote/**；mkdtemp 原子替换或 rmSync+mkdir（照 build-search-index:209-213） */ }
// process.argv[1] 守卫：被测试 import 时不落盘（照 build-search-index.mjs:255）
```

> **路径核实**：`public/` 为 Vite 静态目录（`vite.config.js` 未改 `publicDir`，默认 `public`）；构建时复制进 `dist/`，随现成 rsync 链上线（S3 复用）。`public/content-remote/` 目录当前**不存在**（本文件已核实）。

---

## 3. 依赖

| 依赖 | 标注 | 说明 |
|---|---|---|
| **内容侧** | **无** | S1 **消费现有** `src/content/**`（182 页），不要求内容侧新增任何字段/页。内容侧每次改内容后**可重跑**发布脚本即可（构建期快照）。 |
| **外部 / 工具链** | **无**（本阶段） | sha256 用 Node 内置 `node:crypto`；**rsync/CI 属 S3**，不在 S1。 |
| **待核实** | **CI 接入点** | S1 是否需要在 CI 产出/校验快照，见 §5 P-S05；若无，则纯本地脚本。 |
| **对 S2 的前置（旁注）** | **已满足** | `content_cache`/`content_meta` 空表已在 v7 建好（§0 更正 2）——S2 无需再升版。 |

---

## 4. 约束影响（H1–H7 逐条）

| 硬约束 | S1 是否触及 | 说明 / 保证 |
|---|---|---|
| **H1** CSP `script-src 'self'`（禁 eval/运行时动态 import） | **否（天然满足）** | S1 是**纯构建期** Node 脚本：产物是 **JSON 纯数据**；**不新增任何前端动态 `import()`/`eval`**（运行期消费 JSON 是 S2 的 `fetch`+`JSON.parse`，S1 不做）。脚本内亦**不得**拼接 `import()`。 |
| **H2** `site.js` `files[]` **只允许末尾追加**（顺序即 fileIndex） | **是（需强制）** | S1 的 `sitePatch` 生成器**只追加**语义：**不得**产出重排/插入/删除既有坐标的 patch；B1 阶段 `sitePatch` **为空**。→ 由 `tests/build-content-remote.test.js` 钉死「对内置 `site.js` 只读、零位移」。 |
| **H3** 判分↔自评二歧 | **否** | 不涉判分/自评。 |
| **H4** Node v22 | **是** | 跑测/脚本用 Node v22；`node:crypto` sha256 同输入同摘要（可复现）。 |
| **H5** schema 白名单流程 | **否（本阶段）** | S1 **不新增 block 类型/字段**（只搬运现有 `blocks` + 复用现有 `schema` 校验）。`sitePatch` 仅预留 `fileMetaUpdates`（title/subtitle，**身份不变**），不引入新块字段。 |
| **H6** `validate:content` + `lint --max-warnings 0` | **是** | 新脚本在 `scripts/`（lint 已覆盖）；发布前校验**复用** `createBlockValidator`（与 CI 同一份）。 |
| **H7** 单一真相源 | **是（核心）** | 形状定义**只在 `contentManifest.js` 一份**；遍历/元信息**只在 `load-content.mjs` 一份**；校验规则**只在 `validateBlock.js` 一份**；**不新写第二套序列化器**。 |

**顺带红线**（dual-track §6）：轨道 A **零回归**（139…实测 182 页内置内容、构建期校验全部不动）；超限必报告。

---

## 5. 待拍板项（编号 P-S01…；每项 2–3 选项 + 推荐 + 理由）

> 6 个**方案级**决策点已由用户拍板（B1 / 静态目录 / 内容层优先 / 协议共用实现延后 / 前进式回滚 / 启动检查）；下表是 **S1 实施层**新增的待裁决点。

| # | 事项 | 选项 | **推荐** | 理由 |
|:-:|---|---|---|---|
| **P-S01** | **`public/content-remote/**` 是否入库** | (a) **gitignore**（构建产物不入库，对齐 `public/search-*`）<br/>(b) 入库（对齐 `public/practice-bank/*`）<br/>(c) 入库 manifest（小）但 ignore 分片（大） | **(a)** | 快照是**构建产物**：入库会让每次内容改动产生大 JSON diff（182 页正文，含 LaTeX/mermaid），拖慢 review/clone；`search-body` 已是此先例。CI/发布**按需生成**（S3）。⚠️ 但**先例不一致**（`practice-bank/*` 入库）——若 team-lead 倾向「发布产物入库以便 rsync 直取」，可改 (b) |
| **P-S02** | **`contentVersion` 来源**（要求全局单调递增 + 前进式回滚） | (a) **人工/CI 维护的单调递增整数**<br/>(b) 由全部页 hash 聚合的**内容指纹**<br/>(c) 时间戳/构建号 | **(a)+另存指纹** | 前进式回滚需要**单调递增**号 → (b) 纯指纹不保证单调（无法表达「发一版新的旧内容」）。(a) 保证单调；**再另存一个 `contentHash`（内容指纹）**用于「内容真变了才需要换号」的去重与审计。(c) 同秒/多机不稳 |
| **P-S03** | **分片粒度** | (a) **一单元一片**（`content/{subject}/{unitNum}.json`，方案默认）<br/>(b) 一学科一片<br/>(c) 一页一片 | **(a)** | 按需拉取对齐**单元导航**粒度；单元级分片最重也远小于学科级；一页一片则请求数过多 |
| **P-S04** | **`sitePatch` 在 S1 的策略** | (a) **预留空结构**（B1 不产出任何 site 变更）<br/>(b) 生成 `fileMetaUpdates`（title/subtitle 更新）<br/>(c) 不预留字段 | **(a)** | 协议**一次到位**（键位预留，避免以后改协议）；B1 实现**零成本**（不 appendUnit、不改身份）。(b) 属 B1 可选增强，非本轮必需 |
| **P-S05** | **`build:content-remote` 何时跑** | (a) **独立手动脚本**（不进 `prebuild`/`build:index`）<br/>(b) 纳入 `build:index`<br/>(c) 纳入 `prebuild` | **(a)** | S1 **零运行时影响**，普通构建**不需要**产出远程快照（否则每次 `npm run build` 多写一堆 JSON）；发布时机由 S3 的 CI/rsync 决定 |
| **P-S06** | **`hash` 规范化口径** | (a) 直接 `JSON.stringify(blocks)`<br/>(b) **规范化序列化**（递归键序归一）后 stringify | **(b)** | 客户端（S2）校验 hash 须与服务端**一致**；规范化可消除键序差异导致的**假「内容变了」**。代价：脚本内一个 ~小函数（不引第三方，避免新依赖） |
| **P-S07** | **manifest 是否预留 `search`/`practice` 子清单** | (a) **预留键位、不产出**（协议一次到位，实现延后 S5+）<br/>(b) 同时产出空占位分片<br/>(c) 完全不提 | **(a)** | 与已拍板「协议共用设计一次到位、实现延后」一致；留键位零成本，避免 S5+ 改协议致老客户端不兼容 |

---

## 6. 验证方式

### 6.1 测试落点（`tests/`）

| 文件 | 断言要点 |
|---|---|
| `tests/content-manifest.test.js`（新增） | 路径/键/常量：`manifestPath()`、`snapshotPath(subject,unitNum)`、`pageKeyOf(meta)` 与 `searchIndex`/`practiceBank` 风格一致；`SCHEMA_VERSION` 存在 |
| `tests/build-content-remote.test.js`（新增） | `collectSnapshot()`：① 分片 `pages[]` 结构（`subject`/`unitNum`/`fileIndex`/`fileKey`/`op`/`blocks`）；② `hash` **稳定**（同内容同值）+ **敏感**（改一字节变号）；③ `sitePatch` **只追加**（B1 空）；④ **校验失败 → 返回错误、不产出分片**；⑤ 超限 `console.warn` 点名（注入小上限触发，照 `build-search-index` 的 `capBody(text, limit)` 测试模式） |

> 测试**不落盘**（`collectSnapshot` 纯函数直接断言，避免污染 `public/`）——照 `build-search-index.mjs` 的 `collectIndex()` 导出模式。

### 6.2 关卡（Node v22；提交前本地必跑）

```
export NODE=/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node
$NODE --version                       # 确认 v22
npm run validate:content              # 内置内容仍合规（S1 不改内容）
npm run lint --max-warnings 0         # scripts/ 与 tests/ 已覆盖
npx vitest run tests/content-manifest.test.js tests/build-content-remote.test.js --pool=threads --maxWorkers=1
npm run build:content-remote          # 冒烟：产出 public/content-remote/** 且校验通过
# 回归闸门（沿用批 E/F 纪律）
npx vitest run --pool=threads --maxWorkers=1
```

- vitest **必须**带 `--pool=threads --maxWorkers=1`（沙箱 forks 池坏）。
- 每 commit 后全量 `npm test --pool=threads --maxWorkers=1` + `npm run validate:content` + `npm run lint --max-warnings 0`。

### 6.3 是否需要真实浏览器 / 真机实测

**否。** S1 是**纯构建期**（Node 脚本 + 形状定义），**零运行时代码路径**——不触 `loadPage`、不触 IndexedDB、不触 CSP。真实浏览器/真机验证属 **S5/P5**（远程加载在 Tauri/Android 生效）。本阶段产出物（JSON + 脚本）用 Node 断言即可。

---

## 7. 工作量（S/M/L，不承诺日期）

| 项 | 工作量 | 依据 |
|---|:--:|---|
| S1 整体 | **M** | 形状定义（小，照 `searchIndex`/`practiceBank`）+ 发布脚本（中，复用遍历/校验，新增 hash/sitePatch/分片写盘）+ 2 个测试文件；**纯构建期、零运行时回归风险**。与 dual-track §6 一致 |

**关键路径**：S1 → S2（最长链）。S1 自身**无外部阻塞**，可即刻开工（除 §5 待拍板项）。

---

## 附：本文件核对过的代码事实（实测 HEAD=`e5e3e57`，工作树干净）

| 事实 | 证据 |
|---|---|
| 内容文件 **182** 个；站点配置 **3**（`math`/`chinese`/`computer`） | `collectFiles(CONTENT_DIR).length = 182`；`Object.keys(SITE_FILES) = [math,chinese,computer]` |
| `load-content.mjs` 提供 `ROOT`/`CONTENT_DIR`/`SITE_FILES`/`collectFiles`/`loadSite`/`buildMetaIndex`/`importFresh`/`relPathOf`/`NON_PAGE_FILES`/`NON_PAGE_DIRS`/`BOARD_DIR`/`collectBoardIds` | `scripts/lib/load-content.mjs`（`:37` NON_PAGE_FILES、`:63` NON_PAGE_DIRS、`:66` collectFiles） |
| 形状定义先例（纯 ESM 零 import，两端共用） | `src/content/searchIndex.js`（`META_FILE:47`/`bodyShardPath:53`/`bodyKeyOf:62`）、`src/content/practiceBank.js`（`BANK_INDEX_FILE:26`/`practiceShardPath:32`/`practiceKeyOf:43`） |
| 构建脚本模式：复用 load-content + 形状定义；`collectX()` 导出；`process.argv[1]` 守卫；超限 `console.warn`；`public/` 落盘 | `scripts/build-search-index.mjs`（`:21-30` 导入、`:155` `collectIndex` 导出、`:222-244` 告警、`:255` 守卫、`:209-213` 写盘）；`scripts/build-practice-bank.mjs`（`:18-32` 同族导入） |
| 校验器单一来源 | `src/utils/validateBlock.js` `createBlockValidator`；`scripts/validate-content.mjs:15/24/29`（导入 + 读 SCHEMA + 建校验器） |
| 元信息推导 | `src/content/pageMeta.js:31-53` `resolvePageMeta`；`:63-65` `pageFileKeyOf` |
| **DB 已 v7 且 content_cache/content_meta 已建（空表）** | `src/stores/studyDb.js:33` `DB_VERSION=7`；`:17/:27` 注释「S2 预留空表，避免 S2 再升 v8」；`:180-191` `oldVersion<7` 段建两表 |
| 远程基址派生 | `src/sync/apiBase.js:18-24`（`VITE_API_BASE` → `API_BASE`/`IS_ABSOLUTE_API`）；`.env.tauri` 注入 `https://520305.top/api` |
| CSP | `src-tauri/tauri.conf.json` `app.security.csp`（`connect-src` 含 `https://520305.top`） |
| `public/` 入库先例不一致 | `.gitignore` 含 `public/search-meta.json` + `public/search-body/`；`git ls-files public/` = 6（含 `practice-bank/*.json`） |
| vite 静态目录 = 默认 `public` | `vite.config.js`（未改 `publicDir`；`:63-68` `/api` proxy；`:22` `base:'./'`） |
| `package.json` 现无 `build:content-remote` | `package.json` scripts（`prebuild`/`build:index`/`build:practice`/`build:search` 等） |

> 本文件为功能实现侧的技术规划，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。
