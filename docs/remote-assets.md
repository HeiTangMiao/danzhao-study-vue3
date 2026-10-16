# 远程资产链路说明（批 S5：内容 / 搜索 / 题库三条链）

> 面向改链路的人与验真机的人。**读本文再看代码**，能省掉「为什么这里不回退内置」这类反复追问。
> 相关：发布/回滚 SOP 见 [`content-release-runbook.md`](./content-release-runbook.md)；
> 逐条可执行的操作步骤见 [`远程内容链路验证清单.md`](./远程内容链路验证清单.md) 第 4 部分。

---

## 1. 一句话总览

三条链**共用一套**缓存表、一套版本权威、一套原子写/读时闸门，
区别只在**「兜底终点」**：内容层有内置兜底，搜索/题库没有。

| | 内容层（单元内容） | 搜索层（两级索引） | 题库层（练习题库） |
|---|---|---|---|
| 运行时入口 | `src/utils/contentClient.js` | `src/utils/searchClient.js` | `src/utils/practiceBankClient.js` |
| 共享原语 | `src/utils/assetClient.js` | 同左 | 同左 |
| 基址派生 | `src/utils/assetBase.js`（`contentRoot()`） | 同左（`siteRoot()`） | 同左（`siteRoot()`） |
| 产物位置 | `content-remote/{manifest.json, <subj>/<unit>.json}` | `search-meta.json` / `search-body/<subj>.json` | `practice-bank/index.json` / `practice-bank/<subj>.json` |
| **有无内置兜底** | ✅ 有（`src/content/**` 每个内容页一个懒加载 chunk —— 页数以该目录为准，不写死） | ❌ **无** | ❌ **无** |
| 全部失败时 | 回退内置，用户无感 | 搜索面板置 error 态 + 重试入口 | 抛错，由题库视图兜底 |

---

## 2. 三条链的优先级链（P-S53 / R-3）

### 2.1 内容层

```
内置 bundle（懒加载 chunk）      ← 永远可用，是「地板」
        ↑ 兜底
缓存：进程内 Map → IDB content_cache[unitKey]
        ↑ 命中且够新则零请求
远程：content-remote/manifest.json → 单元分片
```

- 启动后台刷新（`startBackgroundRefresh`）先过**版本闸门**：
  `isNewer(manifest.contentVersion, meta.contentVersion)` 为真才拉，同版本只做**自愈**（`pendingUnits`）。
- 三模式由 `mergeContent.computeRetrySet` 唯一实现：`newer` / `heal` / `skip`。
  `heal` 用 **pending 自带的坐标**重拉，不读远程 `units`（S4-2 已钉死）。
- `pendingUnits` 重试上限 `PENDING_MAX_ATTEMPTS = 5`，超限一次性 `console.warn` 后放弃该单元。

### 2.2 搜索层

```
缓存：进程内 Map → IDB content_cache['search:meta' | 'search:<subj>']
        ↑ 命中且够新则零请求
远程：siteRoot() + 'search-meta.json' / 'search-body/<subj>.json'
        ↑ 失败
回退：陈旧缓存（stale）——「旧的」好过「没有」
        ↑ 连陈旧缓存都没有
终点：抛错 → SearchPanel 置 error 态并给出「重试」入口
```

- **按需粒度**：预取（idle 或 1.5s 兜底）只拉 `search-meta.json`；
  正文分片 `search-body/<subj>.json` 要等查询词 ≥ 2 字且只拉**当前学科**。
  这是 `tests/search-panel.test.js` 钉死的加载时机契约，不要为了「少一次请求」改成启动全量拉。

### 2.3 题库层

```
缓存：进程内 Map → IDB content_cache['practice:index' | 'practice:<subj>']
        ↑ 命中且够新则零请求
远程：siteRoot() + 'practice-bank/index.json' / 'practice-bank/<subj>.json'
        ↑ 失败
回退：陈旧缓存（stale）
        ↑ 都没有 / 产物形状不可用
终点：抛错（空题库 = 组不出卷，静默返回空库更糟 —— 用户会以为是自己选错条件）
```

### 2.4 ⚠️ 搜索 / 题库**没有内置兜底层**（降级终点）

这是三条链最大的不对称，也是最容易改错的地方：

- 内容层的产物是 `src/content/**` 里每个内容页一个懒加载 chunk（页数以该目录为准，随内容增长而变），
  **它们就在安装包 / 构建产物里**，离线永远可读；
