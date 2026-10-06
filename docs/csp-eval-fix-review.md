# 几何画板 CSP 缺陷 —— 无 unsafe-\* 方案评审与选型（v2）

> 评审人：高见远（架构师）　范围：**桌面端缺陷本身**
> **本版变更：用户决策「不要任何 unsafe-\* 指令」→ 方案 A 已出局，重构为「零 CSP 放宽」优先。**
> 性质：评审 + 方案设计，**未修改任何代码文件**（唯一新增文件为本报告）
> 所有结论均已在仓库实测 / 规范查证后下出，可复现命令见附录 A

---

## 0. 结论速览

| 项 | 结论 |
|---|---|
| 用户约束的影响 | **直接把答案收敛到 B 家族**。A（unsafe-eval）与 E（blob:）都要动 CSP；C 不修缺陷；D 过度工程。**「既不动 CSP、又不用 eval」的路径只有一条：把 initCode 在构建期变成真实模块。** |
| **推荐** | **🟢 B1′：一次性 codemod，把 20 段 initCode 落成 20 个真实画板模块 `src/geometry/boards/<boardId>.js`，按 boardId 惰性 import** |
| 一句话理由 | 把「代码字符串」搬出内容数据、放进真实 `.js` 文件后，eval 消失、CSP 一字不改、Vite/rollup 的 139 页分包策略与 import.meta.glob 全部照旧，**而且语法错误从此变成构建错误**（用户要的护栏免费实现） |
| 关键新发现 | 内容页**零 import**（纯数据 ESM）、20 个 boardId **全部唯一且是合法 kebab-case 标识符** → 天然就是文件名。这让 B 从「要写 Vite 插件」降级为「跑一个一次性脚本」 |
| 必须诚实说明的成本 | 这是拿**实实在在的一天改造工时**，去换一个**实测攻击面为零**的敞口（详见 §2.5）。安全收益写在纸面上，实际收益为零。决策权在用户，我只负责把账算清楚 |

---

## 1. initCode 真实样本（决定 B/D 改造代价）

**来源与链路**：`src/content/**/*.js` 内容页 ES 模块里 `type:"diagram"` 区块的字符串字段。

```
内容页 .js ──loadPage.js:20-22 动态 import──▶ registry.js:47 asyncBlock(()=>import('./GeometryBlock.vue'))
   ──▶ GeometryBlock.vue:30 computed 里 new Function ──▶ JsxGraphBoard.vue:58 async init()，await import('jsxgraph') 后同步执行
```
注入参数：`board` = `initBoard()` 返回值；`colors` = 按 `dataset.theme` 现算的 5 键调色板（`bg/primary/accent/text/muted`）；`JXG` = jsxgraph 命名空间。

### 样本 1 — `quadratic-func`（数学 03 二次函数）

```js
board.create('segment', [[-6,0],[6,0]], {strokeColor: colors.muted, strokeWidth:1});
board.create('text', [5.8,-0.4, 'x'], {fontSize:14, color: colors.muted});
const a = board.create('slider', [[-5.6,3.0],[-2.6,3.0],[-2,1,2]], {name:'a', snapWidth:0.1, ...});
const b = board.create('slider', [[-5.6,2.2],[-2.6,2.2],[-3,0,3]], {name:'b', ...});
const c = board.create('slider', [[-5.6,1.4],[-2.6,1.4],[-3,0,3]], {name:'c', ...});
board.create('functiongraph', [function(x){ return a.Value()*x*x + b.Value()*x + c.Value(); }, -6, 6], {...});
board.create('text', [-5.6, 3.8, function(){
  const av = a.Value(), bv = b.Value(), cv = c.Value();
  return 'y = ' + av.toFixed(1) + 'x² ' + (bv>=0?'+ ':'- ') + Math.abs(bv).toFixed(1) + 'x ' + ...;
}], {fontSize:14, color: colors.text});
```
→ **顶层 const + 闭包**：text 的内容是 JSXGraph 每帧回调求值的函数，捕获外层 `a/b/c`。

### 样本 2 — `circle-standard`（数学 11 圆的方程）

