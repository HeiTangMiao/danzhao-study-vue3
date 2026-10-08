<!--
  ContentSidebar —— 内容页固定侧边栏（快捷导航 + 快捷操作）
  职责：
   - 快捷操作区（吸顶）：返回顶部 / 标记完成 / 书签 / 笔记 / 目录 / 展开收起
   - 快捷导航区（可滚动）：本页区块章节 / 同单元其他页面 / 前后单元切换
  props:
   - unit        当前单元配置（含 files 列表）
   - toc         本页目录（[{index,type,title}]）
   - fileIndex    当前页索引（同单元内）
   - subject     当前学科号
   - unitNum     当前单元号
   - site        学科配置（用于单元间导航）
   - isDone      是否已完成
   - isMath      是否数学学科（侧边栏据此追加 math 主题类）
   - doneFiles   单元内各页面完成状态（布尔数组，移动端答题卡）
   - mastered    本页是否已手动掌握（复用页脚主行动的数据落点 §5.7.7）
  移动端（≤1150px）形态：底部操作栏（目录/上页/下页主按钮/更多）+ 答题卡导航抽屉（下滑手势关闭）+ 更多操作面板
  注意：与 AppTabBar 互斥契约（system_design §4.1 / §9.3）：本组件只在详情页（UnitView）使用，
     而 AppTabBar 的底部 pill 在详情页（无 route.meta.tab）不渲染 —— 两个底栏永不同屏。
     若将来把 ContentSidebar 复用到一级 Tab 页，须同步收敛两处底栏的显示条件。
  emits:
   - scroll-to   跳转到区块 ({index})
   - toggle-master 标记/取消本页掌握（桌面 UX 方案 commit 1：页脚隐藏后侧栏承接）
   - toggle-bookmark 书签
   - toggle-notes 笔记
   - go-file     跳转同单元指定页
   - go-unit     跳转指定单元
   - go-prev     上一页（移动端底部栏 / 桌面侧栏翻页兜底）
   - go-next     下一页（移动端底部栏 / 桌面侧栏翻页兜底）
