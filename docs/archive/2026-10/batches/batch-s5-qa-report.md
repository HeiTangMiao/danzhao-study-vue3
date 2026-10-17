# 批 S5「搜索 · 题库远程化」独立对抗验证报告（QA）

> 验证人：software-qa-engineer（Edward）｜验证对象：**工作树里的未提交改动**（HEAD `63c2f0f`，17 M + 9 ?? 为实施侧改动）
> 方法：**独立证伪**——不复跑既有测试当结论，另写 5 个新探针文件共 **88 例**；每条结论按「攻击 → 预期 → 实际 → 判定」四段写。
> 防假绿手段：① 不抄实现的期望值（真值表独立重推 / Node 原生 API 实测 / 独立重算 sha256）；② **变异反证 N1–N8**（与 team-lead 已跑的 M1–M8 完全不重叠）**8/8 被检出**；③ 反向锚与正向对照。
> 纪律：未 commit / push / reset；未改 `/tmp/s5_mutation.py`；未改任何既有测试的断言；未跑 `npm run build` 整链；关键校验一律 Python/Grep 工具（不用 shell grep）。

---

## 0. 结论速览

| 项 | 结果 |
|---|---|
| 新写探针 | 5 个文件 / **88 例**（87 绿、1 红） |
| 10 个攻击面 | **9 面通过、1 面判缺陷**（⑩ 文档数字腐烂，低） |
| 附带发现的缺陷 | **D-S5-1（高）**、**D-S5-2（低）**、D-S5-3（低，即 ⑩） |
| 变异反证 | N1–N8 **8/8 被我的探针检出**（N6 首轮漏检 → 已补用例 → 复跑检出） |
| lint | `npx eslint src tests scripts --max-warnings 0` → **0 问题** |
| 全量回归 | 111 文件 / 1394 用例 → **1393 绿 / 1 红**（红的即 D-S5-3）→ 见 §5 |
| 最终结论 | **有条件放行**（条件：D-S5-1 必须修或明确接受并由发布纪律兜底） |

---

## 1. 攻击清单（逐条四段式）

### ① 读时闸门边界 `assetClient.isFreshEntry`

- **攻击**：不抄实现的期望值 —— 按 `docs/remote-assets.md` §4.2 的文字口径**独立重推**一份期望函数，再把 `isFreshEntry` 在 **16 种 entry × 7 种 minVersion = 112 格**上全量比对；另加三条定向边界（`minVersion = 0`、条目无版本号、回滚场景）。
- **预期**：逐格一致；`0` 是合法代次不得被当成「不知道版本」；无版本号一律判**陈旧**；缓存版本**高于**本地已见版本仍算命中（判据是「小于」不是「不等」）。
- **实际**：112 格**全部一致**；`isFreshEntry({version:0},0)=true`、`({version:0},1)=false`、`({version:1},0)=true`；`{}` / `{version:undefined}` / `{version:null}` / `{version:NaN}` / `{version:'abc'}` / `{version:''}` 六种无版本号形态在 `minVersion=3` 下**全部 false**；`({version:9},3)=true`、`({version:3},9)=false`。
- **判定**：**通过**。

> 附带记录（**非缺陷，是有意口径**）：`minVersion` 为 `null` 时 `isFreshEntry` 是**短路放行**（返回 true），与 `!isNewer(null, ev)` **不等价** —— 因为 `Number(null)===0` 是有限值，`isNewer` 不会在那一步返回 false。已用「记录口径差异」一例钉住，防止将来有人把 `isFreshEntry` 简化成 `!isNewer(...)`，把离线首开从「能用」改成「抛错」。

> 变异反证：**N1**（`if (minVersion == null)` → `if (!minVersion)`）→ **检出**。

---

### ② stale 回退语义：两层终点不同

