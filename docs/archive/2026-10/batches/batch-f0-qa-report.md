# 批 F0 独立 QA 验证报告

> 角色：QA（严过关）｜仓库 `danzhao-study-vue3`｜基线 HEAD `d771a63`（= 五笔交付末笔；工作树含内容团队在制文件）
> 轮次：Round 1（实施侧五笔已交付：F0c1 `8e2fad9` / F0c2 `abf470f` / F0c3 `75b9b9c` / F0c4 `d107dbe` / F0c5 `d771a63`，本地 main 未 push）
> 方法：**独立证伪** —— 不复跑既有用例当结论；自写新用例攻击 + 对 F0c4 做**变异测试**（向真实内容页注入 solution → 校验器必须点名 → 精确还原）。
> 纪律：仅新增 `tests/**` 与本文报告；**未改任何 `src/` 生产代码**；未 commit/push；变异改动全部精确还原（md5 校验通过）。
> 环境：Node v22.22.2（`/Users/iras17514/.workbuddy/binaries/node/versions/22.22.2-6/bin/node`）；`vitest --pool=threads --maxWorkers=1`；UI 挂载类走 jsdom。

## 0. 结论速览

| 攻击点 | 判定 | 新用例 | 要点 |
|---|---|:--:|---|
| F0c1 深链归一化 | **验证成立**（含 1 处已记录缺口） | 19（18 pass + 1 xfail） | 5≡05 归一在**新记录入口**成立；`fileIndex` 不受累；legacy `/unit` 重定向生效；缺口=同记录 unit→unit 参数变更 `beforeEnter` 不重入 |
| F0c2 双脚本接 CI | **验证成立** | 6 | 两步严格位于「生产构建」后、「上传构建产物」前；非软失败；实跑 exit 0 |
| F0c3 浏览态单选判分 | **验证成立** | 17 | 点选即判分（绿/红 + 反馈）；锁重复选择；`correctIndex` 越界/负数/非整数→回落「查看答案」且**不出现全错**；H3 运行时无 DB 写入 |
| F0c4 校验绊线 | **验证成立**（变异 1/1 命中） | 15 | quiz/exam 带 `solution`→报错；example（含 `type:'single'`）→不报；嵌套（layout/group/columns 内 quiz）**盲区也被拦**；真实页面注入被点名 |
| F0c5 例题解析可达 | **验证成立** | 11 | `x→explanation`（缺省 ''）；带 x 者**皆例题**且 x≠a；错题本解析优先级；两渲染点两态 |
| 全量关口 | **通过** | — | 750 用例（749 绿 + 1 预期失败）；lint 0；validate:content 绿；DB 仍 v7；五笔未触 schema |

新增测试文件（5 个，共 **68** 个用例，67 通过 + 1 预期失败）：
- `tests/batch-f0-verify-route.test.js`（19）
- `tests/batch-f0-verify-quiz.test.js`（17）
- `tests/batch-f0-verify-validate.test.js`（15）
- `tests/batch-f0-verify-practice-explain.test.js`（11）
- `tests/batch-f0-verify-ci.test.js`（6）

---

## 1. F0c1 深链归一化（`src/utils/routeParams.js` + `src/router/index.js`）

**结论：验证成立（含 1 处已记录缺口，生产 UI 不可达）。** 新用例 19 条，18 条通过、1 条 `it.fails` 记录缺口。

**独立实现对照（不复用既有断言）：**
- `normalizeUnitNum` 边界矩阵：`'5'→'05'`、`'05'→'05'`、`'12'→'12'`；`null/undefined/''` **原样返回**（`v==null||v===''` 分支）；数字 `5→'05'`（`String().padStart`）；`'5.0'→'5.0'`（不解析小数，仅补零）。✅
- **规范深链零重定向**：`from '/study/computer/05/4'` 进入 → `unitNum='05'`、`fileIndex='4'`，且 `redirectedFrom === undefined`（未触发 `beforeEnter` 的 replace 分支）。✅
- **非规范深链归一**：`from '/'` → push `/study/computer/5/4` → `unitNum='05'`（beforeEnter replace 生效）。✅
- **`fileIndex` 不受伤**：归一仅动 `unitNum`，`fileIndex` 保持 `'4'`；push `/study/computer/07`（无 fileIndex）→ 保持空、不臆造 `'0'`。✅
- **legacy `/unit/:unitNum/:fileIndex?` 重定向**：`/unit/computer/7` → 落到 `name:'unit'` 且 `unitNum='07'`（同一归一函数复用）。✅
- 真路由 smoke：注入 `useAuthStore().accessToken='qa-token'` 通过 `beforeEach` 鉴权 + stub `window.scrollTo`，**避免把鉴权重定向误判为归一化失败**。✅