```js
const C = board.create('point', [0,0], {name:'C', size:2, color: colors.accent});
const P = board.create('point', [2,0], {name:'P', size:2, color: colors.primary});
board.create('circle', [C, P], {strokeColor: colors.primary, strokeWidth:2});
board.create('text', [-5.6, 3.6, function(){
  const a = Math.round(C.X()*100)/100, b = Math.round(C.Y()*100)/100;
  const r = Math.round(Math.hypot(P.X()-C.X(), P.Y()-C.Y())*100)/100;
  return '(x' + sa + Math.abs(a) + ')² + (y' + sb + Math.abs(b) + ')² = ' + Math.round(r*r*100)/100;
}], {fontSize:14, color: colors.text});
```
→ **拖拽点 + 两个闭包**，实时算标准方程。

### 样本 3 — 复杂度上限（`solid-cylinder-cone`，数学 10 空间几何体）

```js
function ellipse(cx, cy, rx, ry) {
  board.create('curve', [function(t){return cx + rx*Math.cos(t);},
                         function(t){return cy + ry*Math.sin(t);}, 0, 2*Math.PI], {strokeWidth:1.5});
}
ellipse(-2.5, -1.2, 1.6, 0.6);
ellipse(-2.5,  1.2, 1.6, 0.6);
board.create('segment', [[-4.1,-1.2],[-4.1,1.2]], {...});
```
→ **唯一带命名函数声明**的一段，且该函数被多次复用。

### 20 处是否同质？—— 是，且做了全量扫描（非抽样）

| 指标 | 结果 |
|---|---|
| 总段数 | 20 |
| 字面量形态 | **20/20 全是「双引号 + `\n` 转义」的单行字符串**；无反引号模板、无单引号 |
| 长度 min / 中位 / max / 均值 | 744 / 1062 / 1609 / 1096 字符 |
| 含顶层 `const` | 17 / 20 |
| **含闭包回调 `function(){...}`** | **17 / 20** |
| 含命名函数声明 | 1 / 20 |
| 含 `eval(` / `new Function` / 字符串拼接构造代码 | **0 / 20** |
| boardId | **20 个，去重后仍为 20 → 全局唯一**；且全部是合法文件名标识符 |

**对 B 的含义**：20 段全部可机械平移（wrapper 里包一段函数体即可），无一处需要人脑重写 → B 的风险极低。
**对 D 的含义**：17/20 依赖**真正的词法闭包**，不是数据能表达的东西 → D 必须自带表达式解释器。

---

## 2. 候选方案对比（无 unsafe-\* 优先）

### 候选清单与判定

| 候选 | 做法 | 是否动 CSP | 结论 |
|---|---|---|---|
| **A** | 生产 `script-src` 加 `'unsafe-eval'` | **是（unsafe-\*）** | 🔴 **用户已排除**，仅作参照 |
| **B1′（推荐）** | 一次性 codemod：20 段 → 20 个真实模块文件，按 boardId 惰性 import | **否** | 🟢 推荐 |
| **B2′** | 生成脚本从内容页提取 initCode → 生成模块文件（content 保持单一真相） | **否** | 🟡 备选 |
| **D** | initCode → 声明式 JSON 配置 + 自研解释器渲染 | **否** | 🔴 过度工程 |
| **E** | Blob URL + 动态 import，`script-src` 加 `blob:` | **是（scheme 源）** | 🔴 见 §2.3，换皮版 A |
| **F** | 静态 nonce 注入 index.html + CSP | **是（加 nonce）** | 🔴 静态 nonce 是公认反模式 |
| **G** | 塞进 Worker | 否 | 🔴 JSXGraph 需 DOM，不可能 |
| **H** | 借 Tauri 自动 hash 注入，把 20 段写进 index.html 内联脚本 | 否（Tauri 自动注入 hash） | 🔴 绑定 Tauri 内部实现 + 20 段全部预加载，脆弱 |
| **C** | 不改造 | 否 | 🔴 不修缺陷 |

### 2.3 关于 E（Blob URL）—— 团队特别要求查证，以下为查证结果

