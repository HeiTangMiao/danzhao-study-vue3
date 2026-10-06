# 移动端体验大改造 · 系统设计 v1

> 状态：**v1.2（架构师并入新决策 + 正确性体检，2026-10-07）**。
> 本轮变更：①并入 **D11-D14**（练习自评强制 / 自动组卷 / 署名块 / 克制+关键处加强）与 **v2 风格细则**（玻璃 30-42% + 内侧高光、TabBar 液态悬浮 pill、陶土橙加至 ~6 处）；②新增 §5.6 学习页视觉改进（玻璃迷你顶栏可行性、区块差异化最小改动路径、进度条统一）；③**正确性体检**（§12）：修正「147 页」→ **139 页**（147 = 139 数据页 + 3 site.js + 5 基建文件）等多处数字/表述；④§13 给出 `docs/csp-guard-plan.md` 处置结论。
> v1.1 记录：复核结论「无失真」；更正 geogebra「已无 src 引用」不实；精化 §5.1 WebKit bug 触发条件；补 §2 `/practice` 路由；补全 §9 / §10。

---

## 1. 决策记录（ADR 摘要）

| #  | 决策       | 结论                                                          | 依据                                                                                             |
| -- | -------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1 | 技术栈      | **保留 Vue 3，不迁 React**                                       | 四条样式诉求 Vue 全部可做且三条已在用；真正的约束是内容模型，迁栈不解决；迁栈成本 4-8 周且需重趟风险点                                       |
| D2 | 目标载体     | **桌面窗口 + Android 包**，自适应优先（一份布局两端，不写两套）                     | 用户拍板                                                                                           |
| D3 | 底部导航     | **4 Tab：学习 / 练习 / 复习 / 我的**                                 | 采纳 PM 建议；"练习"为新增聚合层                                                                            |
| D4 | 内容模型     | **方案 A：布局原语**（排布自由度）                                        | 存量 **139 个数据页**零改动；"任意自定义组件"仅在极少数页面作逃生舱                                                         |
| D5 | 动效       | **丰富，分级降级**（高端丰富/低端精简）                                      | WebView + 移动端性能硬约束                                                                             |
| D6 | 视觉       | 导航页玻璃拟态+柔光渐变；学习页 Claude 纸质阅读；**全面禁用 emoji，改 Lucide SVG 图标** | 用户拍板                                                                                           |
| D7 | 编辑器      | **删除**（使用频率 0）                                              | 用户拍板                                                                                           |
| D8 | Tailwind | **不引入**                                                     | 与现有 2000+ 行 token CSS 并存会风格漂移                                                                  |
| D9 | 图标       | **Lucide**（`lucide-vue-next`）                               | 24.8k star、ISC、编译期内联 SVG、CSP 零风险；排除 Iconify 运行时模式（connect-src 拦截）与 Phosphor（6 权重易花哨，与降 AI 味相悖） |
| D10 | GeoGebra 演练场 | **下线**：移除 desmos 区块实例与全部入口，`vendor/geogebra` 随之 `git rm`（保留 `scripts/fetch-geogebra.mjs` 供将来重拉）；`stash@{0}` 重写方案保留，P4 阶段用 layout 原语体系重做 | 桌面端白屏已实测（C7）；单页锦上添花功能不占大改造预算；GWT 运行时内联注入属第三方行为不可控 |
| **D11** | 练习自评 | **强制**：看答案后必须选「我会了 / 我还不会」才能进下一题，不可跳过。自评是错题入库的**唯一触发器** | **架构师实测复核一致**：全库 `question` 键共 **1393** 处，`correctIndex` 共 **286** 处 → 仅 **20.5%** 可机器判分，79.5% 只有自由文本答案，无自评则错题本无输入源 |
| **D12** | 模拟冲刺 | **支持自动组卷**（按难度/单元从 1393 题组卷），不止现有 4 套真题卷 | 实测：exam 区块仅 4 个文件（`math/12-模拟冲刺/02、03`、`chinese/06-模拟冲刺/02`、`computer/05-模拟冲刺/02`），覆盖极薄 |
| **D13** | 署名块 | **仅保留一处**（「我的」页，墨色小字，去紫红渐变文字与 ❤️ emoji）；其余页脚署名卡全删 | 用户拍板 |
| **D14** | 视觉方向 | **克制为主 + 关键处加强**：整体 Claude 纸质克制高级感，首页/入口等少数位置加强视觉冲击 | 用户拍板；导航页渐变**保持克制**（用户明确选此项） |

**CSP 硬约束**（贯穿所有选型）：`script-src 'self'`（禁 eval/内联脚本）；`style-src 'self' 'unsafe-inline'`（内联样式允许）；`font-src 'self' data:`（字体必须自托管）；`connect-src` 不含第三方域。

---

## 1.5 工程原则（贯穿全部实施阶段，2026-10-06 用户新增）

### 高内聚低耦合

| 原则 | 含义 | 落地方式 |
|---|---|---|
| **高内聚** | 一个模块/组件只负责一件事，相关状态与逻辑就近放置 | 延续 registry 模式（`blocks/registry.js` 集中注册）；通用逻辑抽 composable（`useKatex`/`useMermaid` 先例）；layout 原语与区块组件**正交**（互不感知，正交组合是内聚的） |
| **低耦合** | 模块间只通过明确接口通信，消灭隐式依赖 | 组件间只用 props/emits 显式契约（禁 provide/inject 滥用）；样式只经 CSS token（禁跨组件选择器穿透）；**"耦合检查"列为每阶段验收项** |

**已知耦合点（重构时必须处理）**：
- `ContentSidebar` 的底栏与 `UnitView` 深度绑定（互斥逻辑分散在两处）
- 悬浮番茄钟（`UnitView.vue:144`）与内容页状态耦合
- `iconOf(type)` 返回字符串被 TOC/HomeView 直接消费（契约脆弱，Lucide 迁移时已计划改为 `<AppIcon>` 组件）

### 中文注释规范

- **精简**：只注释"为什么"（决策原因、陷阱提醒、契约说明），不复述代码"是什么"
- **新手友好**：关键路径有步骤说明；魔法值与复杂时序有解释（正面示范：`main.css:16-48` 的迁移策略注释、`ColumnsBlock.vue` 的"不 import BlockRenderer 避免循环依赖"）
- **语言**：中文
- **范围**：所有新增代码必须遵守；存量代码在被触碰时顺手补齐，**不做专项补注释**（避免无意义的 diff 噪音）
- 反面示例：`// 设置为 true`、`// 遍历数组` 这类复述型注释

---

## 2. 信息架构

### 现状问题（PM 诊断，代码证据）

- Web 式 IA：首页 4 张卡做导航中心 + 页脚 nav + 面包屑；全站 grep 不到 tabbar/bottom-nav
- `App.vue` 常驻站点式顶部 header；`.app-main { max-width: 960px }` 桌面居中列
- Dashboard/ErrorBook/Profile 均带面包屑（纯 Web 惯用法）

### 目标 IA：底部 Tab Bar（移动）+ 侧栏（桌面）

| Tab    | 收录现有页面                                                      | 归并理由                                       |
| ------ | ----------------------------------------------------------- | ------------------------------------------ |
| **学习** | HomeView（继续学习卡、学科切换、阶段分组、搜索）                                | 内容导航最高频；"继续学习"卡天然是首屏                       |
| **练习** | **新增聚合层**：模拟冲刺 + 按学科/单元题目聚合（quiz/exam 区块提取）                 | "刷题"是独立任务流（进题→对错→结算），现 quiz/exam 埋在页内无聚合入口 |
| **复习** | ErrorBookView + useSpacedReview（SM-2 到期队列）+ Dashboard 薄弱点洞察 | 错题+间隔复习+薄弱点是同一"补漏"闭环                       |
| **我的** | ProfileView + DashboardView（进度/统计）+ 主题 + 管理后台(admin) + 退出   | "账号+数据+设置"标准"我的"Tab                        |