- **攻击**：同一组**可编排假 store**（能返回任意 version 的缓存条目）分别驱动两个客户端，覆盖「缓存够新 / 缓存陈旧 / 无缓存」×「远程可达 / 远程挂了」；并补上组件层验证。
- **预期**（卡 §4 第 5 条 + docs §2.2 / §2.3）：有缓存（含陈旧）→ 用缓存；搜索无缓存 → 抛错、由 SearchPanel 置 error 态；题库无缓存 → 抛错、由视图兜底。
- **实际**：
  - 搜索：缓存够新 + 远程挂 → 返回缓存且 **0 次网络**；缓存陈旧 + 远程挂 → 退回陈旧缓存（**确实先试了 1 次远程**）；无缓存 + 远程挂 → 抛错 → 组件渲染「搜索索引加载失败，请重试」。
  - 题库：缓存陈旧 + 远程挂 → **也退回陈旧缓存**（这是 S5 的新契约，旧行为是一失败就抛）；无缓存 + 远程挂 → 抛错；产物形状坏（非数组）→ 抛「题库产物形状不合法」。
  - 对照：搜索层遇同样的坏形状**不抛**、退化为 `{}`（该学科只剩标题级检索）—— 两层在此处**刻意不同**，与文档一致。
  - 组件层：`useStudyDbStore()` 直接抛（模拟 Pinia 未激活）+ fetch 正常 → 搜索结果照常出现、不进 error 态（红线 2 的组件级证明）。
- **判定**：**通过**。

> 变异反证：**N5**（去掉 stale 兜底）→ **检出**。

> **附带风险 R-S5-A（低）**：`readByKey` 只在 `source === 'stale'`（即 **IDB 里确实有该条**）时让上层拿到旧值；若 IDB 缺该条（`miss`）或读抛错（`error`），即便**进程内 memory 里就有一份可用的旧 payload** 也不回退 → 直接抛错。与 docs §2.2「连陈旧缓存都没有才到终点」的降级图不完全一致。
> 证据：`src/utils/assetClient.js:84`（`!store → miss`）、`:88-90`（catch → error）、`:91`（`!entry → miss`）；`src/utils/searchClient.js:109`、`src/utils/practiceBankClient.js:80`（同构）。已在 `tests/s5-qa-gate.test.js` A5 用两条用例**记录现状**（不阻断放行）。

---

### ③ 原子写提交点 `commitAtomically`

- **攻击**：构造「第 2 片写入抛错」断言 meta 未被写；再端到端让 `saveContentCache` 抛 `QuotaExceededError`，断言 `loadSearchMeta()` 仍返回**本次从远程取回的**正确数据。
- **预期**：body 逐片落、meta 最后交；任一 body 抛错 → meta 一滴不写、异常向上抛、失败那片不进 memory；`commitBestEffort` 吞异常但**返回的数据仍然正确**（红线 2：存储故障 ≠ 内容故障）。
- **实际**：`calls.meta = []`；`calls.cache = ['a']`（失败点之前的片按序落了，允许，幂等重拉即可）；`memory.keys() = ['a']`（失败那片没进进程内缓存）；顺序断言 `['cache:a','cache:b','meta']`；`commitBestEffort` 返回 `{written:0, failed:true}` **不抛**；端到端 `loadSearchMeta()` resolves 出远程数据，且 `getContentCache` 确为 `null`（不是「假成功」）。另加**反向锚**：「meta 提到循环前」的坏实现会被同一组断言抓出来（证明断言有鉴别力）。
- **判定**：**通过**。

> 变异反证：**N3**（meta 提前到循环前）→ **检出**。

> **附带风险 R-S5-B（中低，属 H7 过渡态）**：`commitAtomically` 的 `metaPatch` 分支**目前没有生产调用方** —— `contentClient.doRefresh` 仍未迁到 `assetClient`（卡 §S5-2 明确「本批不重写最高风险路径」，已登记 R-9 备案）。即「原子写模式唯一」这条不变量**目前只由测试守护**，`doRefresh` 里那份内联实现可以独立漂移。证据：全仓 `saveContentMeta` 生产调用点只有 `src/utils/contentClient.js:205` 一处。

---

### ④ 半填充拒绝 —— CLI 层非零退出且不落盘

- **攻击**：在 `/tmp` 的最小仓库副本里**真跑子进程** `node scripts/build-content-remote.mjs` / `check-content-remote.mjs`，三类缺失形态各一次；跑之前/之后对 `public/content-remote/**` 做**逐文件 sha256 指纹对照**。
- **预期**：半填充 / 半份内部缺失 → 退出码 ≠ 0，且盘上**一个字节都不改**（`rmSync`/`mkdirSync`/`writeFileSync` 都在 `buildSubSections` 之后）。
- **实际**：
  - 删 1 个 `search-body` 分片 → **exit 1**（`产物缺失：search-body/math.json`）；content-remote 28 个文件指纹**逐字节不变**。
  - 删 1 个 `practice-bank` 分片 → **exit 1**；指纹不变。
  - 删光 `practice-bank`（search 全在）→ **exit 1**（`搜索/题库产物缺失不一致`）。
  - 自检侧：删 1 个 `search-body` 分片 → `check:content-remote` **exit 1**（`子段 search 声明的分片缺失`）。
