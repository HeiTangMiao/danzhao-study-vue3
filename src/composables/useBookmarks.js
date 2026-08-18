/**
 * useBookmarks —— 书签 / 收藏 composable
 * 职责：
 *  - 按页面加载 / 切换 / 删除书签
 *  - 提供书签状态响应式引用
 *
 * 替代旧版 assets/js/bookmark.js
 * 依赖：studyDb store
 */
import { ref, computed, toValue, watch } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'

function toComputed(v) { return computed(() => toValue(v)) }

export function useBookmarks(pageKey, subject = 'math', pageInfo = {}) {
  const db = useStudyDbStore()
  const key = toComputed(pageKey)
  const subj = toComputed(subject)
  const info = toComputed(pageInfo)

  // 响应式状态
  const isBookmarked = ref(false)

  /** 加载书签状态 */
  async function loadBookmarkState() {
    if (!key.value) return
    try {
      await db.init()
      const bookmark = await db.getBookmark(key.value)
      isBookmarked.value = !!bookmark
    } catch (e) {
      console.warn('[Bookmark] 加载状态失败:', e)
    }
  }

  /** 切换书签（收藏 / 取消收藏） */
  async function toggleBookmark() {
    if (!key.value) return
    try {
      if (isBookmarked.value) {
        // 取消收藏
        await db.deleteBookmark(key.value)
        isBookmarked.value = false
      } else {
        // 添加收藏
        await db.saveBookmark({
          pageKey: key.value,
          subject: subj.value,
          title: info.value?.title || '',
          unitTitle: info.value?.unitTitle || '',
          unitNum: info.value?.unitNum || '',
          url: info.value?.url || '',
          createdAt: Date.now()
        })
        isBookmarked.value = true
      }
    } catch (e) {
      console.warn('[Bookmark] 切换失败:', e)
    }
  }

  // 初始加载
  loadBookmarkState()

  // 页面切换时重新加载新页面的书签状态
  watch(key, (nk, ok) => {
    if (nk && nk !== ok) {
      isBookmarked.value = false
      loadBookmarkState()
    }
  })

  return { isBookmarked, loadBookmarkState, toggleBookmark }
}