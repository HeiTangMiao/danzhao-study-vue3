<!--
  ContentSidebar —— 内容页固定侧边栏（快捷导航 + 快捷操作）
  职责：
   - 快捷操作区（吸顶）：返回顶部 / 标记完成 / 书签 / 笔记 / 目录 / Desmos/展开收起
   - 快捷导航区（可滚动）：本页区块章节 / 同单元其他页面 / 前后单元切换
  props:
   - unit        当前单元配置（含 files 列表）
   - toc         本页目录（[{index,type,title}]）
   - fileIndex    当前页索引（同单元内）
   - subject     当前学科号
   - unitNum     当前单元号
   - site        学科配置（用于单元间导航）
   - isDone      是否已完成
   - isMath      是否数学学科（控制 GeoGebra 入口显隐）
   - doneFiles   单元内各页面完成状态（布尔数组，移动端答题卡）
  移动端（≤1150px）形态：底部操作栏（目录/上页/下页主按钮/更多）+ 答题卡导航抽屉（下滑手势关闭）+ 更多操作面板
  emits:
   - scroll-to   跳转到区块 ({index})
   - toggle-done 标记完成
   - toggle-bookmark 书签
   - toggle-notes 笔记
   - toggle-toc  目录面板
   - open-geogebra 打开 GeoGebra 演练场
   - go-file     跳转同单元指定页
   - go-unit     跳转指定单元
   - go-prev     上一页（移动端底部栏）
   - go-next     下一页（移动端底部栏）