**二级下钻**：学习 → 学科 → 单元 → **内容页**（UnitView 保留）；练习 → 做题会话（全屏）→ 结算；复习 → 到期队列 → 错题详情 → 跳回来源页。

**路由 meta 结构**（架构师设计，入口清单已定）：

```
每个一级入口 = 顶层路由，meta: { tab: '<id>', tabOrder: n }
/           → meta {tab:'study'}（学习：现 HomeView）
/practice   → meta {tab:'practice'}（练习：新增聚合层，交互稿待 PM 细化）
/error-book → meta {tab:'review'}（复习）
/profile    → meta {tab:'me'}（我的）
/study/...  → 详情页不带 tab meta（push 进入，隐藏 TabBar）
/admin      → 非 tab（仅 admin）
```

- active 高亮按 `route.meta.tab` 匹配（非 path.startsWith），避免详情页误点亮
- **互斥规则**：详情页（ContentSidebar 底栏）与 AppTabBar 不可同屏——详情页隐藏 TabBar

---

## 3. 内容模型重构（核心）

### 现状证据

- 22 类型硬白名单：`schema/content-schema.json:27`；`validateBlock.js:70` 未知类型报错
- **容器区块已支持递归**（`ColumnsBlock.vue:13-15`、`GroupBlock.vue:22-24` 用 slot 避免循环依赖）——本仓库最有价值的既有资产
- **校验器已是递归实现**（`validateBlock.js:154-177`）→ 扩展成本低

### 三个候选方案

| 方案           | 做法                                                                                                                                        | 存量兼容                  | 作者工作流              | 工作量                         | 定位              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------ | --------------------------- | --------------- |
| **A 布局原语** ⭐ | `columns/group` 泛化为 `{type:'layout', as:'grid'\|'stack'\|'split'\|'hero'\|'bleed'\|'rail', props, children:[block\|layout]}`，允许 layout 嵌套 | ✅ 100%（新增类型，**139 个数据页零改动**） | 手写声明式 .js 数据（已是现状） | 中（6-10 个原语 + 校验 + 注册表 + 测试） | **主力**          |
| B 逃生舱        | 页面可 `export default { component: () => import('...Xxx.vue') }`                                                                            | ✅ 100%（默认走 blocks 分支） | 写 Vue SFC，门槛陡      | 小                           | 仅极少数页面，**不作默认** |
| C 版式变体       | 22 类型加 `layout/span/tone/align` props                                                                                                     | ✅ 100%                | 改字段                | 极小                          | A 的低成本子集        |

**推荐：A 为主 + B 逃生舱 + C 作为 A 的子集**。明确反对"放弃数据模型、每页写组件"——会让 139 个数据页 + 搜索索引（`build-search-index.mjs` 按 blocks 形状抽取）+ 未来任何批量改动全部失守。

> 📏 **页数口径（正确性体检修正，2026-10-07）**：`src/content/**/*.js` 共 **147 个 .js 文件**，其中**数据页 139 个**，其余 8 个是基建文件（3 个 `site.js` + 根目录 `index.js`/`loadPage.js`/`pageMeta.js`/`serializePage.js`/`searchIndex.js`）。先前文档多处写「147 页」**不准确**，本文档统一按 **139 个数据页**计（与 `CLAUDE.md` 的「139 个页面」一致）。§9.2 时序图注释中的「139 页分包」是**正确**的，无需改。

**实现要点**：

- layout 与 block **共用 `type` 单键**（不引 `kind`）
- 校验器**统一递归**（复用 `validateBlock.js:154-177` 骨架）+ **递归深度上限**（防深嵌套）
- 渲染新增 `LayoutRenderer.vue`，复用现有 slot 递归模式
- 矛盾 A 回答：作者写**结构化布局数据**（非代码、非模板语言——禁 eval 符合 CSP），**可接受**

---

## 4. 移动端架构

### 4.1 TabBar —— 纯手写 `AppTabBar.vue`（v2：**圆角液态悬浮 pill**）

**v2 形态（用户已定，取代 v1 的「贴底栏 + 中间凸起 fab」）**：

| 项 | v2 参数 |
|---|---|
| 形态 | 四周留白、**不贴底**的悬浮胶囊；`border-radius: 28px`（高 56px 时正好胶囊形） |
| 玻璃底 | `rgba(255,255,255,.42)` + `backdrop-filter: blur(12px) saturate(1.2)` |
| 投影 | 暖可可 `0 8px 24px rgba(88,46,29,.10)` |
| 激活项 | 底色 `rgba(201,100,66,.10)`（陶土橙）+ 内圆角 `22px` |
| 显示条件 | 仅 `< var(--bp-lg)`（1150px）；桌面端为侧栏 |

**悬浮 pill 的安全区公式（v2 新增，与 v1 贴底不同）**：

```css
/* pill 自身：不贴底，但仍必须让开系统手势条 */
.app-tabbar {
  position: fixed;
  bottom: calc(var(--space-3) + var(--sab));          /* 12px + 安全区 */
  left:  calc(var(--space-4) + var(--sal));           /* 16px + 横屏左安全区 */
  right: calc(var(--space-4) + var(--sar));
}
/* 内容区让位：pill 高度 + 上下留白 + 安全区 */
.app-main { padding-bottom: calc(var(--tabbar-h, 56px) + var(--space-3) + var(--sab) + var(--space-2)); }
```

- ⚠️ **悬浮 pill 同样受 §5.1「祖先不可有 transform/filter/will-change」约束**（否则玻璃静默失效）；它是 `position: fixed`，父级链上任何 transform 都会同时破坏 fixed 定位与 backdrop root
- ⚠️ 圆角玻璃在 WebKit 上圆角处可能出现模糊溢出/锯齿 → 把 `backdrop-filter` 放到**同圆角的伪元素层**（父级 `border-radius` + `overflow: hidden`）
- 高频直达入口保留「读 `last_study` → `router.push('/study/...')`，无历史降级为默认页」；**形态改为 pill 内的一个强调项**（取消 v1 的中间凸起 fab，避免凸起处破坏胶囊轮廓与 backdrop root）
- 信息架构统一：App.vue 顶部 header、详情页 ContentSidebar 底栏、悬浮番茄钟——**三者不得与 pill 同屏打架**

### 4.2 响应式 —— 容器查询为主

**决定性依据**：项目大量"同一区块被放进不同宽度容器"（桌面侧栏里的区块其实很窄但视口很宽）→ **媒体查询按视口判断会误判**。容器查询按实际可用宽度判定。

- 用法：`container-type: inline-size` + 尺寸查询；**避开 `cqw/cqh` 单位（老 Safari bug）与 style queries（Safari 18 才支持）**
- 支持：WebView Android 105+ / Safari iOS 16+ / WKWebView macOS 13+ → 满足
- 兜底：`@supports not (container-type: inline-size)` → 退回媒体查询

### 4.3 断点收敛（现有 6 个碎片值 → 4 级阶梯）

| 名称        | 值      | 语义                    | 归并          |
| --------- | ------ | --------------------- | ----------- |
| `--bp-sm` | 600px  | 手机竖屏                  | ← 600（10 处） |
| `--bp-md` | 900px  | 平板/横屏                 | ← 640/768   |
| `--bp-lg` | 1150px | **桌面↔移动分界**（侧栏↔底栏切换线） | ← 1150/1151 |
| `--bp-xl` | 1280px | 宽桌面（**新增档**，现有代码无对应） | — |

> 修正说明：`1024px`（`ColumnsBlock.vue:65`）与 `768px`（`CompareBlock.vue:98`）**不是全局断点**，它们是区块级宽度判断，按 §4.2 应**迁到容器查询**，不并入本阶梯（v1 表格曾把 1024 归入 xl，表述不准）。

### 4.4 哪些组件需要结构性两套排布（仅 3 处）