- **判定**：**通过**（半填充 / 半份缺失两种形态均被 CLI 层拦住，且不落盘）。

> 变异反证：**N8**（半填充一致性检查改成 `if (false)`）→ **检出**。

> ⚠️ **但同一组里挖出一个真缺陷，见 §3 的 D-S5-1（高）。**

---

### ⑤ 基址派生 `siteRootFrom` / `contentRootFrom`（剥 `/api`）

- **攻击**：表驱动，期望值取自 **Node 原生 `new URL(x).origin` 的实测结果**（不抄实现里的字符串拼接）；并额外断言派生结果里**不再出现** `/api` 与 `/content-remote`。
- **预期**：`siteRootFrom('https://520305.top/api', true) === 'https://520305.top'`。
- **实际**：5 组绝对基址全部等于 origin、且不含 `/api`；`siteRootFrom('https://520305.top/api', true) + '/search-meta.json' === 'https://520305.top/search-meta.json'`；`contentRootFrom` 全部为 `origin + /content-remote`、不含 `/api/`；相对模式 4 组（`./api` / `''` / `'.'` / `/api`）归一为 `./`；非法基址（`not a url` / `http://` / `https://[bad`）走兜底**不抛**。
- **判定**：**通过**。

> 变异反证：**N7**（`siteRootFrom` 不剥 `/content-remote`）→ **检出**。

> 附带观察（非缺陷）：`originOf` 的 catch 兜底对 `'/api'` 会返回 `''`（`String('/api').replace(/\/[^/]*$/,'')`），进而被 `siteRootFrom` 归一成 `./`。该分支只在 `IS_ABSOLUTE_API === true` 且 `new URL` 仍失败时可达（即 API_BASE 形如 `http://`），生产不可达。

---

### ⑥ CSP 红线 + 扫描范围是否真覆盖新文件

- **攻击**：**重新实现一遍 `walkSrc`**，先证明 3 个新文件确实落在扫描集合里，再去注释后扫 `eval(` / `new Function` / 动态 `import()` / `require(` / `import.meta.glob` / 第三方域名 / `API_BASE +` 拼接。
- **预期**：`tests/csp-guard.test.js` 的扫描是**动态递归遍历**而非硬编码清单；3 个新文件自身干净。
- **实际**：`csp-guard.test.js:64` 是 `walkSrc(join(ROOT,'src'))`（动态递归、`/\.(js|vue|ts)$/`），且**未硬编码**任何新文件路径 → 自动覆盖；3 个新文件均在我重实现的集合里；去注释后：0 处 `eval(`、0 处 `new Function`、0 处动态 `import(`、0 处 `require(`、0 处 `import.meta.glob`、0 个 `http(s)://` 主机、0 处 `API_BASE +`。全仓 `src/` 去注释后只有 2 个第三方主机（`www.zjzs.net` 在 `HOST_ALLOWLIST`；`www.example.com` 在 `src/content/computer/**`，属 L4 排除的教学数据）。
- **判定**：**通过**。

---

### ⑦ 产物与 manifest 一致性（sha256 + 翻字节必变）

- **攻击**：在副本里按纪律顺序跑 `build:practice` → `build:search` → `node scripts/build-content-remote.mjs`，然后**独立重算盘上文件 sha256** 与 manifest 里每条 `hash` 比对（不比「实现算出来的值」，防同源假绿）；再把 `search-body/math.json` 里某个值 +1 个空格后重建，断言哈希必变。
- **预期**：每条 `hash` = `sha256:` + 盘上真实摘要；`count` 与产物实际条目数一致；翻字节后哈希必须变；顺序纪律 `build:practice` 先于 `build:search` 不可反。
- **实际**：search 4 条 + practice 4 条**逐条相符**；`count` 全对；翻字节后 `m2.search['search-body/math.json'].hash !== beforeHash` 且等于重算值；`package.json` 的 `build:index = "npm run build:practice && npm run build:search"`、`prebuild` 里 `build:index` 排在 `build:content-remote` 之前（静态断言钉住）。另核对 `ci.yml` 部署顺序 `:167 assets → :179 index.html+favicon+search-meta.json → :180 search-body → :200 content-remote(--exclude manifest) → :201 practice-bank → :203 manifest`，与 docs §6「先产物、后清单」一致。
- **判定**：**通过**。