**CSP 语义层（已查证，来源：MDN CSP `script-src` 文档 / secureheaders-equivalent CSP 规范解读）**：
1. ✅ `blob:` **确实不属于 `unsafe-*`** —— 它是**协议源（scheme source）**，书写不带引号：`script-src 'self' blob:`。
2. ❌ **`'self'` 不匹配 blob: URL**。规范明确：source-list 匹配算法把 `blob:`/`data:`/`filesystem:` 排除在外，`*` 也不覆盖它们；必须显式写 `blob:`。所有现代浏览器一致（旧版 Chrome 曾把同源自产 blob 当 'self'，已修正并收敛到与 WebKit/Firefox 一致）。
3. ⚠️ **`blob:` 放进 script-src 的风险等级 ≈ `unsafe-eval`。** 文档原话：*"allowing blob: in a script context lets the page run code it builds at runtime, which is close to handing back 'unsafe-eval'"*；MDN 把 script-src 的 `blob:` 标为 **❌ Risky（XSS 向量）**。原因：blob 内容是运行期拼出来的，没有静态文件可审计、没有 host 或 hash 可钉。

**结论：E 满足「不含 unsafe-\*」的**字面要求**，但实质是同一档松弛 —— 用 `blob:` 替换 `'unsafe-eval'`，攻防效果等价。** 若用户的真实诉求是「不要开放『把字符串当代码执行』的能力」，E 是**政策上的形式主义（policy theater）**，不该选。

另外三点让它更不划算：
- **仍需改 CSP**（`'self'` 不匹配 blob:），用户要的「零放宽」没实现
- **initCode 仍是运行期字符串**，本次缺陷的所有次生问题（语法错误只有运行时才炸、编辑器 round-trip、看不到 stack）一个都没解决
- **Tauri 侧未验证**：`tauri://localhost` 这个自定义协议下 `URL.createObjectURL` 产出的 `blob:tauri://localhost/<uuid>` 在 WKWebView 中的行为，我无法静态查证，**必须在真机实测才能确认**，等于把风险后置

→ **E 判定：不推荐。** 它同时具备 A 的「放宽 CSP」缺点和 B 要解决的「字符串是代码」缺点，唯独没有优点。

### 2.4 综合对比表