| 类别                          | 组件                                                                            |
| --------------------------- | ----------------------------------------------------------------------------- |
| **结构性**（元素位置真的变，同一数据两个容器）   | `ContentSidebar.vue`（侧栏↔底栏+抽屉）、`UnitView.vue`（内容+侧栏↔迷你顶栏）、`AppTabBar.vue`（新增） |
| **布局变体**（props 表达意图，CSS 降级） | `ColumnsBlock.vue`（多栏↔单列）、`CompareBlock.vue`（左右↔上下）                           |
| **仅密度/排版**（不改结构，token 切换）   | 其余全部                                                                          |

### 4.5 安全区 —— 已就绪，只需规范化

`main.css:252-258` 已定义 `--sat/--sab/--sal/--sar`；`index.html:6` 已 `viewport-fit=cover`。规范：底栏 `calc(8px + var(--sab))`，sticky 顶栏 `calc(8px + var(--sat))`。

### 4.6 Tauri Android 前置条件（当前未装）

已具备：`lib.rs:5` `mobile_entry_point`、crate-type 含 staticlib/cdylib、android 脚本、icons/android+ios。  
尚缺：① Android Studio + SDK + NDK + JDK 17（`ANDROID_HOME`/`NDK_HOME`）② Rust target `aarch64-linux-android` ③ `npm run tauri:android:init` ④ keystore 签名 ⑤ 移动端缺失能力用 `#[cfg(desktop)]` 隔离。

---

## 5. 视觉与动效

### 5.1 玻璃拟态 —— 手写 CSS（无成熟库，Vue 侧空白）

**v2 参数（2026-10-07 用户已定，取代 v1 的 55-72% 半透明）**：

```css
/* 玻璃三要素必须 token 化：暗色主题与降级各需一份取值 */
:root {
  --glass-bg: rgba(255, 255, 255, 0.42);   /* v2：30-42%（v1 为 55-72%，偏"闷"） */
  --glass-hl: rgba(255, 255, 255, 0.9);    /* 内侧高光：模拟折射 */
  --glass-shadow: 0 8px 24px rgba(88, 46, 29, 0.10);  /* 暖可可投影 */
}
:root[data-theme="dark"] { --glass-bg: rgba(28, 28, 26, 0.42); }

.glass {
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);   /* 必写前缀 */
  backdrop-filter: blur(12px) saturate(1.2);
  box-shadow: inset 0 1px 0 var(--glass-hl),           /* 内侧高光边 */
              var(--glass-shadow);
}
.glass-pill { border-radius: 28px; }                   /* 见 4.1 液态 TabBar */
```

**约束（v1/v2 均成立，v2 新增两条）**：

- **blur 上限 8-16px**（v2 沿用）。引用已核实（bugs.webkit.org）：#316769 触发条件是**极大 stdDeviation（~200px 级）**导致 paint >10s（已并入 #315118 修复钳制），对本项目的 12px 不构成直接威胁；但 **#322045** 证实**中等半径（64px）下「blur 元素 + 内联 SVG 同帧首绘」仍会卡死首帧**——本项目玻璃层与 Lucide 内联 SVG 图标同屏是常态，故除钳制 blur 外：**首帧避免「玻璃 + 大量内联 SVG」同现**（hero 图标延后一帧挂载，或装饰性发光改用 CSS 渐变/mask 替代 blur）
- **头号陷阱**：祖先有 `transform`/`filter`/`will-change`/`contain:paint` → 创建新 backdrop root → **玻璃效果静默消失**。玻璃层不可被"动画 transform 的祖先"包住
- **v2 新增**：**液态 pill 形态同样受上条约束**，且因 `position: fixed` + 不贴底，父级链上任何 transform 会同时破坏固定定位与 backdrop root
- **v2 新增**：**圆角玻璃**在 WebKit 上圆角处可能模糊溢出/锯齿 → `backdrop-filter` 挂在与 pill 同圆角的伪元素层，父级 `border-radius` + `overflow: hidden`
- 降级：`@supports not (backdrop-filter)` → 不透明背景（token 换值即可，与 §5.5「只换 token 不换写法」一致）

**陶土橙加量（v2）**：v1 仅 3 处偏少 → v2 **约 6 处**：①激活 Tab ②两个数据数字 ③进度条 ④chip 标签 ⑤主行动按钮 ⑥（学习页）当前位置/关键强调。仍须满足 D14「克制为主」，加量集中在**入口与关键数据**，不铺满内容区。

### 5.2 动效 —— ⚠️ 需正式反转 `main.css:182-186` 的既有哲学

该处明确写"动效克制…不做路由过渡/stagger/滚动视差"。用户新需求要求反转，需同步改注释与策略。

**分层选型**：

| 层     | 方案                                                       | 依赖                                   |
| ----- | -------------------------------------------------------- | ------------------------------------ |
| 微交互   | Vue `<Transition>`/`<TransitionGroup>` + CSS             | 0 依赖                                 |
| 页面转场  | **View Transitions API**（`document.startViewTransition`） | Chrome111+/Safari18+；不支持则直接切换；<500ms |
| 滚动/手势 | **@vueuse/motion**（<25KB，自动尊重 reduced-motion）            | 轻量；不引 GSAP（25-35KB、命令式）              |

**动效清单**：

- ✅ 值得：Tab 指示器滑动、卡片按压 `scale(.97)`、区块进入 fade+rise（IntersectionObserver 一次）、阅读进度条（已有）、浮层进出、页面转场
- ⚠️ 陷阱：滚动视差（易掉帧，仅少量元素+低端机关闭）、一屏几十个同时动画、**对 backdrop-filter 元素做 transform 动画（破坏玻璃）**、长转场阻塞输入

### 5.3 性能预算与降级（用户已接受分级）

- **只动 `transform`/`opacity`**（compositor-only）；禁动 `width/height/top/left/box-shadow/blur`
- `will-change` 生命周期：进入前加、`animationend` 后移除
- 三层降级：`prefers-reduced-motion`（已有）→ 能力分级（hardwareConcurrency/deviceMemory 或首帧 FPS 采样）→ 低端机仅 opacity 或全关
- 验收：低端安卓真机 + `chrome://inspect` Performance 面板必测

### 5.4 图标迁移（Lucide）

- 迁移点：`blockTypes.js:16-38`（22 个 icon）、`content/index.js:41-45`（SUBJECT_META 📐✍️💻）、各 View 硬编码 emoji
- **契约变更**：`iconOf(type)` 现返回字符串 → 改返回 Lucide name + 新增 `<AppIcon :name>` 组件统一渲染；同步 `tests/block-registry.test.js`

### 5.5 Claude 纸质阅读风 —— 规范要点

纸白 `#f8f8f6`（非纯白）、墨色 `#1a1a1a`（非纯黑）、陶土橙 `#c96442` 极克制点缀、暖灰分隔线、暖可可色阴影；衬线标题（Source Serif 4 自托管，font-src 'self' 限制禁 CDN）单一中等字重 500；正文 16-17px / 行高 1.6-1.7；行宽 65-75ch（**中文 30-40 汉字**，需覆盖 prose 默认度量）；圆角阶梯 6/8/12/16。**现有 main.css token 已大体符合**，本轮是增强而非推翻。
> ⚠️ 口径差异（体检标注）：现有 token 圆角阶梯是 **8/12/16/20/24**（`main.css:92-97`：`--radius-sm/md/`、`--radius/lg/xl`），与本节提议的 **6/8/12/16** 不同 → 这是一次**有意的收敛**（PM 侧提案），实施时须同步改这 5 个 token 并全量回归视觉，不是"增强"而是**改基数**。

---

### 5.6 学习页视觉改进（用户："还需要继续改进"）

> PM 从产品侧给区块级差异化方案（概念/要点/例题/练习/小结 各自形态）；本节是**技术侧补**：可行性、最小改动路径、与 v2 视觉的统一。

#### 5.6.1 玻璃质感迷你顶栏（阅读页）—— 可行性：✅ **已有基础，属改造而非新建**

**现状（已核实）**：`UnitView.vue` 已有移动端迷你顶栏——模板 `UnitView.vue:19-25`（`v-if="showTopbar && page"`，滚动 >200px 后出现，带 `<transition name="topbar">`），样式 `UnitView.vue:574-584` **已经用了 `backdrop-filter: blur(10px)` + `color-mix` 半透明背景**。所以 v2 只需**按新规范改参数**，不需要新建组件。

