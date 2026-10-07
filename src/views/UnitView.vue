<!--
  UnitView —— 内容页（Schema 驱动渲染，多学科支持）
  职责：
   - 根据路由参数 subject + unitNum + fileIndex 加载对应内容数据
   - 将内容区块数组交给 BlockRenderer 逐块渲染
   - 提供上一页/下一页导航与完成标记
   - 学习追踪：记录页面访问、答题与测验成绩（无游戏化奖励）
   - 笔记功能：每页可记录学习笔记
   - 书签功能：收藏当前页面
  导航互斥（system_design §4.1 / §9.3）：
   - 本视图为详情页（路由不携带 meta.tab），故 AppTabBar 的底部 pill 自动隐藏，
     由 ContentSidebar 的底部操作栏接管 —— 两个底栏不同屏。
   - 桌面端顶栏仍常驻（承载用户区入口）；其与阅读进度条的层叠由本文件 `.reading-progress`
     的桌面端 top 下移解决（进度条降至顶栏下方）。
   - 完成状态不再在页眉重复渲染（原 `.done-chip` 为第 4 份拷贝）；
     统一由 ContentSidebar 的只读状态徽章承担（每端 1 处，见架构审计 §2-3）。
-->
<template>
  <div class="unit-view">
    <!-- 阅读进度条 -->
    <div class="reading-progress">
      <div class="reading-progress__bar" :style="{ width: readProgress + '%' }"></div>
    </div>

    <!-- 移动端迷你顶栏：滚动离开页面头部后出现（返回首页 + 标题 + 阅读进度） -->
    <transition name="topbar">
      <div v-if="showTopbar && page" class="mobile-topbar">
        <button class="topbar-back" title="返回首页" aria-label="返回首页" @click="router.push('/')">←</button>
        <span class="topbar-title">{{ fileMeta?.title }}</span>
        <span class="topbar-progress">{{ readProgress }}%</span>
      </div>
    </transition>

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
        <!-- 工具按钮：目录 + 书签 + 笔记 -->
        <div class="page-tools">
          <button v-if="toc.length > 0" class="tool-btn" :class="{ active: showToc }" title="目录" aria-label="目录" @click="showToc = !showToc">☰</button>
          <button class="tool-btn" :class="{ active: bookmark.isBookmarked.value }" title="收藏" aria-label="收藏" @click="bookmark.toggleBookmark()">
            {{ bookmark.isBookmarked.value ? '★' : '☆' }}
          </button>
          <button class="tool-btn" title="笔记" aria-label="笔记" @click="showNotes = !showNotes">📝</button>
        </div>
      </div>
    </header>

    <!-- 目录导航（折叠式） -->
    <section v-if="showToc && page && toc.length > 0" class="toc-panel card">
      <div class="toc-head">📑 本页目录</div>
      <ul class="toc-list">
        <li v-for="(item, i) in toc" :key="i">
          <button class="toc-item" @click="scrollToBlock(item.index)">
            <span class="toc-icon">{{ item.icon }}</span>
            <span class="toc-text">{{ item.title }}</span>
          </button>
        </li>
      </ul>
    </section>

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
      <div
        v-for="(block, i) in page.blocks"
        :id="'block-' + i"
        :key="i"
        class="block-anchor"
      >
        <BlockRenderer
          :block="block"
          :context="pageContext"
        />
      </div>
    </main>

    <!-- 页面切换导航 -->
    <nav v-if="unit" class="page-nav">
      <button class="nav-btn" :disabled="!hasPrev" @click="goPrev">← 上一页</button>
      <span class="nav-index">{{ fileIndex + 1 }} / {{ unit.files.length }}</span>
      <button class="nav-btn" :disabled="!hasNext" @click="goNext">下一页 →</button>
    </nav>

    <!-- 固定侧边栏：快捷导航 + 快捷操作（移动端为底部栏 + 答题卡抽屉） -->
    <ContentSidebar
      v-if="page"
      :unit="unit"
      :toc="toc"
      :file-index="fileIndex"
      :unit-num="route.params.unitNum"
      :site="site"
      :is-done="isDone"
      :is-math="subject === 'math'"
      :done-files="doneFiles"
      @scroll-to="scrollToBlock"
      @scroll-top="scrollTop"
      @toggle-bookmark="bookmark.toggleBookmark()"
      @toggle-notes="showNotes = !showNotes"
      @toggle-toc="showToc = !showToc"
      @go-file="goFile"
      @go-unit="goUnit"
      @go-prev="goPrev"
      @go-next="goNext"
    />

    <!-- 番茄钟悬浮计时器（学习时随时开启，状态自动持久化） -->
    <div class="pomodoro-fab">
      <transition name="fade">
        <div v-if="pomodoroOpen" class="pomodoro-card card" @click.stop>
          <div class="pomodoro-card__head">
            <span class="pomodoro-mode" :class="'mode-' + pomodoro.mode.value">🍅 {{ pomodoro.modeLabel.value }}</span>
            <span v-if="pomodoro.running.value" class="pomodoro-running">进行中</span>
          </div>
          <div class="pomodoro-time">{{ pomodoro.display.value }}</div>
          <div class="pomodoro-progress">
            <div class="pomodoro-progress__bar" :style="{ width: pomodoro.progress.value * 100 + '%' }"></div>
          </div>
          <div class="pomodoro-today">今日已完成 {{ pomodoro.sessionsCompleted.value }} 个番茄</div>
          <div class="pomodoro-actions">
            <button class="pomodoro-btn pomodoro-btn--primary" @click="pomodoro.running.value ? pomodoro.pause() : pomodoro.start()">
              {{ pomodoro.running.value ? '⏸ 暂停' : '▶ 开始' }}
            </button>
            <button class="pomodoro-btn" @click="pomodoro.reset()">↺ 重置</button>
            <button class="pomodoro-btn" @click="pomodoro.skip()">⏭ 跳过</button>
          </div>
        </div>
      </transition>
      <button
        class="pomodoro-fab__btn"
        :class="{ open: pomodoroOpen }"
        :aria-label="pomodoroOpen ? '收起番茄钟' : '打开番茄钟'"
        :title="pomodoroOpen ? '收起番茄钟' : '打开番茄钟'"
        @click="pomodoroOpen = !pomodoroOpen"
      >🍅</button>
    </div>

    <!-- 离开确认弹层（考试作答中导航离开前统一弹确认） -->
    <transition name="fade">
      <div v-if="confirmLeave" class="leave-confirm-overlay" @click.self="handleLeaveConfirm(false)">
        <div class="leave-confirm card">
          <div class="leave-confirm__title">⚠️ 确定离开？</div>
          <p class="leave-confirm__msg">{{ confirmMsg }}</p>
          <div class="leave-confirm__actions">
            <button class="leave-confirm__btn leave-confirm__cancel" @click="handleLeaveConfirm(false)">继续作答</button>
            <button class="leave-confirm__btn leave-confirm__ok" @click="handleLeaveConfirm(true)">离开</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, provide, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { getSubjectConfig } from '@/content/index'