-->
<template>
  <aside class="content-sidebar" :class="{ collapsed, 'math': isMath }">
    <div v-if="!collapsed" class="sidebar-inner">
      <!-- ===== 快捷操作区（吸顶） ===== -->
      <div class="sb-quick">
        <div class="sb-title">快捷操作</div>
        <div class="sb-actions">
          <!-- 首位「掌握」：页脚隐藏后（桌面 UX 方案 commit 1）主行动在此承接；
               on 态复用 sb-act.on 的 success 绿语义（与页脚 rf-master.on 一致） -->
          <button class="sb-act" :class="{ on: mastered }" :title="mastered ? '已掌握本页，点击取消' : '标记本页已掌握'" @click="emit('toggle-master')">
            <AppIcon name="target" :size="16" /><span>{{ mastered ? '已掌握' : '掌握' }}</span>
          </button>
          <button class="sb-act" title="返回顶部" @click="emit('scroll-top')"><AppIcon name="arrow-up" :size="16" /><span>顶部</span></button>
          <button class="sb-act" :class="{ 'sb-act--marked': bookmarked }" :title="bookmarked ? '已收藏本页，点击取消' : '收藏本页'" @click="emit('toggle-bookmark')"><AppIcon name="star" :size="16" :stroke-width="1.8" /><span>{{ bookmarked ? '已收藏' : '收藏' }}</span></button>
          <button class="sb-act" title="笔记" @click="emit('toggle-notes')"><AppIcon name="square-pen" :size="16" /><span>笔记</span></button>
          <!-- 目录不设按钮：侧栏「本页章节」常驻即目录（用户裁定：toc-panel 浮层与目录按钮均为冗余） -->
          <button class="sb-act" title="收起侧边栏" @click="collapsed = true"><AppIcon name="chevron-left" :size="16" /><span>收起</span></button>
        </div>
        <!-- 完成状态：只读徽章。原三处「永远 disabled 的按钮」是把状态伪装成可交互元素，已收敛到此一处。
             桌面 UX 方案批 2：内容页不渲染（「学习中」对内容页是零信息量噪音）；
             仅测验页显示 已交卷/待作答。移动端抽屉头徽章不受影响（保持已完成/学习中） -->
        <span v-if="isTestPage" class="sb-status" :class="{ on: isDone }" :title="isDone ? '本页测验已交卷' : '本页测验待作答'">
          <span class="sb-status__dot" aria-hidden="true"></span>{{ isDone ? '已交卷' : '待作答' }}
        </span>
      </div>

      <!-- ===== 快捷导航区：本页章节 ===== -->
      <nav v-if="toc.length" class="sb-nav">
        <div class="sb-title">本页章节</div>
        <ul>
          <li v-for="(item, i) in toc" :key="i">
            <button class="sb-item" @click="emit('scroll-to', item.index)">
              <span class="sb-icon"><AppIcon :name="item.icon" :size="15" /></span>
              <span class="sb-text">{{ item.title }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- ===== 快捷导航区：同单元页面 ===== -->
      <nav v-if="unit" class="sb-nav">
        <div class="sb-title">本单元内容</div>
        <ul>
          <li v-for="(f, i) in unit.files" :key="i">
            <button class="sb-item" :class="{ active: i === fileIndex }" @click="emit('go-file', i)">
              <span class="sb-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="sb-text">{{ f.title }}</span>
            </button>
          </li>
        </ul>
        <!-- 翻页兜底（桌面 UX 方案 commit 1）：键盘/分段条之外的三通道之一；
             复用已声明的 go-prev/go-next 事件与 UnitView 既有绑定（零新增链路） -->
        <div class="sb-pager">
          <button class="sb-unit-btn" :disabled="!hasPrev" title="上一页" @click="emit('go-prev')">← 上一页</button>
          <button class="sb-unit-btn" :disabled="!hasNext" title="下一页" @click="emit('go-next')">下一页 →</button>
        </div>
      </nav>

      <!-- ===== 快捷导航区：单元切换 ===== -->
      <nav v-if="site" class="sb-nav">
        <div class="sb-title">单元导航</div>
        <div class="sb-unit-goto">
          <button class="sb-unit-btn" :disabled="!prevUnit" :title="prevUnit ? '上一单元：' + prevUnit.title : '已是第一单元'" @click="emit('go-unit', prevUnit)">
            ← {{ prevUnit ? prevUnit.title.slice(0, 4) : '—' }}
          </button>
          <button class="sb-unit-btn" :disabled="!nextUnit" :title="nextUnit ? '下一单元：' + nextUnit.title : '已是最后一单元'" @click="emit('go-unit', nextUnit)">
            {{ nextUnit ? nextUnit.title.slice(0, 4) : '—' }} →
          </button>
        </div>
      </nav>
    </div>

    <!-- 收起态：迷你图标徽标（完成状态不在此重复，展开后在快捷区查看）；
         展开入口集成在此按钮组首位（独立把手已按用户裁定移除） -->
    <div v-else class="sidebar-mini">
      <button class="mini-item mini-item--expand" title="展开侧边栏" aria-label="展开侧边栏" @click="collapsed = false"><AppIcon name="chevron-right" :size="16" /></button>
      <button class="mini-item" title="顶部" aria-label="顶部" @click="emit('scroll-top')"><AppIcon name="arrow-up" :size="16" /></button>
      <!-- 掌握 mini 按钮：与展开态 sb-act 首位同语义（on = success 绿） -->
      <button class="mini-item" :class="{ on: mastered }" :title="mastered ? '已掌握本页，点击取消' : '标记本页已掌握'" :aria-label="mastered ? '取消掌握' : '标记掌握'" @click="emit('toggle-master')"><AppIcon name="target" :size="16" /></button>
      <button class="mini-item" :class="{ 'mini-item--marked': bookmarked }" :title="bookmarked ? '已收藏本页，点击取消' : '收藏本页'" :aria-label="bookmarked ? '取消收藏' : '收藏本页'" @click="emit('toggle-bookmark')"><AppIcon name="star" :size="16" :stroke-width="1.8" /></button>
      <button class="mini-item" title="笔记" aria-label="笔记" @click="emit('toggle-notes')"><AppIcon name="square-pen" :size="16" /></button>
    </div>
  </aside>

  <!-- ===== 移动端（≤1150px）：底部操作栏（翻页优先）+ 答题卡导航抽屉 + 更多面板 ===== -->
  <div class="sb-mobile">
    <!-- 抽屉遮罩 -->
    <div class="sb-backdrop" :class="{ show: sheetOpen || moreOpen }" @click="closeSheets"></div>

    <!-- 导航抽屉：单元进度 + 答题卡网格 + 本页章节 + 单元切换 -->
    <div
      class="sb-sheet"
      :class="{ open: sheetOpen, dragging: sheetDragging }"
      :style="sheetOpen && sheetDragY ? { transform: `translateY(${sheetDragY}px)` } : {}"
      role="dialog"
      aria-modal="true"
      aria-label="答题卡与章节导航"
      :aria-hidden="!sheetOpen"
    >
      <!-- 拖拽把手：下滑关闭抽屉 -->
      <div
        class="sb-sheet__grab"
        @touchstart.passive="onGrabTouchStart"
        @touchmove.prevent="onGrabTouchMove"
        @touchend="onGrabTouchEnd"
      >
        <span class="sb-sheet__grab-bar"></span>
      </div>
      <div class="sb-sheet__head">
        <span class="sb-sheet__title">{{ unit?.title }}</span>
        <!-- 完成状态：移动端唯一的只读状态徽章（与桌面端一致，非按钮） -->
        <span class="sb-status" :class="{ on: isDone }">
          <span class="sb-status__dot" aria-hidden="true"></span>{{ isDone ? '已完成' : '学习中' }}
        </span>
        <button class="sb-sheet__close" title="关闭" aria-label="关闭" @click="sheetOpen = false"><AppIcon name="x" :size="18" /></button>
      </div>
      <div class="sb-sheet__body">
        <!-- 单元完成进度 -->
        <div v-if="unit" class="sb-progress">
          <div class="sb-progress__track">
            <div class="sb-progress__fill" :style="{ width: unitDonePct + '%' }"></div>
          </div>
          <span class="sb-progress__text">{{ doneCount }}/{{ unit.files.length }} 已完成</span>
        </div>

        <!-- 答题卡网格：本单元页面一览（对勾 = 已完成 / 高亮 = 当前页 / 考 = 测验页） -->
        <nav v-if="unit" class="sb-nav">
          <div class="sb-title">答题卡 · 点击跳页</div>
          <div class="sb-grid">
            <button
              v-for="(f, i) in unit.files"
              :key="i"
              class="sb-grid__cell"
              :class="{ done: doneFiles[i], current: i === fileIndex, test: f.isTest }"
              :title="f.title"
              @click="emit('go-file', i); sheetOpen = false"
            >
              <span v-if="doneFiles[i]" class="sb-grid__check"><AppIcon name="check" :size="12" :stroke-width="2.5" /></span>
              <template v-else>{{ i + 1 }}</template>
              <span v-if="f.isTest" class="sb-grid__test">考</span>
            </button>
          </div>
        </nav>

        <!-- 本页章节 -->
        <nav v-if="toc.length" class="sb-nav">
          <div class="sb-title">本页章节</div>
          <ul>
            <li v-for="(item, i) in toc" :key="i">
              <button class="sb-item" @click="emit('scroll-to', item.index); sheetOpen = false">
                <span class="sb-icon"><AppIcon :name="item.icon" :size="15" /></span>
                <span class="sb-text">{{ item.title }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <!-- 单元切换 -->
        <nav v-if="site" class="sb-nav">
          <div class="sb-title">单元导航</div>
          <div class="sb-unit-goto">
            <button class="sb-unit-btn" :disabled="!prevUnit" :title="prevUnit ? '上一单元：' + prevUnit.title : '已是第一单元'" @click="emit('go-unit', prevUnit); sheetOpen = false">
              ← {{ prevUnit ? prevUnit.title.slice(0, 4) : '—' }}
            </button>
            <button class="sb-unit-btn" :disabled="!nextUnit" :title="nextUnit ? '下一单元：' + nextUnit.title : '已是最后一单元'" @click="emit('go-unit', nextUnit); sheetOpen = false">
              {{ nextUnit ? nextUnit.title.slice(0, 4) : '—' }} →
            </button>
          </div>
        </nav>
      </div>
    </div>

    <!-- 更多操作面板：收藏 / 笔记 / 完成 / 计算器 / 顶部 -->
    <div class="sb-sheet sb-sheet--more" :class="{ open: moreOpen }" role="dialog" aria-modal="true" aria-label="更多操作" :aria-hidden="!moreOpen">
      <div class="sb-sheet__head">
        <span class="sb-sheet__title">⋯ 更多操作</span>
        <button class="sb-sheet__close" title="关闭" aria-label="关闭" @click="moreOpen = false"><AppIcon name="x" :size="18" /></button>
      </div>
      <div class="sb-more">
        <button class="sb-more__item" @click="emit('toggle-bookmark'); moreOpen = false"><AppIcon name="star" :size="16" :stroke-width="1.8" /><span>收藏本页</span></button>
        <button class="sb-more__item" @click="emit('toggle-notes'); moreOpen = false"><AppIcon name="square-pen" :size="16" /><span>学习笔记</span></button>
        <button class="sb-more__item" @click="emit('scroll-top'); moreOpen = false"><AppIcon name="arrow-up" :size="16" /><span>返回顶部</span></button>
      </div>
    </div>

    <!-- 底部常驻操作栏：目录 / 上一页 / 下一页（主操作）/ 更多 -->
    <!-- v4：翻页/入口职责移交 ReaderFooter 与 ReaderTopbar，hideBar 时不渲染（§5.7.0） -->
    <div v-if="!hideBar" class="sb-bar">
      <button class="sb-bar__btn" :class="{ on: sheetOpen }" title="答题卡与章节导航" @click="openSheet('nav')"><AppIcon name="menu" :size="16" /><span>目录</span></button>
      <button class="sb-bar__btn" :disabled="!hasPrev" title="上一页" @click="emit('go-prev')">←<span>上页</span></button>
      <button class="sb-bar__next" :title="nextBtnTitle" @click="onNextClick">
        {{ nextBtnLabel }}
      </button>
      <button class="sb-bar__btn" :class="{ on: moreOpen }" title="更多操作" @click="openSheet('more')">⋯<span>更多</span></button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  unit: { type: Object, default: null },
  toc: { type: Array, default: () => [] },
  fileIndex: { type: Number, default: 0 },
  unitNum: { type: String, default: '' },
  site: { type: Object, default: null },
  isDone: { type: Boolean, default: false },
  isMath: { type: Boolean, default: false },
  // 单元内各页面完成状态（布尔数组，供移动端答题卡网格）
  doneFiles: { type: Array, default: () => [] },
  // 本页是否已手动掌握（页脚主行动同源数据，§5.7.7 语义③）
  mastered: { type: Boolean, default: false },
  // 本页是否已收藏（useBookmarks 同源数据；收藏态用主色星标而非 success 绿）
  bookmarked: { type: Boolean, default: false },
  // v4 学习页（§5.7.0 空间账：页脚 130→52）：翻页职责移交 ReaderFooter，
  // 本组件的移动端底部操作栏不再渲染；抽屉/更多面板保留，由父组件经 expose 打开
  hideBar: { type: Boolean, default: false }
})