> ⚠️ **但暴露出真缺陷 D-S5-1（高），见 §3。**

---

### ⑧ 加载时机契约（预取只拉 `search-meta.json` 1 次）

- **攻击**：组件层**独立复现**（不依赖 `tests/search-panel.test.js`），并补上工程师**没覆盖**的分支 —— 他们的文件把 `@/stores/studyDb` mock 成恒返回 null，于是「缓存命中」这条分支在组件层**从未被真正走过**。
- **预期**：挂载零请求；idle / 1.5s 兜底只拉 `./search-meta.json`、恰好 1 次；正文要等 ≥2 字且只拉当前学科。
- **实际**：挂载 `calls = []`；1500ms 后 `calls.length === 1` 且 `calls[0] === './search-meta.json'`、无 `search-body`；1 字不触发正文；≥2 字触发 `./search-body/math.json` 一次；切学科后 `chinese` 拉 1 次、`math` 仍为 1 次（不重拉）；**有缓存时预取 0 次网络且 UI 正常出结果**（缓存优先，用的是缓存里的 META 而非远程 NEW_META）。
- **判定**：**通过**。

> 变异反证：**N4**（缓存条目 `version` 登记成 0 → 永远陈旧 → 反复重拉）→ **检出**（二次调用不再零 fetch）。

---

### ⑨ 缓存键隔离 + 不触发 IDB 升版

- **攻击**：把 4 条链的键（3 学科展开 = 8 个）与内容层 `unitKey` 做**全量两两不重复**比对；再静态 + 运行时断言 DB 版本与 object store。
- **预期**：8 个资源键两两不同、不与 `math/01` 这类内容键撞车；`DB_VERSION` 仍为 **7**；不新增 `search_/bank_/asset_/practice_` 开头的 store。
- **实际**：`new Set(keys).size === 8`；与 `math/01` 等 3 个内容键**双向**互不命中；前缀分别为 `search:` / `practice:`，且 `search:math ≠ practice:math`；`src/stores/studyDb.js:33` 仍 `const DB_VERSION = 7`，两表仍在 `if (oldVersion < 7)` 分支内以 `keyPath:'key'` 创建，无新 store；真 store 写入/读回 `search:meta` 与 `practice:math` 均成功。
  另**全仓扫描确认**：除测试外**没有任何生产代码按「`content_cache` 里全是单元分片」的假设去遍历它**（`getAllContentCache` 无生产调用方）→ 混存不会污染既有逻辑。
- **判定**：**通过**。

---

### ⑩ `docs/remote-assets.md` 与代码一致性

- **攻击**：把文档里**可核对的断言**逐条抽出来用代码证伪 —— §1 表三个运行时入口、§1「共享原语 = assetClient / 基址派生 = assetBase」、§5 基址表 4 格、§5 CSP 放行、§3 四个缓存键、§2.1 `PENDING_MAX_ATTEMPTS = 5`、§2.2「≥2 字」、§8 自检命令、文档里的 chunk 数、CI 发布顺序。
- **预期**：全部对得上。
- **实际**：**10 条里 9 条一致**（入口文件存在、两个新客户端确实 import assetClient/assetBase 且无 `API_BASE +`、基址 4 格全等、`connect-src` 含 `https://520305.top`、4 个缓存键全等、`PENDING_MAX_ATTEMPTS === 5`、`BODY_MIN_QUERY === 2`、`npm run` 命令全部命中 package.json、CI 顺序与 §6 一致）。
  **1 条不一致**：文档三处写「182 个懒加载 chunk / 内置 182 chunk 兜底」，而 `src/content/{math,chinese,computer}` 实际内容页 = **183**（82/46/55），manifest 页合计也是 183。182 是 S1/S2 时期的旧数（当时 computer 54 页）。
- **判定**：**缺陷（低，编号 D-S5-3）** —— `docs/remote-assets.md:20 / :75 / :222`；同源的旧注释 `src/content/loadPage.js:17` 也仍是 182。这是**唯一报红**的用例，位于 `tests/s5-qa-docs.test.js` E4。

---

## 2. 新写的 5 个测试文件与覆盖点

