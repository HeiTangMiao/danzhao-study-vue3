<!--
  ProfileView —— 个人主页
  职责：展示账号信息 + 学习数据总览（等级/连击/进度/成就/错题/笔记）
-->
<template>
  <div class="profile">
    <nav class="breadcrumb">
      <router-link to="/">📚 首页</router-link>
      <span class="crumb-sep">/</span>
      <span>个人主页</span>
    </nav>

    <div v-if="loading" class="loading">加载中…</div>

    <template v-else>
      <!-- 账号卡片 -->
      <section class="card account-card">
        <div class="avatar">{{ avatarEmoji }}</div>
        <div class="account-info">
          <h1 class="username">{{ auth.user?.username }}
            <span v-if="auth.isAdmin" class="role-badge">管理员</span>
          </h1>
          <p v-if="auth.user?.email" class="email">{{ auth.user.email }}</p>
          <p class="meta">注册于 {{ registerDate }} · ID #{{ auth.user?.id }}</p>
        </div>
      </section>

      <!-- 等级与 XP -->
      <section v-if="data" class="card level-card">
        <div class="level-badge">
          <span class="lv-num">{{ data.levelInfo.level.lv }}</span>
          <span class="lv-title">{{ data.levelInfo.level.title }}</span>
        </div>
        <div class="level-info">
          <div class="xp-total">总经验 {{ data.totalXP }} XP</div>
          <div class="xp-bar"><div class="xp-fill" :style="{ width: (data.levelInfo.progress * 100) + '%' }"></div></div>
          <div v-if="data.levelInfo.next" class="xp-hint">距 {{ data.levelInfo.next.title }} 还需 {{ data.levelInfo.needXP }} XP</div>
          <div v-else class="xp-hint">已达满级 🎓</div>
        </div>
      </section>

      <!-- 数据总览 -->
      <section v-if="data" class="stat-grid">
        <div class="card stat-card"><div class="stat-icon">🔥</div><div class="stat-val">{{ data.streak }}</div><div class="stat-label">连续学习(天)</div></div>
        <div class="card stat-card"><div class="stat-icon">📖</div><div class="stat-val">{{ data.totalVisited }}</div><div class="stat-label">已学页面</div></div>
        <div class="card stat-card"><div class="stat-icon">✏️</div><div class="stat-val">{{ data.totalQuestions }}</div><div class="stat-label">答题总数</div></div>
        <div class="card stat-card"><div class="stat-icon">🏆</div><div class="stat-val">{{ data.achievements.length }}</div><div class="stat-label">成就</div></div>
        <div class="card stat-card"><div class="stat-icon">⭐</div><div class="stat-val">{{ data.allErrors.length }}</div><div class="stat-label">错题</div></div>
        <div class="card stat-card"><div class="stat-icon">📝</div><div class="stat-val">{{ noteCount }}</div><div class="stat-label">笔记</div></div>
      </section>

      <!-- 学科进度 -->
      <section v-if="data" class="card subjects-card">
        <h2>📊 学科进度</h2>
        <div v-for="(s, key) in data.subjects" :key="key" class="subject-row">
          <span class="subject-name">{{ subjectName(key) }}</span>
          <span class="subject-bar"><span class="subject-fill" :style="{ width: (s.total ? (s.visited / s.total * 100) : 0) + '%' }"></span></span>
          <span class="subject-count">{{ s.visited }}/{{ s.total }}</span>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="profile-actions">
        <router-link to="/dashboard" class="btn">📈 仪表盘</router-link>
        <router-link to="/error-book" class="btn">⭐ 错题本</router-link>
        <router-link v-if="auth.isAdmin" to="/admin" class="btn admin">🛠 管理后台</router-link>
        <button class="btn danger" @click="logout">退出登录</button>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 个人主页逻辑
 * 数据来源：auth store（账号）+ gameEngine.getDashboardData()（学习统计）
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGameEngineStore } from '@/stores/gameEngine'
import { useStudyDbStore } from '@/stores/studyDb'
import { api } from '@/sync/api'

const router = useRouter()
const auth = useAuthStore()
const game = useGameEngineStore()

const loading = ref(true)
const data = ref(null)
const noteCount = ref(0)
const registerDate = ref('')

const avatarEmoji = computed(() => {
  const n = (auth.user?.username || '?').charCodeAt(0) || 0
  return ['🦊', '🐱', '🐶', '🐼', '🐯', '🦁', '🐸', '🐰'][n % 8]
})

const SUBJECT_NAMES = { math: '数学', chinese: '语文', computer: '计算机' }
const subjectName = (k) => SUBJECT_NAMES[k] || k

async function load() {
  try {
    // 拉取最新用户信息（含注册时间与 role）
    const me = await api.me()
    if (me.user) {
      auth.setSession({ user: me.user, accessToken: auth.accessToken, refreshToken: auth.refreshToken })
      if (me.user.createdAt) registerDate.value = me.user.createdAt.slice(0, 10)
    }

    const [dashboard, db] = await Promise.all([game.getDashboardData(), useStudyDbStore()])
    data.value = dashboard
    noteCount.value = (await db.getAllNotes()).length
  } catch (e) {
    console.warn('[Profile] 加载失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function logout() {
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

.account-card { display: flex; align-items: center; gap: var(--spacer-14); }
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem; background: var(--surface-muted); border: 1px solid var(--border);
}
.username { margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
.role-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: #f0c040; color: #5a4300; font-weight: 600; }
.email, .meta { margin: 4px 0 0; color: var(--text-secondary, #888); font-size: 0.85rem; }

.level-card { display: flex; gap: var(--spacer-14); align-items: center; }
.level-badge { flex-shrink: 0; text-align: center; }
.lv-num { font-size: 2rem; font-weight: 700; display: block; }
.lv-title { font-size: 0.8rem; color: var(--text-secondary, #666); }
.level-info { flex: 1; }
.xp-total { font-size: 0.9rem; margin-bottom: 6px; }
.xp-bar { height: 10px; background: var(--surface-muted); border-radius: 999px; overflow: hidden; }
.xp-fill { height: 100%; background: var(--accent, #4a6cf7); border-radius: 999px; }
.xp-hint { font-size: 0.75rem; color: var(--text-secondary, #888); margin-top: 4px; }

.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacer-10); }
.stat-card { text-align: center; padding: var(--spacer-14) var(--spacer-8); }
.stat-icon { font-size: 1.3rem; }
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
</style>