| 维度 | **A**（参照，用户已排除） | **B1′ codemod 真实模块** 🟢 | **B2′ 生成脚本** | **D 声明式 JSON + 解释器** | **E Blob + `blob:`** | **C 不改造** |
|---|---|---|---|---|---|---|
| **是否引入 unsafe-\*** | **是（`'unsafe-eval'`）** | **否** | **否** | **否** | 否（但引入等价风险的 `blob:` 协议源） | 否 |
| **是否要动 CSP** | 是 | **否** | **否** | **否** | **是**（加 `blob:`） | 否 |
| **工作量** | 1 行 | 一次性 codemod 脚本 ~60 行（跑完即弃）+ **20 个新模块文件**（平均 ~1.1KB，脚本机械生成）+ `GeometryBlock.vue` ~30 行 + 配置 4 处小改 ≈ **半天到一天** | 生成脚本 ~80 行常驻 `prebuild` + 20 个生成文件 + `GeometryBlock.vue` ~30 行 | 解释器 ~250 行 + 渲染器 ~350 行 + **人工重写并逐一视觉核对 20 张图** ≈ **数天** | ~30 行 + CSP 1 处 | 0 |
| 是否要写构建插件 | 否 | **否**（一次性脚本即可） | 否（用现有 `prebuild` 钩子，与 `build-search-index.mjs` 同一模式） | 否 | 否 | 否 |
| **是否改 14 个内容文件** | 否 | **是**：删掉 20 个 `initCode` 字段（由 codemod 脚本执行，内容页因此更干净、体积减少 ~21KB） | 否（content 保持单一真相） | **是**：20 段全部人工重写 | 否 | 否 |
| **是否要改编辑器流程** | 否 | **是**：`schemaForm.js` 里 `initCode` 的 textarea 失去意义（字段没了），作者改为直接编辑 `boards/<boardId>.js` —— **详见 §2.5，这是 B1′ 唯一的真实成本** | **否**（textarea 照旧可用） | **是**（textarea 改为编辑 JSON 配置） | 否 | 否 |
| **是否要改 `validateBlock.js:133`** | 否 | **是**：`isEmpty(block.initCode)` → 改为「boardId 必须能在 boards 目录解析到模块」（boardId 现在已经是必填，规则反而更简单） | 否（规则不变） | 是 | 否 | 否 |
| **`loadPage.js` 字面量前缀风险** | 无 | **无**（完全不动内容加载方式，139 页分包策略原样保留） | 无 | 无 | 无 | 无 |
| **`tests/block-async.test.js:39` 风险** | 无 | **无** ✅ —— 该断言只扫 `registry.js`（当前 `:47` 已是动态 import）。B1′ 在 `GeometryBlock.vue` 内部用 `import.meta.glob` + 惰性 load，**不是静态 import**，且每个 board 独立 chunk，分包反而更细 | 无 | 无 | 无 | 无 |
| **回归风险** | 极低 | **低**。20 段是纯机械封装；风险集中在 `GeometryBlock` 由「同步 setup」改「异步取模块」这一处时序（见 §3 清单） | 低～中（多一层生成/失效问题） | **高**：20 张图需逐一视觉核对，且 DSL 表达力天然不足（`glider`、参数曲线、`functiongraph` 都要新语法） | 中（依赖未验证的 Tauri blob 行为） | 零，但功能坏着 |
| **安全性 · 理论** | 最弱 | **强**（零 eval、CSP 一字不改） | 强 | **最强**（代码彻底变成数据） | 弱（等价 unsafe-eval） | 强 |
| **安全性 · 本应用实际** | ≈0（见下） | 更强 | 更强 | 最强 | ≈0 | 最严但图全坏 |
| **可维护性** | 最优 | **优**：画板代码变成真实 `.js` 文件（有语法高亮、lint、跳转、Git diff 可读），比现在在 textarea 里编辑 1KB 转义单行字符串 **明显更好** | 中：多了生成步骤，编辑器改完 initCode 后需重跑生成，否则 dev 下会「改了不生效」 | **差**：新增一类 DSL，未来每加一个 JSXGraph 特性都要扩展它 | 差：字符串代码的一切毛病都在 | 差 |
| **性能 / 首屏** | 无影响 | **略优**：少一次运行期编译；20 个 board 各自独立 chunk、按 boardId 惰性加载，单页只拉用到的那 1 个 | 同 B1′ | 略差（多一层解释开销，可忽略） | 略差（每次渲染建 blob） | 图不渲染 |
| **是否需要改测试** | 否（实测 0 个测试触及本议题） | **建议新增 1 个**（boardId ↔ 模块存在性），现有 244 个**一个都不用改** | 建议新增 1 个 | 需大量新增 | 否 | 否 |
| **缺陷是否修复** | ✅ | ✅ | ✅ | ✅ | 需实测确认 | ❌ 20 图全不可用 |

### 2.5 必须诚实说明的一件事

我此前的取证结论依然成立：initCode 是**构建期随二进制分发的编译期常量**（dist 对账：14 个内容 chunk / 20 次命中，与源码完全一致）；不可信输入通路逐条排查全否（远端只服务 auth/sync；编辑器 write 插件 `apply:'serve'`，生产 bundle 里根本没有；localStorage / 搜索索引 / 路由参数均不进 eval）；`src/`+`scripts/` 全树 `new Function` 仅此 1 处。

**所以：从 A 换到 B，防御的是一个实测攻击面为零的敞口。** 这不是反对用户的决策 —— 收紧 CSP 本身是正当偏好，我也认可「能用真实模块就别用字符串」在工程上更干净。但账要算明白：**这次要付的是大约一天工时 + 编辑器 textarea 工作流的改变，换来的是纸面上的安全收益。**

我完全支持这个决策（B1′ 的可维护性收益本身也值这笔钱），但若将来有第三方正文再来复盘"为什么当初花了这么大工夫"，上面这段是准确的原因。

---

## 3. 明确推荐 + 改动清单

## 🟢 推荐 B1′：把 20 段 initCode 一次性 codemod 成 20 个真实画板模块

**一句话理由**：既不许放宽 CSP、又不许用 eval，答案就只剩「让代码在构建期变成真实模块」；而内容页零 import、boardId 全局唯一且是合法文件名这两个既成事实，恰好让这件事退化成「跑一个一次性脚本 + 20 个新文件」，无需任何构建魔法。