**⚠️ 已记录缺口（`it.fails` 显式标注）：`beforeEnter` 是**per-record** 守卫，同记录仅参数变化（unit→unit）时不重入。**

```js
it.fails('unit → unit 非规范深链应被归一化（当前缺口：beforeEnter 未重入）', async () => {
  await router.push('/study/computer/05/4')
  await router.push('/study/computer/7/4') // 同记录、非规范 → 期望 07
  expect(router.currentRoute.value.params.unitNum).toBe('07') // 实测仍为 '7'
})
```

**可达性分析（为何判定「生产 UI 不可达」）：** 逐点核查全部 11 处 `name:'unit'` / `/study/…` 跳转源（HomeView×3、UnitView×2、SearchPanel、ErrorBookView、PracticeHome、practice.js、PracticeStore），其 `unitNum` 一律取自**学科配置 `units[].num`**（实测三科配置 num 全为两位 `'01'`…`'12'`，**无单位数**），或取自已补零的题库/搜索索引产物。故：**同记录内切换单元的 target 已是规范值，无需归一化**；归一化缺口仅在「手动改 URL hash 到非规范值 / 外部构造的同记录非规范链接」时触发——此时页面会因 `unit.value` 匹配不到而落到「单元未找到」，属低概率边界，**非本批回归**。详见第 8 节（最不确定处）。

---

## 2. F0c3 浏览态单选判分（`QuizBlock.vue`）

**结论：验证成立。** 新用例 17 条，全绿。

- **点选即判分**：native pick → 命中项 `option-correct`、错选项 `option-wrong`；反馈文案出现。断言改用 `.find('.option-letter').text()`（MathJaxRender 已 stub，整块 text 只到选项字母）。
- **锁重复选择**：`pickChoice` 后 `states[i].selected !== undefined` → `:disabled` 生效；再点不改变选中集（不覆盖判分）。✅
- **`correctIndex` 边界矩阵（独立重算，不复用实现分支）**：越界（`>=len`）/ 负数 / 非整数（`1.5`、`'1'`、`NaN`）→ 全部**回落「查看答案」**，且**断言不出现「全错」（不存在「每个选项都 option-wrong」）**。✅
- **判断题派生无回归**：`judge-derive` 场景仍按既有口径判分。✅
- **H3 运行时证据（非仅静态）**：
  - 静态：`QuizBlock.vue` 源码**不含** `studyDb` / `recordError` / `recordAnswered`。
  - 运行时：用 fake-indexeddb 真库，浏览态点选后断言 `error_book` 为空、`questionsAnswered` 计数未变 → **浏览态不写 DB**。✅
- **`.option-selected` 独立复核**：源码与渲染 DOM 双查，QuizBlock **不再产出 `.option-selected`**。⚠️ 注意：**ExamBlock 拥有自己作用域的 `.option-selected`**，未使用共享样式——不存在「共享样式被误删」问题，未误判。
- 多题互不干扰：高亮互斥性 + 多 items 独立性。✅

---

## 3. F0c4 校验绊线（`src/utils/validateBlock.js` · `checkQuestionItems`）+ **变异测试**

**结论：验证成立（变异 1/1 命中）。** 新用例 15 条，全绿。

- **绊线命中**：`type:'quiz'` / `type:'exam'` 的 item 带 `solution` → 报错「solution 只在例题块渲染（请改用 answer）」。✅
- **无假阳性**：`type:'example'`（含 `type:'single'` 的例题）带 `solution` → **不报**；无 `solution` 的题目 → 不报。✅
- **边界矩阵**：`solution:''` / `null` / `0` / `false` **全部命中**（判据为 `!== undefined`，非 truthy）。✅
- **嵌套盲区攻击（新增，超出既有用例）**：把带 `solution` 的 quiz 塞进 `layout.children` / `group.items` / `columns` 内层 → **均被拦下**（验证 `checkQuestionItems` 的递归路径覆盖嵌套）。递归为**类型无关**（layout/group/columns 统一 `validateBlock(child)`），故更深嵌套同样命中。
- 多 item 索引正确（报 `[ii]` 精确）；接线核对：`quiz`（:120）与 `exam`（:143）两分支均调用 `checkQuestionItems`。

