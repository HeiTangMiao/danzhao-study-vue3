<!--
  AppTabBar —— 一级导航（双形态，D20）
  - 移动端 <1150px（--bp-lg）：底部液态悬浮 pill（4 Tab，四周留白、不贴底）
  - 桌面端 ≥1150px：顶部玻璃导航条（品牌左 / 4 Tab 居中 / 用户区右）
  双形态完全同构：同图标、同激活色、同文案。

  互斥契约（system_design §2 / §4.1 / §9.3）：
   - 只有**移动底栏**（pill）受 route.meta.tab 门控：进入详情页（UnitView 不带 tab meta）即隐藏，
     由 ContentSidebar 的底部操作栏接管 —— 两个底栏不可同屏。
   - **桌面顶栏常驻所有页面**：它同时承载详情页的用户区入口（同步 / 用户名 / 管理 / 退出 / 主题）。
     若在详情页隐藏顶栏，桌面用户将无任何退出/同步入口（功能倒退）；其与阅读进度条的层叠冲突
     由 UnitView 把进度条降到顶栏下方解决（见 UnitView `.reading-progress`）。
   - 一级 Tab 页：<1150px 渲染底部 pill；≥1150px 渲染桌面顶栏（同一 activeId 高亮，双形态同构）。

  注意：玻璃三铁律：必写 -webkit- 前缀；blur ≤ 16px；玻璃层不可被带 transform/filter/will-change
     的祖先包住（否则新建 backdrop root，玻璃静默失效）。
     本组件的玻璃取值全部来自 main.css 的 --glass-* token（唯一来源；main.css 的 .glass 工具类同源）。

  图标：内联 SVG 路径（源自 Lucide，ISC 许可），编译期内联、无 emoji、无运行时注入、CSP 零风险。
        P2-T1 引入 AppIcon 后统一替换此处路径。
-->
<template>
  <!-- 桌面端：顶部玻璃导航条（≥1150px）——常驻所有页面，也承载详情页的用户区入口
       （同步 / 用户名 / 管理 / 退出 目前只存在于本组件内，整体隐藏会让详情页用户无法操作）。 -->
  <header class="app-topbar" role="navigation" aria-label="主导航">
    <div class="app-topbar__inner">
      <div class="app-topbar__brand">{{ brand }}</div>
      <nav class="app-topbar__tabs">
        <router-link
          v-for="t in tabs"
          :key="t.id"
          :to="t.to"
          class="app-topbar__tab"
          :class="{ 'is-active': activeId === t.id }"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path v-for="(d, i) in ICON_PATHS[t.icon]" :key="i" :d="d" />
          </svg>
          <span>{{ t.label }}</span>
        </router-link>
      </nav>
      <!-- 用户区：由 App.vue 注入（同步 / 用户名 / 管理 / 退出 / 主题），避免本组件耦合 auth/sync -->
      <div class="app-topbar__user"><slot name="user" /></div>
    </div>
  </header>

  <!-- 移动端：底部液态悬浮 pill（<1150px）。
       --tab-active：当前激活 Tab 的下标（0-3），驱动 ::after 指示器滑动（见样式） -->
  <nav v-if="isTabRoute" class="app-pill" aria-label="主导航" :style="{ '--tab-active': activeIndex }">
    <router-link
      v-for="t in tabs"
      :key="t.id"
      :to="t.to"
      class="app-pill__tab"
      :class="{ 'is-active': activeId === t.id }"
    >
      <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path v-for="(d, i) in ICON_PATHS[t.icon]" :key="i" :d="d" />
      </svg>
      <span>{{ t.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps({
  // 桌面顶栏品牌文案（移动 pill 不显示品牌）
  brand: { type: String, default: '单招学习打卡' }
})

const route = useRoute()

// 4 个一级 Tab（D3）。数组顺序即一级导航顺序；to 指向顶层路由。
const tabs = [
  { id: 'study', label: '学习', to: '/', icon: 'book' },
  { id: 'practice', label: '练习', to: '/practice', icon: 'pencil' },
  { id: 'review', label: '复习', to: '/error-book', icon: 'refresh' },
  { id: 'me', label: '我的', to: '/profile', icon: 'user' }
]

// 高亮按 route.meta.tab 匹配（**非** path.startsWith）：
// 详情页路径形如 /study/... 若按前缀匹配会误点亮「学习」Tab。
const activeId = computed(() => route.meta.tab || '')

// 一级入口判定：详情页（UnitView）不携带 tab meta → 隐藏底部 pill
const isTabRoute = computed(() => !!route.meta.tab)

// 激活 Tab 下标：驱动底部 pill 的滑动指示器（CSS transform 按 100% × 下标平移）。
// 未命中（详情页等）给 -1 → 指示器滑出左边界，视觉上等于无高亮，不需要额外的显隐逻辑。
const activeIndex = computed(() => tabs.findIndex((t) => t.id === activeId.value))

// 内联图标路径（Lucide 24×24 线性路径，stroke 由 CSS 控制）
const ICON_PATHS = {
  book: [
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'
  ],
  pencil: ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'],
  refresh: ['M3 12a9 9 0 1 0 2.64-6.36L3 8', 'M3 3v5h5'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']
}
</script>

<style scoped>
/* 公共：线性图标统一描边（继承 currentColor，随激活态变色） */
.tab-icon {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex: 0 0 auto;
}

/* ===== 桌面端：顶部玻璃导航条 ===== */
.app-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 110;
  display: none; /* 默认隐藏，断点处再显示（移动优先） */
  /* 注意：顶栏真实占高必须 == calc(--tabbar-h + --sat)：
   * 若不显式定高，顶栏高度由「子元素高 + 自身 border-bottom」决定，会多出 1px，
   * 使进度条 top(= calc(--tabbar-h+--sat)) 落进顶栏底边（bottom 57 > top 56 → 重叠 1px）。
   * 故显式给顶栏定高并用 border-box 把 border 计入高度，令 --tabbar-h 的语义
   * == 「顶栏实际占高」——进度条、内容区让位等所有依赖它的 calc 随之同时正确（§4.1）。 */
  height: calc(var(--tabbar-h) + var(--sat));
  box-sizing: border-box;
  /* 玻璃取值统一来自 main.css 的 --glass-* token（唯一来源，避免两套玻璃写法） */
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  border-bottom: 1px solid var(--line);
  box-shadow: inset 0 1px 0 var(--glass-hl), var(--glass-shadow);
}
.app-topbar__inner {
  display: grid;
  /* 三栏：品牌左 / Tab 居中 / 用户区右 —— 用 1fr auto 1fr 保证 Tab 绝对居中 */
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-4);
  /* 跟随父级定高（父级已用 border-box 计入 border），不再各自算高度，避免两处高度漂移 */
  height: 100%;
  box-sizing: border-box;
  padding: var(--sat) var(--pad-page) 0;
}
.app-topbar__brand {
  justify-self: start;
  font-weight: 600;
  font-size: var(--fs-lg);
  color: var(--text-primary);
}
.app-topbar__tabs {
  justify-self: center;
  display: flex;
  gap: var(--space-1);
}
.app-topbar__tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--fs-md);
  font-weight: 500;
  transition: background var(--dur-2) var(--ease-standard), color var(--dur-2) var(--ease-standard);
}
.app-topbar__tab:hover {
  background: var(--surface-muted);
  color: var(--text);
}
.app-topbar__tab:active {
  /* P3-T1 按压反馈：只动 transform；顶栏是玻璃层本体，transform 只加在子 Tab 上
   * （不能加在 .app-topbar 上，那会破坏它自己的 backdrop-filter） */
  transform: scale(0.96);
}
.app-topbar__tab.is-active {
  background: var(--glass-active);
  color: var(--primary);
  font-weight: 600;
}
.app-topbar__user {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* ===== 移动端：底部液态悬浮 pill ===== */
.app-pill {
  position: fixed;
  z-index: 110;
  left: calc(var(--space-4) + var(--sal));
  right: calc(var(--space-4) + var(--sar));
  bottom: calc(var(--space-3) + var(--sab)); /* 不贴底：让开系统手势条 */
  height: var(--tabbar-h);
  display: flex;
  align-items: stretch;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: 28px; /* 高 56px 时正好胶囊形 */
  /* 圆角玻璃裁剪：backdrop-filter 挂同圆角伪元素，父级 overflow:hidden 防 WebKit 圆角模糊溢出 */
  overflow: hidden;
  box-shadow: var(--glass-shadow);
}
.app-pill::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1; /* 置于内容之下；父级有 z-index 形成层叠上下文，仍显示在页面之上 */
  border-radius: 28px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-sat));
  box-shadow: inset 0 1px 0 var(--glass-hl);
}
/* 滑动指示器（P3-T1）：激活底色从「各 Tab 自带背景」改为「一枚共享的滑块」——
 * 切换 Tab 时滑块以 transform 平移过去（compositor-only），比背景瞬间跳变更有方向感。
 * 与玻璃的关系：::after 是 ::before（玻璃）的**兄弟**而非后代，transform 动画不会
 * 新建玻璃的 backdrop root（§5.1 铁律的「玻璃层必须是被动画元素的兄弟」）。
 * 几何：pill 内宽减去左右 padding 后四等分；left 定位在内容区起点，translateX
 * 按「自身宽度 × 下标」平移 —— 与 flex:1 的等宽 Tab 一一对齐。 */