**为什么是 B1′ 而不是 B2′（生成脚本）**：B2′ 保留了 textarea 编辑，但换来「生成产物需提交、改完要重跑、dev 下易出现改了不生效」的一整类新问题。**一道一次性脚本跑完就再也不用管**，画板代码从此是仓库里看得见、可 lint、可 diff 的真实文件 —— 这是能把可维护性从「差」提到「优」的关键，也是我愿意为它放弃 textarea 的原因。

### 改动清单

| # | 文件 | 改法 |
|---|---|---|
| 1 | **新建 `src/geometry/boards/<boardId>.js` × 20** | 每个文件形如 `export default function setup(board, colors, JXG) { <该段 initCode 原文> }`。文件名即 boardId（`quadratic-func.js`、`circle-standard.js`、`solid-cylinder-cone.js` …）。**由脚本从内容页机械提取生成**，不需要人写 |
| 2 | **一次性脚本 `scripts/codemod-initcode.mjs`**（~60 行，跑完可删） | Node 侧 `import()` 各内容页（**已验证内容页零 import，是纯数据 ESM，可直接被 Node 导入**，无需正则/AST）；遍历 blocks（含 `columns`/`group` 嵌套）找出 `type === 'diagram'`；对每段 `JSON.parse` 后的 initCode 写出上述 20 个文件；同时按要求改写内容页删掉 `initCode` 字段 |
| 3 | **`src/components/blocks/GeometryBlock.vue`**（~30 行） | 删掉 `:36` 的 `new Function`。改为：`const loaders = import.meta.glob('@/geometry/boards/*.js')`，按 `props.block.boardId` 惰性 `await loaders[path]()` 取到 setup 函数。**注意这是唯一有实现风险的一处**：现在 setup 是同步 computed，改成异步后，`JsxGraphBoard` 的 `:90 if (props.setup)` 守卫会在模块到位前就跑完 → 必须让 `GeometryBlock` **先把模块拿到再渲染子组件**（或给 `JsxGraphBoard` 加 key 触发重挂载），否则会出现「加载中 → ready 但空画板」。建议加个本地 `loading/error` 态复用现有 UI |
| 4 | **`src/utils/validateBlock.js:133`** | `if (isEmpty(block.initCode))` → 改为校验 `boardId` 能解析到 boards 模块（boardId 本来就已必填） |
| 5 | **`schema/content-schema.json:44`** | diagram 的 `required` 从 `["boardId","initCode"]` 去掉 `initCode` |
| 6 | **`src/views/editor/schemaForm.js:33,58`** | `LONG_FIELDS` 里移除 `'initCode'`、`FIELD_LABEL` 里移除 `initCode: '初始化代码'`（字段已不存在）。**这就是编辑器流程的改变：作者改为直接编辑 `boards/<boardId>.js`** |
| 7 | **不改** | `loadPage.js`（字面量前缀与 139 页分包策略原样不动）、`registry.js:47`（`block-async.test.js:39` 继续通过）、`JsxGraphBoard.vue`（props 契约不变）、`serializePage.js`（内容更纯了，纯 JSON 序列化反而更稳） |
| 8 | **不改动 CSP** | `tauri.conf.json` **一个字都不动**。生产 CSP 维持 `script-src 'self'`，不加 `'unsafe-eval'`，也**绝不加 `'unsafe-inline'`** |

### 验收清单

- 20 张图在真实 macOS `.app` 中全部渲染（重点验收三处代表：`quadratic-func` 拖滑块后抛物线+公式文本实时更新、`circle-standard` 拖 C/P 后圆+方程实时更新、`solid-cylinder-cone` 的 `function ellipse` 复用正常）
- 20 个 board 各自独立惰性 chunk（用 `ANALYZE=1 npm run build` 确认没有塌进主包）
- `npm run validate:content` 与 `npm test`（244+1）全绿
- `npm run lint` 零告警（画板代码现在是 lint 范围内了）
- **dev 与 prod 表现一致**（这一点 B1′ 天然满足，因为不再依赖任何 CSP 行为）

---

## 4. 防御性护栏

用户提的问题是「initCode 是字符串，语法错误编译器查不出来，只能运行时炸」。