**变异测试（真实内容页注入 → 校验器必须点名 → 精确还原）：**

Harness：`/tmp/qa-mutate-validate.py`（避开内容侧在制文件，选 `src/content/math/09-概率/09-统计案例.js`）。

| 阶段 | 动作 | 结果 |
|---|---|---|
| 基线 | `npm run validate:content` | `exit=0` 全部通过 |
| 变异 | 向区块[10] 题目[0] 注入 `solution:"QA 变异探针"` | `exit=1`，报 **`math/09-概率/09-统计案例.js 区块[10] 题目[0] solution 只在例题块渲染（请改用 answer）`** → **CAUGHT** |
| 还原 | 回填备份 | 文件 md5 回到 `f9805f91c2c428d4be12cd9fa0a6c557`（改动前==还原后）→ **RESTORED OK** |
| 复核 | 再跑 | `exit=0` 全部通过 → **POST-RESTORE CLEAN** |

`git status` 事后无 `09-统计案例` 残留改动，无 `qa-` 探针文件残留。**无残留。**

---

## 4. F0c5 例题解析入库可达（`build-practice-bank.mjs` + `practiceBank.js` + 练习/复习流）

**结论：验证成立。** 新用例 11 条，全绿。

- **形状**：`normalizeBankItem` `x → explanation`；缺 `x`/`x:undefined`/`x` 非字符串 → `explanation=''`（旧产物优雅降级）。`BANK_ITEM_KEYS.x === 'explanation'`。✅
- **构建（`collectBank()` 内存构建，不假设既有产物）**：
  - 带 `x` 的条目**全部是例题**（`it==='example'`），且 `x` 均为**非空字符串**。✅
  - **排除重复展示**：抽样真实例题核对 `x`（solution）与 `a`（answer）**内容确实不同**（全部 `x !== a`，无一条完全相同）。✅
- **产物现状核对（补充事实）**：当前 `public/practice-bank/*.json` **已含 `x`**（math 257 / chinese 106 / computer 62 条），与 `collectBank()` 内存构建一致——说明产物已被重建过。**本用例不依赖该事实**（改用内存构建，符合「不假设既有产物」纪律），故产物是否重建都不影响判定。
- **错题本解析优先级**：有 `explanation` → `练习解析：<解释>`；缺省 → 回落 `练习解析：<answer>`（不回归）。✅
- **两渲染点两态**：
  - `PracticeSession.vue`：有 `explanation` → `.ps-answer-explain` 存在；无 → 答案卡仍在（`.ps-answer`）但**不渲染**解释节点。✅
  - `PracticeResult.vue`：`看解析` 开关展开后，有 → `.review-explain` 存在；无 → 不存在（`showReview` 门控）。✅
  - （注：`ReviewView.vue` 的 `.rv-answer-expl` 为**既有**渲染点，F0c5 未改动；本例按变更范围仅覆盖 PracticeSession / PracticeResult 两点。）

---

## 5. F0c2 双脚本接 CI（`.github/workflows/ci.yml` + `package.json`）

**结论：验证成立。** 新用例 6 条（直接读产物文件做位置/语义核对），全绿。

- **`package.json`**：`check:dup`→`check-duplicates.mjs`；`check:single`→`node scripts/check-single-choice.mjs --selftest && node scripts/check-single-choice.mjs`（**含 `--selftest &&` 自检链**，且自检在前、正式检测在后）。✅
- **`ci.yml` 步骤位置**（`quality` job 内，行号 0 基）：「生产构建」(35) < 「题库实质重复检测」`npm run check:dup` (41) < 「单选题判分口径检测」`npm run check:single` (44) < 「上传构建产物」`run: upload-artifact@v4` (47)。两步**严格在「生产构建」之后、「上传构建产物」之前**——否则读不到 `build:index` 产出的 `public/practice-bank/*.json`，将空跑。✅
- **非软失败**：两步块内均无 `|| true` / `continue-on-error`，且直接 `run: npm run check:*`。✅

**实跑证据（`node` v22）：**

| 脚本 | 退出码 | 数据 |
|---|:--:|---|
| `npm run check:dup` | **0** | math L1/L2 0·L3 0 / chinese 0·0 / computer 0·0；汇总 L1/L2 0 组 |
| `npm run check:single` | **0** | 自检 12/12 规则会触发、无假阳性；正式：math A 0·B 21 / chinese A 0·B 33 / computer A 0·B 8；汇总 **A 类 0 / B 类 62** |

