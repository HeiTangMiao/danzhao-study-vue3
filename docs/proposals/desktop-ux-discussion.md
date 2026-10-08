# 学习页（UnitView 桌面模式）五问题 UX 改进讨论方案

> 状态：讨论稿（未写代码）。基于对当前代码的只读核查，标注「已验证」的事实均可直接引用。
> 纪律：移动端（≤1150）既有交互（页脚功能条、手势翻页、抽屉）为既定设计，本方案默认不动。

---

## 方案一：顶栏/页脚全宽 + 侧栏夹层

### 现状（已验证）
- `reader.css` 尾部 L309-332 存在两段避让规则：
  - `@media (min-width:1150px)`：`.reader-topbar / .reader-footer { right: calc(var(--sb-rail-w, 236px) + 24px) }`
  - `body.sb-collapsed` 时收窄为 `right: 68px`（mini 列 44 + 右缝 12 + 间隙 12）
- 侧栏 `.content-sidebar`：`top: calc(var(--tabbar-h) + var(--sat) + var(--reader-topbar-h) + 8px)` ≈ 108px（桌面 sat=0），已在顶栏（y 56–100）下方 ✓；`bottom: 12px`，与页脚（高度 = 52 + max(sab, 24px 手势区) ≈ 76px）垂直重叠约 64px——这是当初避让的起因。
- 收起态 `.sidebar-mini`：`position:fixed; top:116px; right:12px; width:44px`，高度约 200px，不与顶栏/页脚冲突。

### 推荐方案
1. **删除 reader.css 尾部两段避让规则**（L309-332 整段，含注释），顶栏/页脚恢复 `right:0` 全宽。
2. 侧栏 top 保持 108 不动（本来就是「侧栏避顶栏」的正确方向）。
3. 侧栏 `bottom: 12px` **保持不动**——前提是方案四（桌面页脚移除）同批实施，页脚没了就无重叠。
4. `body.sb-collapsed` 的 watch 同步逻辑（ContentSidebar L244-245）只被避让规则消费，规则删除后可顺手移除（低耦合清理，注释说明为什么）。

### 备选方案
- 保留页脚 + 侧栏上收：`bottom: calc(max(var(--sab), var(--sys-gesture-bottom)) + var(--reader-footer-h) + 12px)`。仅在用户否决方案四时启用。

### 影响面与风险
- ⚠️ **方案一必须与方案四绑定实施**：若只删避让而保留桌面页脚，全宽玻璃页脚会横穿侧栏底部 64px，比现状更难看。
- 顶栏全宽后与侧栏无几何重叠（顶栏 y<100，侧栏 y≥108），无 z 层调整需要；玻璃条 `@supports` 降级、过渡均不受影响。
- mini 悬浮组核查结论：**无需改动**（几何上不与功能条冲突；`top:116px` 硬编码与展开态 108 的 8px 差异无视觉后果，两者不同屏）。

---

## 方案二：收藏状态反馈

### 现状（已验证）
- `useBookmarks.js` 已有响应式 `isBookmarked`，`toggleBookmark()` 本地同步翻转状态。
- `UnitView` 已把 `bookmark.isBookmarked.value` 传给 `ReaderTopbar`（移动端 `rt-act.on` 高亮），但桌面 `.rt-actions { display:none }`（≥1151px）——**桌面唯一收藏入口是侧栏 sb-act，完全无状态反馈**，即用户抱怨点。
- `AppIcon` 渲染 `fill="none"`（presentation attribute），CSS `fill: currentColor` 可覆盖实现「实心星」。
- mini 列 `.mini-item.on { color: var(--success) }` 样式已存在但没有任何按钮在用它。

### 推荐方案
1. `ContentSidebar` 新增 prop `bookmarked: Boolean`，`UnitView` 传同一 `bookmark.isBookmarked.value`。
2. sb-act 收藏按钮：`:class="{ marked: bookmarked }"`；已收藏态 = 文案「已收藏」+ 星形实心（CSS `.sb-act.marked :deep(.app-icon) { fill: currentColor }`）+ 颜色 `--primary`。
   - 颜色选 `--primary` 而非复用现有 `.sb-act.on`（success 绿）：success 绿在本组件语境 = 完成/掌握语义，收藏复用会混淆；且与顶栏移动端 `rt-act.on`（primary）一致。
3. mini 列收藏按钮同步接 `:class="{ on: bookmarked }"`（复用已有 `.mini-item.on` 样式 + 同款 fill CSS），收起态也有反馈。

### 备选方案
- 点击后 toast「已收藏」：瞬时反馈、无持久状态展示，成本更高且不解决「不知道当前是否已收藏」，不推荐为主案。

### 影响面
- 纯展示层接线，数据层零改动；状态翻转是本地同步的（`toggleBookmark` 内 `isBookmarked.value = ...`），点击即生效无延迟。

---

## 方案三：「已完成/学习中」徽章处置