// 别名导入：本组件已有名为 loadPage 的本地函数（负责访问记录/进度刷新等副作用）
import { loadPage as loadContentPage } from '@/content/loadPage'
import { useProgressStore } from '@/stores/progress'
import { useStudyDbStore } from '@/stores/studyDb'
import { useNotes } from '@/composables/useNotes'
import { useBookmarks } from '@/composables/useBookmarks'
import { usePomodoro } from '@/composables/usePomodoro'
import BlockRenderer from '@/components/BlockRenderer.vue'
import { iconOf } from '@/components/blocks/registry'
import ContentSidebar from '@/components/ContentSidebar.vue'

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()
const db = useStudyDbStore()

// 番茄钟（学习页悬浮计时器）
const pomodoro = usePomodoro()
const pomodoroOpen = ref(false)

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

// 生成页面唯一标识（学科_单元号_文件名）
const pageKey = computed(() => {
  if (!unit.value || !fileMeta.value) return ''
  return `${subject.value}_${unit.value.num}_${fileMeta.value.name}`
})

// 页面上下文（供交互区块记录错题等）
const pageContext = computed(() => ({
  subject: subject.value,
  unitNum: unit.value?.num || '',
  fileKey: pageKey.value,
  fileTitle: fileMeta.value?.title || '',
  unitTitle: unit.value?.title || ''
}))