（与团队实测一致：0/0/0 与 A 类 0 / B 类 62。）

---

## 6. 全量关口（最终必跑）

| 关口 | 命令 | 结果 |
|---|---|---|
| 全量测试 | `npx vitest run --pool=threads --maxWorkers=1` | **67 文件 / 750 用例（749 通过 + 1 预期失败（F0c1 已记录缺口））** ✅ |
| 代码规范 | `npm run lint` | **exit 0，0 警告** ✅ |
| 内容 Schema | `npm run validate:content` | **182 内容文件 + 3 站点配置，全部通过** ✅ |
| DB 版本 | `src/stores/studyDb.js:33` | `DB_VERSION = 7`（未被五笔触碰） ✅ |
| schema 未污染 | `git diff --name-only b3d56a9..d771a63` | 五笔改动 **不含** `schema/content-schema.json` ✅ |
| F0c4 变异 | `python3 /tmp/qa-mutate-validate.py` | CAUGHT + RESTORED + CLEAN ✅ |

> 注：全量 750 含本轮新增 68（注：5 文件 = 67 pass + 1 expected fail）。实施前基线 652；F0 实施 + 本轮复核后 750。

---

## 7. 纪律与残留核查

- **仅新增** `tests/batch-f0-verify-*.test.js`（5 个）+ 本报告；**未改任何 `src/` 生产代码**。
- **变异改动全部精确还原**：目标文件 md5 改动前 == 还原后 == `f9805f91c2c428d4be12cd9fa0a6c557`；无 `qa-` 探针文件残留。
- **未 commit / 未 push**。
- **未触碰内容团队在制文件**（`git status` 仅列：`public/practice-bank/*.json`、`chinese/01-字音字形`、`computer/04-卡点清单`、`computer/05-整卷模拟四`、`math/02-一元二次不等式` 及其产物；以及我的 5 个测试文件）。
- **lint 未遇内容侧错误**：本轮 `npm run lint` 全绿，无需「照报不修」的情形。

---

## 8. 缺陷 / 风险清单

| # | 等级 | 项 | 说明 / 建议 |
|---|---|---|---|
| R-1 | ~~低（已记录缺口）~~ **Round 2 已收口** | F0c1 `beforeEnter` 同记录参数变更不重入 | 同记录 unit→unit 非规范参数**不归一**。**生产 UI 不可达**（所有跳转源用配置两位 num）；仅手动改 URL / 外部同记录非规范链接可触发。**F0c6（`d4be892`）把归一化下沉为全局 `beforeEach`，该缺口已收口**（Round 2 独立复核见下节）。 |
| R-2 | 信息 | F0c5 产物 `x` 现状 | 当前产物已含 `x`（math 257/chinese 106/computer 62）；用例改走内存 `collectBank()`，不依赖产物重建。若下游部署依赖产物，请确认 pipeline 中 `build:practice` 已重跑并提交产物。 |
| R-3 | 信息 | `check:single` B 类 62 处 | 均为**不阻断**的「确认渲染意向 / 选项长度不均衡」提示（B3/B6/B7），非硬缺陷；A 类硬缺陷 0。无需本批处理，供内容侧择期人工确认。 |
| R-4 | 低 | 全量测试跨文件环境耗时 | `environment` 147s（jsdom + fake-indexeddb 重）为主要耗时；非缺陷，仅记录。 |

### 我最不确定的一处

**R-1（F0c1 缺口）的生产可达性。** 我已在**路由层实证**缺口存在（`it.fails` 稳定复现 `unitNum` 停在 `'7'`），并**穷举 11 处导航源 + 三科配置 num 格式**论证「生产 UI 内皆用规范值、缺口不可达」——但这一步是**基于静态核查的推断**，而非端到端复现「真实用户操作触发该缺口」。残余不确定性在于：**浏览器 back/forward 或未来新增的动态跳转**若在**维持 unit 记录**的前提下产生非规范 `unitNum`，归一化会静默失效（表现为「单元未找到」，而非错误单元）。建议：若追求纵深防御，把归一化下沉到**全局 `beforeEach`/`beforeResolve`**（覆盖所有参数变更，含同记录），可一劳永逸消除该不确定性；否则以 `it.fails` 持续守望即可。

---

## Round 2（R-1 收口定向复核）