| 文件 | 用例数 | 覆盖点 |
|---|---|---|
| `tests/s5-qa-gate.test.js` | **25** | ① `isFreshEntry` 真值表 112 格独立重推比对；`minVersion=0` / 条目无版本号 / 回滚三条边界；`readLocalMaxVersion` 边界（0 是合法代次 / 非数字→null / db=null 不抛）；③ `commitAtomically` 提交点（meta 不写、异常上抛、memory 只回填成功片、顺序断言）+ **反向锚**；`commitBestEffort` 吞异常 + **端到端数据仍正确**；`readByKey` 五态（memory/idb/stale/miss/error）+ 记录 R-S5-A；`isNewer` 方向一致性与「数值比较非字典序」 |
| `tests/s5-qa-base.test.js` | **20** | ⑤ `originOf` 与 Node 原生 `new URL().origin` 逐格一致；站点根/内容根 5 组绝对 + 4 组相对；Tauri 真实形态 URL 不含 `/api`；非法基址不抛；⑨ 8 个资源键全量两两不重复 + 与 `math/01` 双向不撞 + 前缀隔离；DB 仍 v7、两表 keyPath 仍是 `key`、无新 store、真 store 读写通过；⑥ 重实现 `walkSrc` 证明 3 个新文件在 CSP 扫描集合内 + 去注释后扫 eval/new Function/动态 import/require/glob/第三方域名/`API_BASE +` |
| `tests/s5-qa-degrade.test.js` | **21** | ② 两层 stale 回退（搜索：够新 0 网络 / 陈旧退回 / 无缓存抛错 / 组件层 error 态；题库：陈旧退回 / 无缓存抛错 / 坏形状抛「形状不合法」/ **全条目坏也必须抛**）+ 两层对照（搜索坏形状不抛）；存储不可用（Pinia 未激活）时组件仍可用；⑧ 挂载零请求 / 预取恰好 1 次且只拉 meta / 1 字不触发正文 / ≥2 字只拉当前学科 / 切学科不重拉旧学科 / **有缓存时预取 0 网络且 UI 正常**；坏条丢弃粒度（bodyKeyOf / practiceKeyOf）+ `kp` 回落 `fk` |
| `tests/s5-qa-artifacts.test.js` | **11** | ④ **真跑 CLI 子进程**（/tmp 最小副本）：删 1 个 search 分片 / 删 1 个 practice 分片 / 删光 practice（半填充）→ 退出码 ≠ 0 且 `content-remote/**` 逐文件 sha256 指纹不变；自检脚本亦拒绝；⑦ 独立重算盘上 sha256 与 manifest 逐条比对 + `count` 一致 + **翻一个字节哈希必变** + `build:index` 顺序静态断言；**记录 D-S5-1 现状** |
| `tests/s5-qa-docs.test.js` | **11** | ⑩ 文档 §1/§2.1/§2.2/§3/§5/§8 的可核对断言逐条用代码证伪；chunk 数防腐烂（**唯一报红**） |

> 工程说明：D 组的沙箱**只复制 `src` / `scripts` / `schema` / `package.json` 与 4 个产物项**（~8.7 MB）且**不用 `node_modules`**（已核实四个构建脚本的依赖树零 npm 包）。复制用逐文件 `readFileSync/writeFileSync` 而非 `cpSync` —— 本沙箱的 fs shim 会拦 `copyFileSync`（`Brokered host copy source refused by file policy`），全量 `npm test` 时会让整个套件挂掉。

---

## 3. 仍存在的风险（按严重度排序）

### 🔴 D-S5-1（高）｜CI 具名自检可被「子段为 null」整体绕过 —— 3/4 产物全缺时自检仍绿

- **现象**：搜索 / 题库产物（`public/search-meta.json`、`public/search-body/`、`public/practice-bank/`）**完全不在盘上**时：
  1. `node scripts/build-content-remote.mjs` → **exit 0**，manifest 里 `search = null`、`practice = null`（协议允许，向后兼容 S5 前产物）；
  2. `node scripts/check-content-remote.mjs`（CI 具名门禁）→ **exit 0（绿）**。