- 搜索 / 题库的产物**只存在于 `public/`**（约 1.7 MB），客户端拿它们**只能靠 fetch**。
- 所以搜索 / 题库的降级终点是「**缓存**」或「**陈旧缓存**」，
  **不是**「回退内置」——代码里写不出这个分支，硬写就是凭空造一个不存在的数据源。
- 推论：**Tauri（含 Android）首次打开且无缓存时，离线搜不了、组不了卷**。
  这是 S5-6 明确确认过的取舍（见 `src/utils/assetBase.js` 顶部注释）：
  换来的是「产物只需维护线上一份」+「不必为包内副本另立版本判据」。
  若将来要改，最小改法是在 `loadAsset()` 的兜底分支追加一次**相对路径**重试
  （落在 app 自身 origin = 包内副本），约 6 行、不动基址派生——但需先评估「包内旧副本」与读时闸门并存的问题。

---

## 3. 缓存键（P-S52：零 DB 升版）

三链**全部复用 v7 已预留的 `content_cache` / `content_meta` 两张表**，靠**键前缀**隔离，DB 版本号**保持 7 不动**。

| 链 | `content_cache` 键 | 条目形状 |
|---|---|---|
| 内容 | `<subject>/<unitNum>`（如 `math/01`） | `{ key, version, hash, pageHashes, pages }` |
| 搜索 | `search:meta` | `{ key, version, payload }`（payload = 条目数组） |
| 搜索 | `search:<subject>`（如 `search:math`） | `{ key, version, payload }`（payload = `{ '01/0': 正文 }`） |
| 题库 | `practice:index` | `{ key, version, payload }`（payload = 统计对象） |
| 题库 | `practice:<subject>`（如 `practice:math`） | `{ key, version, payload }`（payload = 题目数组） |

- `content_meta` 只有一条：`key = 'manifest'`（`CONTENT_META_KEY`），
  存 `{ contentVersion, contentHash, units, pendingUnits }`——**版本闸门的提交点**。
- 前缀隔离的必要性：单元键形如 `math/01`，搜索/题库键带 `search:` / `practice:`，
  三者不可能撞；若哪天新增一层，先定前缀再说（`tests/search-client.test.js` 与
  `tests/practice-client.test.js` 各有前缀隔离的正向锚）。
- 进程内二级缓存是**模块级 Map**（`memoryCache` / `memory`），
  测试隔离靠 `resetSearchClient()` / `resetPracticeClient()`——**同文件跨用例会持久**，别忘了清。

---

## 4. 版本权威与读时闸门（P-S51 / P-S53）

### 4.1 一个版本号，不是三个

`CONTENT_VERSION`（`src/content/contentManifest.js` 里的手工递增整数）→ 写入 `manifest.contentVersion`。
**三层共用它**，不给搜索 / 题库单开版本号（P-S51）：多一个版本号就多一处「谁前进了、谁没前进」的错位。

### 4.2 读时闸门

```js
// src/utils/assetClient.js
isFreshEntry(entry, minVersion)  // 判据写死：entry.version < minVersion → 未命中
```

- `minVersion` 来自 `readLocalMaxVersion(db)` = `content_meta['manifest'].contentVersion`。
  **读路径不额外拉 manifest**——那会让「缓存命中」也付一次往返，
  违背「预取只取 meta（1 次请求）」的契约（P-S51：本地那份就是全站唯一权威的最新已知值）。
- `minVersion == null`（本地无记录 / 读失败）→ **不拦**，但也**不写缓存**：
  无版本号的条目无法参与闸门，写了反而每次都被判陈旧、反复重拉。
- 判据是「**小于**」不是「不等于」：`entry.version` **高于**线上（回滚场景）仍算命中——
  不这样做的话，回滚发布会把用户已有的新缓存判成陈旧，等于自我否认。

#### ⚠️ 已知依赖（R-S5-5）：`minVersion` 由内容层的后台刷新「写入」

`minVersion` 只有 `content_meta['manifest']` 一个来源，而**写它的生产调用点目前只有一处**：
内容层的 `doRefresh()`（`contentClient.js`，由 `App.vue` 启动后台刷新）。
由此有一条必须知道的推论：

> **若客户端首次启动就离线（或后台刷新从未成功过一次），`minVersion` 恒为 null
> → 读时闸门不拦，但缓存也**永不落盘** → 搜索 / 题库在离线时拿不到旧索引/旧题。**

这不是 bug 而是取舍：反过来做（无版本号也写缓存）会让条目永久无法参与闸门，
每次都被判陈旧 → 反复重拉，损失比「首次离线没有缓存」更大（且更隐蔽）。
**不要**为了「离线能搜」去删这条限制；真要支持，正确做法是给缓存条目补一个
可比较的代次标记，并单独评估它与 P-S51「一个版本权威」是否冲突。

