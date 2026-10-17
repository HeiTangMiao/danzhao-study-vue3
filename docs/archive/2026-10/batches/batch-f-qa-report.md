# 批 F 独立 QA 验证报告

> 角色：QA（严过关）｜仓库 `danzhao-study-vue3`
> 方法：**独立证伪** —— 不复跑既有用例当结论；自写对抗用例（换形状/反例/真序）+ 独立复扫（Python/Node，勿用 grep）。
> 纪律：仅新增 `tests/**` 与本文报告；未改任何 `src/`；未 commit/push；未触碰内容侧在制文件；跑完删除临时工作树。
> 环境：Node v22.22.2（`/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node`）；`vitest --pool=threads --maxWorkers=1`。

---

## Round 1（批 F）—— Fc2 抽屉锁 / Fc3 断点 / Fc4 schema

> 对象三笔：`9b20a70`（Fc2）/ `a7bb96e`（Fc3）/ `bb4b1d4`（Fc4）。
> ⚠️ 内容侧正在全库大改（~160 个 `src/content/**` + `public/practice-bank/*` 未提交在制）→ **全量关口在干净工作树**（`git worktree add --detach /tmp/qa-verify-batchF bb4b1d4`）执行，隔离在制污染。
> 主树中三笔涉及的所有 `src/**` 文件实测**均干净**（未被在制改动），故对抗探针在主树即可测到提交版本。

### 结论速览

| 攻点 | 判定 | 新用例 | 要点 |
|---|---|:--:|---|
| 1 Fc2 抽屉锁归属 | **成立**（1 处对称边角已记录） | 7 | 真序「先 NP 后 CS」不误清他人锁；自己锁关即清；卸载只清自己；反向锚（从未加锁不改写 body）通过 |
| 2 Fc3 断点 | **成立** | 9 | `min-width:1151`/`max-width:1150` 各 **0**；JS/CSS 同口径同值；带 `and` 两处未漏；与既有规范处一致 |
| 3 Fc4 schema 5 处 | **成立** | 33 | 5 项逐一反例命中；兼容期 lines-only（19 块）不误伤；diagram 新字段可选；table 修正只碰 3 行 |
| 4 数字复核 | **成立** | — | 18 CSS + 1 JS；改动 10 CSS + 1 JS；其余 8 处本已规范 |
| 全量关口 | **通过** | — | 干净树 **73 文件 / 841 通过 + 6 跳过**；validate:content 182 绿；block-registry 26 绿 |

新增测试（3 个文件，共 **49** 用例，全通过）：
- `tests/batch-f-verify-lock.test.js`（7）—— Fc2
- `tests/batch-f-verify-breakpoints.test.js`（9）—— Fc3
- `tests/batch-f-verify-schema.test.js`（33）—— Fc4

---

### 1. Fc2 抽屉滚动锁归属感知（`src/components/ContentSidebar.vue`）

**结论：验证成立。** 攻击点 ①–⑤ 全覆盖；另发现 1 处**对称边角**（见下 R-1）。

实现核对（`:299-311`）：`lockOwned` 布尔 + `watch(sheetOpen)`，仅当 `open && overflow!=='hidden'` 时才加锁并置 `lockOwned=true`；仅 `lockOwned` 为真时才在关闭/卸载清锁。

| 攻击点 | 用例证据 | 结果 |
|---|---|---|
| ① 他人持锁不被清（真序） | **真序**：mount NotesPanel(open:false)→setProps(open:true)（NP 持锁）→ mount ContentSidebar → openSheet→closeSheet → body 仍 `hidden`；cs.unmount 后仍 `hidden`；NP 关才 `''` | ✅ |
| ② 自己持锁关闭即清 | CS openSheet→`hidden`；closeSheet→`''` | ✅ |
| ③ 卸载只清自己的 | 自己持锁→unmount→`''`；他人持锁→unmount→仍 `hidden` | ✅ |
| ④ 反向锚（从未加锁不改写 body） | body=`'visible'` 哨兵 → 从未开抽屉 → closeSheets()/unmount 后仍 `'visible'` | ✅ |
| ④ 反向锚（他人锁下开→关→卸载） | 他人锁 `hidden` → CS openSheet（不夺锁）→ closeSheet → unmount → 仍 `hidden` | ✅ |
| ⑤ 与 UnitView 键盘守卫联动 | 静态：`onKeydown` 内 `document.body.style.overflow === 'hidden'` 守卫位于 `pagingGo(` 之前 return（`:534` 早于 `:536`） | ✅ |