- **根因**：`check()` 的 ③ 循环用 `if (!sub) continue` **整段跳过**（`scripts/check-content-remote.mjs:113`）；而子段变 null 的来源是 `buildSubSections` 的「全缺返回 null」（`scripts/build-content-remote.mjs:343`）。
- **为什么严重**：S5-5 的承诺是「把发布闭环从 1 份产物扩到 4 份」，但**「4 份里 3 份全缺」这种最致命状态根本不会被 CI 拦住**。而运行时客户端**压根不读** `manifest.search` / `manifest.practice`（已全仓核实：`searchClient.js` / `practiceBankClient.js` / `assetClient.js` / `assetBase.js` / `SearchPanel.vue` / `practice.js` / `contentClient.js` **零处消费**子段，路径一律直接取形状模块）→ **没有第二道防线**。这正是 2026-10-15 事故的失效形态：「看起来没报错、线上却拿不到」。
- **可复现证据**：`tests/s5-qa-artifacts.test.js` 的「缺陷 R-S5-B」一例（在副本里删光三处产物后跑构建与自检，断言两者 exit 均 0 —— 断言的是**现状**，修复后该行应改为 1）。
- **触发前提**：`prebuild` 链里 `build:index` 被去掉或静默失败（`build:index` 自身失败会让 prebuild 失败，所以实际触发路径是「链子被改坏」而非「脚本报错」）。
- **建议修法（供工程师选，我未改码）**：
  - (a) 收紧：`check()` 里子段为 `null` 时**报错**（S5 已发布，不再需要向后兼容 null）；
  - (b) 折中：加一道独立门禁，直接断言四份产物存在（不依赖 manifest 子段），与 S4-4a 同款；
  - (c) 若坚持保留 null 合法，请在 `docs/remote-assets.md` §8 与 `content-release-runbook.md` 明确写出「子段为 null 时自检不覆盖搜索/题库齐备性」，让缺口可见而不是静默。

### 🟠 R-S5-5（中低，设计层）｜搜索/题库的持久缓存**依赖内容层后台刷新先成功**

- **证据**：`saveContentMeta` 的生产调用点**只有** `src/utils/contentClient.js:205`（在 `doRefresh` 内），由 `src/App.vue:103 startBackgroundRefresh()` 触发。而 `readLocalMaxVersion(db)` 读的就是这条记录。
- **后果**：若内容层后台刷新从未成功过（首次启动即离线 / `content-remote` 不可达），`minVersion` 恒为 `null` → 按设计**不写缓存** → 搜索/题库**永远拿不到离线能力**。这是 P-S51「一个版本权威」的代价。
- **建议**：不一定要改码，但**必须在 `docs/remote-assets.md` §4.2 写明这条依赖**，否则后人会以为「接了缓存就该有离线」。

### 🟡 R-S5-B（中低）｜`assetClient` 的原子写模式暂无生产调用方（H7 过渡态）

- `commitAtomically` 的 `metaPatch` 分支只被测试调用；`doRefresh` 仍保有自己的内联实现 → 「原子写模式唯一」这条不变量目前**只由测试守护**。卡 §S5-2 已登记为 R-9 备案，我认同这个取舍，但建议下次触碰 `contentClient` 时优先收敛。

### 🟡 R-S5-A（低）｜`readByKey` 在 `miss` / `error` 时不回退进程内的旧值

- 见 §1 ② 附带风险。影响面很窄（需要「IDB 被清/读错」且「进程内恰好还有旧值」同时成立），但不改的话与文档的降级图对不上。

### 🟢 D-S5-3（低）｜文档与注释里的 chunk 数已腐烂（182 → 183）

- `docs/remote-assets.md:20 / :75 / :222` 三处、以及 `src/content/loadPage.js:17` 的注释，均仍写 182；实际内容页 **183**（math 82 / chinese 46 / computer 55），manifest 页合计也是 183。182 是 S1/S2 时期 computer 还只有 54 页时的旧数。
- 已由 `tests/s5-qa-docs.test.js` E4 钉住（该用例会随内容增长持续校验，防止再次腐烂）。

### 🟢 其它观察（非缺陷，不需处理）

- `sanitizeBankShard([])`（产物是空数组）返回 `[]` 而非 `null`，上层由 practice store 抛「该范围内没有可用题目」兜住 —— 与 docs §2.3「静默返回空库更糟」的字面口径略有出入，但用户侧仍有明确提示，且会被 N6 之外的下游闸接住。
- `originOf` 的 catch 兜底在 `/api` 这类相对基址下返回 `''`，生产不可达（见 §1 ⑤）。

---

## 4. 变异反证（N1–N8，与 team-lead 的 M1–M8 不重叠）

