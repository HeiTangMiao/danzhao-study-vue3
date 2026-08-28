/**
 * auth Store —— 账号会话（Pinia，自动持久化到 localStorage）
 * 职责：注册/登录/刷新/退出，管理 access + refresh 令牌与用户信息。
 * 说明：tryRefresh 用裸 fetch 而非 api 客户端，避免循环依赖。
 */
import { defineStore } from 'pinia'

const BASE = '/api'

function post(path, body) {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  })
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: '',
    refreshToken: '',
    user: null
  }),
  // 持久化登录态：刷新/重启后保持登录（否则强制登录会反复踢回登录页）
  persist: {
    pick: ['accessToken', 'refreshToken', 'user']
  },
  getters: {
    isLoggedIn: (s) => !!s.accessToken,
    isAdmin: (s) => s.user?.role === 'admin'
  },
  actions: {
    /** 保存会话（注册/登录/刷新共用） */
    setSession({ user, accessToken, refreshToken }) {
      this.user = user
      this.accessToken = accessToken
      this.refreshToken = refreshToken
    },

    /** 注册并登录 */
    async register({ username, password, email }) {
      const d = await post('/auth/register', { username, password, email })
      this.setSession(d)
      return d.user
    },

    /** 登录 */
    async login({ username, password }) {
      const d = await post('/auth/login', { username, password })
      this.setSession(d)
      return d.user
    },

    /** 用 refresh 令牌换新 access 令牌（401 时自动调用） */
    async tryRefresh() {
      if (!this.refreshToken) return false
      try {
        const d = await post('/auth/refresh', { refreshToken: this.refreshToken })
        this.accessToken = d.accessToken
        this.refreshToken = d.refreshToken
        return true
      } catch {
        this.logout()
        return false
      }
    },

    /** 退出登录 */
    logout() {
      this.accessToken = ''
      this.refreshToken = ''
      this.user = null
    }
  }
})
