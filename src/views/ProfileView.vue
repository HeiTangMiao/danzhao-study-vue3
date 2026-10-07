<!--
  ProfileView —— 个人主页
  职责：展示账号信息 + 学习数据总览（学科进度/错题/笔记）
-->
<template>
  <div class="profile">
    <nav class="breadcrumb">
      <router-link to="/">首页</router-link>
      <span class="crumb-sep">/</span>
      <span>个人主页</span>
    </nav>

    <div v-if="loading" class="loading">加载中…</div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="error-hint card">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="load"><AppIcon name="refresh-cw" :size="16" /> 重试</button>
    </div>

    <template v-else>
      <!-- 账号卡片：头像取用户名首字符（原 emoji 头像随 P2 emoji 清零移除） -->
      <section class="card account-card">
        <div class="avatar">{{ avatarChar }}</div>
        <div class="account-info">
          <h1 class="username">{{ auth.user?.username }}
            <span v-if="auth.isAdmin" class="role-badge">管理员</span>
          </h1>
          <p v-if="auth.user?.email" class="email">{{ auth.user.email }}</p>
          <p class="meta">注册于 {{ registerDate }} · ID #{{ auth.user?.id }}</p>
        </div>
      </section>

      <!-- 数据总览 -->
      <section v-if="overview" class="stat-grid">
        <div class="card stat-card"><div class="stat-icon"><AppIcon name="book-open" :size="20" /></div><div class="stat-val">{{ overview.totalVisited }}</div><div class="stat-label">已学页面</div></div>
        <div class="card stat-card"><div class="stat-icon"><AppIcon name="pencil" :size="20" /></div><div class="stat-val">{{ overview.totalQuestions }}</div><div class="stat-label">答题总数</div></div>
        <div class="card stat-card"><div class="stat-icon"><AppIcon name="siren" :size="20" /></div><div class="stat-val">{{ overview.errorsCount }}</div><div class="stat-label">错题</div></div>
        <div class="card stat-card"><div class="stat-icon"><AppIcon name="square-pen" :size="20" /></div><div class="stat-val">{{ noteCount }}</div><div class="stat-label">笔记</div></div>
      </section>

      <!-- 学科进度 -->
      <section v-if="overview" class="card subjects-card">
        <h2>学科进度</h2>
        <div v-for="(_, key) in SUBJECT_NAMES" :key="key" class="subject-row">
          <span class="subject-name">{{ subjectName(key) }}</span>
          <span class="subject-bar">
            <span class="subject-fill" :style="{ width: (subjectTotals[key] ? (overview.subjects[key].visited / subjectTotals[key]) * 100 : 0) + '%' }"></span>
          </span>
          <span class="subject-count">{{ overview.subjects[key].visited }}/{{ subjectTotals[key] }}</span>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="profile-actions">
        <router-link to="/dashboard" class="btn">仪表盘</router-link>
        <router-link to="/error-book" class="btn">错题本</router-link>
        <router-link v-if="auth.isAdmin" to="/admin" class="btn admin">管理后台</router-link>
        <button class="btn danger" @click="logout">退出登录</button>
      </section>

      <!-- 作者署名（D13 拍板：全站仅保留此处；墨色小字、去渐变文字、去装饰符号） -->
      <p class="credit">黑糖＆菜菜</p>
    </template>
  </div>
</template>

