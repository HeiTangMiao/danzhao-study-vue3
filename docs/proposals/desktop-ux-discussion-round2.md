# 学习页（UnitView）第二批四需求 UX 改进讨论方案

> 状态：讨论稿（未写代码）。基于对当前代码的只读核查，标注「已验证」的事实均可直接引用。
> 前置约束：上一轮（round1）刚落地的改动**不回退**——顶栏/页脚恒全宽、桌面页脚隐藏（≥1150 display:none）、掌握入侧栏首位、键盘←/→ + 分段条点击 + 侧栏翻页兜底、导图 Ctrl+滚轮缩放、侧栏 top≈108px、收起态 mini 悬浮组 fixed top:116 right:12。
> 本轮用户主动要求改移动端，覆盖上一轮「移动端徽章/交互不动」的旧拍板（用户新决策优先）。

---

## 方案一：侧栏图标方向修正 + 快捷操作栏重排（需求 1）

### 1a. 图标颠倒：根因已验证，修正是「两个名字对调」

**已验证**：`lucide-paths.js` L196-201——`chevron-left` = `m15 18-6-6 6-6`（尖角朝左 ‹），`chevron-right` = `m9 18 6-6-6-6`（尖角朝右 ›）。AppIcon 是纯几何透传，无翻转。

侧栏在**屏幕右侧**，方向语义应以「面板去向」为准：

| 按钮 | 面板动作 | 正确图标 | 当前图标 | 判定 |
|---|---|---|---|---|
| 收起（sb-actions 末位，L47） | 面板向右合拢 | **chevron-right ›** | chevron-left ‹ | ❌ 装反 |
| 展开侧边栏（mini 首位，L106） | 面板向左展开 | **chevron-left ‹** | chevron-right › | ❌ 装反 |

**修正**：两处 icon name 对调即可，各改 1 个单词。team-lead 给的方向判断与代码事实完全吻合。

### 1b. 快捷操作栏重排：开关独立 + 其余等宽 + 尺寸稳定

**现状（已验证）**：
- `.sb-actions` 是 `grid; repeat(3, 1fr)`，当前 5 个按钮流式填充为 3+2 两行；「收起」混在功能按钮里。
- 文字变化导致变宽的根因：`.sb-act` 是 flex 行内内容（icon + span），grid 1fr 轨道虽等宽，但按钮内容超宽时会把轨道撑破（`1fr` 实为 `minmax(auto, 1fr)`，内容 min-width 参与轨道计算）——「收藏↔已收藏」「掌握↔已掌握」正是这一类。
- 状态色样式 `.sb-act.on`（success 绿）/ `.sb-act--marked`（primary + 实心星）必须保留，重排只动布局不动配色。

**推荐方案**：
1. **开关独立**：把「收起」从 sb-actions 拆出，放到「快捷操作」标题行的右端——
   `.sb-quick` 顶部新增一行 `sb-quick__head`：左侧「快捷操作」标题，右侧一枚 28px icon-only 幽灵按钮（chevron-right ›，title「收起侧边栏」）。
   理由：收起是「退出性操作」，与四个功能按钮语义不同类，视觉上分置（标题右端）比混在网格里更清晰；同时释放一个网格位。
2. **其余四钮 2×2 等宽**：`grid-template-columns: repeat(2, 1fr)`，顺序 [掌握, 顶部 / 收藏, 笔记]（掌握保持首位，用户上轮拍板不变）。
   - 每格轨宽 ≈ (236 − 24 padding − 6 gap) / 2 ≈ **103px**；最长文案「已掌握」= icon 16 + gap 4 + 3 字 ×~11.5px ≈ **55px**，余量充足，任何状态切换都不会触顶。
   - **防撑破保险**（双保险，改动各 1 行）：
     ```css
     .sb-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); } /* minmax(0,1fr) 掐死轨道不吃内容宽 */
     .sb-act span { white-space: nowrap; overflow: hidden; }           /* 兜底：内容再长也裁切不出格 */
     ```
   - 按钮本身 `width: 100%`（grid 项默认拉伸已满足），点击前后尺寸/位置零变化。