const emit = defineEmits([
  'scroll-to', 'scroll-top',
  'toggle-master', 'toggle-bookmark', 'toggle-notes',
  'go-file', 'go-unit',
  'go-prev', 'go-next'
])

// 收起/展开状态（持久化）
const collapsed = ref(localStorage.getItem('sidebar_collapsed') === '1')
watch(collapsed, (v) => localStorage.setItem('sidebar_collapsed', v ? '1' : '0'))

// ===== 移动端：抽屉与更多面板 =====
// 导航抽屉开关
const sheetOpen = ref(false)
// 更多操作面板开关
const moreOpen = ref(false)

function openSheet(which) {
  if (which === 'nav') { sheetOpen.value = !sheetOpen.value; moreOpen.value = false }
  else { moreOpen.value = !moreOpen.value; sheetOpen.value = false }
}
function closeSheets() {
  sheetOpen.value = false
  moreOpen.value = false
}

// v4：底部操作栏隐藏后，父组件（UnitView）经模板 ref 打开答题卡抽屉/更多面板
defineExpose({ openSheet, closeSheets })

// Esc 关闭抽屉 / 更多面板
function onKeyDown(e) {
  if (e.key === 'Escape' && (sheetOpen.value || moreOpen.value)) closeSheets()
}
onMounted(() => window.addEventListener('keydown', onKeyDown))