> ⚠️ jsdom 未实现 `matchMedia`：NotesPanel 加锁以 `matchMedia(MOBILE_MQ).matches` 为前提，用例**显式 stub 为移动端命中**以走通真实加锁路径（不 stub 则 NotesPanel 永不加锁 → 假绿）。此为该环境的「假绿陷阱」，已规避。

### 2. Fc3 1150 断点统一化

**结论：验证成立。** 独立复扫（自写递归扫描器，非 grep）：

- **反例锚**：`src/**` 内 `min-width: 1151px` = **0 处**；`max-width: 1150px` = **0 处**；且无 `min-1149`/`max-1151` 错值。✅
- **断点族形状**：18 处 CSS 命中**全部**为 `max-width: 1149px` 或 `min-width: 1150px`。✅
- **JS/CSS 同口径**：`NotesPanel.vue:64` `MOBILE_MQ = '(max-width: 1149px)'`，与同文件 CSS 移动边界（`max-width: 1149px`）**同值**；桌面边界 `min-width: 1150px` = js+1。**不存在 1150 处 JS 判移动/CSS 判桌面的撕裂**。✅
- **带 `and` 的两处未漏改**：`ContentSidebar :776 max-width: 1149px and (orientation: landscape)` ✅；`UnitView :710 min-width: 1150px and (max-width: 1456px)` ✅。
- **与既有规范处一致**：`App.vue` / `AppTabBar.vue` 均 `max-width: 1149px` + `min-width: 1150px`。✅

### 3. Fc4 schema 口径 5 处收敛

**结论：验证成立。** 自造反例（不依赖工程师用例）：

| Item | 反例 → 期望 | 实测 |
|---|---|---|
| 1 formula 兼容期 | 仅 `lines`（无 formulas）→ 通过 | ✅（另：`formulas`-only 通过；二者皆无→报错；`lines`/`formulas` 末孤立反斜杠**仍拦**，兼容分支不漏语义） |
| 2 table | 缺 headers→报错；`headers` 非数组→报错；`rows` 非数组→报错；行宽≠表头（首/末行）→报行号 | ✅（合规表通过） |
| 3 solve 双向 | `quiz` 带 solve → 报「题目[0] 未知题型: solve」；`exam` 带 solve → **通过** | ✅（另：`exam` 带未知题型→报「模拟卷题目[0]…」；schema enum 独立核对：`quizItem` 不含 solve、`examItem` 含 solve） |
| 4 columns | `cols:4/1/0`→报「只支持 2/3」；`cols:2`+3 列 / `cols:3`+2 列→报不一致；缺 items→报错；`cols` 缺省→兼容不报 | ✅（`cols:2`+2、`cols:3`+3 通过；容器内子区块仍被递归校验） |
| 5 diagram | 仅 `boardId`（无几何字段）→ 通过；带 `boundingbox/height/fixed`→通过 | ✅ |

**兼容期红线（独立取证）**：干净树内容侧 `lines:` 块 = **19 处**（与团队口径一致）；validator 对 lines-only 返回 `[]`（不误伤未迁移内容）。✅

**diagram 新字段可选（独立取证）**：schema `diagram` 分支 `required === ['boardId']`（**未新增必填**）；真实内容抽检 **20 个 diagram 块**（其中仅 1 个含 `boundingbox`），**几何字段从不触发错误**，无几何字段的块全部通过。✅

**table 数据修正只碰 3 行（越权核查）**：`git show bb4b1d4 -- "src/content/math/06-数列/01-数列基础.js"` hunk = **6 变更行（3 删 3 增）= 恰好 3 行**；**不含**任何 `options:` 前缀改动 → **无内容侧越权**。✅

### 4. 独立数字复核（1150 断点）

| 口径 | 团队值 | 我的独立复核 | 一致 |
|---|---|---|---|
| 全站 1150 断点 | 18 CSS + 1 JS | 18 CSS（`@media`）+ 1 JS（`MOBILE_MQ`） | ✅ |
| 本次改动 | 10 CSS + 1 JS | `git show a7bb96e` 新增断点行 11 = 10 CSS + 1 JS | ✅ |
| 其余本已规范 | 8 处 | 18−10=8：App.vue×2、reader.css×3（:55/:321/:334）、AppTabBar×2、UnitView×1（:671） | ✅ |