| 编号 | 变异 | 跑的探针 | 结果 |
|---|---|---|---|
| N1 | `if (minVersion == null)` → `if (!minVersion)`（吞掉合法的 0） | s5-qa-gate | ✅ 检出 |
| N2 | 陈旧判定被绕过（`if (false)`，stale 当新用） | s5-qa-gate | ✅ 检出 |
| N3 | 提交点提前（meta 先交再落 body） | s5-qa-gate | ✅ 检出 |
| N4 | 缓存条目 `version` 登记成 0（永远陈旧 → 反复重拉） | s5-qa-gate | ✅ 检出 |
| N5 | 去掉 stale 兜底（离线直接 error 态） | s5-qa-degrade | ✅ 检出 |
| N6 | 题库「全条目坏」不再判不可用（静默空库） | s5-qa-degrade | ⚠️ 首轮**未检出** → 我补了「所有条目都坏也必须抛」一例 → 复跑 ✅ 检出 |
| N7 | 站点根不剥 `/content-remote` | s5-qa-base | ✅ 检出 |
| N8 | 半填充一致性检查被摘掉 | s5-qa-artifacts | ✅ 检出 |

**合计 8/8**（N6 是我自己探针的缺口，已补）。变异脚本 `/tmp/qa-s5-mutation.py`，跑完已自动还原，工作树未被污染。

---

## 5. 回归与门禁

| 项 | 命令 | 结果 |
|---|---|---|
| lint | `npx eslint src tests scripts --max-warnings 0` | **0 问题（exit 0）** |
| 我的 5 个探针 | `npx vitest run tests/s5-qa-*.test.js --pool=threads --maxWorkers=1` | **88 例：87 绿 / 1 红**（红的是 D-S5-3 文档数字） |
| 全量回归 | `npx vitest run --pool=threads --maxWorkers=1` | **111 文件 / 1394 用例：1393 绿 / 1 红 / 0 跳过**；失败项 = 上述 D-S5-3 一例 |

- 基线对账：team-lead 报的基线是 **106 文件 / 1306 用例**；加我 5 个文件（88 例）后 111 文件 / 1394 用例 —— **数字精确吻合**（106+5=111，1306+88=1394），说明我的探针**没有污染也没有替换**任何既有用例。
- 期间另跑过一次显示 10 处 skip（既有的 git 历史依赖型用例在沙箱里的预期空转，随环境浮动，非我引入）；最终一次为 0 skip。
- `tests/s5-qa-artifacts.test.js` 在**全量（非提权）执行下也能跑通**（11 例 / 56.9s）—— 首轮曾因 `cpSync` 被沙箱拦而整套件挂掉，已改为逐文件读写复制。

---

## 6. 最终结论：**有条件放行**

**放行的部分**：批 S5 的主体实现质量高 —— 读时闸门、原子写、基址派生、CSP、缓存键隔离（DB 零升版）、加载时机契约、产物哈希一致性、半填充拒绝（CLI 层非零退出且不落盘）**九面全部通过**，且经 8 组独立变异反证证明守卫真的在咬。

**条件（必须二选一）**：

1. **修 D-S5-1**（推荐）：让「搜索/题库产物全缺」在 `check:content-remote` 里**也必须红**（改法见 §3，约 1–6 行）；或
2. **明确接受**：由 team-lead 裁定「`prebuild` 链完整性由发布纪律保证」并接受该缺口，同时在 `docs/remote-assets.md` §8 / `content-release-runbook.md` 写明。

**建议同批顺手修（不阻断）**：D-S5-3（文档 182→183，1 分钟）、R-S5-A（低）、R-S5-5 的文档补写。

**不建议现在做**：R-S5-B 的 `contentClient` 收敛（属 H7 过渡态备案，应留在下次触碰时做，本批混入会扩大回归面）。

---

## 7. 智能路由判定

| 项目 | 判定 | 去向 |
|---|---|---|
| 10 个攻击面中的 9 面 | 通过 | — |
| D-S5-1（自检可绕过，高） | **源码/脚本缺陷** | → **Engineer**（未自修，仅提供建议改法） |
| D-S5-3（文档 182→183，低） | **文档缺陷** | → **Engineer / team-lead**（未自修） |
| R-S5-A / R-S5-B / R-S5-5 | 风险（设计层，非实现 bug） | → **team-lead 裁决**（未自修，未改判据） |
| 我的 A6「闸门方向全格成立」首轮报红 | **我自己断言过强**（把有意的 `minVersion==null` 短路也算进去） | → **自修**（收窄到非空 minVersion，并另加一例把这个有意差异钉住） |
| 我的 N6 变异首轮未检出 | **我自己探针缺口**（只覆盖「非数组」，漏了「全条目坏」） | → **自修**（补用例，复跑检出） |
| 我的 D 组首轮 Failed Suites | **我自己探针的环境适配问题**（`cpSync` 被沙箱拦） | → **自修**（改逐文件读写复制 + 最小沙箱 + 显式超时） |

