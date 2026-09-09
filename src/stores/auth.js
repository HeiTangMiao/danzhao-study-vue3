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

    /** 用 refresh 令牌换新 access 令牌（401 时自动调用）。断网不登出，仅服务端明确拒绝才登出。 */
    async tryRefresh() {
      if (!this.refreshToken) return false
      let res
      try {
        res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        })
      } catch {
        // 网络不可达 / DNS 失败：保留登录态，等待下次同步重试
        return false
      }
      // 服务端明确拒绝会话（过期 / 已轮换 / 已撤销）→ 会话确实失效才登出
      if (res.status === 401) {
        this.logout()
        return false
      }
      if (!res.ok) return false // 5xx 等瞬时错误：保留会话，不误登出
      const d = await res.json().catch(() => ({}))
      if (!d.accessToken) return false
      this.accessToken = d.accessToken
      this.refreshToken = d.refreshToken
      return true
    },

    /** 退出登录：先尽力撤销服务端 refresh 会话，再清本地登录态（断网也能本地登出） */
    logout() {
      const token = this.refreshToken
      this.accessToken = ''
      this.refreshToken = ''
      this.user = null
      if (token) {
        fetch(`${BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: token })
        }).catch(() => { /* 断网/失败：本地登出已完成，服务端会话随 token 过期自然失效 */ })
      }
    }
  }
})