.app-pill::after {
  content: '';
  position: absolute;
  top: var(--space-1);
  bottom: var(--space-1);
  left: var(--space-1);
  width: calc((100% - var(--space-1) * 2) / 4);
  border-radius: 22px; /* 与 Tab 内圆角一致 */
  background: var(--glass-active);
  transform: translateX(calc(var(--tab-active, 0) * 100%));
  transition: transform var(--dur-2) var(--ease-out);
}
.app-pill__tab {
  flex: 1;
  min-width: 0;
  /* 抬到指示器之上：指示器是绝对定位，不抬会被盖住（无点击问题但有视觉遮挡） */
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 22px; /* 内圆角：与外胶囊同心 */
  color: var(--text-muted);
  font-size: var(--fs-2xs);
  /* 激活底色已由 ::after 滑块承担，这里只过渡文字/图标颜色 —— 避免「滑块未到、底色先到」的双高亮 */
  transition: color var(--dur-2) var(--ease-standard);
}
.app-pill__tab:active {
  /* P3-T1 按压反馈：transform 加在 Tab（玻璃的兄弟）上，不碰 ::before 玻璃层 */
  transform: scale(0.96);
}
.app-pill__tab.is-active {
  color: var(--primary);
  font-weight: 600;
}
.app-pill__tab .tab-icon {
  width: 22px;
  height: 22px;
}

/* ===== 断点切换：<1150px 只显示 pill；≥1150px 只显示顶栏 ===== */
@media (max-width: 1149px) {
  .app-topbar {
    display: none;
  }
}
@media (min-width: 1150px) {
  .app-topbar {
    display: block;
  }
  .app-pill {
    display: none;
  }
}

/* 玻璃降级：宿主不支持 backdrop-filter 时退回不透明底（只换取值，写法不变） */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .app-topbar {
    background: var(--surface);
  }
  .app-pill::before {
    background: var(--surface);
  }
}
</style>