**职责承载（TabBar 在阅读页隐藏时）**：返回首页（现有 `.topbar-back`，`UnitView.vue:21`）+ 页面标题（`.topbar-title`）+ 阅读进度（`.topbar-progress`）——三者现成，缺的是**目录/书签/笔记**入口（移动端已收进 ContentSidebar 底栏，不重复放顶栏）。

**v2 改造点**：半透明降到 30-42% + 内侧高光边 + 圆角（改为**悬浮胶囊**，与底部 pill 呼应：顶栏也可做成 28px 圆角的悬浮条，`top: calc(var(--space-3) + var(--sat))`）+ 陶土橙用于进度数字。

**`backdrop-filter` 在滚动时的表现与降级（⚠️ 必须实测）**：

| 风险 | 说明 | 处置 |
|---|---|---|
| 滚动时每帧重采样 | iOS WebKit 不缓存模糊结果，滚动时逐帧重跑高斯模糊 → 移动端可能掉帧 | ①blur 钳制 ≤12px ②顶栏不做滚动视差/位移动画 ③低端机（§5.3 能力分级）降级为**不透明背景** |
| 与 View Transitions 叠加 | 转场快照含 blur 层时，合成器负担叠加 | 转场期间给顶栏加 `data-transitioning` 临时关闭 backdrop-filter |
| 首帧「玻璃 + 内联 SVG 图标」 | §5.1 已述 #322045 陷阱：顶栏图标（Lucide 返回箭头）与玻璃同帧首绘可能卡首帧 | 顶栏在滚动 >200px 后才出现 → **天然避开首帧**，风险低于底部 pill；底部 pill 仍需按 §5.1 处理 |
| 祖先 transform 破坏 backdrop root | 顶栏若被 `<transition>` 的 transform 动画包裹（现有 `topbar-enter` 用 `translateY`）→ 玻璃会静默失效 | **动画只作用于子元素/伪层**，或对玻璃层改用 `opacity` 过渡（不用 transform） |

#### 5.6.2 区块差异化 —— 最小改动路径：**CSS 属性选择器（`data-kind`）为主，不引入新容器原语**

**结论**：**不需要**新容器原语，也**不改**渲染链路（`UnitView → BlockRenderer → registry` 完全不动）。分三层递进，按需要取用：

| 层 | 做法 | 改动面 | 适用 |
|---|---|---|---|
| **L1 纯 CSS（推荐先做）** | `UnitView.vue` 的 `.block-anchor`（`UnitView.vue:100-110`）加 `data-kind="<语义类>"`；`src/assets/css/blocks.css` 用 `[data-kind="concept"] h3 { ... }` 之类写差异化（字号/留白/左侧色条/底色/圆角） | 1 个模板属性 + 1 个 CSS 文件；**零 schema、零组件、零存量改动** | 概念/要点/小结 的视觉层次（PM 的「≥2 级视觉层次」） |
| **L2 组件内形态调整** | 各 block 组件内部改模板（如「要点」卡片化、「例题」渐进折叠） | 仅涉及被改的 2-5 个 block 组件 | PM 的「例题渐进 / 练习专注」这类形态差异 |
| **L3 布局原语（方案 A）** | 用 P0 的 layout 原语重排页面 | 需 P0 完成 | 真正不同的**排布**（非样式差异） |

**`data-kind` 映射表放哪**：`type` 有 22 种，PM 的语义类只有 5 类（概念/要点/例题/练习/小结）→ 需在 `src/components/blocks/blockTypes.js` 新增 `kind` 字段（该文件已有 `label`/`icon` 元信息，是唯一真相源），并沿用 `tests/block-registry.test.js` 的守卫模式加测试（与 §5.4 的 `iconOf` 契约变更同批处理，避免两次改同一张表）。

#### 5.6.3 阅读进度条与 v2 统一

**现状**：`UnitView.vue:465-473` —— `.reading-progress` 固定顶部 `height: 3px`；`.reading-progress__bar` 用 `linear-gradient(90deg, var(--primary), var(--accent))`（`--primary` 已是陶土橙 `brand-500`，见 `main.css:76`）。**已基本符合 v2**，只需三点：

1. 与悬浮顶栏**合并承载**：进度条移到顶栏内/紧贴顶栏底部，避免顶部出现两条横线；`z-index` 需高于顶栏玻璃层（现 `.reading-progress` 为 100、`.mobile-topbar` 为 99 → 已正确）
2. 圆角与 token 化：进度条端点圆角 `var(--radius-full)`，颜色走 `--primary → --accent`（已是陶土橙系，属 v2 的 6 处橙之一）
3. 动效统一：进度条宽度过渡**只动 `width` 会触发布局** → 改为 `transform: scaleX()` + `transform-origin: left`（§5.3「只动 transform/opacity」）；`prefers-reduced-motion` 下直接跳变

---

## 6. 需求池（PM 产出，R1-R9）

| ID | 需求              | 优先级   | 验收要点                                                 |
| -- | --------------- | ----- | ---------------------------------------------------- |
| R1 | 底部 Tab Bar 一级导航 | P0    | 4 Tab 触控 ≥44×44；内容页自动隐藏；任意一级页 1 次点击可达其余 3 个          |
| R2 | 路由转场 + 返回手势     | P0    | ≤300ms 转场；边缘右滑返回；reduced-motion 兜底                   |
| R3 | 去 Web 味         | P0    | 删 960px 居中 / 面包屑 / 页脚 nav+版权 / 站点 header；有转场；触控原生反馈  |
| R4 | 页面级布局自由度        | P0    | ≥3 种 layout 模板落真实页面；同数据不同排布；缺省回退 reading             |
| R5 | 内容差异化（三轴）       | P0-P1 | 题型（例题渐进/练习专注/错题对比）、学科（三科调性）、层次节奏（≥2 级视觉层次）           |
| R6 | 动效系统            | P1    | 全站 :active 反馈；视差；手势切题；统一 token；reduced-motion 兜底     |
| R7 | 视觉现代化           | P1    | 字号/圆角/色阶层级提升；对比度 WCAG AA。⚠️ 与 Claude 调性冲突，按"增强不推翻"处理 |
| R8 | 删除编辑器           | P0    | 全仓 grep 无残留；路由不含 /editor；构建通过                        |
| R9 | 加载与首屏感知         | P0    | 骨架屏替代"加载中…"文字；无白屏空帧                                  |

**用户旅程**（PM 产出）：J1 系统性学习闭环（打开→薄弱点→做题→错题→复习→掌握）、J2 碎片续学（打开→继续→换科）。痛点：答错无即时引导、换科后重新找单元、概念页长瀑布无节奏。

---

## 7. 实施路线（每阶段可独立上线，非大爆炸）

| 阶段                | 交付                                                                       | 依赖               | 可独立上线 |
| ----------------- | ------------------------------------------------------------------------ | ---------------- | ----- |
| **P0 内容模型**       | LayoutRenderer + layout 原语 + schema 分支 + 递归校验（含深度上限）+ 注册表 + 测试；**存量零改动** | 无                | ✅ 纯增量 |
| **P1 移动端骨架**      | AppTabBar + 容器查询基础设施 + 断点收敛(600/900/1150/1280) + 安全区规范 + 信息架构统一          | 无（可与 P0 并行）      | ✅     |
| **P2 视觉**         | token 微调 + `<AppIcon>` 统一 + 玻璃层规范 + emoji 清零 + Lucide                    | 无（可并行）           | ✅     |
| **P3 动效**         | 三级递进（CSS → View Transitions → @vueuse/motion），每级独立开关+降级                  | P2（玻璃规范先行）       | ✅ 逐级  |
| **P4 内容差异化**      | 用 P0 能力重排高价值页（导航 hero、重点页定制布局）                                           | P0               | ✅ 逐页  |
| **P5 Android 打包** | 工具链 → tauri android init → 真机验证                                          | Android 工具链（当前缺） | ✅     |
| **P6 练习聚合层**（D11/D12） | 题源索引（区分可判分/需自评）→ 会话 store → 自动组卷 → 会话页+结算页；**强制自评** | P0 + PM 交互稿 | ✅ 独立 |