---

### 全量关口（干净工作树 `/tmp/qa-verify-batchF @ bb4b1d4`）

| 关口 | 命令 | 结果 |
|---|---|---|
| 全量测试 | `npx vitest run --pool=threads --maxWorkers=1` | **73 文件 / 841 通过 + 6 跳过（847）**；无失败 ✅（期望 ≥70 文件 / 798 通过，实际超出） |
| 内容 Schema | `npm run validate:content` | 182 内容文件 + 3 站点配置，全部通过 ✅ |
| 区块注册表 | `npx vitest run tests/block-registry.test.js` | 26 通过 ✅ |
| lint（探针文件） | `eslint tests/batch-f-verify-*.test.js --max-warnings 0` | exit 0 ✅ |

> **6 跳过说明（非回归）**：`tests/batch-e-verify-search.test.js` 的 6 条依赖构建产物（`public/search-body/*.json`、`public/practice-bank/*`）——这些是 `.gitignore` 的未跟踪构建产物，干净工作树未构建 → `artifactsReady` 为假 → 跳过。属环境性，非代码缺陷。（在主树构建产物就绪时会实跑。）

---

### 新遗留风险

| # | 等级 | 项 | 说明 |
|---|---|---|---|
| R-1（批F） | **低（对称边角，可能不可达）** | Fc2 锁归属的对称方向 | 探针实测：**CS 先开（持锁）→ NP 后开（不夺锁）→ CS 关 → body 变 `''`**，此时 NP 仍开却失去背景滚动锁。这是「单一 body 锁 + lockOwned」模式的固有限制（NotesPanel 自身同款），**非本次引入**。真实可达性存疑：移动端从抽屉内开笔记的路径是「先关抽屉（`sheetOpen=false`）再 emit toggle-notes」，二者不重叠 → 该边角很可能不可达。**建议**：若未来两抽屉可同时开，改为「引用计数锁」或「DOM 顺序防重叠」；当前不阻断。 |
| R-2（批F） | 信息 | 干净树 6 跳过 | 见上，环境性；如需覆盖，干净树需先 `npm run build:index`。 |

**其余：0**。三笔均无功能性缺陷；Fc3/Fc4 数字与口径与团队一致；table 内容修正无越权。

---

_报告人：QA 严过关｜Round 1（批 F）｜基线 `bb4b1d4`（Fc2/Fc3/Fc4 末笔）｜方法：独立证伪 + 换形状对抗 + 反例_

---

## Round 2（批 F 第二波）—— Fc6 志愿填报 / CSP 元检查收口 / Fc5 作品训练卡

> 对象四笔：`89d2e60`（Fc6 `/guide` + openExternal + L4 登记）/ `3ce7f01`（批 E CSP 复核用例同步）/ **`1282813`（CSP 元检查提取器收口，本轮关键对抗目标）** / `c98e6a3`（Fc5 workcard 新块 + useCountdown）。
> 派单基线 HEAD = `1282813`；验证期间内容侧终态交付 `c1531d7` 落到 `main`（`1282813` 为其**祖先**），故**全量关口在干净工作树 @ `1282813`** 跑，复现该提交点的确定数字。
> 环境：Node **v22.22.2**；`vitest --pool=threads --maxWorkers=1`。纪律：仅新增 `tests/batch-f-verify-r2-*.test.js`（5 文件 / **41** 用例）与本文报告；未改 `src/`；未 commit；跑完删除临时工作树。

### 结论速览