// 面板打开时锁定背景滚动（移动端手势隔离）
watch([sheetOpen, moreOpen], ([s, m]) => {
  document.body.style.overflow = (s || m) ? 'hidden' : ''
})
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeyDown)
})

// 抽屉把手下拉手势：跟手位移，松手超过阈值即关闭
const sheetDragY = ref(0)
const sheetDragging = ref(false)
let grabStartY = 0

function onGrabTouchStart(e) {
  grabStartY = e.touches[0].clientY
  sheetDragging.value = true
  sheetDragY.value = 0
}
function onGrabTouchMove(e) {
  if (!sheetDragging.value) return
  sheetDragY.value = Math.max(0, e.touches[0].clientY - grabStartY)
}
function onGrabTouchEnd() {
  if (!sheetDragging.value) return
  if (sheetDragY.value > 70) sheetOpen.value = false
  sheetDragY.value = 0
  sheetDragging.value = false
}

// ===== 翻页（底部栏主操作） =====
const hasPrev = computed(() => props.fileIndex > 0)
const hasNext = computed(() => !!props.unit && props.fileIndex < props.unit.files.length - 1)

// 当前页是否测验页（桌面徽章只对测验页渲染，已交卷/待作答；内容页零信息量不渲染）
const isTestPage = computed(() => !!props.unit?.files[props.fileIndex]?.isTest)