// ===== 目录导航（TOC）与阅读进度 =====

// 生成目录：仅收录「有标题 且 该类型配置了图标」的区块
// 图标来自 blocks/registry.js，未知类型图标为空字符串，自然被过滤掉
const toc = computed(() => {
  if (!page.value || !Array.isArray(page.value.blocks)) return []
  return page.value.blocks
    .map((b, i) => ({ index: i, type: b.type, title: b.title, icon: iconOf(b.type) }))
    .filter((b) => b.title && b.icon)
})

// 目录面板显隐
const showToc = ref(false)

// 滚动到指定区块
function scrollToBlock(index) {
  const el = document.getElementById('block-' + index)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 阅读进度（0-100）
const readProgress = ref(0)

// 移动端迷你顶栏：滚动超过一屏后出现（返回 + 标题 + 进度百分比）
const showTopbar = ref(false)

// 计算滚动阅读进度
function updateReadProgress() {
  const doc = document.documentElement
  const total = doc.scrollHeight - window.innerHeight
  if (total <= 0) { readProgress.value = 0; showTopbar.value = false; return }
  const scrolled = window.scrollY
  readProgress.value = Math.min(100, Math.round((scrolled / total) * 100))
  showTopbar.value = scrolled > 200
}

// 监听滚动更新进度条（rAF 合并，避免每帧触发 Vue 渲染）
let scrollRaf = 0
function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    updateReadProgress()
  })
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  updateReadProgress()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})

// 笔记 composable（按页面 key 隔离，key 随导航响应式变化）
const notes = useNotes(pageKey, subject, computed(() => ({
  title: fileMeta.value?.title,
  unitTitle: unit.value?.title
})))

// 书签 composable（key 随导航响应式变化）
const bookmark = useBookmarks(pageKey, subject, computed(() => ({
  title: fileMeta.value?.title,
  unitTitle: unit.value?.title,
  unitNum: unit.value?.num
})))

// 动态加载内容数据（Vite 支持动态 import）
const page = ref(null)

/** 加载页面内容并记录访问 */
async function loadPage() {
  if (!unit.value || !fileMeta.value) return
  loading.value = true
  // 注意：不在此清空 page —— 翻页时保留旧内容直到新内容就绪，避免整块闪空
  try {
    // 加载内容页：元信息由 site.js 推导并注入（见 src/content/loadPage.js）
    // 注意：此处不做空值合并 —— 越界时 loadContentPage 返回 null，交由下方 catch/模板降级
    page.value = await loadContentPage(subject.value, unit.value.num, fileIndex.value)
    // 记录页面访问（学习日志 / 每日统计）
    await db.markPageVisited({
      subject: subject.value,
      unitNum: unit.value.num,
      unitTitle: unit.value.title,
      fileKey: pageKey.value,
      fileTitle: fileMeta.value.title,
      isTest: fileMeta.value.isTest || false
    })
    // 刷新完成快照（内容页打开即完成，测验页等交卷后再由 ExamBlock 刷新）
    // 「最近学习」位置不再另存 localStorage —— progress 由 page_progress 推导
    // （含 lastStudied 坐标），首页「继续学习」直接读 store（见架构审计 §2-2）。
    progress.refresh().catch((e) => console.error('[UnitView] 刷新进度失败:', e))
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

// 单元内各页面完成状态（供移动端答题卡网格；完成语义见 stores/progress.js）
const doneFiles = computed(() => {
  if (!unit.value) return []
  return unit.value.files.map((_, i) => progress.isCompleted(subject.value, unit.value.num, i))
})

// ===== 考试作答保护 =====
// ExamBlock 注入此状态；作答中导航离开前统一确认，防误触丢失作答
const examState = reactive({ active: false })
provide('examState', examState)

// 应用内确认弹层（替代 window.confirm，规避部分 Android WebView 不支持 confirm 导致无法离开的隐患）
const confirmLeave = ref(false)
const confirmMsg = ref('')
let resolveLeave = null
function requestLeaveConfirm() {
  confirmMsg.value = '测验尚未交卷，离开将丢失作答记录。确定离开吗？'
  confirmLeave.value = true
  return new Promise((resolve) => { resolveLeave = resolve })
}
function handleLeaveConfirm(ok) {
  confirmLeave.value = false
  if (resolveLeave) { resolveLeave(ok); resolveLeave = null }
}

// 统一离开保护：页内翻页（onBeforeRouteUpdate）+ 跨路由离开（onBeforeRouteLeave）都走同一确认，
// 覆盖底部翻页、迷你顶栏返回、面包屑、答题卡抽屉、浏览器返回等所有出口
async function guardLeave() {
  if (!examState.active) return true
  return requestLeaveConfirm()
}
onBeforeRouteLeave(guardLeave)
onBeforeRouteUpdate(guardLeave)

// 翻页导航
const hasPrev = computed(() => fileIndex.value > 0)
const hasNext = computed(() => unit.value && fileIndex.value < unit.value.files.length - 1)

function goPrev() {
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: fileIndex.value - 1 } })
}
function goNext() {
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: fileIndex.value + 1 } })
}