3. mini 列（收起态）首位展开按钮图标同步换成 chevron-left（1a 的对调包含此处），mini 列结构不动。

**备选方案**：
- A. 保持单行 4 列（repeat(4, minmax(0,1fr))）：轨宽仅 ~48px，「已掌握」55px 必然溢出，只能靠图标化（去文字）解决——丢失文案可读性，不推荐。
- B. 「收起」独立为网格下方整行按钮：占用纵向空间且与「顶部」等混排观感差，不如标题行内联省空间。
- C. 文案不做「已收藏/已掌握」切换，只变颜色：违背上轮拍板的状态反馈设计，不推荐。

**影响面**：仅 `ContentSidebar.vue`（模板 L37-48 区块 + 少量 scoped CSS）。数据链路、事件、状态色零改动。

**回归点**：展开/收起过渡动画不受影响（收起按钮移位但 collapsed 逻辑不变）；掌握/收藏两个状态色在 2×2 布局下的视觉核对；mini 悬浮组（fixed top:116）不涉及。

---

## 方案二：移动端「底部导航栏」整合（需求 2，**存在歧义，需用户拍板**）

### 2.0 解读选项表（供拍板）

用户原话「将底部导航栏的功能整合进菜单页面」中的「底部导航栏」有两种解读：

| | **解读 A：学习页页脚功能条**（ReaderFooter） | **解读 B：全站 AppTabBar 底部 pill** |
|---|---|---|
| 对象 | 学习页底部的玻璃条：上一页 / 标记已掌握 / 下一页（≤1150 显示） | 全站底部 pill：学习 / 练习 / 复习 / 我的（一级 Tab 页显示） |
| 「菜单页面」对应物 | 侧栏移动端的抽屉/更多面板（sb-mobile，现成） | 需新建或复用「我的」页做导航枢纽 |
| 影响范围 | 仅 UnitView 学习页 | **所有一级 Tab 页 + 路由 meta.tab 门控 + 全站导航习惯** |
| 与既有决策的连贯性 | 与上一轮「桌面删页脚、保持学习页底部整洁」完全同构，只是延伸到移动端 | 与上一轮方向无关，是另一个议题 |
| 成本 | 低（1 个 CSS 规则 + 顶栏 1 按钮 + 更多面板 2 项） | 高（跨 5+ 视图、导航链路重构、iOS/Android 返回手势适配重验） |
| 现状互补性 | 移动端翻页仍有手势 + 答题卡抽屉，页脚功能整合后入口不缺失 | pill 移除后一级页缺底部导航，必须新建入口，缺口更大 |

**推荐：解读 A**（team-lead 倾向一致）。B 属全站导航重构，动作大且用户抱怨的语境（上一轮即「学习页底部不整洁」）指向 A；B 建议本轮明确不做，若用户原意确是 B 再单独立项。

### 2A. 推荐方案细节（解读 A）

**已验证现状**：移动端（≤1150）页脚 = ReaderFooter 玻璃条（上页/标记已掌握主按钮/下页）；顶栏 rt-actions（收藏/笔记/答题卡目录）移动端可见、桌面隐藏（reader.css L123-125）；sb-mobile 的「更多面板」现有 3 项（收藏/笔记/返回顶部）；`hideBar=true` 使旧 sb-bar 底栏不渲染；UnitView `padding-bottom` 让位规则在 ≤1150（reader.css L312-318）；番茄钟 fab 的页脚避让规则在 ≤1150（UnitView L808-810）。

1. **页脚隐藏（纯 CSS，与桌面同构）**：
   `reader.css` 加 `@media (max-width: 1150px) { .reader-footer { display: none } }`。
   ReaderFooter 组件与事件链路保留（与桌面处理方式一致，将来要恢复只删一行）。移动端翻页由**手势滑动 + 答题卡抽屉跳页**承接，页脚的上/下页兜底进更多面板（第 3 点）。
