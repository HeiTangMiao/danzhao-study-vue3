<!--
  SearchPanel —— 全文搜索（跨学科，离线索引）
  说明（阶段 7.4 起为两级索引）：
   - 构建期由 scripts/build-search-index.mjs 生成 public/search-meta.json（标题级，小）
     与 public/search-body/{学科}.json（正文分片，大），形状见 src/content/searchIndex.js
   - 挂载时**不加载任何索引**：focus / 首次输入才取 meta，另在 requestIdleCallback 里预取 meta
   - 查询词 ≥ 2 字时才按「当前学科」取正文分片（一次按键不该拉一份整学科正文）
   - 点击结果跳转对应内容页
-->
<template>
  <div ref="searchEl" :class="{ open: open }" class="search">
    <div class="search-bar">
      <span class="search-icon"><AppIcon name="search" :size="16" /></span>
      <input
        v-model="q"
        class="search-input"
        type="text"
        :placeholder="placeholder"
        @focus="onFocus"
        @input="debounced"
      />
      <button v-if="q" class="search-clear" title="清空" aria-label="清空" @click="clearSearch"><AppIcon name="x" :size="16" /></button>
    </div>

    <!-- meta 索引加载失败 -->
    <div v-if="open && focused && metaState === 'error'" class="search-empty">
      <span>搜索索引加载失败，请重试</span>
      <button class="search-retry" @click="loadMeta"><AppIcon name="refresh-cw" :size="14" /> 重试</button>
    </div>

    <!-- 结果列表 -->
    <div v-else-if="open && focused && metaState === 'ready' && results.length" class="search-results">
      <button
        v-for="(r, i) in results"
        :key="i"
        class="search-result"
        @click="go(r)"
      >
        <span class="res-icon"><AppIcon :name="r.isTest ? 'clipboard-list' : subjectIconName(r.subject)" :size="16" /></span>
        <span class="res-body">
          <span class="res-title">
            {{ r.title }}
            <span v-if="r.matchedQuestion" class="res-badge" title="命中练习题库题干">题目</span>
          </span>
          <span class="res-unit">{{ r.name }} · {{ r.unitTitle }}</span>
          <span v-if="r.snippet" class="res-snippet">{{ r.snippet }}</span>
        </span>
      </button>
      <div v-if="hasMore" class="search-more">… 还有更多结果，请细化关键词</div>
    </div>

    <!-- 空状态：区分「正文还没到」「正文拉失败」与「真的没匹配」 -->
    <div v-else-if="open && focused && metaState === 'ready' && q" class="search-empty">
      <span v-if="bodyState === 'loading'">正在检索正文…</span>
      <template v-else-if="bodyState === 'error'">
        <span>正文索引加载失败，当前仅按标题匹配</span>
        <button class="search-retry" @click="ensureBody"><AppIcon name="refresh-cw" :size="14" /> 重试</button>
      </template>
      <span v-else>没有匹配的内容，换个关键词试试</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { matchSearch, prepareSearchIndex } from '@/utils/search'
import { META_FILE, bodyShardPath } from '@/content/searchIndex'
import { SUBJECT_META } from '@/content/index'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()

defineProps({
  // 输入框占位文案（模板中以 `placeholder` 直接引用 props 名）
  placeholder: { type: String, default: '搜索知识点、标题…（数学/语文/计算机）' }
})

/** 空闲预取 meta 的最长等待：即便浏览器一直不空闲，1.5s 后也要把 meta 拿回来 */
const IDLE_TIMEOUT = 1500
/** 少于 2 个字符只按标题匹配，避免一次按键就拉整份学科正文（正文分片可达数百 KB） */
const BODY_MIN_QUERY = 2

const q = ref('')
const open = ref(false)
const focused = ref(false)
// 防抖后的查询词（停顿 200ms 才更新，避免每次按键全量过滤）
const debouncedQ = ref('')
const meta = ref([])
// 已加载的正文分片（键为 bodyKeyOf(条目)，见 src/content/searchIndex.js）；未加载时为 null
const bodies = ref(null)
// meta 索引状态：idle 未开始 / loading 加载中 / ready 就绪 / error 失败
const metaState = ref('idle')
// 正文分片状态：idle / loading / ready / error（失败只影响全文命中，标题匹配照常）
const bodyState = ref('idle')
// 搜索组件根元素（点击外部时关闭浮层）
const searchEl = ref(null)
let timer = null
let idleHandle = null

// 学科图标名：数据层唯一取值来源 = SUBJECT_META（Lucide 名）；
// 原本地 SUBJECT_ICON emoji 映射副本已删（重复真相源 + emoji 清零）
const SUBJECT_NAME = { math: '数学', chinese: '语文', computer: '计算机' }
function subjectIconName(s) { return SUBJECT_META[s]?.icon || '' }
/** 当前学科（首页记住的选择，UnitView / HomeView 均写这个键） */
function currentSubject() { return localStorage.getItem('current_subject') || 'math' }

// 会话级缓存：索引构建期生成，不会热更新，同会话重复进入不重复 fetch
let metaCache = null
const bodyCache = new Map()
// 正在加载正文的学科（防止同一分片并发 fetch）
let bodyLoading = ''

// 加载标题级索引（base './' 相对路径）
async function loadMeta() {
  if (metaState.value === 'loading') return
  if (metaCache) {
    meta.value = metaCache
    metaState.value = 'ready'
    return
  }
  metaState.value = 'loading'
  try {
    const res = await fetch(`./${META_FILE}`)
    if (!res.ok) {
      metaState.value = 'error'
      return
    }
    metaCache = await res.json()
    meta.value = metaCache
    metaState.value = 'ready'
    // meta 到手时若输入框里已经有 ≥2 字的查询词（例如输入早于预取），补一次正文
    ensureBody()
  } catch (e) {
    console.warn('[Search] meta 索引加载失败:', e)
    metaState.value = 'error'
  }
}