### 4.3 原子写：body 先落、meta 后交

```
content_cache 全部写成功 → 才写 content_meta（提交点）
```

任一片写失败 → 向上抛，**meta 不被写** → 闸门不前进 → 下次刷新重拉。
（`tests/asset-client.test.js` 有反向锚：第 2 片抛错时 `meta` 必须为空。）

### 4.4 存储不可用时怎么办（S5 收尾新增）

`safeDb()`（同一个文件）取不到 store 就返回 **null**，下游三处语义一致：
**缓存 miss / 版本未知 / 不写缓存** → 读路径退化为**直连远程**。

- 为什么必须这样：存储对搜索 / 题库只是**加速器**。
  `useStudyDbStore()` 在 Pinia 未激活时会抛，IDB 在隐私模式 / 配额耗尽 / 部分 webview 下也不可用——
  若让这些连带打掉整条读路径，等于把「功能可用性」挂在「可选优化」上。
- 读路径的缓存写走 `commitBestEffort()`：写失败**吞掉**，不向上抛。
  否则「quota 超了」会被调用方当成「远程失败」，明明有数据却置 error 态。
- **IDB 拿不到 ≠ 手里的旧值该扔**（R-S5-A）：`readByKey()` 在 `store` 为 null / IDB 报 miss /
  IDB 读抛错这三种情况下，只要**进程内还有那份（哪怕陈旧的）条目**，就返回 `source: 'stale'`
  而不是 `miss` / `error` —— 调用方据此先试远程、失败时才退回旧值。
  没有内存旧值时仍如实报 `miss` / `error`（**不要用 stale 掩盖存储故障**，故障必须可观测）。
- 回归锚：`tests/asset-store-degrade.test.js`（刻意**不建 Pinia**，用真实的「取不到 store」场景做证）；
  `tests/s5-qa-gate.test.js` 的 A5 组钉住了「有旧值 → stale」与「无旧值 → miss / error」两个方向。

---

## 5. 基址派生（S5-6）

全部收敛在 `src/utils/assetBase.js`，三层客户端**只 import，不自己拼**（H7 单一真相源）。

| 模式 | `contentRoot()` | `siteRoot()` | 说明 |
|---|---|---|---|
| 相对（dev / Web） | `./content-remote` | `./` | 请求的就是 `public/` 拷到 dist 根的那份 |
| 绝对（Tauri / Android） | `https://520305.top/content-remote` | `https://520305.top` | **必须取 origin**，不能拼 `API_BASE` |

⚠️ **`/api` 前缀陷阱**：Tauri 注入的 `API_BASE` 是 `https://520305.top/api`，
而静态目录**不在** `/api` 下面。直接 `API_BASE + '/search-meta.json'` 会打到 `/api/search-meta.json` → 404。
故一律 `new URL(apiBase).origin`（`originOf`）。

⚠️ 改站点域名时必须同步改 `src-tauri/tauri.conf.json` 的 CSP `connect-src`，
否则 WebView 直接拦截，表现为 **CSP violation** 而不是网络错误（很容易误判成「远程挂了」）。

---

## 6. 发布顺序纪律（产物先行，清单最后）

`manifest.json` 是客户端**唯一的入口指针**（既指 `content-remote` 的单元分片，
也经 `manifest.search` / `manifest.practice` 指搜索与题库分片）。所以：

```
① dist/assets/            ② index.html + favicon + search-meta.json + search-body/
③ 带 --delete 清理旧 assets / search-body
④ dist/content-remote/（--exclude manifest.json，不带 --delete）
   dist/practice-bank/（不带 --delete）
⑤ dist/content-remote/manifest.json   ← 提交点，单独最后切
```

- 顺序反了会开出「新清单已上线、它指向的题库分片还没传完」的窗口 → 客户端按指针拉即 404。
- `content-remote` / `practice-bank` **不带 `--delete`**：单元下线时旧分片残留无害
  （客户端只按 manifest 指向拉取），而 `--delete` 会在「新清单已上线、仍有旧客户端在飞」的窗口里
  删掉它们正在请求的文件。
- 断言在 `tests/content-remote-ci-wiring.test.js`（含反向锚）。

---

## 7. Android 真机验收清单（5 组）

> 前置：装的是 **release 包**（不是 dev server）；`API_BASE` 为绝对模式；
> 真机与电脑不在同一局域网也能测（走的是公网 `https://520305.top`）。
> 每组都先记下**预期**，再操作——对不上就是缺陷，不要「再试一次就好了」。