**顺序要点**：P0/P1/P2 互不依赖可并行；P3 依赖 P2；P4 依赖 P0；P6 依赖 P0 与 PM 交互稿；P5 依赖 P1-P3 与工具链；全程不阻断存量。

---

## 8. 诚实评估（架构师，基于 139 个数据页的区块类型覆盖度统计）

> ⚠️ 下列页数是 **grep 粗计**（按每个类型出现在多少个文件里统计，非精确区块实例数），**仅用于定性判断量级**，不要当作精确指标引用。

| 页面类型             | 手机端      | 缓解                                 |
| ---------------- | -------- | ---------------------------------- |
| 纯阅读型（约 1/3）      | ✅ 两端 90+ | 单列窄栏正是阅读最佳形态                       |
| 含思维导图（96 页 ≈65%） | ⚠️ 80-88 | 纵向 flowchart 变体 / 触摸平移+双指缩放 / 全屏入口 |
| 含宽表（73 页 ≈50%）   | ⚠️ 80-88 | 横向滚动 + 首列 sticky（card 化会改变语义，不推荐）  |
| 含几何画板（14 页）      | ⚠️ 75-85 | 全屏化                                |
| 模拟卷（4 页）         | 🟡 82-88 | 可用                                 |
| 多栏/对照（<2%）       | ✅ 影响极小   | 降级单列                               |

**没有任何页面需要两套代码**——差异全部收敛为"布局变体 + token + 结构性重排（仅 3 处）"。  
**约束**：内容重页（导图/表）的"丰富感"必须让位于可读性。

---

## 9. 核心设计图

### 9.1 classDiagram —— 内容模型（方案 A）与渲染/校验/导航分层

```mermaid
classDiagram
    direction TB

    %% ===== 数据层：纯数据 ESM，零 import，139 个数据页零改动 =====
    class ContentPage {
        +blocks : BlockOrLayout[]
    }
    class BlockOrLayout {
        <<interface>>
        +type : string
        +title : string
    }
    class LayoutBlock {
        +type = 'layout'
        +as : LayoutKind
        +props : LayoutProps
        +children : BlockOrLayout[]
    }
    class LayoutKind {
        <<enumeration>>
        grid
        stack
        split
        hero
        bleed
        rail
    }
    class ContentBlock {
        <<interface>>
        +type : BlockType
    }
    class BlockType {
        <<enumeration>>
        knowledge
        formula
        quiz
        exam
        ...共22种
    }

    ContentPage o-- BlockOrLayout : 有序 blocks
    BlockOrLayout <|-- LayoutBlock
    BlockOrLayout <|-- ContentBlock
    LayoutBlock o-- BlockOrLayout : children 递归_深度上限
    LayoutBlock ..> LayoutKind
    ContentBlock ..> BlockType

    %% ===== 加载链路：既有机制，方案 A 不改 =====
    class SiteConfig {
        +subject : string
        +units : Unit[]
    }
    class PageMeta {
        +id : string
        +unitNum : string
        +subject : string
        +title : string
        +folder : string
        +name : string
        +fileIndex : number
    }
    class ContentLoader {
        <<src/content/loadPage.js>>
        +importPageModule(subject, folder, name)
        +loadPage(subject, unitNum, fileIndex)
    }
    class PageMetaResolver {
        <<src/content/pageMeta.js>>
        +resolvePageMeta(site, unitNum, fileIndex)
        +hydratePage(mod, meta)
    }

    ContentLoader ..> PageMetaResolver : 共用推导规则
    ContentLoader ..> SiteConfig : getSubjectConfig
    PageMetaResolver --> ContentPage : 输出 对象展开meta 加 blocks

    %% ===== 渲染层 =====
    class UnitView {
        <<src/views/UnitView.vue>>
        +loadPage()
        +toc
        +pageContext
    }
    class BlockRenderer {
        <<src/components/BlockRenderer.vue>>
        +block
        +context
    }
    class LayoutRenderer {
        <<新增 src/components/LayoutRenderer.vue>>
        +按 as 渲染容器
        +children 经 slot 回递归
    }
    class BlockRegistry {
        <<src/components/blocks/registry.js>>
        +componentOf(type)
        +BLOCK_REGISTRY
    }
    class BlockComponents {
        <<src/components/blocks/*.vue 共22种>>
    }

    UnitView --> ContentLoader : loadPage()
    UnitView --> BlockRenderer : page.blocks 逐块分发
    BlockRenderer --> LayoutRenderer : type为layout时走新分支
    BlockRenderer --> BlockRegistry : componentOf(type)
    BlockRegistry --> BlockComponents : diagram_exam_desmos 走 asyncBlock 懒加载
    LayoutRenderer --> BlockRenderer : children 递归_slot注入_避免循环依赖

    %% ===== 校验层：浏览器与 Node 共用同一份规则 =====
    class ContentSchema {
        <<schema/content-schema.json>>
    }
    class BlockValidator {
        <<src/utils/validateBlock.js>>
        +createBlockValidator(schema, opts)
        +layout 递归校验_深度上限_新增
    }
    class ValidateContent {
        <<scripts/validate-content.mjs>>
        +CI 门禁
    }

    BlockValidator ..> ContentSchema : 类型白名单派生
    BlockValidator --> LayoutBlock : 递归校验_新增
    ValidateContent --> BlockValidator : Node 侧注入 schema

    %% ===== 导航层 =====
    class AppTabBar {
        <<新增 src/components/AppTabBar.vue>>
        +activeTab : route.meta.tab
        +goLastStudy()
    }
    class AppRouter {
        <<src/router/index.js>>
        +meta.tab
        +meta.tabOrder
    }

    AppTabBar --> AppRouter : push 与 meta.tab 高亮
    AppRouter --> UnitView : 详情页路由_无tab_meta_隐藏TabBar
```

**关系要点**：`LayoutBlock` 与 `ContentBlock` 共用 `type` 单键（不引 `kind`）；`LayoutRenderer ↔ BlockRenderer` 经 slot 互递归（沿用 `ColumnsBlock/GroupBlock` 既有模式，双方都不得 import 对方，由 BlockRenderer 内部分发）；校验器递归复用 `columns/group` 既有骨架并加**深度上限**。

### 9.2 sequenceDiagram ① 内容页加载与渲染链路（含 layout 分发）

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户
    participant R as Router_hash模式
    participant UV as UnitView
    participant LP as loadPage.js
    participant IM as import_@content...
    participant BR as BlockRenderer
    participant LR as LayoutRenderer
    participant REG as registry.js
    participant BC as blocks 组件

    U->>R: 打开 /study/:subject/:unitNum/:fileIndex
    R->>UV: 路由匹配（详情页 meta 无 tab → AppTabBar 隐藏）
    Note over R: 路由守卫内 warmKatex() 幂等预热，不 await
    UV->>LP: loadPage(subject, unitNum, fileIndex)
    LP->>LP: resolvePageMeta(siteConfig, unitNum, fileIndex) → meta
    LP->>IM: import(`@/content/${subject}/${folder}/${name}.js`)
    Note over IM: 字面量前缀 → 每页独立懒加载 chunk（139 页分包，硬约束）
    IM-->>LP: 页面模块 default { blocks }
    LP-->>UV: hydratePage(mod, meta) → { ...meta, blocks }
    UV->>UV: markPageVisited / progress.refresh / saveLastStudy
    loop 逐区块
        UV->>BR: BlockRenderer(block, context)
        alt block.type === 'layout'
            BR->>LR: 分发到 LayoutRenderer
            LR->>BR: 按 as 渲染容器，children 经 slot 回调 BlockRenderer（递归）
        else 已知区块类型
            BR->>REG: componentOf(type)
            REG-->>BR: 组件（diagram/exam/desmos 为 asyncBlock 懒加载）
            BR->>BC: 挂载渲染
        else 未知类型
            BR->>BR: 渲染「未知区块类型」显式降级提示
        end
    end
