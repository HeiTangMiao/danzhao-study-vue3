<!--
  UnitView —— 内容页（Schema 驱动渲染，多学科支持）
  职责：
   - 根据路由参数 subject + unitNum + fileIndex 加载对应内容数据
   - 将内容区块数组交给 BlockRenderer 逐块渲染
   - 提供上一页/下一页导航与完成标记
   - 游戏化追踪：页面访问奖励 XP、答题奖励 XP
   - 笔记功能：每页可记录学习笔记
   - 书签功能：收藏当前页面
-->
<template>
  <div class="unit-view">
    <!-- 面包屑导航 -->
    <nav class="breadcrumb">
      <router-link to="/">🏠 首页</router-link>
      <span class="crumb-sep">/</span>
      <span>{{ site.breadcrumbHome }}</span>
      <span class="crumb-sep">/</span>
      <span>{{ unit?.title }}</span>
    </nav>

    <!-- 页面头部 -->
    <header v-if="page" class="page-header">
      <div class="page-header__row">
        <div>
          <h1>{{ page.title }}</h1>
          <p class="page-subtitle">{{ page.subtitle }}</p>
        </div>
        <!-- 工具按钮：书签 + 笔记 -->
        <div class="page-tools">
          <button class="tool-btn" :class="{ active: bookmark.isBookmarked.value }" title="收藏" @click="bookmark.toggleBookmark()">
            {{ bookmark.isBookmarked.value ? '★' : '☆' }}
          </button>
          <button class="tool-btn" title="笔记" @click="showNotes = !showNotes">📝</button>
        </div>
      </div>
      <button class="done-btn" :class="{ done: isDone }" @click="toggleDone">
        {{ isDone ? '✅ 已完成' : '○ 标记完成' }}
      </button>
      <!-- XP 获得提示 -->
      <transition name="fade">
        <span v-if="xpPopup" class="xp-popup">+{{ xpPopup }} XP</span>
      </transition>
    </header>

    <!-- 加载中提示 -->
    <div v-if="!page && loading" class="loading-hint">
      <span class="loading-spinner"></span> 正在加载内容…
    </div>

    <!-- 内容加载失败提示 -->
    <div v-if="!page && !loading" class="error-hint card">
      <p>⚠️ 内容加载失败</p>
      <p class="error-detail">学科: {{ subject }} | 单元: {{ route.params.unitNum }} | 文件: {{ route.params.fileIndex || 0 }}</p>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>

    <!-- 笔记面板（折叠式） -->
    <section v-if="showNotes && page" class="notes-section card">
      <div class="notes-head">
        <span>📝 我的笔记</span>
        <span class="notes-status" :class="'notes-' + notes.statusType.value">{{ notes.status.value }}</span>
      </div>
      <textarea
        v-model="notes.content.value"
        class="notes-textarea"
        placeholder="在此记录学习笔记…（自动保存）"
        @input="notes.scheduleAutosave()"
      ></textarea>
      <div class="notes-foot">
        <span>{{ notes.wordCount.value }} 字</span>
        <button class="notes-save" @click="notes.manualSave()">💾 保存</button>
      </div>
    </section>

    <!-- 内容主体：逐块渲染 -->
    <main v-if="page" class="page-content">
      <BlockRenderer v-for="(block, i) in page.blocks" :key="i" :block="block" />
    </main>

    <!-- 页面切换导航 -->
    <nav v-if="unit" class="page-nav">
      <button class="nav-btn" :disabled="!hasPrev" @click="goPrev">← 上一页</button>
      <span class="nav-index">{{ fileIndex + 1 }} / {{ unit.files.length }}</span>
      <button class="nav-btn" :disabled="!hasNext" @click="goNext">下一页 →</button>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSubjectConfig } from '@/content/index'
import { useProgressStore } from '@/stores/progress'
import { useGameEngineStore } from '@/stores/gameEngine'
import { useNotes } from '@/composables/useNotes'
import { useBookmarks } from '@/composables/useBookmarks'
import BlockRenderer from '@/components/BlockRenderer.vue'

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()
const game = useGameEngineStore()

// 当前学科（从路由参数获取，默认 math）
const subject = computed(() => route.params.subject || 'math')

// 当前学科配置（动态获取）
const site = computed(() => getSubjectConfig(subject.value))

// 当前单元（根据路由 unitNum 在当前学科配置中匹配）
const unit = computed(() => site.value.units.find((u) => u.num === route.params.unitNum))

// 当前页索引（从路由或默认 0）
const fileIndex = computed(() => {
  const n = Number(route.params.fileIndex)
  return unit.value && !Number.isNaN(n) ? Math.min(n, unit.value.files.length - 1) : 0
})

// 当前页面元信息
const fileMeta = computed(() => unit.value?.files[fileIndex.value])

// 笔记面板显隐
const showNotes = ref(false)

// 加载状态
const loading = ref(false)

// XP 获得浮动提示
const xpPopup = ref(null)
let xpPopupTimer = null

/** 显示 XP 获得提示（2 秒后消失） */
function showXPPopup(xp) {
  if (!xp) return
  xpPopup.value = xp
  if (xpPopupTimer) clearTimeout(xpPopupTimer)
  xpPopupTimer = setTimeout(() => { xpPopup.value = null }, 2000)
}