-->
<template>
  <aside class="content-sidebar" :class="{ collapsed, 'math': isMath }">
    <!-- 展开/收起开关（常驻右下/右上浮动） -->
    <button class="sidebar-toggle" :class="{ active: !collapsed }" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="collapsed = !collapsed">
      {{ collapsed ? '◀' : '▶' }}
    </button>

    <div v-if="!collapsed" class="sidebar-inner">
      <!-- ===== 快捷操作区（吸顶） ===== -->
      <div class="sb-quick">
        <div class="sb-title">⚡ 快捷操作</div>
        <div class="sb-actions">
          <button class="sb-act" title="返回顶部" @click="emit('scroll-top')">⬆ <span>顶部</span></button>
          <button class="sb-act" :class="{ on: isDone }" title="标记完成" @click="emit('toggle-done')">
            {{ isDone ? '✅' : '○' }} <span>完成</span>
          </button>
          <button class="sb-act" title="本页目录" @click="emit('toggle-toc')">☰ <span>目录</span></button>
          <button class="sb-act" title="收藏本页" @click="emit('toggle-bookmark')">★ <span>收藏</span></button>
          <button class="sb-act" title="笔记" @click="emit('toggle-notes')">📝 <span>笔记</span></button>
          <button v-if="isMath" class="sb-act sb-desmos" title="GeoGebra 图形计算器演练场" @click="emit('open-geogebra')">
            🧮 <span>GeoGebra</span>
          </button>
        </div>
      </div>

      <!-- ===== 快捷导航区：本页章节 ===== -->
      <nav v-if="toc.length" class="sb-nav">
        <div class="sb-title">📑 本页章节</div>
        <ul>
          <li v-for="(item, i) in toc" :key="i">
            <button class="sb-item" @click="emit('scroll-to', item.index)">
              <span class="sb-icon">{{ item.icon }}</span>
              <span class="sb-text">{{ item.title }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- ===== 快捷导航区：同单元页面 ===== -->
      <nav v-if="unit" class="sb-nav">
        <div class="sb-title">📚 本单元内容</div>
        <ul>
          <li v-for="(f, i) in unit.files" :key="i">
            <button class="sb-item" :class="{ active: i === fileIndex }" @click="emit('go-file', i)">
              <span class="sb-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="sb-text">{{ f.title }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <!-- ===== 快捷导航区：单元切换 ===== -->
      <nav v-if="site" class="sb-nav">
        <div class="sb-title">🔄 单元导航</div>
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

    <!-- 收起态：迷你图标徽标 -->
    <div v-else class="sidebar-mini">
      <button class="mini-item" title="顶部" aria-label="顶部" @click="emit('scroll-top')">⬆</button>
      <button class="mini-item" :class="{ on: isDone }" title="完成" aria-label="标记完成" @click="emit('toggle-done')">{{ isDone ? '✅' : '○' }}</button>
      <button class="mini-item" title="目录" aria-label="目录" @click="emit('toggle-toc')">☰</button>
      <button class="mini-item" title="收藏" aria-label="收藏" @click="emit('toggle-bookmark')">★</button>
      <button class="mini-item" title="笔记" aria-label="笔记" @click="emit('toggle-notes')">📝</button>
      <button v-if="isMath" class="mini-item" title="GeoGebra 演练场" aria-label="GeoGebra 图形计算器" @click="emit('open-geogebra')">🧮</button>
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
        <span>📚 {{ unit?.title }}</span>
        <button class="sb-sheet__close" title="关闭" aria-label="关闭" @click="sheetOpen = false">✕</button>
      </div>
      <div class="sb-sheet__body">
        <!-- 单元完成进度 -->
        <div v-if="unit" class="sb-progress">
          <div class="sb-progress__track">
            <div class="sb-progress__fill" :style="{ width: unitDonePct + '%' }"></div>
          </div>
          <span class="sb-progress__text">{{ doneCount }}/{{ unit.files.length }} 已完成</span>
        </div>

        <!-- 答题卡网格：本单元页面一览（✓ 已完成 / 高亮 当前页 / 考 测验页） -->
        <nav v-if="unit" class="sb-nav">
          <div class="sb-title">🗂 答题卡 · 点击跳页</div>
          <div class="sb-grid">
            <button
              v-for="(f, i) in unit.files"
              :key="i"
              class="sb-grid__cell"
              :class="{ done: doneFiles[i], current: i === fileIndex, test: f.isTest }"
              :title="f.title"
              @click="emit('go-file', i); sheetOpen = false"
            >
              <span v-if="doneFiles[i]" class="sb-grid__check">✓</span>
              <template v-else>{{ i + 1 }}</template>
              <span v-if="f.isTest" class="sb-grid__test">考</span>
            </button>
          </div>
        </nav>

        <!-- 本页章节 -->
        <nav v-if="toc.length" class="sb-nav">
          <div class="sb-title">📑 本页章节</div>
          <ul>
            <li v-for="(item, i) in toc" :key="i">
              <button class="sb-item" @click="emit('scroll-to', item.index); sheetOpen = false">
                <span class="sb-icon">{{ item.icon }}</span>
                <span class="sb-text">{{ item.title }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <!-- 单元切换 -->
        <nav v-if="site" class="sb-nav">
          <div class="sb-title">🔄 单元导航</div>
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
        <span>⋯ 更多操作</span>
        <button class="sb-sheet__close" title="关闭" aria-label="关闭" @click="moreOpen = false">✕</button>
      </div>
      <div class="sb-more">
        <button class="sb-more__item" :class="{ on: isDone }" @click="emit('toggle-done'); moreOpen = false">
          {{ isDone ? '✅' : '○' }}<span>{{ isDone ? '已完成' : '标记完成' }}</span>
        </button>
        <button class="sb-more__item" @click="emit('toggle-bookmark'); moreOpen = false">★<span>收藏本页</span></button>
        <button class="sb-more__item" @click="emit('toggle-notes'); moreOpen = false">📝<span>学习笔记</span></button>
        <button v-if="isMath" class="sb-more__item sb-more__calc" @click="emit('open-geogebra'); moreOpen = false">🧮<span>计算器</span></button>
        <button class="sb-more__item" @click="emit('scroll-top'); moreOpen = false">⬆<span>返回顶部</span></button>
      </div>
    </div>

    <!-- 底部常驻操作栏：目录 / 上一页 / 下一页（主操作）/ 更多 -->
    <div class="sb-bar">
      <button class="sb-bar__btn" :class="{ on: sheetOpen }" title="答题卡与章节导航" @click="openSheet('nav')">☰<span>目录</span></button>
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

const props = defineProps({
  unit: { type: Object, default: null },
  toc: { type: Array, default: () => [] },
  fileIndex: { type: Number, default: 0 },
  unitNum: { type: String, default: '' },
  site: { type: Object, default: null },
  isDone: { type: Boolean, default: false },
  isMath: { type: Boolean, default: false },
  // 单元内各页面完成状态（布尔数组，供移动端答题卡网格）
  doneFiles: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'scroll-to', 'scroll-top', 'toggle-done',
  'toggle-bookmark', 'toggle-notes', 'toggle-toc',
  'open-geogebra', 'go-file', 'go-unit',
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

// 末页时主按钮转为「标记完成」；末页且已完成则进入下一单元，无下一单元则返回顶部
function onNextClick() {
  if (hasNext.value) emit('go-next')
  else if (!props.isDone) emit('toggle-done')
  else if (nextUnit.value) emit('go-unit', nextUnit.value)
  else emit('scroll-top')
}

// 底部主按钮文案/提示（随页次与完成状态切换，避免「死按钮」）
const nextBtnLabel = computed(() => {
  if (hasNext.value) return '下一页 →'
  if (!props.isDone) return '完成 ✓'
  return nextUnit.value ? '下一单元 →' : '返回顶部 ↑'
})
const nextBtnTitle = computed(() => {
  if (hasNext.value) return '下一页'
  if (!props.isDone) return '标记完成'
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
  top: 64px;
  right: 12px;
  bottom: 12px;
  z-index: 90;
  width: 236px;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, width 0.25s ease;
}
.content-sidebar.collapsed {
  width: 0;
}
.sidebar-toggle {
  position: absolute;
  top: 12px;
  left: -34px;
  width: 26px;
  height: 34px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-right: none;
  border-radius: 10px 0 0 10px;
  box-shadow: var(--shadow-sm);
  color: var(--text-muted);
  font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
  z-index: 95;
}
.sidebar-toggle:hover { color: var(--primary); }
.sidebar-inner {
  flex: 1;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
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
.sb-act.on { background: rgba(47, 158, 68, 0.12); border-color: var(--success); color: var(--success); }
.sb-desmos { background: rgba(226, 128, 52, 0.14); border-color: var(--accent); color: var(--accent); }

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
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
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
    box-shadow: var(--shadow-md);
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
  .sb-sheet__head span {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
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
    background: rgba(47, 158, 68, 0.12);
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
  .sb-more__item.on { background: rgba(47, 158, 68, 0.12); border-color: var(--success); }
  .sb-more__item.on span { color: var(--success); }
  .sb-more__calc { background: rgba(226, 128, 52, 0.12); border-color: var(--accent); }
  .sb-more__calc span { color: var(--accent); }

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
    box-shadow: var(--shadow-sm);
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