// 滚动到顶部
function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 跳转到同单元指定页
function goFile(i) {
  if (i === fileIndex.value) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: unit.value.num, fileIndex: i } })
}

// 跳转到指定单元（默认第一页）
function goUnit(u) {
  if (!u) return
  router.push({ name: 'unit', params: { subject: subject.value, unitNum: u.num, fileIndex: 0 } })
}

// 监听路由变化重新加载内容（切换页面或学科时触发）
watch(
  () => [route.params.subject, route.params.unitNum, route.params.fileIndex],
  () => {
    loadPage()
  }
)
</script>

<style scoped>
/* 阅读进度条 */
.reading-progress {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 3px; background: transparent;
}
/* 桌面端顶栏常驻所有页面（z-index 110、高 calc(--tabbar-h + --sat)），会盖住 top:0 的进度条 →
 * 桌面端把进度条挪到顶栏正下方，避免遮挡冲突；移动端详情页无顶栏，保持 top:0 不变。
 * 注：「进度条并入顶栏」是 system_design §4.4 列的 P4 工作，本轮不做，先降至顶栏下方。 */
@media (min-width: 1150px) {
  .reading-progress { top: calc(var(--tabbar-h) + var(--sat)); }
}
.reading-progress__bar {
  height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 0 3px 3px 0;
  transition: width 0.1s linear;
}

/* 目录导航 */
.toc-panel { margin-bottom: var(--spacer-16); }
.toc-head { font-weight: 700; margin-bottom: var(--spacer-8); }
.toc-list { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.toc-item {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface-muted); border: 1px solid var(--border);
  border-radius: var(--radius-full); padding: 4px 12px;
  font-size: 0.82rem; transition: all 0.15s ease;
}
.toc-item:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
.toc-icon { font-size: 0.85rem; }

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

.fade-enter-active, .fade-leave-active { transition: opacity var(--dur-3) var(--ease-standard); }

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

/* 阶段 3 第二步：区块间距统一为 32px —— gap 归零，靠 .block-anchor 相邻选择器给间距。
 * 各区块自身的 margin-bottom 已一并移除（间距双来源问题，见交接文档第六节第 4 条） */
.page-content { display: flex; flex-direction: column; gap: 0; }
.block-anchor + .block-anchor { margin-top: var(--gap-block, 32px); }
.block-anchor { scroll-margin-top: 16px; }

/* 侧边栏可见时，为内容区右侧预留空间，避免被固定侧边栏遮挡 */
@media (min-width: 1151px) and (max-width: 1456px) {
  .unit-view { padding-right: 250px; }
}
/* 移动端迷你顶栏（桌面端隐藏） */
.mobile-topbar { display: none; }
.topbar-enter-active, .topbar-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.topbar-enter-from, .topbar-leave-to { transform: translateY(-100%); opacity: 0; }