// 完成状态自动记录（访问即完成 / 测验交卷），底部主按钮只负责翻页与单元跳转
function onNextClick() {
  if (hasNext.value) emit('go-next')
  else if (nextUnit.value) emit('go-unit', nextUnit.value)
  else emit('scroll-top')
}

// 底部主按钮文案/提示
const nextBtnLabel = computed(() => {
  if (hasNext.value) return '下一页 →'
  return nextUnit.value ? '下一单元 →' : '返回顶部 ↑'
})
const nextBtnTitle = computed(() => {
  if (hasNext.value) return '下一页'
  return nextUnit.value ? `下一单元：${nextUnit.value.title}` : '返回顶部'
})

// ===== 单元完成度（答题卡进度） =====
const doneCount = computed(() => props.doneFiles.filter(Boolean).length)
const unitDonePct = computed(() => {
  if (!props.unit || !props.unit.files.length) return 0
  return Math.round((doneCount.value / props.unit.files.length) * 100)
})

// 前后单元
const unitIdx = computed(() => {
  if (!props.site) return -1
  return props.site.units.findIndex((u) => u.num === props.unitNum)
})
const prevUnit = computed(() => unitIdx.value > 0 ? props.site.units[unitIdx.value - 1] : null)
const nextUnit = computed(() => unitIdx.value >= 0 && unitIdx.value < props.site.units.length - 1 ? props.site.units[unitIdx.value + 1] : null)
</script>

<style scoped>
.content-sidebar {
  position: fixed;
  /* 顶部对齐阅读区功能条之下（玻璃条 = tabbar 56 + reader-topbar 44），不与其抢占视觉层 */
  top: calc(var(--tabbar-h) + var(--sat) + var(--reader-topbar-h) + 8px);
  right: 12px;
  bottom: 12px;
  z-index: 90;
  /* 宽度取全局 token：reader.css 的功能条避让量与这里耦合，单一取值来源（main.css） */
  width: var(--sb-rail-w, 236px);
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, width 0.25s ease;
}
.content-sidebar.collapsed {
  width: 0;
}
.sidebar-inner {
  flex: 1;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  padding: 12px;
  scrollbar-width: thin;
}
.sb-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  margin: 10px 4px 6px;
  letter-spacing: 0.3px;
}
.sb-quick:first-child .sb-title { margin-top: 0; }
.sb-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.sb-act {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 7px 4px;
  font-size: 0.78rem;
  color: var(--text);
  transition: all 0.15s;
}
.sb-act:hover { border-color: var(--primary); color: var(--primary); }
.sb-act.on { background: rgba(var(--success-rgb), 0.12); border-color: var(--success); color: var(--success); }