| 攻点 | 判定 | 新用例 | 要点 |
|---|---|:--:|---|
| 1 openExternal 回退 | **成立** | 5 | jsdom 无 Tauri→`window.open(_blank,noopener)` 且不调 shell；伪 `__TAURI_INTERNALS__`+shell 抛错→try/catch 回退+warn 不炸；成功→不再 window.open；工具内**零 URL 字面量**；**静态字面量 import** |
| 2 L4/L6 + 元检查（`1282813`） | **成立** | 14 | 生产 CSP **未放宽**；`HOST_ALLOWLIST` 恰 `{www.zjzs.net}`；**6 向量对抗矩阵**（双引号/模板字面量/裸标识符：旧静默放行→新抓红；单引号URL/拼接：新旧均抓）；真实文件**无假红**；锚点懒加载 **10→11** |
| 3 useCountdown 跳时校准（Fc5） | **成立** | 4 | deadline 口径：跳 +30s 仅放行一 tick → **569（09:29）** 而非 599（累减口径）；到点钳 0 且自动 stop；unmount 清 interval |
| 4 WorkCardBlock 三勾（Fc5） | **成立** | 8 | 浏览态挂载 **不写库**（H3）；勾选写 `page_progress.workcards[id]` 子键 + 保留原行其它字段；子键 spread 不动他卡；幂等；**不写错题本**；DB 停 v7；H5 四处一致 |
| 5 `/guide` 独立性 | **成立** | 10 | 顶层非学科路由（`name=guide`、无 `meta.tab`）；`NON_PAGE_DIRS` 含 guide；collectFiles 不收 guide；纯数据 ESM（零 import）；HomeView 入口可达；区块合 schema；唯一外链 |
| 6 依赖面 | **成立** | 3 | 运行期仅新增 `@tauri-apps/plugin-shell`；Fc6 对 lock 的**新增** `@tauri-apps/*` 恰 2（api + plugin-shell） |
| 7 全量关口 | **通过** | — | 干净树 **76 文件 / 875 通过 + 6 跳过（881）/ 0 失败**（与 engineer 口径 & `c98e6a3` 一致，**含 `1282813` 后不变**）；validate:content 182+3 绿；block-registry 26 绿 |

新增测试（5 文件，共 **41** 用例，全通过）：
- `tests/batch-f-verify-r2-openext.test.js`（5）—— 攻点[1]
- `tests/batch-f-verify-r2-csp-meta.test.js`（14）—— 攻点[2]
- `tests/batch-f-verify-r2-countdown.test.js`（4）—— 攻点[3]
- `tests/batch-f-verify-r2-workcard.test.js`（8）—— 攻点[4]
- `tests/batch-f-verify-r2-guide.test.js`（10）—— 攻点[5]/[6]

---

### 1. openExternal 回退（Fc6）

**结论：验证成立。** 源码 `src/utils/openExternal.js` 逐行核对（`isTauri()` 判 `window.__TAURI_INTERNALS__`；`shellOpen` try/catch→`console.warn`→回退 `openInBrowser`）。

| 攻击点 | 用例证据 | 结果 |
|---|---|---|
| jsdom（无 Tauri） | `await openExternal(URL)` → `mocks.open` **未调用**；`window.open` 调 1 次，实参 `(URL,'_blank','noopener')` | ✅ |
| 反向锚：有 Tauri 但 shell.open 抛错 | 置 `window.__TAURI_INTERNALS__={}`，`mocks.open.mockRejectedValueOnce` → 行为 `resolves.toBeUndefined()`（**不炸**）+ warn 被调 + 回退 window.open | ✅ |
| 有 Tauri 且成功 | `mockResolvedValueOnce` → shell.open 调、**不再** window.open（短路 return） | ✅ |
| 零 URL 字面量 | 去注释后 `src/utils/openExternal.js` **无 `http(s)://`** | ✅ |
| 静态 import（L6） | `import { open as shellOpen } from '@tauri-apps/plugin-shell'`；无 `import(` 动态/拼接 | ✅ |

> 红线与源码注释一致：URL 属数据（归页面数据文件），工具不硬编码；shell 失败不静默吞错。

### 2. L4/L6 + CSP 元检查提取器收口（`1282813`）—— 本轮关键对抗

**结论：验证成立；`1282813` 收口有效且未过度收紧。**

**做法（独立）**：不凭记忆复写正则，而是**运行时从被验对象 `tests/batch-e-verify-csp.test.js` 抽取它实际使用的提取器与残留守卫**，再喂 6 形态输入核「放行/抓红」；并用 **Python 独立复算**同一矩阵（规避 grep/凭记忆误差）。

