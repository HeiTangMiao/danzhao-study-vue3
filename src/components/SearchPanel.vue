<!--
  SearchPanel —— 全文搜索（跨学科，离线索引）
  说明：
   - 构建期由 scripts/build-search-index.mjs 生成 public/search-index.json
   - 组件 fetch 该索引后本地过滤，点击结果跳转对应内容页
-->
<template>
  <div ref="searchEl" :class="{ open: open }" class="search">
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        v-model="q"
        class="search-input"
        type="text"
        :placeholder="placeholder"
        @focus="open = true"
        @input="debounced"
      />
      <button v-if="q" class="search-clear" title="清空" aria-label="清空" @click="clearSearch">✕</button>
    </div>

    <!-- 索引加载失败 -->
    <div v-if="open && focused && indexState === 'error'" class="search-empty">
      <span>搜索索引加载失败，请重试</span>
      <button class="search-retry" @click="loadIndex">🔄 重试</button>
    </div>

    <!-- 结果列表 -->
    <div v-else-if="open && focused && indexState === 'ready' && results.length" class="search-results">
      <button
        v-for="(r, i) in results"
        :key="i"
        class="search-result"
        @click="go(r)"
      >
        <span class="res-icon">{{ r.isTest ? '📝' : subjectIcon(r.subject) }}</span>
        <span class="res-body">
          <span class="res-title">{{ r.title }}</span>
          <span class="res-unit">{{ r.name }} · {{ r.unitTitle }}</span>
          <span v-if="r.snippet" class="res-snippet">{{ r.snippet }}</span>
        </span>
      </button>
      <div v-if="hasMore" class="search-more">… 还有更多结果，请细化关键词</div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="open && focused && indexState === 'ready' && q" class="search-empty">没有匹配的内容，换个关键词试试</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { matchSearch, prepareSearchIndex } from '@/utils/search'

const router = useRouter()

defineProps({
  // 输入框占位文案（模板中以 `placeholder` 直接引用 props 名）
  placeholder: { type: String, default: '搜索知识点、标题…（数学/语文/计算机）' }
})

const q = ref('')
const open = ref(false)
const focused = ref(false)
// 防抖后的查询词（停顿 200ms 才更新，避免每次按键全量过滤）
const debouncedQ = ref('')
const index = ref([])
// 索引加载状态：loading 加载中 / ready 就绪 / error 失败
const indexState = ref('loading')
// 搜索组件根元素（点击外部时关闭浮层）
const searchEl = ref(null)
let timer = null

const SUBJECT_ICON = { math: '📐', chinese: '✍️', computer: '💻' }
const SUBJECT_NAME = { math: '数学', chinese: '语文', computer: '计算机' }
function subjectIcon(s) { return SUBJECT_ICON[s] || '📖' }

// 加载构建期生成的搜索索引（base './' 相对路径）
// 会话级缓存：同会话重复进入不重复 fetch（索引构建期生成，不会热更新）
let indexCache = null
async function loadIndex() {
  indexState.value = 'loading'
  if (indexCache) {
    index.value = indexCache
    indexState.value = 'ready'
    return
  }
  try {
    const res = await fetch('./search-index.json')
    if (res.ok) {
      // 加载后一次性预计算小写检索串，避免每次按键重复拼接
      indexCache = prepareSearchIndex(await res.json())
      index.value = indexCache
      indexState.value = 'ready'
    } else {
      indexState.value = 'error'
    }
  } catch (e) {
    console.warn('[Search] 索引加载失败:', e)
    indexState.value = 'error'
  }
}

function debounced() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    debouncedQ.value = q.value.trim()
    focused.value = !!q.value.trim()
  }, 200)
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
  loadIndex()
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onEsc)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onEsc)
})

// 清空搜索词（保留输入框焦点便于重新输入）
function clearSearch() {
  q.value = ''
  debouncedQ.value = ''
}

// 过滤匹配：标题 / 单元标题 / 副标题 / 正文关键词（基于防抖后的查询词，纯函数见 src/utils/search.js）
const results = computed(() => {
  const hits = matchSearch(index.value, debouncedQ.value)
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
  box-shadow: var(--shadow-md);
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
  border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
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