2. **「掌握」快捷开关入顶栏 rt-actions**：
   - ReaderTopbar 新增 prop `mastered: Boolean` + emit `toggle-master`，UnitView 传 `isPageMastered` / `togglePageMastered`（数据链路零新增，页脚同源）。
   - **位置：首位**——[掌握][收藏][笔记][目录]，主行动优先（与桌面侧栏「掌握居首」的用户拍板一致）。
   - **图标与状态反馈**：icon 用 `target`，已掌握切换为 `check`（与页脚 rf-master 现行为一致）；激活态复用现成 `.rt-act.on`（primary 高亮 + glass-active 底），与收藏按钮的 `on` 同语义体系。文字提示 title「标记本页已掌握/已掌握，点击取消」。
   - ⚠️ 首帧规避：rt-actions 的图标已走 `iconsReady` 延迟挂载（WebKit #322045），新按钮同样式接入即可，无额外处理。
3. **更多面板补齐翻页兜底**：sb-more 从 3 项扩为 6 项（3 列 × 2 行，网格刚好填满无空洞）：
   `收藏 / 笔记 / 返回顶部` + `上一页 / 下一页 / 番茄钟`（番茄钟项由方案三共用，见下）。
   上一页/下一页复用已声明的 `go-prev`/`go-next` emit（ContentSidebar 内部已有 `hasPrev/hasNext` computed），零新增链路。 mastery 也建议同步加进更多面板成第 7 项？——**不加**，顶栏已有掌握且是高频主行动，更多面板保持 6 项整格。
4. **底部让位清理**（删页脚后的连锁，两处小改）：
   - reader.css L312-318 的 `.unit-view` 底部 padding 规则删除（页脚没了无需让位）。
   - UnitView L808-810 番茄钟 fab 移动端避让改为 `bottom: calc(var(--sab) + var(--sys-gesture-bottom, 24px) + 12px)`（不再让页脚）——注：该规则在方案三中会随 fab 条件化一并重构。

**备选**：
- 页脚 `v-if` + matchMedia 卸载而非 display:none：需新增 1150 断点响应式状态（UnitView 现有 narrowMq 是 899 断点，不通用），收益不成成本，不推荐（与桌面 round1 的 display:none 决策保持同构）。
- 掌握放 rt-actions 末位：收藏/笔记/目录是既有顺序，插中间会打乱肌肉记忆；放首位与桌面「掌握居首」对齐，推荐。

**影响面**：`reader.css`（2 处）、`ReaderTopbar.vue`（+1 prop/+1 emit/+1 按钮）、`ContentSidebar.vue`（sb-more +3 项）、`UnitView.vue`（prop 接线 + 删 padding 规则）。ReaderFooter.vue 零改动。

**回归点**：
- 手势翻页（use-swipe-paging 23 条纯函数测试）不受影响——手势层/页脚互不依赖。
- 答题卡抽屉、更多面板打开时的 body overflow 锁与键盘翻页守卫（L540）不受影响。
- 横屏安全区规则（sb-sheet 左右 sar/sal）不受影响。
- ⚠️ 核对：`--reader-footer-h` token 仍被 fab 避让旧规则引用，随第 4 点一并清理，避免死 token。
- 1150 断点上下穿梭（平板转窗）时页脚 display:none 平滑切换，无布局跳变（padding 规则同步删除是前提）。

---

## 方案三：番茄钟组件化 + 入口 + 固定开关（需求 3）

**已验证现状**：番茄钟无独立组件——UI 内联在 UnitView（模板 L135-163：`pomodoro-fab` 容器内含卡片 + FAB 按钮；样式 L764-810）；逻辑全在 `usePomodoro` composable（`pomodoroOpen` ref 在 UnitView 控制开合）；计时器状态已有 localStorage 持久化（`pomodoro_state`），**面板关闭计时照跑**（interval 在 composable 内，与 UI 解耦）——组件化的天然有利条件。

### 推荐方案

1. **抽离 `src/components/PomodoroPanel.vue`**：
   - 承载现有卡片 UI（模式标签/大时钟/进度条/今日番茄/开始-暂停-重置-跳过）+ 新增头部行：`[timer icon + 「番茄钟」] [📌 固定开关] [× 关闭]`。
   - Props：`pomodoro`（composable 返回对象透传，数据层零改动）、`pinned: Boolean`、`open: Boolean`；Emits：`close`、`toggle-pin`。
   - 卡片样式原样迁移（class 名不变，继续走 main.css token），UnitView 删 L764-810 样式段。