抽取到的事实（被验对象本体）：
- 提取器：`[...hostM[1].matchAll(/['"`]([^'"`]+)['"`]/g)]`
- 残留守卫：`hostM[1].replace(/['"`][^'"`]*['"`]/g, '').replace(/[\s,]/g, '') === ''`

| 输入形态 | `3ce7f01` 原版 | `1282813` 收口后 |
|---|:--:|:--:|
| 正常 `'www.zjzs.net'` | 放行 | 放行 |
| 双引号 `"evil.com"` | **静默放行** | **抓红** |
| 模板字面量 `` `evil2.com` `` | **静默放行** | **抓红** |
| 裸标识符 `evil3.com` | **静默放行** | **抓红** |
| 单引号 URL `'https://evil4.com'` | 抓红 | 抓红 |
| 拼接 `'www.zjzs' + '.net'` | 抓红 | 抓红 |
| **真实 `HOST_ALLOWLIST` 体** | — | **放行（无假红）** |

> Vitest 探针与 Python 复算**结论一致**。原版盲区（只认单引号 → 换引号即静默绕过）已被消除；残留守卫额外封堵裸标识符/拼接；对真实文件的**精确集合相等**（`=== ['www.zjzs.net']`）保持不变，**未削弱 D 组断言**。

**其余核对**：
- 生产 CSP **未放宽**：`tauri.conf.json` `csp` 不含 `zjzs`、无协议源通配。✅
- `EVAL_ALLOWLIST` 仍为空；`HOST_ALLOWLIST` 恰 `{www.zjzs.net}`；理由注释（openExternal / webview 不加载 / 不改生产 CSP）与事实相符。✅
- L6 懒加载锚点：`src/router/index.js` 的 `@/views/*.vue` 懒加载实数 **11**，`csp-guard.test.js` 断言 **11**（10→11 随 `/guide` 增）。✅

> 与本批 batch-E 报告的口径更正：见 `docs/proposals/batch-e-qa-report.md` **附录 A**（`HOST_ALLOWLIST 均为空集` 已作废；「未授权主机必抓红」的保证以 `1282813` 为界成立）。

### 3. useCountdown 跳时校准（Fc5）

**结论：验证成立。** 源码 `src/composables/useCountdown.js` 为 **deadline 口径**：`remaining = max(0, ceil((deadline − Date.now())/1000))`，非 `timeLeft--` 累减。

| 用例 | 证据 | 结果 |
|---|---|---|
| 跳时校准 | `setSystemTime(t0+30000)`（不触发定时器）+ `advanceTimersByTime(1000)`（仅一 tick，时钟至 t0+31000）→ `timeLeft === 569`；**显式断言 `!== 599`**（累减口径会得 599） | ✅ |
| 到点钳 0 | 跳 +5s > 总 2s → `timeLeft === 0`、`>=0`、`running === false`（自动 stop） | ✅ |
| reset | `reset(50)` → `timeLeft===50` 且停表 | ✅ |
| unmount 清 interval | 组件内 `useCountdown().start()` → `unmount()` → `running===false` 且 `spyOn(clearInterval)` 被调 | ✅ |

### 4. WorkCardBlock 三勾（Fc5）

**结论：验证成立。** 源码 `src/components/blocks/WorkCardBlock.vue` 的 `persist`：**仅当已有进度行**才 `savePageProgress({...existing, workcards:{...(existing.workcards||{}), [wcId]:{...checks}}})` → 浏览态不写、写子键、spread 合并不动他卡。

| 用例 | 证据 | 结果 |
|---|---|---|
| 浏览态挂载不写库（H3） | 预置进度行后挂载 → `spyOn(db,'savePageProgress')` **未被调** | ✅ |
| 勾选写子键 + 保留原行 | 点 `.workcard__box[0]` → `row.workcards.B.guided===true`、`restore===false`；`visited/subject/fileTitle` 保留 | ✅ |
| 子键 spread 不动他卡 | 预置 `workcards.A` → 勾 B → A **原样**、B.restore 置真 | ✅ |
| 幂等 | 勾→取消→再勾：`false` → `true` 终态一致 | ✅ |
| 不写错题本（H3） | `db.getAllErrors()` 中该 `fileKey` 为空 | ✅ |
| DB 停 v7 | `studyDb.js` `const DB_VERSION = 7` | ✅ |
| H5 四处一致 | schema `enum` 含 workcard + `allOf` 分支（`intro`/`duration`）；`blockTypes` `workcard:{kind:'practice'}`；`registry` `workcard:WorkCardBlock`；`content.d.ts` `'workcard'` + `interface WorkCardBlock` | ✅ |

### 5. `/guide` 独立性 + 搜索/题库边界

**结论：验证成立。**

- **路由**：`router.getRoutes()` 中 `name=guide`、`path='/guide'`、非 `/study` 子路径、`meta.tab` 为空 → 顶层独立页。✅
- **采集边界**：`scripts/lib/load-content.mjs` `NON_PAGE_DIRS = new Set(['guide'])`；`collectFiles(CONTENT_DIR)` 返回 >100 文件且**无一 guide 文件**。源码注释明确其**设计意图**：guide 是独立非学科页，**让搜索索引 / 题库构建不误收该页数据**。✅
- **搜索索引不入 guide**（派单待定项 · 已定论）：`build-search-index.mjs` 亦走 `collectFiles`（同排除）；实测构建产物 `public/search-body/{math,chinese,computer}.json` **仅三学科**，「志愿填报」内容**零命中** → guide 有意**不进搜索索引**。**实现与注释意图一致，判定为正确决定**（外链工具入口页不属于检索知识点）。✅
- **内容纯度**：`src/content/guide/01-志愿填报.js` 零 `import`（纯数据）。✅
- **入口可达**：`HomeView.vue` 含 `to="/guide"`。✅
- **schema**：guide 骨架区块经 `createBlockValidator` 逐块复算 **0 错误**；唯一外链 `https://www.zjzs.net`。✅
- **站点配置数 = 3**：`SITE_FILES` keys = `{math,chinese,computer}`（对应 `validate:content` 输出「+3」）。✅

### 6. 依赖面

**结论：验证成立。**
- `package.json` 运行期 `@tauri-apps/*` = **仅** `@tauri-apps/plugin-shell`（`^2.5.0`）。✅
- Fc6 提交对 `package-lock.json` 的**新增** `@tauri-apps/*` 顶层键 = **恰 2**（`node_modules/@tauri-apps/api`、`node_modules/@tauri-apps/plugin-shell`）——由 `git show 89d2e60` diff 独立得出。
- ⚠️ **口径澄清**：全量 lock 另有 **12 个预存** `@tauri-apps/cli*` 平台包（devDependency，构建用，与本笔无关）。故「仅 2」的正确判据是 **lock 的 diff**，非全量 lock 的计数——初版探针按全量计数误报，已修正。

---

### 全量关口（干净工作树 @ `1282813`）

| 关口 | 命令 | 结果 |
|---|---|---|
| 全量测试 | `npx vitest run --pool=threads --maxWorkers=1` | **76 文件 / 875 通过 + 6 跳过（881）/ 0 失败** ✅（与 engineer @ `c98e6a3` 口径一致；**含 `1282813` 后用例数不变**） |
| CSP 守护双子集 | `vitest run tests/csp-guard.test.js tests/batch-e-verify-csp.test.js` | **31 通过**（17 + 14），与 `1282813` 提交信息口径一致 ✅ |
| 内容 Schema | `npm run validate:content` | **182 内容文件 + 3 站点配置**，全部通过 ✅ |
| 区块注册表 | `vitest run tests/block-registry.test.js` | 26 通过 ✅ |
| 作品卡/外链 | `vitest run tests/workcard-block.test.js tests/open-external.test.js` | 21 + 5 通过 ✅ |

> **6 跳过说明（非回归）**：`tests/batch-e-verify-search.test.js` 依赖 `.gitignore` 的构建产物（`public/search-body/*.json` 等），干净工作树未 `build:index` → 跳过。属**环境性**，非代码缺陷（本轮攻点[5] 已在主树用现成产物独立核过 guide 不入索引）。

---

### 新遗留风险（Round 2）

| # | 等级 | 项 | 说明 |
|---|---|---|---|
| — | — | **无** | 四笔均通过独立证伪；无功能性缺陷。 |
| R-1（批F） | **低** | Fc2 对称边角 | 承 Round 1 登记，本轮四笔未触及该路径；维持「低/可能不可达」。 |
| R-2（批F） | 信息 | 内容侧终态交付 `c1531d7` | 验证期间 `main` 前进至内容侧终态交付；本轮四笔均早于它，干净树已隔离。内容侧大改的独立验证属**另一批次**，不在本轮范围。 |

**其余：0**。`1282813` 的元检查收口**消除了**原版引号形态盲区且**不引入假红**——该笔对口径是关键改进；批 E 报告 §1 的「`HOST_ALLOWLIST` 均为空集」表述已随之作废（更正见 `docs/proposals/batch-e-qa-report.md` 附录 A）。

**建议 patch：无**（本轮无需源码修改；`1282813` 已自证充分）。

---

_报告人：QA 严过关｜Round 2（批 F 第二波）｜基线 `1282813`（含 `89d2e60`/`3ce7f01`/`1282813`/`c98e6a3` 四笔）｜方法：独立证伪 + 运行时抽取被验正则 + Python 双实现对照 + 干净树全量关口_