```

### 9.3 sequenceDiagram ② TabBar 高亮与详情页互斥

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户
    participant TB as AppTabBar
    participant R as Router
    participant TV as 顶层Tab视图
    participant UV as UnitView_详情页
    participant CS as ContentSidebar

    U->>TB: 点击一级 Tab（如 复习）
    TB->>R: router.push('/error-book')
    R-->>TB: route.meta.tab = 'review'
    TB->>TB: activeTab = meta.tab 高亮（按 meta 匹配，非 path.startsWith）
    R->>TV: 渲染顶层视图（meta 含 tab → 显示 TabBar）

    U->>TV: 继续学习 / 单元下钻（读 last_study 直达）
    TV->>R: push('/study/:subject/:unitNum/:fileIndex')
    R-->>TB: route.meta.tab = undefined（详情页）
    TB->>TB: 隐藏自身（与 ContentSidebar 底栏互斥，不可同屏）
    R->>UV: 渲染 UnitView
    UV->>CS: 显示移动端底部操作栏 + 答题卡抽屉

    U->>CS: 返回（底栏 / 迷你顶栏 / 浏览器返回）
    UV->>R: router.back()
    R-->>TB: route.meta.tab 恢复 → TabBar 重新显示并高亮来源 Tab
```

---

## 10. 细粒度任务分解（P0-P6，文件路径级）

> 规则：任务按功能分组（非单文件拆分）；每阶段验收项含 **§1.5 耦合检查**；所有新增代码遵守中文注释规范。

### P0 内容模型（方案 A 地基）—— 存量零改动，可独立上线

| 任务 | 内容与文件 | 依赖 | 可并行 |
|---|---|---|---|
| P0-T1 schema + 校验 | `schema/content-schema.json`（加 `layout` allOf 分支 + `LayoutKind/LayoutProps` definitions）；`src/utils/validateBlock.js`（layout 分支：递归校验 children + `as`/`props` 白名单 + **深度上限**） | 无 | — |
| P0-T2 渲染分发 | 新增 `src/components/LayoutRenderer.vue`；改 `src/components/BlockRenderer.vue`（layout 分支）；改 `src/components/blocks/registry.js`（layout→LayoutRenderer 绑定） | P0-T1 | — |
| P0-T3 布局原语族 | 新增 `src/components/layouts/`（GridLayout / StackLayout / SplitLayout / HeroLayout / BleedLayout / RailLayout）+ `src/assets/css/layouts.css`（容器查询驱动降级） | P0-T2（联调）；组件编写可与 T2 并行 | ✅ 与 T4 |
| P0-T4 类型与守卫 | 同步 `src/types/content.d.ts`；扩展 `tests/block-registry.test.js`；新增 `tests/validate-layout.test.js`（含深度上限用例） | P0-T1、T2 | ✅ 与 T3 |

### P1 移动端骨架（自适应优先）—— 可独立上线

| 任务 | 内容与文件 | 依赖 | 可并行 |
|---|---|---|---|
| P1-T1 token 与断点收敛 | `src/assets/css/main.css`（`--bp-sm/md/lg/xl`、容器查询基础设施 + `@supports` 兜底、密度 token 移动端覆盖） | 无 | ✅ 与 P0 并行 |
| P1-T2 TabBar + 路由 | 新增 `src/components/AppTabBar.vue`（玻璃底 + 中间凸起直达 + meta.tab 高亮）；改 `src/router/index.js`（meta.tab/tabOrder、`/practice` 占位路由）；改 `src/App.vue`（挂载 TabBar、顶部 header 收敛） | P1-T1；入口清单已定（D3） | — |
| P1-T3 结构性重排 | `src/components/ContentSidebar.vue`（与 TabBar 互斥协调）；`src/views/UnitView.vue`（详情页隐藏 TabBar）；`src/views/HomeView.vue`（学习 Tab 改造：去 960px 居中 / 面包屑 / 页脚 nav） | P1-T2 | — |
| P1-T4 容器查询迁移 | `src/components/blocks/ColumnsBlock.vue`、`src/components/blocks/CompareBlock.vue`（媒体查询 → 容器查询） | P1-T1 | ✅ 与 T2/T3 |
| P1-T5 CSP 护栏（防复发，见 §13） | 新增 `tests/csp-guard.test.js`（L1-L4）+ `tests/helpers/csp-lock.js`（L5 `withCspLocked`）；零新依赖（`node:fs` + vitest + 自写 CSP 解析器） | 无 | ✅ 全程可并行 |

### P2 视觉 —— 可独立上线

| 任务 | 内容与文件 | 依赖 | 可并行 |
|---|---|---|---|
| P2-T1 AppIcon + 图标数据 | 新增 `src/components/AppIcon.vue`；改 `src/components/blocks/blockTypes.js`（icon → Lucide name）；改 `src/content/index.js`（SUBJECT_META）；同步 `tests/block-registry.test.js` | 无 | ✅ 与 P0/P1 并行 |
| P2-T2 emoji 清零 | `src/App.vue`、`src/views/*.vue`（Home/Dashboard/ErrorBook/Login/Profile/Admin/Unit）、`src/components/blocks/asyncBlock.js`（加载文案）、`src/components/BlockRenderer.vue` | P2-T1 | — |
| P2-T3 玻璃层与阅读风（**v2 参数**） | `src/assets/css/main.css`（token 化 `--glass-bg/hl/shadow` + `.glass`/`.glass-pill` + `@supports` 降级 + blur 钳制 ≤12px）；`src/components/AppTabBar.vue`（液态 pill 玻璃底）；`src/views/HomeView.vue`（hero 玻璃+渐变，导航页渐变**保持克制** per D14）。⚠️ 遵守 §5.1 首帧「玻璃+内联SVG」规避与圆角伪层做法 | P2-T1、P1-T1 | — |
| P2-T5 陶土橙加量 + 署名块（D13/D14） | `src/assets/css/main.css`（橙色落点收敛到 ~6 处：激活 Tab / 数据数字 / 进度条 / chip / 主行动 / 学习页强调）；`src/views/ProfileView.vue`（**唯一保留**的署名块，墨色小字）；删除其余页脚署名卡（HomeView/DashboardView 等） | P2-T1 | ✅ 与 T4 |
| P2-T4 删除编辑器（R8，**无依赖可随时先行**） | 删除 `src/views/editor/`（EditorView.vue / BlockForm.vue / schemaForm.js）、`src/utils/contentWrite.js`、`src/utils/contentSchema.js`、`scripts/vite-plugin-content-write.mjs`、测试 `tests/block-form.test.js` / `tests/editor-schema-form.test.js` / `tests/content-write.test.js`；改 `src/router/index.js`（删 /editor）、`src/views/HomeView.vue`（删编辑器入口卡）。⚠️ **保留** `src/content/serializePage.js`（迁移脚本仍用）与 `src/utils/validateBlock.js`（CI 仍用） | 无 | ✅ 全程可并行 |

### P3 动效（三级递进，每级独立开关+降级）

| 任务 | 内容与文件 | 依赖 | 可并行 |
|---|---|---|---|
| P3-T1 微交互层 | `src/assets/css/main.css`（扩 `--dur-*/--ease-*`、:active 反馈、反转 §5.2 所述「克制」注释）；`src/components/AppTabBar.vue`（指示器滑动）；卡片按压 scale | P2-T3 | — |
| P3-T2 页面转场层 | 新增 `src/utils/viewTransition.js`（`document.startViewTransition` 封装 + 降级）；改 `src/App.vue`（router-view 转场接线）；改 `src/router/index.js` | P3-T1 | — |
| P3-T3 滚动/手势 + 能力分级 | 新增 `src/composables/useMotionPrefs.js`（reduced-motion + hardwareConcurrency/deviceMemory 分级）；改 `src/views/UnitView.vue`（区块进入动效）；`package.json` 引入 `@vueuse/motion`。⚠️ R2 边缘右滑返回：Tauri Android WebView 手势能力**待验证**，标注风险 | P3-T1 | ✅ 与 T2 |