**选 B1′ 之后，这条护栏是免费的：** 20 段代码变成真实 `.js` 模块，进入正常的 Vite/esbuild 编译 → **语法错误直接变成构建失败**，不再是「运行时才炸 / 静默显示红字」。 lint 也会覆盖它们。**这本身就是对「怎么用字符串写都查不出来」的正面解决，不需要额外测试。**

但 B1′ 引入了一个新的可能断裂点：**「内容页写了 boardId，但 boards 目录下没有对应模块」**（以前是校验 initCode 非空，现在这层保证没了）。所以补一条低成本测试即可：

**新增 `tests/geometry-board.test.js`（~25 行）**
- 用现成的 `collectFiles(CONTENT_DIR)` 扫描规则（与 `content-style.test.js` / `content-smoke.test.js` 共用同一份，保持「哪些算内容页」只有一处定义）
- 递归收集所有 diagram 区块，收集全部 `boardId`
- 断言每个 boardId 都能在 `src/geometry/boards/` 命中同名 `.js`，且该模块 `default` 导出是函数、arity 可接受三个参数
- 反向断言：boards 目录下没有孤儿文件（防止改了 boardId 却忘了改文件名）
- 顺带断言 boardId 仍然全局唯一（现在 20/20 唯一，这条能防止将来复制粘贴产生重名导致互相覆盖）

**额外建议（无论选哪个方案，都值得带上）**：`GeometryBlock.vue:35-40` 的 catch 目前把「CSP 拦截 / 语法错 / 字段缺失」三种故障混成同一句「图形初始化代码无效」—— 本次缺陷排查成本高，一半就花在这句误导性文案上。建议编译时按 `e.name` 分支出具体原因，且 `console.error` 带上 `boardId`（20 个全局唯一，天然主键）。即使 B1′ 之后不再有 CSP 问题，`JsxGraphBoard.vue:90-96` 的 catch 仍然会在 setup 抛错时把状态置成 `ready`、显示一块**完全空白的画布**，建议改为 `state.value = 'error'` 复用已有重试 UI。

---

## 5. Anything UNCLEAR

| # | 项 | 影响 | 需要谁确认 |
|---|---|---|---|
| 1 | boardId 是否会成为长期稳定标识？B1′ 把文件名与 boardId 绑定，改名要同步改两处（§4 的孤儿检测会兜住） | 低 | 已知足（QA 已确认唯一性） |
| 2 | 是否接受「编辑器不再能编辑画板代码、改为直接编辑 `.js` 文件」？**这是 B1′ 唯一的真实代价**，若不接受请改选 B2′ | **中 —— 这一条需要用户拍板** | 用户 / team-lead |
| 3 | `JsxGraphBoard` 改异步取模块后的加载态 UI 如何取舍（沿用现有 spinner 文案 or 新增） | 低 | 实施时由工程师定 |
| 4 | macOS 签名/公证缓存可能影响验收时的产物刷新 | 低 | 发布时留意 |
| 5 | `dist-probe` / `dist-probe2` 疑似验证过程临时产物 | 仓库卫生 | 建议加入 `.gitignore` |
| 6 | E 方案在 `tauri://localhost` 协议下 WKWebView 对 blob: 的真实行为**未做实测**（规范层已查证，平台层未验证） | 仅影响已否決的 E | 若坚持 E 必须真机实测 |

---

## 附录 A：可复现实测命令

```
# 1) initCode 分布：14 文件 / 20 处
grep -rc "initCode" src/content | grep -v ":0"

# 2) boardId 唯一性：20 个，去重后 20
grep -rho 'boardId: "[^"]*"' src/content | sort -u | wc -l

# 3) 内容页零 import（纯数据 ESM → Node 可直接 import，codemod 无需正则/AST）
grep -rl "^import \|^const .*= require" src/content/math/          # → 空

# 4) eval 站点总数：src/ + scripts/ 内仅 GeometryBlock.vue:36
grep -rn "new Function" src/ scripts/

# 5) 现有测试面：24 文件 / 244 用例全通过，且 0 个测试触及本议题
npm test ; grep -rln "initCode\|GeometryBlock\|JsxGraphBoard\|diagram" tests/    # → 空
```

> 本次评审全程只读，**未修改任何既有文件**；唯一新增文件为本报告。