/* 收藏态：主色 + 星标实心。刻意不复用 .on——success 绿语义专属「掌握/完成」
 * （桌面 UX 方案批 2，避免把收藏误读成已完成）。
 * AppIcon 的 fill="none" 是 presentation attribute，CSS fill 可覆盖 → 星标实心 */
.sb-act--marked { border-color: var(--primary); color: var(--primary); }
.sb-act--marked svg { fill: currentColor; }

/* 完成状态只读徽章（审计 §2-4 收敛：替代原先 3 处永远 disabled 的按钮；桌面/移动端共用） */
.sb-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--surface-muted);
  border: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.sb-status.on {
  background: rgba(var(--success-rgb), 0.12);
  border-color: var(--success);
  color: var(--success);
}
.sb-status__dot {
  flex: 0 0 auto;
  width: 6px; height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.sb-nav { border-top: 1px dashed var(--border); }
.sb-nav ul { list-style: none; }
.sb-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  font-size: 0.8rem;
  text-align: left;
  color: var(--text);
  transition: background 0.15s;
}
.sb-item:hover { background: var(--primary-soft); color: var(--primary); }
.sb-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
.sb-icon { flex: 0 0 auto; }
.sb-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sb-index {
  flex: 0 0 auto;
  font-size: 0.72rem;
  color: var(--text-muted);
  background: var(--surface-muted);
  border-radius: 6px;
  padding: 0 5px;
}
.sb-unit-goto { display: flex; gap: 6px; }
/* 「本单元内容」区尾部的翻页兜底行（桌面 UX 方案 commit 1），样式复用 sb-unit-btn */
.sb-pager { display: flex; gap: 6px; margin-top: 8px; }
.sb-unit-btn {
  flex: 1;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 7px 4px;
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.sb-unit-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.sb-unit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* 收起态迷你图标 */
.sidebar-mini {
  /* 收起态侧栏盒宽为 0，flex:1 会把迷你列推出视口右缘（实测越界 27px）→ 固定到视口右缝 */
  position: fixed;
  top: 116px; /* 与展开态侧栏 top（功能条下方 +8）对齐，展开/收起切换无跳动 */
  right: 12px;
  z-index: 95; /* 盖过内容区、低于功能条 */
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  padding: 8px 4px;
  width: 44px;
}
.mini-item {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1rem;
}
.mini-item:hover { border-color: var(--primary); }
.mini-item.on { color: var(--success); }
/* 收藏态 mini：与 sb-act--marked 一致用主色（.on 的 success 绿是掌握语义，不混用） */
.mini-item--marked { color: var(--primary); }
.mini-item--marked svg { fill: currentColor; }
/* 展开入口：收起态唯一的展开方式，primary 描边着色保证可发现性（用户实测反馈） */
.mini-item--expand { border-color: var(--primary); color: var(--primary); }

/* 移动端组件（桌面端隐藏） */
.sb-mobile { display: none; }

/* 响应式：窄屏隐藏桌面侧边栏，改用底部操作栏 + 答题卡抽屉 + 更多面板 */
@media (max-width: 1150px) {
  .content-sidebar { display: none; }

  .sb-mobile { display: block; }

  .sb-backdrop {
    position: fixed; inset: 0; z-index: 125;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0; pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .sb-backdrop.show { opacity: 1; pointer-events: auto; }

  /* ===== 底部抽屉（导航 / 更多 共用） ===== */
  .sb-sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 130;
    max-height: 72vh;
    display: flex; flex-direction: column;
    background: var(--surface);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-pop);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    transform: translateY(105%);
    transition: transform 0.28s ease;
    overflow: hidden;
  }
  .sb-sheet.open { transform: translateY(0); }
  /* 拖拽中：去掉过渡，位移跟手 */
  .sb-sheet.dragging { transition: none; }

  /* 拖拽把手 */
  .sb-sheet__grab {
    display: flex; align-items: center; justify-content: center;
    padding: 10px 0 2px;
    cursor: grab;
    touch-action: none;
  }
  .sb-sheet__grab-bar {
    width: 38px; height: 4px;
    border-radius: var(--radius-full);
    background: var(--border);
  }

  .sb-sheet__head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    font-weight: 700;
    font-size: 0.95rem;
  }
  /* 仅标题参与省略；徽章/按钮不应被 nowrap 规则命中 */
  .sb-sheet__title {
    flex: 1;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  /* 抽屉头内的徽章：作为 flex 项不参与纵向堆叠间距 */
  .sb-sheet__head .sb-status { margin-top: 0; flex: 0 0 auto; }
  .sb-sheet__close {
    flex: 0 0 auto;
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius-full);
    background: var(--surface-muted);
    border: 1px solid var(--border);
  }
  .sb-sheet__body { overflow-y: auto; padding: 4px 12px 12px; }
  .sb-sheet .sb-title { margin-top: 12px; }
  .sb-sheet .sb-item { padding: 12px 8px; min-height: 44px; }
  .sb-sheet .sb-unit-btn { padding: 12px 4px; }

  /* 单元完成进度 */
  .sb-progress {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 4px 4px;
  }
  .sb-progress__track {
    flex: 1; height: 8px;
    background: var(--surface-muted);
    border-radius: var(--radius-full);
    overflow: hidden;
  }
  .sb-progress__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--success), #7bc96f);
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
  }
  .sb-progress__text { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; }

  /* 答题卡网格 */
  .sb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 8px;
    padding: 2px 0 4px;
  }
  .sb-grid__cell {
    position: relative;
    height: 48px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface-muted);
    border: 1.5px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: all 0.15s;
  }
  .sb-grid__cell:active { transform: scale(0.94); }
  .sb-grid__cell.done {
    background: rgba(var(--success-rgb), 0.12);
    border-color: var(--success);
    color: var(--success);
  }
  .sb-grid__cell.current {
    border-color: var(--primary);
    color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary-soft);
  }
  /* 测验页角标 */
  .sb-grid__test {
    position: absolute; top: 2px; right: 3px;
    font-size: 0.55rem;
    color: var(--warning);
    font-weight: 700;
  }

  /* 更多操作面板 */
  .sb-sheet--more { max-height: none; }
  .sb-more {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 14px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  }
  .sb-more__item {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 6px;
    min-height: 64px;
    background: var(--surface-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 1.3rem;
    color: var(--text);
    transition: all 0.15s;
  }
  .sb-more__item:active { transform: scale(0.95); }
  .sb-more__item span { font-size: 0.75rem; color: var(--text-muted); }
  .sb-more__item.on { background: rgba(var(--success-rgb), 0.12); border-color: var(--success); }
  .sb-more__item.on span { color: var(--success); }

  /* ===== 底部常驻操作栏：目录 / 上页 / 下页（主操作）/ 更多 ===== */
  .sb-bar {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 120;
    display: flex; align-items: stretch; gap: 6px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 6px 10px calc(6px + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -2px 10px rgba(31, 36, 48, 0.06);
  }
  /* 暗色模式下底部栏阴影随主题适配 */
  :root[data-theme="dark"] .sb-bar { box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.45); }
  .sb-bar__btn {
    flex: 1; min-width: 0; min-height: 48px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px;
    padding: 4px 2px;
    font-size: 1.1rem;
    color: var(--text-muted);
    border-radius: var(--radius-md);
    transition: color 0.15s, background 0.15s;
  }
  .sb-bar__btn span { font-size: 0.66rem; line-height: 1.2; color: var(--text-muted); }
  .sb-bar__btn.on, .sb-bar__btn.on span { color: var(--primary); background: var(--primary-soft); }
  .sb-bar__btn:disabled { opacity: 0.35; }
  /* 主操作按钮：下一页 */
  .sb-bar__next {
    flex: 1.5; min-height: 48px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 10px;
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    font-size: 0.95rem;
    font-weight: 700;
    box-shadow: var(--shadow-xs);
    transition: transform 0.15s;
  }
  .sb-bar__next:active { transform: scale(0.97); }
}

/* 横屏：底部栏与抽屉左右安全区适配（刘海屏） */
@media (max-width: 1150px) and (orientation: landscape) {
  .sb-bar { padding-left: calc(10px + var(--sal)); padding-right: calc(10px + var(--sar)); }
  .sb-sheet { left: var(--sal); right: var(--sar); }
}
</style>