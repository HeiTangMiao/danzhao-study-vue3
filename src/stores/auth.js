/**
 * auth Store —— 账号会话（Pinia，自动持久化到 localStorage）
 * 职责：注册/登录/刷新/退出，管理 access + refresh 令牌与用户信息。
 * 说明：tryRefresh 用裸 fetch 而非 api 客户端，避免循环依赖。
 */
import { defineStore } from 'pinia'
import { API_BASE } from '@/sync/apiBase'
import { useStudyDbStore } from '@/stores/studyDb'

// 地址集中配置（见 src/sync/apiBase.js）。此前这里写死 '/api'，
// 导致 Tauri 打包后请求被解析到 tauri://localhost/api 而必然失败。
const BASE = API_BASE

/**
 * 本地同步数据归属的用户 id。
 *
 * 为什么需要它：IndexedDB（study_game_db）是**单库无用户维度**的，登出只清 token 不清数据。
 * 若不记录归属，A 退出后 B 登录同一设备，A 的错题/笔记/学习记录会立即对 B 可见，
 * 且首次同步会以 B 的 user_id 全量推上服务端（隐私 + 数据完整性缺陷）。
 *
 * 判据只认「换人」：同账号（含刷新恢复、登出后重登）一律不清，避免误丢未同步进度。
 */
const DATA_OWNER_KEY = 'local_data_owner'

function getDataOwner() {
  try {
    return localStorage.getItem(DATA_OWNER_KEY)
  } catch {
    return null
  }
}

function setDataOwner(id) {
  try {
    if (id) localStorage.setItem(DATA_OWNER_KEY, String(id))
    else localStorage.removeItem(DATA_OWNER_KEY)
  } catch { /* 存储不可用时退化为「下次仍会触发清理」，不影响正确性 */ }
}

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
    /**
     * 保存会话（注册/登录/刷新共用）
     *
     * 换账号检测：本地数据归属（DATA_OWNER_KEY）≠ 新 userId → 先清空同步仓库再让新账号进场。
     * 只在「确实换了人」时清；同账号（刷新恢复 / 登出后重登）一律不清，避免误丢未同步进度。
     *
     * @returns {Promise<void>|undefined} 发生换账号时返回清库 Promise（便于测试与调用方 await）；
     *          未换账号返回 undefined。登录主流程不依赖它，故不 await 也不会卡住。
     */
    setSession({ user, accessToken, refreshToken }) {
      const nextId = user && user.id != null ? String(user.id) : null
      const prevOwner = getDataOwner()
      const accountSwitched = !!prevOwner && !!nextId && prevOwner !== nextId

      this.user = user
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      setDataOwner(nextId)

      if (accountSwitched) {
        return useStudyDbStore().clearAllSyncedData().catch((e) => {
          console.error('[Auth] 换账号清理本地同步数据失败:', e)
        })
      }
      return undefined
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