<script setup>
/**
 * 个人主页逻辑
 * 数据来源：auth store（账号）+ studyDb.getLearningOverview()（学习统计）
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStudyDbStore } from '@/stores/studyDb'
import { getSubjectConfig } from '@/content/index'
import { api } from '@/sync/api'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const auth = useAuthStore()
const db = useStudyDbStore()

const loading = ref(true)
const overview = ref(null)
const noteCount = ref(0)
const registerDate = ref('')
// 加载失败提示
const error = ref('')

// 头像字符：取用户名首字符大写（原为 emoji 池，P2 emoji 清零后改为纯文字头像）
const avatarChar = computed(() => {
  const name = auth.user?.username || '?'
  return name.charAt(0).toUpperCase()
})

const SUBJECT_NAMES = { math: '数学', chinese: '语文', computer: '计算机' }
const subjectName = (k) => SUBJECT_NAMES[k] || k

// 各学科页面总数（由内容配置计算）
const subjectTotals = computed(() => {
  const totals = {}
  for (const k of Object.keys(SUBJECT_NAMES)) {
    const cfg = getSubjectConfig(k)
    totals[k] = cfg && cfg.units ? cfg.units.reduce((s, u) => s + u.files.length, 0) : 0
  }
  return totals
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    // 拉取最新用户信息（含注册时间与 role）
    const me = await api.me()
    if (me.user) {
      auth.setSession({ user: me.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken })
      if (me.user.createdAt) registerDate.value = me.user.createdAt.slice(0, 10)
    }

    overview.value = await db.getLearningOverview()
    noteCount.value = (await db.getAllNotes()).length
  } catch (e) {
    console.warn('[Profile] 加载失败:', e)
    error.value = '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function logout() {
  if (!window.confirm('确定要退出登录吗？')) return
  auth.logout()
  router.replace('/login')
}
</script>

<style scoped>
.profile { display: flex; flex-direction: column; gap: var(--spacer-14); }
.breadcrumb { font-size: 0.85rem; color: var(--text-secondary, #666); }
.crumb-sep { margin: 0 6px; }
.card { padding: var(--spacer-16); border-radius: var(--radius, 12px); background: var(--surface); border: 1px solid var(--border); }
.loading { padding: var(--spacer-32); text-align: center; color: var(--text-secondary, #666); }

/* 加载失败 */
.error-hint { text-align: center; padding: var(--spacer-24); }
.error-hint p { margin-bottom: var(--spacer-12); color: var(--text-muted); }
.retry-btn {
  min-height: 44px; padding: 0 var(--spacer-20);
  background: var(--primary); color: #fff;
  border-radius: var(--radius-full);
  font-weight: 600; font-size: 0.9rem;
  display: inline-flex; align-items: center; justify-content: center;
}

.account-card { display: flex; align-items: center; gap: var(--spacer-14); }
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; font-weight: 700; color: var(--text-secondary, #666);
  background: var(--surface-muted); border: 1px solid var(--border);
}
.username { margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
.role-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: #f0c040; color: #5a4300; font-weight: 600; }
.email, .meta { margin: 4px 0 0; color: var(--text-secondary, #888); font-size: 0.85rem; }

.stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacer-10); }
.stat-card { text-align: center; padding: var(--spacer-14) var(--spacer-8); }
.stat-icon { display: flex; justify-content: center; color: var(--primary); margin-bottom: var(--spacer-4); }
.stat-val { font-size: 1.3rem; font-weight: 700; }
.stat-label { font-size: 0.75rem; color: var(--text-secondary, #888); }

.subject-row { display: flex; align-items: center; gap: var(--spacer-10); margin-top: var(--spacer-10); }
.subject-name { width: 56px; flex-shrink: 0; font-size: 0.9rem; }
.subject-bar { flex: 1; height: 8px; background: var(--surface-muted); border-radius: 999px; overflow: hidden; }
.subject-fill { height: 100%; background: var(--accent, #4a6cf7); border-radius: 999px; }
.subject-count { flex-shrink: 0; font-size: 0.8rem; color: var(--text-secondary, #666); }

.profile-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacer-10); }
.btn {
  display: flex; align-items: center; justify-content: center;
  min-height: 44px; padding: 0 var(--spacer-12);
  border: 1px solid var(--border); border-radius: var(--radius, 10px);
  background: var(--surface-muted); color: var(--text);
  font-size: 0.9rem; text-decoration: none; cursor: pointer;
}
.btn.admin { background: #f0c040; color: #5a4300; border-color: transparent; }
.btn.danger { color: #d33; border-color: #d33; }

/* 作者署名（D13）：墨色小字，不用渐变文字与装饰符号 */
.credit {
  margin-top: var(--spacer-8);
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-secondary, #888);
}
</style>