> 基线 `d4be892`（F0c6：unitNum 归一化从 per-record `beforeEnter` **下沉为全局 `beforeEach`**，注册在 auth 守卫之前；旧 `/unit` redirect 保留归一化）。
> 方法：**换形状对抗**（不复读 engineer 用例）+ 白盒/黑盒交叉核对 + 真导航收敛取证。
> 新增测试：`tests/batch-f0-round2-verify.test.js`（22 用例，全通过）。

**R-1 处置结论：已收口。** 归一化现由全局 `router.beforeEach`（`src/router/index.js:121-126`）承担，同记录 unit→unit 参数变更亦被归一；Round 1 的 `it.fails` 缺口取证已转为正式断言并通过。

| 你要求独立证明的点 | 判定 | 关键证据 |
|---|---|---|
| ① D 组 `:120` 断言未被削弱 | **成立** | 仍为 `expect(unitNum).toBe('07')`（非 `toBeTruthy`/`toContain`）；engineer 补的 2 条为真断言 |
| ② `route-params.test.js` 改写无覆盖损失 | **成立** | 用例数 9→9；①纯函数 5 条逐字未动；②③④三条意图全保留（改黑盒真导航） |
| ③ 对抗性同记录样本（换形状） | **成立** | `'0'`/`'9'`/`'007'`/带 query/带 hash 五种，断言 unitNum 规范形 + URL 同步改写 |
| ④ 无重定向循环 | **成立** | 单跳/连续两跳均收敛；`redirectedFrom` 单次；规范形零跳转；`replace` 经 history 增量取证 |
| ⑤ 非 unit 路由零影响 | **成立** | `/review`、`/error-book`、`/practice`、`/dashboard`、`/`、`/profile`、`/plan` 均不介入；query 里的 `unitNum=5` 不被越界改写 |
| ⑥ 注释声称「未登录 `/login?redirect=` 携带规范形」 | **成立（属实）** | 未登录 push `/study/math/7` → `query.redirect === '/study/math/07'` |
| ⑦ 全量回归 | **通过** | 68 文件 / **774 用例**全绿；**0 unexpected pass**、0 expected-fail |

**逐点证据：**

**① D 组断言未被削弱。** `tests/batch-f0-verify-route.test.js:120-124` 现为：
```js
it('unit → unit 非规范深链应被归一化（F0c6：全局守卫收口同记录缺口）', async () => {
  await router.push('/study/computer/05/4') // 已在 unit 记录
  await router.push('/study/computer/7/4') // 同记录、非规范 → 期望 07
  expect(router.currentRoute.value.params.unitNum).toBe('07')
})
```
真断言 `toBe('07')`，未被换成弱断言。engineer 补的 2 条（`:126` `math 10/1 → 9 ⇒ 09`；`:134` 规范形同记录零跳转 `redirectedFrom` 空）均为**真断言、非同义反复**。整个 `tests/` 目录已无 `it.fails`（grep 仅命中一处注释），故框架不可能出现 unexpected pass。

**② 无覆盖损失。** 程序化提取改写前后 `it()` 名称：**均为 9 条**。逐条对齐：
- ① 纯函数 5 条（`'5'→'05'` / `'05'→'05'` / `'10''12'` / 数字入参 / 空值）——**逐字未动**。
- ② 非规范→replace 归一：原名保留，断言由「直调 guard 取返回对象」改为**真导航**（`redirectedFrom` truthy + params 规范）。✅
- ③ 规范形不重定向：原 `guard(...) === undefined` → **同为真导航 + `redirectedFrom === undefined`**（等价，且行为层更强）。✅
- ④ fileIndex 不受累：同名保留。✅
- ④ 旧 `/unit` 重定向：原 `rec.redirect()` 直调 → 真导航 `/unit/5/4` 落到 `math/05/4`。✅

> ⚠️ **唯一语义位移（如实记录）**：原 ② 曾直接断言返回对象 `res.replace === true`；改写后该白盒字段不再被断（改以 `redirectedFrom` 间接表征）。为不留此缝，我在 Round 2 用例中**补回** `replace` 语义的运行时可证伪断言（见 ④）。

**③ 对抗性同记录样本。** Round 2 五形状（均已在 unit 记录内 push 非规范同记录深链）：
| 起始 | push | unitNum | fullPath |
|---|---|---|---|
| `/study/math/10/1` | `/study/math/0` | `00` | `/study/math/00` |
| `/study/math/10/1` | `/study/math/9` | `09` | `/study/math/09` |
| `/study/computer/05/4` | `/study/computer/007` | `007` | `/study/computer/007`（三位数视为已规范，零跳转） |
| `/study/computer/05/4` | `/study/computer/5/4?tab=a` | `05` | `/study/computer/05/4?tab=a`（query 保留） |
| `/study/computer/05/4` | `{name:'unit',params:{math,7,3},hash:'#sec'}` | `07` | hash `#sec` 保留 |

