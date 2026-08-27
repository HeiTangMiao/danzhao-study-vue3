/**
 * API 客户端 —— 统一 fetch 封装
 *  - 自动附加 Bearer access 令牌
 *  - 401 时自动走 refresh 轮换后重试一次
 *  - 统一抛出后端 error 信息
 */
import { useAuthStore } from '@/stores/auth'

async function request(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const authStore = useAuthStore()
  const headers = { 'Content-Type': 'application/json' }
  if (auth && authStore.accessToken) headers.Authorization = `Bearer ${authStore.accessToken}`

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  // access 过期 → 刷新后重试一次
  if (res.status === 401 && auth && retry) {
    const ok = await authStore.tryRefresh()
    if (ok) return request(path, { method, body, auth, retry: false })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  sync: (payload) => request('/sync', { method: 'POST', body: payload })
}
