<!--
  AdminView —— 管理员界面（仅 role=admin）
  职责：用户管理（角色/删除）+ 页面访问统计（概览/学科/热门页/趋势）
-->
<template>
  <div class="admin">
    <nav class="breadcrumb">
      <router-link to="/">📚 首页</router-link>
      <span class="crumb-sep">/</span>
      <span>管理后台</span>
    </nav>

    <div class="admin__tabs">
      <button class="admin__tab" :class="{ active: tab === 'users' }" @click="switchTab('users')">👥 用户管理</button>
      <button class="admin__tab" :class="{ active: tab === 'stats' }" @click="switchTab('stats')">📊 页面统计</button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
    <p v-else-if="error" class="error">{{ error }}</p>

    <!-- ===== 用户管理 ===== -->
    <section v-if="tab === 'users' && !loading && !error">
      <div class="user-list">
        <div v-for="u in users" :key="u.id" class="card user-row">
          <div class="user-main">
            <span class="user-name">
              {{ u.username }}
              <span v-if="u.role === 'admin'" class="badge admin">管理员</span>
              <span v-else class="badge user">用户</span>
            </span>
            <span class="user-meta">
              ID#{{ u.id }}<template v-if="u.email"> · {{ u.email }}</template><br>
              注册 {{ fmtDate(u.createdAt) }} · 最后同步 {{ u.lastSyncAt ? fmtDate(u.lastSyncAt) : '—' }} · 数据 {{ u.itemCount }} 条
            </span>
          </div>
          <div class="user-actions">
            <button
              class="btn"
              :disabled="u.id === auth.user?.id || busyId === u.id"
              @click="toggleRole(u)"
            >{{ u.role === 'admin' ? '取消管理员' : '设为管理员' }}</button>
            <button class="btn danger" :disabled="u.id === auth.user?.id || busyId === u.id" @click="removeUser(u)">删除</button>
          </div>
        </div>
      </div>
      <p v-if="!users.length" class="empty">暂无用户</p>
    </section>

    <!-- ===== 页面统计 ===== -->
    <section v-else-if="tab === 'stats' && !loading && !error" class="stats">
      <div class="ov-grid">
        <div class="card ov"><b>{{ stats.overview?.users ?? 0 }}</b><span>用户</span></div>
        <div class="card ov"><b>{{ stats.overview?.studyLogs ?? 0 }}</b><span>学习行为</span></div>
        <div class="card ov"><b>{{ stats.overview?.pageProgress ?? 0 }}</b><span>页面记录</span></div>
        <div class="card ov"><b>{{ stats.overview?.errorBook ?? 0 }}</b><span>错题</span></div>
        <div class="card ov"><b>{{ stats.overview?.notes ?? 0 }}</b><span>笔记</span></div>
        <div class="card ov"><b>{{ stats.overview?.items ?? 0 }}</b><span>同步条目</span></div>
      </div>

      <div class="card block">
        <h3>📚 分学科</h3>
        <div v-for="(s, k) in stats.pages?.bySubject || {}" :key="k" class="subj-line">
          <span class="subj-name">{{ subjectName(k) }}</span>
          <span class="subj-stat">访问 {{ s.visits }} · 答题 {{ s.answers }} · 测验 {{ s.tests }}</span>
        </div>
        <p v-if="!Object.keys(stats.pages?.bySubject || {}).length" class="empty">暂无数据</p>
      </div>

      <div class="card block">
        <h3>🔥 热门页面 TOP20</h3>
        <ol class="top-list">
          <li v-for="(p, i) in stats.pages?.topPages || []" :key="p.key">
            <span class="top-rank">{{ i + 1 }}</span>
            <span class="top-name">{{ p.title }}<small v-if="p.unitTitle"> · {{ p.unitTitle }}</small></span>
            <span class="top-count">{{ p.visits }} 次</span>
          </li>
        </ol>
        <p v-if="!stats.pages?.topPages?.length" class="empty">暂无访问记录</p>
      </div>

      <div class="card block">
        <h3>📅 近 14 日访问趋势</h3>
        <div class="trend">
          <div v-for="d in stats.pages?.dailyTrend || []" :key="d.date" class="trend-col">
            <span class="trend-bar" :style="{ height: trendHeight(d.visits) + 'px' }"></span>
            <span class="trend-date">{{ d.date.slice(5) }}</span>
          </div>
        </div>
        <p v-if="!stats.pages?.dailyTrend?.length" class="empty">暂无数据</p>
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * 管理员界面逻辑
 */
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/sync/api'