全部 `unitNum` 规范 + **URL 同步改写**（`fullPath` 逐字断言）。另注：守卫返回 `{...to, params, replace:true}` **spread 了整个 `to`**（含旧 `path`/`fullPath`），实证因 location 带 `name:'unit'` → 解析以 name+params 为准，旧 `path` 被忽略，`fullPath` 正确重算——**无副作用**。

**④ 无重定向循环（收敛取证）。** 每次真导航用 **3s 超时保护**（若成环则 push 不收敛 → 抛错）：
- 单跳 `/study/math/5/1` → 收敛到 `/study/math/05/1`，`redirectedFrom` 记录一次；✅
- **连续两次非规范 push**（`/study/math/5` → `/study/math/8`）均收敛、不挂起，终态 `/study/math/08`；✅
- 规范形 `/study/math/09` → `redirectedFrom === undefined`（零跳转）；✅
- **`replace` 语义（补回 ② 丢失的白盒断言）**：`window.history.length` 增量——非规范 push（归一 replace）**增量 0**（中间态 `…/7` 从不入历史），规范 push **增量 1**。这是 `replace:true` 的**运行时可证伪证据**，证明非规范中间 URL 不污染历史。
- 观察者证据：非规范导航中后注册的 `beforeEach` 观察者至多只见**规范形**目标（有限跳数 ≤2），无重复路径。

> jsdom 限制如实说明：`router.back()` 在 jsdom hash 模式下不触发（探针实测 back 后仍停在原地），故「back 不回非规范 URL」这一条**未能运行时验证**，改以上述 `history.length` 增量间接证明 replace。

**⑤ 非 unit 路由零影响。** 7 条非 unit 路由（`/review`、`/error-book`、`/practice`、`/dashboard`、`/`、`/profile`、`/plan`）从 unit 页进入后：`path` 不变、`redirectedFrom` 空、无 `unitNum` 参数改写。**越界攻击**：`/dashboard?unitNum=5` → `query.unitNum` 仍为 `'5'`（**未被归一为 `'05'`**），守卫严格限定 `to.name === 'unit'`，不碰其它路由及 query。✅

**⑥ 注释声明核验（如实报告）。** 源文件注释（`index.js:116-117`）声称归一化守卫注册在 auth 之前 → 未登录回跳地址为**规范形**。
- 未登录 push `/study/math/7` → 终态 `name:'login'`，`query.redirect === '/study/math/07'` ✅ **与注释一致**。
- 未登录 push `/study/computer/5/4` → `query.redirect === '/study/computer/05/4'`（规范 + 保留 fileIndex）✅。
- 对照：已登录同链接 → 直达规范形 unit 页（无 `/login`）。
**结论：注释属实，非缺陷。**

**⑦ 全量回归。**
| 关口 | 命令 | 结果 |
|---|---|---|
| 全量测试 | `npx vitest run --pool=threads --maxWorkers=1`（Node v22.22.2） | **68 文件 / 774 用例全通过；0 expected-fail、0 unexpected pass** ✅ |
| 代码规范 | `npm run lint` | exit 0，0 警告（含 Round 2 新文件） ✅ |
| 内容校验 | `npm run validate:content` | 182 文件 + 3 站点配置 全通过 ✅ |

> 计数演进：Round 1 全量 750（749+1 xfail）→ F0c6 将 `it.fails` 转正式 `it`（数量不变、xfail 归零）+ engineer 补 2 条 → 752 → 本轮 +22 → **774**。与 engineer 自测 752 一致。

**Round 2 新遗留风险：0（无新增）。**
- 未发现新增缺陷或回归；R-1 缺口已由全局守卫收口并经对抗性用例证明。
- 一处**信息级**提示（非缺陷）：`tests/batch-f0-verify-route.test.js` 与 `tests/route-params.test.js` 现为**真导航**用例，共享模块级 `router` 单例；各用例均在开头显式 push 到既定起点，故不依赖前序状态，隔离性 OK。未来若新增用例，请保持「先落起点再断言」的写法。

---

_报告人：QA 严过关｜Round 1（基线 `d771a63`）+ Round 2（基线 `d4be892`）｜方法：独立证伪 + 变异测试 + 换形状对抗_