> 本文件为质量验证记录，不构成对考试成绩或录取结果的承诺；考试内容、结构与分值以浙江省教育考试院当年发布为准。

---

## 8. 处置记录（team-lead，2026-10-17）

QA 的四条判定**全部采纳**，且 D-S5-1 走「① 修」而非「② 接受 + 写文档兜底」。

| 编号 | 裁决 | 落地位置 |
|---|---|---|
| **D-S5-1**（高） | **必修，口径收紧为「子段必填」** | 见下方 §8.1 |
| **D-S5-3**（低） | 一律**不写死页数**，改为指向真相源（`src/content/**`） | `docs/remote-assets.md` ×3、`loadPage.js` ×3、`searchClient.js` / `assetClient.js` / `assetBase.js` 各 1 |
| **R-S5-A**（低） | 补回退路径：`IDB 拿不到 ≠ 手里的旧值该扔` | `assetClient.readByKey` 的 `staleOr`；`isFreshEntry` **一字未改** |
| **R-S5-5**（中低） | **只补文档，不改实现** | `docs/remote-assets.md` §4.2 末尾「已知依赖」小节 |
| **R-S5-B**（低） | 不做（保留 H7 过渡态备案，下次触碰 `contentClient` 时收敛） | — |

### 8.1 D-S5-1 的修法与副作用

**修法（三处同一份改动）**：

1. `scripts/build-content-remote.mjs` 的 `buildSubSections()`：`产物缺失 → 返回 null` 改为
   **缺任何一份就抛错并点名缺失文件**（最多列 3 个）。原先那条「缺失不一致」分支随之删除
   —— 它只在「一侧为 null」时才可能触发，而 null 已不合法，留着就是永不开火的死守卫。
2. 同文件的 `assertManifestInvariants` 第 ⑤ 段：`sub === null → 跳过` 改为**报错**。
   原「半填充」守卫同步删除（理由同上：其触发路径已被「null 是缺陷」完全覆盖）。
3. `scripts/check-content-remote.mjs` 第 ③ 段：`if (!sub) continue` 改为**报错**。
   与 ⑤ 段互为独立的两道（⑤ 管清单形态、③ 管「声明的东西是否真在盘上」）。

**为什么两道都留**：任何一道单独被改坏，另一道仍会让 CI 红；两道各自的变异都有独立用例咬住
（⑤ → `tests/content-remote-manifest.test.js`；③ → `tests/check-content-remote.test.js` 的
「两个子段都是 null → 抛错」+ 反向锚 `expect(src).not.toMatch(/if \(!sub\) continue/)`）。

**副作用（已排除）**：收紧后，若 `prebuild` 链没跑 `build:index` 就单跑 `build:content-remote`，
现在会**直接失败**（从前是静默产出留空清单）。这正是目的：CI 的 `prebuild` 恒含 `build:index`，
本地构建链完整；唯有「链子被改坏」才会失败 —— 而那正是要拦的场景。

**运行时无过渡风险**：`mergeContent.isValidManifest` **不看**这两个子段（只查 schemaVersion /
contentVersion / units），三个客户端也一律按路径直接拉产物，**零处消费** `manifest.search/practice`。
故「先部署前端 bundle、后部署 manifest」的窗口内不会出现远程内容被判非法而回退内置的情况。

### 8.2 本轮新增 / 改动的测试

- 新增正向：`★ 子段为 null → 抛`（manifest / check 各一）、`★ 两份产物都不在 → 抛`、
  `store 为 null 但内存有旧值 → stale`。
- 改写为断言新契约：QA 的两条「记录现状」用例（`s5-qa-gate` A5 组）、
  `s5-qa-artifacts` 的「半填充」文案断言（旧的 `/缺失不一致/` 口径已随该分支删除）。
- 反向锚扩展：`check-content-remote.test.js` ③ 组新增
  `expect(src).not.toMatch(/if \(!sub\) continue/)` —— 防止有人把「整段跳过」改回来。