### 现状（已验证）
- `sb-status` 由 `isDone` 驱动；`isDone = progress.isCompleted(...)`，而「完成」语义 = **访问即完成**（测验页 = 交卷）——内容页桌面几乎恒为「已完成」，无信息量。
- 侧栏内部已有 `unit` + `fileIndex`，可自行算出 `unit.files[fileIndex].isTest`（答题卡网格就在用 `f.isTest`），**无需新增 prop**。

### 推荐方案：改造为「测验页专用」徽章
- 仅当当前页 `isTest` 时渲染：未交卷 →「待作答」（warning 色）；已交卷 →「已交卷」（success 色，复用现有 `.sb-status.on`）。
- 内容页不渲染徽章（原位置直接省略，快捷区更紧凑）。
- 理由：a) 零数据层改动、成本极低；b) 徽章只在有真实含义（交卷与否）时出现，信息密度↑；c) 对测验页兼做「未交卷」提醒，是删除方案丢掉的价值。

### 备选方案
- A. 直接删除桌面徽章（最省，但测验页提醒一并丢失）。
- B. 改为「本页 X/Y 块已浏览」：需要新增 block 级浏览埋点（IntersectionObserver 追踪），成本高、且与页顶已有的桌面阅读进度条信息重复，**不建议**。
- 移动端抽屉头徽章：非抱怨对象，默认不动（改造逻辑如共用，用桌面 media query 作用域隔离）。

---

## 方案四：桌面页脚移除 + 标记已掌握入侧栏 + 翻页替代

### 4a. 桌面隐藏页脚的方式
- **推荐：纯 CSS**——`reader.css` 加 `@media (min-width:1150px) { .reader-footer { display: none } }`。
- 理由：断点单来源（与侧栏隐藏同文件）；`UnitView` 的 `padding-bottom` 让位规则本就只在 ≤1150 生效（reader.css L301），桌面无需补偿；番茄钟 fab 的页脚避让也只在 ≤1150。移动端 ReaderFooter 完全不受影响（仍是移动端「标记已掌握」唯一入口），符合「移动端不动」纪律。
- 备选：`v-if` + matchMedia 的 JS 断点状态——彻底不挂载，但需新增响应式断点管理，收益（省一个 display:none 的 DOM）不成成本，不推荐。

### 4b. 「标记已掌握」入侧栏
- sb-actions 首位加按钮：`[标记掌握] [收藏] [笔记] [顶部] [收起]`（3 列 grid → 3+2 两行，可接受；收起放最后保持「退出性操作靠后」习惯）。
- 视觉：icon `target`/已掌握 `check`（与页脚一致），`:class="{ on: mastered }"` 直接复用现有 `.sb-act.on`（success 绿描边底），语义完全对口。
- `UnitView` 传 `:mastered="isPageMastered"`、`@toggle-master="togglePageMastered"`——数据链路（studyDb.markPageMastered / masteredAt 时间戳）零改动，只换入口。
- mini 列同步加一枚（复用 `.mini-item.on`）。

### 4c. 桌面翻页替代路径（删页脚后的关键补位）
现状：无键盘翻页、rt-segs 纯展示、翻页入口只剩页脚按钮 + 侧栏「本单元内容」列表。

| 方案 | 成本 | 评估 |
|---|---|---|
| **① 键盘 ←/→ 翻页（推荐）** | 低 | UnitView 全局 keydown → `pagingGo('prev'/'next')`。守卫三条：`examState.active` 不翻（作答保护）、`e.target` 为 input/textarea/contenteditable 不翻（笔记/答题输入）、`confirmLeave` 弹层开启不翻。与手势翻页共用同一条转场链路（leaveConfirmed 防双弹已内建） |
| **② 分段条（rt-segs）可点击（推荐）** | 中 | 每段代表页区间（映射与现 `curSeg` 完全互逆：段 s → 段首页 `floor((s-1)*n/segs)`），点击跳段首页。改 ReaderTopbar：`<i>` 改 `<button>`（或加 role/tabindex），emit `jump(seg)`，UnitView 调 `goFile(target)` 复用转场路径。≤12 页时一段=一页，精度无损 |
| ③ 侧栏上一页/下一页按钮 | 低 | 「本单元内容」标题行右侧两枚小按钮（sb-unit-btn 同款）。成本最低但入口藏在侧栏，作 ①② 的兜底可顺手加 |

- 推荐 ①+② 组合：键盘覆盖「连续翻」，分段条覆盖「跳页」，移动端手势/底栏/答题卡抽屉不受任何影响。
- 有现成事实兜底：`pagingGo` 是滑动/页脚/侧栏三源统一入口（含确认保护、转场闸门、watchdog），新增入口只是再接两根线，风险低。

---

## 方案五：导图防误触

