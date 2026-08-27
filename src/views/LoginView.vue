<!--
  LoginView —— 账号登录 / 注册
  说明：不登录也能正常学习（离线优先），登录用于跨设备同步学习数据。
-->
<template>
  <div class="login">
    <div class="login__card card">
      <h1 class="login__title">📚 账号同步</h1>
      <p class="login__sub">登录后学习进度、错题、笔记可在多设备间同步</p>

      <!-- 登录 / 注册 切换 -->
      <div class="login__tabs" role="tablist">
        <button
          class="login__tab"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
        >登录</button>
        <button
          class="login__tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
        >注册</button>
      </div>

      <form class="login__form" @submit.prevent="submit">
        <label class="login__field">
          <span>用户名 / 邮箱</span>
          <input v-model.trim="username" type="text" autocomplete="username" placeholder="请输入用户名或邮箱" required />
        </label>

        <label v-if="mode === 'register'" class="login__field">
          <span>邮箱（选填，用于找回）</span>
          <input v-model.trim="email" type="email" autocomplete="email" placeholder="you@example.com" />
        </label>

        <label class="login__field">
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="至少 6 位"
            :minlength="6"
            required
          />
        </label>

        <p v-if="error" class="login__error">{{ error }}</p>

        <button class="login__submit" type="submit" :disabled="loading">
          {{ loading ? '请稍候…' : mode === 'login' ? '登 录' : '注册并登录' }}
        </button>
      </form>

      <p class="login__hint">💡 不登录也能学习，登录仅用于开启数据同步</p>
    </div>
  </div>
</template>

<script setup>
/**
 * 登录页逻辑
 * 成功回调可选：携带 redirect 参数跳回来源页
 */
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref('login')
const username = ref('')
const password = ref('')
const email = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'register') {
      await auth.register({ username: username.value, password: password.value, email: email.value })
    } else {
      await auth.login({ username: username.value, password: password.value })
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  } catch (e) {
    error.value = e.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  padding: var(--spacer-32) var(--spacer-16);
}
.login__card {
  width: 100%;
  max-width: 420px;
  padding: var(--spacer-24);
}
.login__title {
  margin: 0 0 var(--spacer-8);
  font-size: 1.4rem;
}
.login__sub {
  margin: 0 0 var(--spacer-16);
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
}
.login__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacer-8);
  margin-bottom: var(--spacer-16);
  padding: 4px;
  background: var(--surface-muted);
  border-radius: var(--radius, 10px);
}
.login__tab {
  padding: var(--spacer-10) 0;
  border: none;
  border-radius: calc(var(--radius, 10px) - 4px);
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}
.login__tab.active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-14);
}
.login__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login__field span {
  font-size: 0.85rem;
  color: var(--text-secondary, #666);
}
.login__field input {
  min-height: 44px;
  padding: 0 var(--spacer-12);
  border: 1px solid var(--border);
  border-radius: var(--radius, 10px);
  background: var(--surface);
  color: var(--text);
  font-size: 1rem;
}
.login__error {
  margin: 0;
  color: #d33;
  font-size: 0.85rem;
}
.login__submit {
  min-height: 48px;
  margin-top: var(--spacer-4);
  border: none;
  border-radius: var(--radius, 10px);
  background: var(--accent, #4a6cf7);
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.login__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.login__hint {
  margin: var(--spacer-16) 0 0;
  text-align: center;
  color: var(--text-secondary, #999);
  font-size: 0.8rem;
}
</style>