const auth = useAuthStore()
const tab = ref('users')
const loading = ref(true)
const error = ref('')
const users = ref([])
const stats = reactive({ overview: null, pages: null })
const busyId = ref(null)

const SUBJECT_NAMES = { math: '数学', chinese: '语文', computer: '计算机' }
const subjectName = (k) => SUBJECT_NAMES[k] || k

function fmtDate(s) {
  if (!s) return '—'
  return s.slice(0, 10)
}

function trendHeight(n) {
  const max = Math.max(...(stats.pages?.dailyTrend || []).map((d) => d.visits), 1)
  return Math.max(2, Math.round((n / max) * 80))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [u, o, p] = await Promise.all([api.adminUsers(), api.adminOverview(), api.adminPagesStats()])
    users.value = u.users || []
    stats.overview = o
    stats.pages = p
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchTab(t) {
  tab.value = t
  if (!stats.overview && !stats.pages) load()
}

async function toggleRole(u) {
  busyId.value = u.id
  try {
    await api.setUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')
    u.role = u.role === 'admin' ? 'user' : 'admin'
  } catch (e) {
    alert(e.message || '操作失败')
  } finally {
    busyId.value = null
  }
}

async function removeUser(u) {
  if (!confirm(`确定删除用户「${u.username}」？其全部同步数据将被清空。`)) return
  busyId.value = u.id
  try {
    await api.deleteUser(u.id)
    users.value = users.value.filter((x) => x.id !== u.id)
  } catch (e) {
    alert(e.message || '操作失败')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.admin { display: flex; flex-direction: column; gap: var(--spacer-14); }
.breadcrumb { font-size: 0.85rem; color: var(--text-secondary, #666); }
.crumb-sep { margin: 0 6px; }
.admin__tabs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacer-8); padding: 4px; background: var(--surface-muted); border-radius: var(--radius, 10px); }
.admin__tab { padding: var(--spacer-10) 0; border: none; background: transparent; color: var(--text-secondary, #666); border-radius: calc(var(--radius, 10px) - 4px); cursor: pointer; }
.admin__tab.active { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
.loading, .empty { padding: var(--spacer-24); text-align: center; color: var(--text-secondary, #666); }
.error { color: #d33; text-align: center; }

.card { padding: var(--spacer-14); border-radius: var(--radius, 12px); background: var(--surface); border: 1px solid var(--border); margin-bottom: var(--spacer-10); }
.badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; font-weight: 600; margin-left: 6px; }
.badge.admin { background: #f0c040; color: #5a4300; }
.badge.user { background: var(--surface-muted); color: var(--text-secondary, #666); }

.user-row { display: flex; justify-content: space-between; align-items: center; gap: var(--spacer-10); flex-wrap: wrap; }
.user-name { font-weight: 600; }
.user-meta { display: block; margin-top: 4px; font-size: 0.8rem; color: var(--text-secondary, #888); }
.user-actions { display: flex; gap: var(--spacer-8); }
.btn { min-height: 38px; padding: 0 var(--spacer-10); border: 1px solid var(--border); border-radius: var(--radius, 8px); background: var(--surface-muted); color: var(--text); cursor: pointer; font-size: 0.8rem; }
.btn:disabled { opacity: .5; }
.btn.danger { color: #d33; border-color: #d33; }

.ov-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacer-8); }
.ov { text-align: center; padding: var(--spacer-12) var(--spacer-6); }
.ov b { display: block; font-size: 1.2rem; }
.ov span { font-size: 0.75rem; color: var(--text-secondary, #888); }

.block h3 { margin: 0 0 var(--spacer-10); font-size: 0.95rem; }
.subj-line { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; border-bottom: 1px dashed var(--border); }
.subj-stat { color: var(--text-secondary, #666); font-size: 0.8rem; }

.top-list { list-style: none; margin: 0; padding: 0; }
.top-list li { display: flex; align-items: center; gap: var(--spacer-8); padding: 6px 0; border-bottom: 1px dashed var(--border); font-size: 0.9rem; }
.top-rank { width: 22px; height: 22px; border-radius: 50%; background: var(--surface-muted); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; }
.top-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-name small { color: var(--text-secondary, #888); }
.top-count { flex-shrink: 0; color: var(--text-secondary, #666); font-size: 0.8rem; }

.trend { display: flex; align-items: flex-end; gap: 4px; height: 100px; padding-top: 8px; }
.trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 2px; }
.trend-bar { width: 100%; max-width: 22px; background: var(--accent, #4a6cf7); border-radius: 3px 3px 0 0; min-height: 2px; }
.trend-date { font-size: 0.6rem; color: var(--text-secondary, #888); }
</style>