// 生成页面唯一标识（学科_单元号_文件名）
const pageKey = computed(() => {
  if (!unit.value || !fileMeta.value) return ''
  return `${subject.value}_${unit.value.num}_${fileMeta.value.name}`
})

// 笔记 composable（按页面 key 隔离）
const notes = useNotes(pageKey.value, subject.value, {
  title: fileMeta.value?.title,
  unitTitle: unit.value?.title
})

// 书签 composable
const bookmark = useBookmarks(pageKey.value, subject.value, {
  title: fileMeta.value?.title,
  unitTitle: unit.value?.title,
  unitNum: unit.value?.num
})

// 动态加载内容数据（Vite 支持动态 import）
const page = ref(null)

/** 加载页面内容并追踪访问（奖励 XP） */
async function loadPage() {
  if (!unit.value || !fileMeta.value) return
  loading.value = true
  page.value = null
  try {
    // 根据学科动态导入对应内容文件
    const m = await import(`@/content/${subject.value}/${unit.value.folder}/${fileMeta.value.name}.js`)
    page.value = m.default
    // 游戏化追踪：记录页面访问
    const result = await game.trackVisit(
      subject.value,
      unit.value.num,
      unit.value.title,
      pageKey.value,
      fileMeta.value.title,
      fileMeta.value.isTest || false
    )
    if (result.xpGained > 0) showXPPopup(result.xpGained)
  } catch (e) {
    console.error('[UnitView] 内容加载失败:', e)
    page.value = null
  } finally {
    loading.value = false
  }
}

loadPage()

// 完成状态（按学科隔离）
const isDone = computed(() => progress.isCompleted(subject.value, unit.value?.num, fileIndex.value))

// 标记完成
function toggleDone() {
  progress.toggleComplete(subject.value, unit.value?.num, fileIndex.value)
}

// 翻页导航
const hasPrev = computed(() => fileIndex.value > 0)
const hasNext = computed(() => unit.value && fileIndex.value < unit.value.files.length - 1)

function goPrev() {
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: fileIndex.value - 1 } })
}
function goNext() {
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: fileIndex.value + 1 } })
}

// 监听路由变化重新加载内容（切换页面或学科时触发）
watch(
  () => [route.params.subject, route.params.unitNum, route.params.fileIndex],
  () => { loadPage() }
)
</script>

<style scoped>
.breadcrumb { margin-bottom: var(--spacer-16); color: var(--text-muted); font-size: 0.85rem; }
.crumb-sep { margin: 0 var(--spacer-8); }
.page-header { margin-bottom: var(--spacer-24); position: relative; }
.page-header__row { display: flex; justify-content: space-between; align-items: flex-start; }
.page-header h1 { font-size: 1.6rem; }
.page-subtitle { color: var(--text-muted); margin-top: var(--spacer-8); }
.page-tools { display: flex; gap: var(--spacer-8); }
.tool-btn {
  width: 36px; height: 36px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-full); cursor: pointer;
  font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
}
.tool-btn.active { color: var(--warning); border-color: var(--warning); }
.done-btn {
  margin-top: var(--spacer-12);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 6px 16px;
}
.done-btn.done { background: rgba(47, 158, 68, 0.12); border-color: var(--success); color: var(--success); }

/* XP 浮动提示 */
.xp-popup {
  position: absolute; top: 0; right: 0;
  background: var(--primary); color: #fff;
  padding: 4px 14px; border-radius: var(--radius-full);
  font-weight: 600; font-size: 0.9rem;
  animation: xpFloat 2s ease;
}
@keyframes xpFloat {
  0% { opacity: 0; transform: translateY(10px); }
  20% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-10px); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }

/* 加载提示 */
.loading-hint { text-align: center; padding: var(--spacer-40); color: var(--text-muted); }
.loading-spinner {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid var(--border); border-top-color: var(--primary);
  border-radius: 50%; animation: spin 0.8s linear infinite;
  vertical-align: middle; margin-right: var(--spacer-8);
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 错误提示 */
.error-hint { text-align: center; padding: var(--spacer-24); }
.error-hint p { margin: var(--spacer-8) 0; }
.error-detail { color: var(--text-muted); font-size: 0.85rem; }
.back-link { display: inline-block; margin-top: var(--spacer-12); color: var(--primary); }

/* 笔记面板 */
.notes-section { padding: var(--spacer-16); margin-bottom: var(--spacer-16); }
.notes-head { display: flex; justify-content: space-between; margin-bottom: var(--spacer-8); font-weight: 600; }
.notes-status { font-weight: 400; font-size: 0.8rem; }
.notes-saved { color: var(--success); }
.notes-saving { color: var(--warning); }
.notes-error { color: var(--danger); }
.notes-textarea {
  width: 100%; min-height: 100px;
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: var(--spacer-12);
  color: var(--text); font-family: inherit; font-size: 0.9rem;
  resize: vertical;
}
.notes-foot { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacer-8); font-size: 0.8rem; color: var(--text-muted); }
.notes-save { background: var(--primary-soft); color: var(--primary); border: none; border-radius: var(--radius-full); padding: 4px 12px; cursor: pointer; }

.page-content { display: flex; flex-direction: column; gap: var(--spacer-8); }
.page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacer-24);
}
.nav-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  padding: 8px 20px;
}
.nav-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.nav-index { color: var(--text-muted); font-size: 0.85rem; }
</style>