/* 移动端：底部操作栏为内容预留空间；头部去重（工具收入底部栏与更多面板） */
@media (max-width: 1150px) {
  .unit-view { padding-bottom: calc(78px + env(safe-area-inset-bottom, 0px)); }
  .page-tools { display: none; }

  /* 迷你顶栏：返回首页 + 页面标题 + 阅读进度百分比 */
  .mobile-topbar {
    display: flex; align-items: center; gap: 10px;
    position: fixed; top: 0; left: 0; right: 0; z-index: 99;
    padding: calc(6px + var(--sat)) 12px 6px;
    background: var(--surface);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-xs);
  }
  .topbar-back {
    flex: 0 0 auto;
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    background: var(--surface-muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    font-size: 1.05rem;
    color: var(--text);
  }
  .topbar-title {
    flex: 1; min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-weight: 700; font-size: 0.95rem;
  }
  .topbar-progress {
    flex: 0 0 auto;
    min-width: 44px; text-align: right;
    font-size: 0.8rem; color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
}
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

/* 移动端适配 */
@media (max-width: 600px) {
  .page-header h1 { font-size: 1.35rem; }
  .tool-btn { width: 40px; height: 40px; }
  .nav-btn { flex: 1; }

  /* 触控目标 ≥44px */
  .toc-item { min-height: 44px; }
  .nav-btn { min-height: 44px; }
  .notes-save { min-height: 44px; padding: 0 16px; }
  /* 锚点跳转偏移补上迷你顶栏高度 + 安全区 */
  .block-anchor { scroll-margin-top: calc(56px + var(--sat)); }
}

/* 离开确认弹层 */
.leave-confirm-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: var(--spacer-24);
}
.leave-confirm {
  width: min(360px, 100%);
  padding: var(--spacer-24);
  box-shadow: var(--shadow-pop);
}
.leave-confirm__title { font-weight: 700; font-size: 1.05rem; margin-bottom: var(--spacer-12); }
.leave-confirm__msg { color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: var(--spacer-20); }
.leave-confirm__actions { display: flex; gap: var(--spacer-12); }
.leave-confirm__btn {
  flex: 1; min-height: 44px;
  border-radius: var(--radius-full);
  font-weight: 600; font-size: 0.9rem;
  display: inline-flex; align-items: center; justify-content: center;
}
.leave-confirm__cancel { background: var(--surface-muted); color: var(--text); border: 1px solid var(--border); }
.leave-confirm__ok { background: var(--danger); color: #fff; }

/* 番茄钟悬浮计时器 */
.pomodoro-fab {
  position: fixed; right: 24px; bottom: 24px; z-index: 150;
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
}
.pomodoro-fab__btn {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--primary); color: #fff; border: none;
  font-size: 1.5rem; cursor: pointer;
  box-shadow: var(--shadow-pop);
  display: flex; align-items: center; justify-content: center;
  transition: transform var(--dur-1) var(--ease-standard);
}
.pomodoro-fab__btn:active { transform: scale(0.92); }
.pomodoro-card {
  width: 250px; padding: 14px 16px;
  box-shadow: var(--shadow-pop);
}
.pomodoro-card__head { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
.pomodoro-mode { font-weight: 700; }
.pomodoro-mode.mode-focus { color: var(--danger); }
.pomodoro-mode.mode-break, .pomodoro-mode.mode-long_break { color: var(--success); }
.pomodoro-running { color: var(--warning); font-size: 0.75rem; }
.pomodoro-time {
  text-align: center; font-size: 2.3rem; font-weight: 700;
  font-variant-numeric: tabular-nums; margin: 6px 0;
}
.pomodoro-progress { height: 6px; background: var(--surface-muted); border-radius: var(--radius-full); overflow: hidden; }
.pomodoro-progress__bar {
  height: 100%; background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: var(--radius-full); transition: width 1s linear;
}
.pomodoro-today { text-align: center; font-size: 0.78rem; color: var(--text-muted); margin-top: 8px; }
.pomodoro-actions { display: flex; gap: 8px; margin-top: 10px; }
.pomodoro-btn {
  flex: 1; min-height: 40px;
  border: 1px solid var(--border); background: var(--surface-muted);
  color: var(--text); border-radius: var(--radius-full);
  font-size: 0.78rem; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.pomodoro-btn--primary { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 600; }

/* 移动端：悬浮在底部操作栏上方，触控目标 ≥44px */
@media (max-width: 1150px) {
  .pomodoro-fab { right: 16px; bottom: calc(var(--sab) + 76px); }
  .pomodoro-btn { min-height: 44px; }
}
</style>