2. **FAB 条件渲染**：
   - `pinned = ref(localStorage.getItem('pomodoro_pin') === '1')`（UnitView 持有，watch 持久化）。
   - FAB（`pomodoro-fab__btn` 那枚 56px 圆钮）改为 `v-if="pinned"`：**默认不固定 → 升级后右下角 FAB 消失**，符合「取消默认固定」。
   - pinned 时 FAB 点击 = 开/关面板（保留现有习惯）；面板头部 × 关闭始终可用。
   - 非固定态的呈现：面板以**居中悬浮卡**形式打开（fixed 居中，宽 250px 复用现有卡片，z-index 140，低于离开确认 300、高于侧栏 90/95），遮罩不加（轻量浮层，点外部不关闭以免误触，用 × 收起）。
3. **固定开关行为**：面板内 📌 点击切换 pinned：
   - 固定 → 面板从居中卡切换到「锚定 FAB」形态（FAB 出现在右下角，点 FAB 开合卡片，即现有交互原样回归）；再点 📌 取消固定 → FAB 消失、面板回到居中浮层。
   - 图标用现成 `pin`（lucide-paths 已有），固定态给 primary 色。
   - 持久化 key：`pomodoro_pin`（与 `pomodoro_state`、`sidebar_collapsed` 命名风格一致）。
4. **入口（两个端各一处，推荐）**：
   - **桌面**：侧栏 sb-actions 第 5 项「番茄钟」，`grid-column: 1 / -1` 占满整行（2×2 之下加一整行）。文案静态（无状态切换），不触发方案一的尺寸稳定问题；整行宽度固定，视觉上是「次级功能」与四主钮的分层。emit `toggle-pomodoro`，UnitView 接 `pomodoroOpen = !pomodoroOpen`。
   - **移动端**：sb-more 更多面板「番茄钟」项（与方案二 A 的 6 项整格合并设计：收藏/笔记/返回顶部/上一页/下一页/番茄钟）。
   - 备选入口：顶栏 rt-actions 加 timer 按钮（仅移动端可见，桌面无 rt-actions）——桌面仍缺入口，故不如侧栏 + 更多面板组合。

**备选方案**：
- 独立路由页（/pomodoro）：路由跳转打断阅读上下文，与「学习时随手看一眼」的使用场景不符，且路由守卫/转场链路成本高，不推荐。
- 入口只放更多面板（桌面也走不出侧栏的更多面板——桌面无此面板），不可行。

**影响面**：新增 `PomodoroPanel.vue`；`UnitView.vue`（删内联模板/样式，换组件引用 + pinned/open 两个 ref）；`ContentSidebar.vue`（sb-actions +1 项、sb-more +1 项）。`usePomodoro.js` **零改动**。

**回归点**：
- 计时持久化/恢复（`pomodoro_state` 时间戳校准逻辑）不碰——面板关闭再开，剩余时间连续。
- 音效（AudioContext 单例）、通知、daily_stats 记录链路在 composable 内，不涉及。
- 移动端 FAB 位置的避让规则（页脚没了，见方案二第 4 点）与新 pinned 逻辑合并重构时，44px 触控目标保持（`.pomodoro-btn` 44 规则保留）。
- 卸载保存（composable `onUnmounted` 里的 saveState）不受影响——composable 仍在 UnitView 实例化。

---

## 方案四：笔记独立组件 + 浮动可拖拽（需求 4）

**已验证现状**：笔记是 UnitView 内联 section（L54-69，`v-if="showNotes && page"`，位于内容区**之前**=页面顶部）；数据在 `useNotes` composable（IndexedDB + 1.5s 防抖自动保存 + pageKey 切换自动重载，watch 已内建）；笔记按钮在 rt-actions（移动，有 `rt-act.on` 高亮）与 sb-actions（桌面，**当前无开合状态高亮**）。

### 推荐方案