### 7.1 在线首开（有网、无缓存）

| 项 | 内容 |
|---|---|
| 前置 | 卸载重装，或「设置 → 清除数据」，确保 IDB 为空 |
| 操作 | 联网打开 → 进首页 → 点搜索框输入 ≥2 字 → 进练习/题库页 |
| 期望 | ① 内容页正常渲染（远程快照生效）；② 搜索出结果；③ 题库能组卷 |
| 判据 | `adb logcat` 里出现对 `https://520305.top/search-meta.json`、`/practice-bank/index.json` 的 200；**无** CSP violation |

### 7.2 离线 + 有缓存

| 项 | 内容 |
|---|---|
| 前置 | 先按 7.1 跑一遍且成功（IDB 已落缓存） |
| 操作 | 关 Wi-Fi 与移动数据 → **冷启动** App（不是切后台再回来）→ 重复 7.1 的操作 |
| 期望 | ① 内容页正常；② 搜索**仍能**出结果；③ 题库**仍能**组卷 |
| 判据 | 功能区全可用；日志里**没有** `Failed to fetch`（缓存命中就不该发请求） |

### 7.3 离线 + 无缓存（已知的不对称点）

| 项 | 内容 |
|---|---|
| 前置 | 「设置 → 清除数据」→ **立刻**断网 → 冷启动 |
| 期望 | ① 内容页**仍然正常**（内置内容页 chunk 兜底，页数以 `src/content/**` 为准）；② 搜索给出**明确的错误态 + 重试入口**；③ 题库给出明确提示，**不能**是「空白/无限 loading」 |
| 判据 | 关键不是「能用」，而是「**说得清为什么不能用**」——这是 §2.4 取舍的直接后果，属预期行为 |
| 若判定不可接受 | 走 §2.4 末尾的相对路径兜底改法（约 6 行） |

### 7.4 远程 404（产物未发布 / 路径错）

| 项 | 内容 |
|---|---|
| 前置 | 联网；临时把某个产物改名或让 nginx 对其返 404（如 `search-meta.json`） |
| 期望 | ① 内容层不受影响（它走 `content-remote`，与 `siteRoot()` 是两条路径）；② 搜索置 error 态；③ **不崩、不白屏**；④ 网络恢复后点「重试」能自愈 |
| 判据 | 错误文案可读；重试按钮真的重新发请求（不是死按钮） |

### 7.5 留空 / 半填充清单（manifest 子段为 null 或缺一侧）

| 项 | 内容 |
|---|---|
| 前置 | 手工构造一份 `manifest.json`：`search` 段有指针、`practice` 为 `null`（半填充）；或两侧都是 `null`（留空，= 产物没随清单产出） |
| 期望 | ① **构建期就被拦**：`build:content-remote` 在产物缺失时直接退出非 0（"子段留空"是 `assertManifestInvariants` ⑤ 的明令禁止态）；② `npm run check:content-remote` 退出码非 0；③ 运行时不应出现「指针指向不存在的文件」 |
| 判据 | 留空 / 半填充**根本不该上线**——CI 的「内容快照自检」步骤必须先红。若它能溜到线上，说明自检接线被改坏了 |

⚠️ **为什么 2026-10-17 把「null 合法」收紧成缺陷**（QA 编号 D-S5-1）：
从前三份搜索/题库产物不在盘上时，构建脚本会填 `null` 后 **exit 0**，而自检脚本遇 `null`
又整段 `continue` 跳过 → **「4 份产物缺 3 份」这个最致命状态 CI 全绿放行**。
而运行时**零处消费** `manifest.search` / `manifest.practice`（三个客户端一律按路径直接拉），
所以这不是「客户端会自愈」，是**没有任何第二道防线的 CI 盲区**（与 2026-10-15 事故同型）。
S5 已发布，不再需要向后兼容 null，故契约收紧为**必填**：缺产物在构建期就抛错、不落盘。

---

## 8. 改这条链路时的自检

1. **版本号动了没？** 改产物内容就要手 bump `CONTENT_VERSION`（`src/content/contentManifest.js`）。
2. **产物重新生成没？** `build:practice` → `build:search` → `build:content-remote`（顺序不能反）。
3. **自检过了没？** `npm run check:content-remote` —— 它同时校验清单不变量与分片计数。
4. **门禁过了没？** `npx eslint src tests scripts --max-warnings 0` + `npm test`。
5. **发布顺序对没？** 见 §6；改了 `ci.yml` 就顺手跑一次 `tests/content-remote-ci-wiring.test.js`。
