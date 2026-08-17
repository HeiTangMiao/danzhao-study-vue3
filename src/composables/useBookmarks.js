/**
 * useBookmarks —— 书签 / 收藏 composable
 * 职责：
 *  - 按页面加载 / 切换 / 删除书签
 *  - 提供书签状态响应式引用
 *
 * 替代旧版 assets/js/bookmark.js
 * 依赖：studyDb store
 */
import { ref } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'

export function useBookmarks(pageKey, subject = 'math', pageInfo = {}) {
  const db = useStudyDbStore()

  // 响应式状态
  const isBookmarked = ref(false)

  /** 加载书签状态 */
  async function loadBookmarkState() {
    if (!pageKey) return
    try {
      await db.init()
      const bookmark = await db.getBookmark(pageKey)
      isBookmarked.value = !!bookmark
    } catch (e) {
      console.warn('[Bookmark] 加载状态失败:', e)
    }
  }

  /** 切换书签（收藏 / 取消收藏） */
  async function toggleBookmark() {
    if (!pageKey) return
    try {
      if (isBookmarked.value) {
        // 取消收藏
        await db.deleteBookmark(pageKey)
        isBookmarked.value = false
      } else {
        // 添加收藏
        await db.saveBookmark({
          pageKey,
          subject,
          title: pageInfo.title || '',
          unitTitle: pageInfo.unitTitle || '',
          unitNum: pageInfo.unitNum || '',
          url: pageInfo.url || '',
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

  return { isBookmarked, loadBookmarkState, toggleBookmark }
}