### P4 内容差异化（依赖 P0）

| 任务 | 内容与文件 | 依赖 |
|---|---|---|
| P4-T1 layout 落地 ≥3 页 | `src/content/` 高价值页改用 layout 原语（导航 hero、重点页定制布局）；schema 不变 | P0 |
| P4-T2 三轴差异化 + 骨架屏（R9） | 新增 `src/components/SkeletonBlock.vue`；改 `src/views/UnitView.vue`（加载骨架）；区块 tone/variant 扩展（schema + 对应 block 组件） | P0、P2 |
| P4-T3 区块差异化（data-kind，见 §5.6.2） | 改 `src/views/UnitView.vue`（`.block-anchor` 加 `data-kind`）；改 `src/components/blocks/blockTypes.js`（新增 `kind` 字段：概念/要点/例题/练习/小结 五类映射）；改 `src/assets/css/blocks.css`（`[data-kind=...]` 差异化）；扩展 `tests/block-registry.test.js` 守卫 | P0-T1（建议与 `iconOf` 契约变更同批，避免两次改同一张表） |
| P4-T4 学习页迷你顶栏 v2（见 §5.6.1） | 改 `src/views/UnitView.vue`（顶栏改悬浮胶囊 + v2 玻璃参数 + 进度条 `scaleX` 改造）；改 `src/assets/css/main.css` | P2-T3 |

### P5 Android 打包（依赖 P1-P3 + 工具链）

| 任务 | 内容 | 依赖 |
|---|---|---|
| P5-T1 工具链 | Android Studio + SDK + NDK + JDK 17；`ANDROID_HOME`/`NDK_HOME`；`rustup target add aarch64-linux-android`（环境，非代码） | — |
| P5-T2 init 与配置 | `npm run tauri:android:init`（生成 `src-tauri/gen/android`，**纳入版本控制**）；`src-tauri/tauri.conf.json`（`bundle.android.minSdkVersion` 等）；keystore 签名 | P5-T1、P1-P3 |
| P5-T3 真机验证 | 真机冒烟 + `chrome://inspect` Performance（§5.3 预算）+ CSP violation 扫描 + §8 妥协项（导图/表/画板）逐项确认 | P5-T2 |

### P6 练习聚合层（D11 强制自评 + D12 自动组卷）—— 新增阶段，依赖 PM 交互稿

| 任务 | 内容与文件 | 依赖 |
|---|---|---|
| P6-T1 题源提取与索引 | 新增 `scripts/build-practice-index.mjs`（复用 `scripts/build-search-index.mjs` 的 blocks 遍历模式：聚合 quiz/exam 的 `items`，按 学科/单元/难度 建索引）。⚠️ 仅 **286/1393（20.5%）** 有 `options`+`correctIndex` 可机器判分，其余只有自由文本答案 → **索引必须区分「可判分 / 需自评」两类** | P0（blocks 结构稳定后） |
| P6-T2 做题会话 store | 新增 `src/stores/practice.js`（Pinia：会话队列、当前题、作答/自评状态）；自评结果写入既有 `studyDb` 的 `error_book`（**D11：自评是错题入库唯一触发器**） | P6-T1 |
| P6-T3 自动组卷（D12） | 新增组卷器（按 难度/单元 从 P6-T1 索引抽题，支持「真题卷」与「自动组卷」两种来源）；复用 `ExamBlock` 的计时/计分语义 | P6-T1、P6-T2 |
| P6-T4 会话页 + 结算页 UI | 新增 `src/views/practice/`（会话页全屏、结算页）；`src/router/index.js`（`/practice` 由占位转正）。**强制自评**：看答案后必须选「我会了/我还不会」才允许下一题（不可跳过） | P6-T2、P6-T3；**PM 交互稿** |

---

## 11. 待确认 / 遗留

1. ~~Tab 划分~~ ✅ 已定（学习/练习/复习/我的）
2. ~~布局自由度含义~~ ✅ 已定（方案 A 排布自由度）
3. ~~动效降级~~ ✅ 已定（分级）
4. ~~手机平台~~ ✅ 已定（Android only）
5. ⬜ **"练习"Tab 的刷题聚合层是全新功能**——**D11（强制自评）/ D12（自动组卷）已拍板**（架构师已实测复核基础数据：1393 题 / 286 可判分 / exam 仅 4 套），仍**缺 PM 的做题会话与结算页交互稿**，是 P6 的前置
6. ⬜ R7 视觉现代化的边界：在 Claude 调性上"增强"的具体设计稿
7. ~~架构师复核本文档~~ ✅ **v1.1 已完成（2026-10-07）**：复核结论「无失真」；更正第 8 条 geogebra 事实错误；精化 §5.1 引用；补 §2 `/practice` 路由；补全 §9 / §10
8. ✅ **GeoGebra 演练场已拍板下线（D10，2026-10-07）**：移除 desmos 区块实例（`03-二次函数.js` 全站唯一）、`DesmosBlock.vue` + `GeoGebraPlayground.vue` 组件、registry/schema/blockTypes 注册、HomeView/UnitView 入口；随后 `git rm -r public/vendor/geogebra`（48MB，**保留 `scripts/fetch-geogebra.mjs` 与 `npm run geogebra` 脚本**供将来重拉）；`stash@{0}` 重写方案保留（P4 用 layout 原语重做）；`lib.rs` 两条 warning
9. ⬜ PM 的 PRD 文件**未落盘到仓库**（`docs/` 下无 PRD 文件）——本复核基于 §6 已收录的 R1-R9 与用户旅程做遗漏检查。建议 PM 将 PRD 落盘（如 `docs/prd-mobile.md`）以便追溯
10. ⬜ 可选第 5 Tab「数据」：**架构师建议不设**（D3 已定 4 Tab；Dashboard 数据洞察已并入「我的」）。若后续要加，架构零阻碍——路由 meta 加一项 + `AppTabBar` 数组加一项（约 0.5 天），无需改容器
11. ⬜ 「练习」聚合层：**已升级为 P6 阶段**（见 §10），**估 1-2 周**，含 P6-T1~T4（题源索引 / 会话 store / 自动组卷 / 会话页+结算页）。⚠️ 关键约束：**索引必须区分「可判分（286 题）」与「需自评（1107 题）」两类**，因为 79.5% 无 `options`+`correctIndex`。**前置**：PM 交互稿。风险：题目去重、exam 计分语义复用
12. ⬜ `tests/jsxgraph-eval-guard.test.js`（QA 复核中）：与 P0-P6 **无耦合**，不影响本设计实施
13. ⬜ `docs/csp-guard-plan.md`（411 行）：**架构师结论 = 保留不删**，并入本文档 §13（L1-L5 仍有效，D10 下线后 L4 归零）；已失效段落（演练场相关）列出待更新项；落地任务见 **P1-T5**。最终归档/更新由 team-lead 决定（**未删文件**）
14. ⬜ v2 风格参数**尚未真机验证**：玻璃 30-42% 不透明度、液态 pill 的 `backdrop-filter` 在滚动时的表现、圆角玻璃在 WebKit 的锯齿——三项均列为 **P5-T3 真机验证必测项**（低端安卓机优先）
15. ⬜ 学习页「区块差异化」的**语义映射表**（22 个 `type` → 5 类 `kind`）需 PM 与架构师共同定稿；技术侧已给最小改动路径（§5.6.2 的 `data-kind`），不阻塞 P0-P2

---

## 12. 正确性体检记录（2026-10-07，架构师）

用户要求「细致、逻辑清晰、**不出错**」→ 对文档内全部数字/行号/API 名逐条复核。

### 12.1 已修正的错误