// 按当前学科取正文分片（查询词不足 2 字或 meta 未就绪时不动作）
async function ensureBody() {
  if (debouncedQ.value.length < BODY_MIN_QUERY || metaState.value !== 'ready') return
  const subject = currentSubject()
  if (bodyCache.has(subject)) {
    bodies.value = bodyCache.get(subject)
    bodyState.value = 'ready'
    return
  }
  if (bodyLoading === subject) return
  bodyLoading = subject
  bodyState.value = 'loading'
  try {
    const res = await fetch(`./${bodyShardPath(subject)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const shard = await res.json()
    bodyCache.set(subject, shard)
    // 期间学科可能已被切走：只在仍是当前学科时应用，否则重新按新学科取
    if (currentSubject() === subject) {
      bodies.value = shard
      bodyState.value = 'ready'
    } else {
      bodyState.value = 'idle'
      ensureBody()
    }
  } catch (e) {
    console.warn('[Search] 正文分片加载失败:', e)
    bodyState.value = currentSubject() === subject ? 'error' : 'idle'
  } finally {
    if (bodyLoading === subject) bodyLoading = ''
  }
}

function debounced() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedQ.value = q.value.trim()
    focused.value = !!q.value.trim()
    ensureBody()
  }, 200)
}

function onFocus() {
  open.value = true
  if (metaState.value !== 'ready') loadMeta()
}

// 空闲预取：挂载时只登记，不立刻占网络（正文留到真正输入时）
function scheduleIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') {
    idleHandle = window.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT })
  } else {
    idleHandle = setTimeout(fn, IDLE_TIMEOUT)
  }
}
function cancelIdle() {
  if (idleHandle == null) return
  if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle)
  else clearTimeout(idleHandle)
  idleHandle = null
}

// 点击组件外部关闭浮层
function onDocClick(e) {
  if (searchEl.value && !searchEl.value.contains(e.target)) {
    open.value = false
    focused.value = false
  }
}
// Esc 关闭浮层
function onEsc(e) {
  if (e.key === 'Escape') {
    open.value = false
    focused.value = false
  }
}

onMounted(() => {
  scheduleIdle(() => loadMeta())
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  cancelIdle()
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onEsc)
})

// 清空搜索词（保留输入框焦点便于重新输入）
function clearSearch() {
  q.value = ''
  debouncedQ.value = ''
}

// 预计算检索串：meta 或正文任一变化时重算一次（每次按键只做子串匹配）
const prepared = computed(() => prepareSearchIndex(meta.value, bodies.value))

// 过滤匹配：标题 / 单元标题 / 副标题 / 正文（纯函数见 src/utils/search.js）
const results = computed(() => {
  const hits = matchSearch(prepared.value, debouncedQ.value, { bodies: bodies.value })
  return hits.map((r) => ({ ...r, name: SUBJECT_NAME[r.subject] || r.subject }))
})

const hasMore = computed(() => results.value.length >= 30)

function go(r) {
  router.push({ name: 'unit', params: { subject: r.subject, unitNum: r.unitNum, fileIndex: r.fileIndex } })
  q.value = ''
  debouncedQ.value = ''
  open.value = false
  focused.value = false
}
</script>

<style scoped>
.search { position: relative; }
.search-bar {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface-muted);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-full);
  padding: 0 14px;
  min-height: 46px;
  transition: border-color 0.15s;
}
.search-bar:focus-within { border-color: var(--primary); background: var(--surface); }
.search-icon { font-size: 1rem; color: var(--text-muted); }
.search-input {
  flex: 1; min-width: 0; border: none; outline: none;
  background: transparent; color: var(--text);
  font-size: 0.95rem;
}
.search-clear {
  flex: 0 0 auto; width: 40px; height: 40px; border-radius: var(--radius-full);
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 0.9rem;
  display: flex; align-items: center; justify-content: center;
}

/* 结果浮层 */
.search-results {
  position: absolute; left: 0; right: 0; top: calc(100% + 6px);
  z-index: 200;
  max-height: 60vh; overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  padding: 6px;
}
.search-result {
  width: 100%; display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: var(--radius-md);
  text-align: left; color: var(--text);
  transition: background 0.12s;
}
.search-result:hover, .search-result:active { background: var(--primary-soft); }
.res-icon { font-size: 1.2rem; flex: 0 0 auto; }
.res-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.res-title { font-weight: 700; font-size: 0.92rem; }
/* E-4：命中题库题干时的「题目」小标（与正文命中区分，便于用户判断去练习） */
.res-badge {
  display: inline-block; vertical-align: middle;
  margin-left: 6px; padding: 1px 6px;
  font-size: 0.66rem; font-weight: 600; line-height: 1.4;
  color: var(--primary); background: var(--primary-soft);
  border-radius: var(--radius-full);
}
.res-unit { font-size: 0.76rem; color: var(--text-muted); }
.res-snippet {
  font-size: 0.78rem; color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.search-more { padding: 6px; text-align: center; font-size: 0.78rem; color: var(--text-muted); }
.search-empty {
  position: absolute; left: 0; right: 0; top: calc(100% + 6px);
  padding: 14px; text-align: center; font-size: 0.85rem; color: var(--text-muted);
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-pop);
  z-index: 200;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.search-retry {
  min-height: 44px; padding: 0 var(--spacer-20);
  background: var(--primary); color: #fff;
  border-radius: var(--radius-full);
  font-size: 0.85rem; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center;
}
</style>