### 假设验证（已确认）
`MindMapBlock.vue` L29：`<div class="mindmap-viewport" data-no-swipe @wheel.prevent="onWheel">`——**滚轮被无条件拦截并转为缩放**（`onWheel` 直接改 `transform.scale`，无任何修饰键判断）。460px 高的固定视口位于长页中部，鼠标滚轮经过即缩放、页面不滚——这就是桌面「太容易误触」的根因，判断成立。
次要误触源：grab 光标 + 任意左键拖拽即 pan（轻扫误拖画面），但有 5px 阈值 + `movedDist` 防误点节点，严重度远低于滚轮问题。

### 推荐方案：滚轮默认放行，Ctrl/Cmd+滚轮才缩放
```js
function onWheel(e) {
  if (!(e.ctrlKey || e.metaKey)) return  // 普通滚轮放行 → 页面照常滚动（为什么：滚轮经过导图是高频动作，不该被劫持）
  e.preventDefault()                     // Ctrl+滚轮：拦下浏览器页缩放，转为导图缩放
  // …原缩放逻辑
}
```
- 模板 `@wheel.prevent` 改 `@wheel`（prevent 移入条件分支）。
- **触控板捏合天然保留**：trackpad pinch 派生的 wheel 事件自带 `ctrlKey=true`，无需额外处理。
- 工具栏 ＋/－/⤢/⟳ 按钮已存在，作为无修饰键缩放兜底；提示文案同步改「Ctrl+滚轮缩放 · 拖拽移动 · 点击节点跳转正文」。
- Vue 模板绑定非 passive，`preventDefault()` 在 wheel 上合法生效（现 `@wheel.prevent` 即此工作方式），无兼容性风险。
- 移动端影响：**零**——触屏不派发 wheel；`touch-action:none` + 单指 pan 现状保留；双指捏合当前本就未实现，无回归。
- 拖拽 pan 建议保留不动（导图核心操作；若用户二期仍嫌误拖，可把 `DRAG_THRESHOLD` 5→10，一行改动）。

### 备选方案
- 完全移除滚轮缩放（最保守，触控板用户损失捏合缩放）；仅改提示文案不改行为（不解决问题）。

---

## 实施顺序与风险

### 改动文件清单
| 文件 | 改动 |
|---|---|
| `src/assets/css/reader.css` | 删避让两段（L309-332）；加桌面隐藏页脚规则 |
| `src/components/ContentSidebar.vue` | +bookmarked/mastered props、按钮状态样式、isTest 徽章逻辑、sb-collapsed watch 清理、mini 列同步 |
| `src/views/UnitView.vue` | 传新 props、键盘翻页 keydown、分段条 jump 接线 |
| `src/components/reader/ReaderTopbar.vue` | rt-segs 可点击化（button 化 + jump emit） |
| `src/components/blocks/MindMapBlock.vue` | onWheel 条件化 + 提示文案 |

### 建议批次（依赖关系）
1. **批 1**：方案一 + 方案四（布局与翻页，必须同批——否则出现「页脚全宽横穿侧栏」的更糟中间态）。
2. **批 2**：方案二 + 方案三（侧栏功能态，独立于批 1 的几何改动，但同文件，顺序在批 1 后减少冲突）。
3. **批 3**：方案五（完全独立，可随时先行上线，收益立现）。

### 回归点
- `use-swipe-paging` 23 条纯函数测试：无手势逻辑改动，**不受影响**。
- ⚠️ team-lead 提到的「masteredAt 6 条集成测试」：已在 `tests/` 与 `server/test/` 全量检索 `master/mastered/掌握`，**当前仓库不存在这组测试**（可能记忆偏差或其他分支）。本方案不触碰 studyDb 数据层，风险本就低；实施时跑全量 vitest 兜底。
- `layout-css-contract.test.js`：只守卫 layouts.css 的 split 排布，不涉及 reader.css ✓。
- 视觉回归点：侧栏收起/展开 width 过渡、玻璃条 @supports 降级、1150/1280/1457 三断点（1151–1456 有 `padding-right:250px` 内容让位规则，与全宽顶栏无几何冲突）、`rt-fade` 120ms 文本过渡不受分段条按钮化影响。

### 验证方式
- 桌面 Chrome 手测矩阵：侧栏展开/收起 ×（顶栏全宽 / 收藏态 / 掌握态 / ←→ 翻页 / 分段点击 / 滚轮放行 / Ctrl+滚轮缩放 / 节点点击联动）。
- 测验页专门验证：未交卷徽章、作答中键盘翻页被拦截、离开确认单弹。
- `npx vitest run` 全量 + 三断点截图对比。

---

## 待确认（UNCLEAR）
1. 「masteredAt 6 条集成测试」在当前工作区不存在，请确认出处（分支/记忆）。
2. 桌面隐藏页脚采用 `display:none`（DOM 保留、事件不触发）而非卸载，如需彻底卸载请明示。
3. 方案三若采用「测验页专用徽章」，移动端抽屉头徽章是否同步改造（默认不动，需用户拍板）。
4. 方案四 ③（侧栏翻页按钮）是否随批 1 顺手带上（+10 行，建议带）。