1. **抽离 `src/components/NotesPanel.vue`**：
   - Props：`open: Boolean`、`notes: Object`（useNotes 返回对象整体透传：content/status/statusType/wordCount/scheduleAutosave/manualSave——数据与保存链路零改动）。
   - Emits：`close`。
   - 内容 = 现有 notes-section 的 head（标题 + 保存状态）/textarea/foot（字数 + 保存钮）原样迁移。
   - 附带收益：**翻页时面板可保持打开**——useNotes 的 pageKey watch 自动切换到新页笔记，边翻边记成为可能（现状顶部内联版随内容流走，无此体验）。
2. **桌面（≥1151）：浮动卡片 + 拖拽**：
   - `position: fixed`，默认位置 `top: 120px`（顶栏 108 之下）、水平居中偏右（避开右侧栏：`right: calc(var(--sb-rail-w, 236px) + 36px)` 作为默认 x）；拖拽后存 `localStorage['notes_panel_pos']`（{x, y}）。
   - **拖拽实现要点（Pointer Events 统一鼠标/触摸）**：
     - 只有**头部把手**响应 `pointerdown`（textarea 区域绝不挂拖拽，避免破坏文本选择/光标操作）；`setPointerCapture` 保证移出把手仍跟手。
     - `pointermove` 更新 x/y（建议落 `transform: translate(x, y)` 而非 left/top，合成层友好，且不给玻璃/卡片添 backdrop root 问题——本面板是实底 card，无玻璃）；拖拽中挂 `.dragging`（`transition: none; user-select: none; cursor: grabbing`）。
     - `pointerup` 时 **clamp 收口 + 持久化**：x/y 限制在视口内（面板至少留 40px 可见），窗口 resize 时对已存位置重 clamp（open 为真时监听一次性的 resize 重排即可）。
     - useMotionPrefs off 档（reduced-motion 用户）无过渡依赖，拖拽本身是直接操作不受档位影响。
   - 键盘翻页守卫（UnitView `isEditableTarget`）已覆盖 textarea 聚焦场景（←/→ 不被劫持），零改动。
3. **移动端（≤1150）：底部抽屉形态，不做自由拖拽**：
   - 复用 sb-sheet 的视觉语言（底部滑入、圆角顶、拖拽把手下滑关闭——把手手势是「关闭抽屉」语义，不与「移动面板」混淆）。
   - **冲突评估结论**：技术上浮动拖拽在移动端可行（面板是 reader-content 的兄弟节点，触摸落在面板上不会触发内容层 swipe 手势；body overflow 锁已有现成 watch 模式），但小屏上自由浮窗遮挡正文 + 拖拽把手与下滑关闭手势语义打架，**体验上不推荐**。底部抽屉是移动端编辑笔记的最稳形态（键盘弹起时贴底也最顺）。
   - 若用户坚持移动端也要任意位置：再开二期，需要加「拖拽模式/关闭模式」的把手双语义设计，本轮不做。
4. **按钮联动**：
   - rt-actions 笔记按钮：现有 `notesOpen` prop → `:class="{ on: notesOpen }"` 已存在，改传面板 open 状态即可（`@notes="showNotes = !showNotes"` 接线不变）。
   - sb-actions 笔记按钮：**补状态高亮**——新增 `.sb-act--open { border-color: var(--primary); color: var(--primary); }`（语义对齐 rt-act.on 的 primary 体系；刻意不复用 `.on`（success 绿=掌握）与 `--marked`（primary+实心星=收藏），三者各表其义）。
   - 面板 × 关闭 = 同一 `showNotes` ref，三处（顶栏/侧栏/面板自身）共享同一状态源，天然联动。
5. UnitView 删除内联 notes-section（L54-69）与样式段（L707-722），换 `<NotesPanel v-model:open="showNotes" :notes="notes" />`。

**备选方案**：
- 侧栏内嵌面板（点笔记在侧栏内展开编辑区）：改动最小，但「页面任意位置编辑」的诉求未满足，且侧栏宽 236px 编辑体验差，不推荐为主案。
- 全屏编辑弹层（移动端）：对短笔记过重，抽屉更轻。

**影响面**：新增 `NotesPanel.vue`；`UnitView.vue`（删内联段、换组件）；`ContentSidebar.vue`（笔记按钮 +1 状态类）。`useNotes.js` **零改动**。