| # | 原表述 | 复核结果 | 处置 |
|---|---|---|---|
| 1 | 内容页 **147 页**（§3 ×2、§8 标题） | ❌ 错。`src/content/**/*.js` 共 147 个 .js，其中**数据页 139 个**（另 3 个 `site.js` + 5 个根级基建文件） | ✅ 全文档统一改为 **139 个数据页**，并在 §3 加口径说明；§9.2 的「139 页分包」本来就是对的 |
| 2 | `--bp-xl 1280px ← 1024 归并`（§4.3） | ❌ 逻辑错。1024（`ColumnsBlock.vue:65`）与 768（`CompareBlock.vue:98`）是**区块级**宽度判断，按 §4.2 应迁容器查询，不应并入全局断点 | ✅ 改为「xl 为新增档，现有代码无对应」并加修正说明 |

### 12.2 复核通过（表述准确，无需改）

| 条目 | 文档表述 | 复核证据 |
|---|---|---|
| **D11 题目数** | 1393 题 / 286 题可判分 / 20.5% | ✅ 实测完全一致：`grep -o 'question' ` = **1393**，`correctIndex` = **286**（286÷1393 = 20.53%） |
| **D12 真题卷** | exam 仅 4 套 | ✅ 实测 4 个文件：`math/12-模拟冲刺/02、03`、`chinese/06-模拟冲刺/02`、`computer/05-模拟冲刺/02` |
| **§5.1 WebKit bug** | #316769 = ~200px 级 stdDeviation、paint >10s、已并入 #315118；#322045 = 64px blur + 内联 SVG 同帧首绘卡死 | ✅ 表述准确（bugs.webkit.org 原文：#316769 reported 2026-06-10，dup 到 #315118，修复为「钳制 blur stdDeviation」；#322045 实测 `blur(64px)` + 内联 SVG 首绘卡顿 10s） |
| **§4.2 容器查询** | Android WebView 105+ / Safari iOS 16+ / WKWebView macOS 13+；避开 `cqw/cqh` 与 style queries | ✅ 准确（Baseline 2023；`container` 属性 Chrome105/Safari16/Firefox110/WebView Android105/WebView iOS16；style queries Safari **18** 才支持） |
| **§4.3 断点** | 600 / 900 / 1150 与代码对应 | ✅ 逐条核对：`main.css:298`=600、`App.vue:152`=600、`HomeView:483`=600、`Dashboard:299`=600、`ErrorBook:363`=600、`GeoGebra:341`=600、`ExampleBlock:104`=600、`QuizBlock:198`=600、`ExamBlock:585`=600、`UnitView:664`=600（共 10 处）；`ErrorFocusBlock:75`=640、`CompareBlock:98`=768、`ColumnsBlock:65`=1024、`ContentSidebar:480`=1150、`UnitView:568/758`=1150、`UnitView:559`=1151-1456 |
| **§5.2 View Transitions** | `document.startViewTransition`；Chrome111+/Safari18+；不支持则直接切换 | ✅ 准确（同文档过渡 2025-10 Baseline；Safari 18.0+；渐进增强用法即 `if (document.startViewTransition)`） |
| **§3 行号** | `schema/content-schema.json:27`（22 类型枚举）、`validateBlock.js:70`（未知类型报错）、`ColumnsBlock.vue:13-15` / `GroupBlock.vue:22-24`（slot 递归）、`validateBlock.js:154-177`（递归校验） | ✅ 全部核对一致 |
| **§4.5 / §4.6 行号** | `main.css:252-258`（安全区变量）、`index.html:6`（viewport-fit=cover）、`lib.rs:5`（mobile_entry_point） | ✅ 一致 |
| **§5.2 / §5.4 / §1.5 行号** | `main.css:182-186`（动效哲学注释）、`blockTypes.js:16-38`（22 个 icon）、`content/index.js:41-45`（SUBJECT_META）、`UnitView.vue:144`（番茄钟） | ✅ 一致 |
| **§5.6 新增引用** | `UnitView.vue:19-25`（迷你顶栏模板）、`:574-584`（含 `backdrop-filter`）、`:465-473`（进度条）、`main.css:92-97`（圆角 token） | ✅ 一致（本节为本次新增，逐条比对源文件后写入） |

### 12.3 需读者注意的口径差异（非错误，但易误读）

- **§8 页数是 grep 粗计**（按"该类型出现在多少个文件里"统计，非区块实例数），已在 §8 顶部加警示，**不得作为精确指标引用**
- **§5.5 圆角阶梯 6/8/12/16** 与**现有 token 8/12/16/20/24**（`main.css:92-97`）不同 → 属**有意改基数**，已在 §5.5 标注，实施须全量回归视觉
- **§1 D9 的 "24.8k star"** 来自工程师库调研（外部数据，随 star 数变化），非架构师实测项

---

## 13. `docs/csp-guard-plan.md`（411 行）处置结论

### 结论：**保留（不删），并入本文档作为系统级防复发策略；新增 P1-T5 任务落地**

**保留的三条理由**：

1. **它防的失败类与本轮大改造正交**。该方案防的是「dev 能跑、prod 被 CSP 拦」（本仓库已发生 3 次：`GeometryBlock` 的 `new Function`、GeoGebra CDN 回退、以及将来再抄这两种模式）。大改造只改 UI/内容模型，不解决这类问题。
2. **它是唯一把「用户的 CSP 决策」固化成机器不变量的文档**。L1 直接把「`script-src` 不得含 `unsafe-eval`/`unsafe-inline`/`blob:`/`data:`」写成断言；L2 的核心是「dev 相对 prod 多出的每一项授权必须显式登记理由」——这正是 §1 CSP 硬约束的**可执行版本**。
3. **D10（GeoGebra 下线）反而让它更干净**：L4 原先唯一的违规项（`www.geogebra.org` CDN 回退）随下线消失，护栏首轮即可通过。

**与 QA 复核中的 `tests/jsxgraph-eval-guard.test.js` 的关系（不重复，但需对齐）**：前者是**仓库级 + 配置级**（扫 `src/` 全部源码 + 比对 `csp` 与 `devCsp`），后者是**单库级**（jsxgraph 是否走 eval）。互补；建议经 team-lead 中转与 QA 确认分工，避免 L3/L5 重复实现。

### 该文件已过时的部分（因演练场方案回退，需更新，**不删文件**）

| 段落 | 问题 | 处置 |
|---|---|---|
| 对 `functionExpr.js` / `functionPlot.js` / `tests/function-expr.test.js` 的引用（含 §2 分工表、§3.2 helper 示例） | 这些文件已随回退**不存在** | L5 helper 示例改为面向现有 `src/geometry/boards/*.js`（20 个画板），并与任务 #20（固化画板禁用 eval 的守卫测试）合并落地 |
| 实例②「`GeoGebraPlayground.vue:65` 官方 CDN 回退」 | 因 **D10 下线**而不再存在 | L4 首轮预期结果改写为「0 违规」 |
| §4.2「`dist/` 与 `.app` 由回退前源码产出」 | 重新构建后失效 | 重新构建后删除该节 |

**落地建议**：以**本节的更新版为准**，`docs/csp-guard-plan.md` 保留作设计依据（其 L1-L5 设计与测试骨架仍有效）；待 P1-T5 落地后，再由 team-lead 决定是归档还是就地更新失效段落。**我没有删除该文件**（仅评估）。

---

*v1 整理：team-lead（齐活林），2026-10-06。来源：PM PRD（许清楚）、架构师方案（高见远）、工程师库调研（寇豆码-2）、用户决策。*
*v1.1 复核补全：架构师（高见远），2026-10-07 —— 复核忠实性、更正 geogebra 事实、补 §9 classDiagram/sequenceDiagram、§10 任务分解、§11 新增 9-12。*
*v1.2 并入新决策与体检：架构师（高见远），2026-10-07 —— 并入 D11-D14 与 v2 风格（§5.1/§4.1）、新增 §5.6 学习页改进、§12 正确性体检（修正 147→139 等 2 处错误）、§13 CSP 护栏处置结论、§10 新增 P1-T5/P2-T5/P4-T3/P4-T4/P6。*
