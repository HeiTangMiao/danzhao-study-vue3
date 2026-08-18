/**
 * useNotes —— 知识点笔记 composable
 * 职责：
 *  - 按页面加载 / 保存 / 删除笔记（IndexedDB 存储）
 *  - 自动保存（防抖延迟 1.5 秒）
 *  - 支持手动保存（Ctrl+S）
 *
 * 替代旧版 assets/js/notes.js
 * 依赖：studyDb store
 */
import { ref, computed, onUnmounted, toValue, watch } from 'vue'
import { useStudyDbStore } from '@/stores/studyDb'

const AUTOSAVE_DELAY = 1500 // 自动保存延迟（毫秒）

// 兼容传入普通值或 ref：页面切换时 pageKey 变化，笔记需跟随新页面
function toComputed(v) { return computed(() => toValue(v)) }

export function useNotes(pageKey, subject = 'math', pageInfo = {}) {
  const db = useStudyDbStore()
  const key = toComputed(pageKey)
  const subj = toComputed(subject)
  const info = toComputed(pageInfo)

  // 响应式状态
  const content = ref('')           // 笔记内容
  const status = ref('就绪')         // 状态文案
  const statusType = ref('ready')   // 状态类型：ready/loading/saving/saved/error
  const wordCount = ref(0)          // 字数统计
  const isLoaded = ref(false)       // 是否已加载

  let saveTimer = null

  /** 更新状态显示 */
  function setStatus(text, type) {
    status.value = text
    statusType.value = type || 'ready'
  }

  /** 更新字数统计 */
  function updateWordCount() {
    wordCount.value = content.value.length
  }

  /** 加载笔记 */
  async function loadNote() {
    if (!key.value) return
    setStatus('加载中…', 'loading')
    try {
      await db.init()
      const note = await db.getNote(key.value)
      content.value = (note && note.content) || ''
      isLoaded.value = true
      updateWordCount()
      if (note && note.updatedAt) {
        const d = new Date(note.updatedAt)
        setStatus('上次保存：' + d.toLocaleString('zh-CN'), 'saved')
      } else {
        setStatus('就绪', 'ready')
      }
    } catch (e) {
      console.warn('[Notes] 加载笔记失败:', e)
      setStatus('加载失败', 'error')
    }
  }

  /** 保存笔记 */
  async function saveNote(manual = false) {
    if (!key.value) return
    const trimmed = content.value.trim()

    if (manual) setStatus('保存中…', 'saving')

    try {
      // 内容为空则删除笔记
      if (!trimmed) {
        await db.deleteNote(key.value)
        setStatus(manual ? '已清空' : '已自动保存（空）', 'saved')
        return
      }

      await db.saveNote({
        pageKey: key.value,
        subject: subj.value,
        title: info.value?.title || '',
        unitTitle: info.value?.unitTitle || '',
        content: content.value, // 保留原始内容（含空格）
        updatedAt: Date.now()
      })
      setStatus('已保存 ' + new Date().toLocaleTimeString('zh-CN'), 'saved')
    } catch (e) {
      console.warn('[Notes] 保存失败:', e)
      setStatus('保存失败', 'error')
    }
  }

  /** 安排自动保存（防抖） */
  function scheduleAutosave() {
    if (saveTimer) clearTimeout(saveTimer)
    setStatus('编辑中…', 'editing')
    updateWordCount()
    saveTimer = setTimeout(() => {
      saveTimer = null
      saveNote(false)
    }, AUTOSAVE_DELAY)
  }

  /** 手动保存 */
  function manualSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    saveNote(true)
  }

  // 初始加载
  loadNote()

  // 页面切换时（pageKey 变化）自动切换并加载新页面的笔记
  watch(key, (nk, ok) => {
    if (nk && nk !== ok) {
      // 先丢弃未保存的旧笔记，重置状态，再加载新页笔记
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
      content.value = ''
      isLoaded.value = false
      updateWordCount()
      loadNote()
    }
  })

  // 组件卸载时保存未持久化的内容
  onUnmounted(() => {
    if (saveTimer) { clearTimeout(saveTimer); saveNote(false) }
  })

  return {
    content, status, statusType, wordCount, isLoaded,
    loadNote, saveNote, manualSave, scheduleAutosave, updateWordCount
  }
}