**回归点**：
- 自动保存（1.5s 防抖）、手动保存、空内容软删墓碑、卸载前冲刷保存（composable onUnmounted）全部不碰，透传即用。
- pageKey 切换重载（watch key）不碰；验证翻页时面板开着内容正确切换、状态文案（已保存/编辑中）跟随。
- 离开保护（confirmLeave 弹层 z-index 300）盖过笔记面板（z-index 140）层级核对。
- 移动端抽屉打开时 body overflow 锁与键盘翻页守卫（L540 的 overflow:hidden 检查）联动正常。

---

## 实施批次与文件清单

| 批次 | 内容 | 文件 | 依赖 |
|---|---|---|---|
| **批 1** | 方案一：图标对调 + 2×2 等宽重排 + 开关独立 | `ContentSidebar.vue` | 无 |
| **批 2** | 方案二 A：移动端页脚整合 + 掌握入顶栏 | `reader.css`、`ReaderTopbar.vue`、`ContentSidebar.vue`（sb-more）、`UnitView.vue`（接线） | 无（与批 1 同文件不同区域，建议批 1 先行减少冲突） |
| **批 3** | 方案三 + 方案四：番茄钟/笔记组件化 | 新增 `PomodoroPanel.vue`、`NotesPanel.vue`；改 `UnitView.vue`（删两段内联 + 接线）、`ContentSidebar.vue`（番茄钟入口 + 笔记高亮） | 方案三的 sb-more「番茄钟」项与方案二的 6 项整格设计耦合 → **批 3 依赖批 2**；方案一的重排是批 3 侧栏入口的前提 → **批 3 依赖批 1** |

批 1、批 2 相互独立可并行；批 3 收尾统一集成调试。

### 受影响测试与验证
- `npx vitest run` 全量兜底；`use-swipe-paging` 23 条不受影响（无手势逻辑改动）；`layout-css-contract.test.js` 只守卫 layouts.css，不涉及。
- 新增纯函数建议：位置 clamp（`clampPos(x, y, vpW, vpH, pw, ph)`）抽到 `src/utils/` 或组件内导出，可加 4-6 条单测（越界四角 + 常规 + 零尺寸视口），成本极低（可选）。
- 手测矩阵：
  - 桌面：侧栏展开/收起 ×（图标方向 / 2×2 等宽 / 掌握-收藏状态切换尺寸稳定 / 番茄钟入口 / 笔记按钮高亮）；笔记面板拖拽（四角 clamp / 刷新后位置恢复 / 翻页保持打开 / 键盘←→不被 textarea 劫持）；番茄钟（默认无 FAB / 固定后 FAB 出现 / 取消固定 / 计时跨面板开关连续）。
  - 移动端（≤1150 + 真机窄屏）：页脚消失后手势翻页 / 答题卡跳页 / 更多面板 6 项 / 顶栏掌握开关状态切换 / 笔记抽屉编辑与自动保存 / 番茄钟抽屉。
  - 三断点（1150 / 1280 / 1457）穿梭无布局跳变；玻璃 @supports 降级不受影响。
- CSP 红线自查：三个方案全部是声明式模板 + composable 透传，无 v-html/innerHTML/运行时注入，符合 script-src 'self' 约束。

---

## 待确认（UNCLEAR，需用户/主理人拍板）

1. **需求 2 解读**：A（学习页页脚整合，推荐）/ B（全站 AppTabBar pill，本轮默认不做）——请用户拍板。
2. **番茄钟固定态默认值**：按需求理解为**默认不固定**（升级后右下角 FAB 首次消失，需从侧栏/更多面板进入再固定）——请确认这一「升级即变」符合预期。
3. **番茄钟非固定态呈现**：推荐「居中轻浮层（无遮罩）」；备选「锚定屏幕右侧栏旁」。影响首开观感，请拍板。
4. **笔记面板移动端形态**：推荐「底部抽屉（不做自由拖拽）」；若用户坚持移动端也任意位置拖拽，需二期加把手双语义，请拍板。
5. **笔记面板桌面默认位置**：推荐「顶栏下方居中偏右（默认避开侧栏）」，拖拽后记忆；若用户偏好记忆上次位置优先于避让，需明确。
