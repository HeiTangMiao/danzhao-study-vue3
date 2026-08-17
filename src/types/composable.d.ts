/**
 * Composable 类型定义
 * 为 Vue3 composables 提供 TypeScript 类型支持
 */
import type { Ref } from 'vue'
import type { Subject } from './site'

// ===== useNotes =====

export interface UseNotesReturn {
  content: Ref<string>
  status: Ref<string>
  statusType: Ref<'saved' | 'saving' | 'error'>
  wordCount: Ref<number>
  scheduleAutosave: () => void
  manualSave: () => Promise<void>
}

export function useNotes(
  pageKey: string,
  subject: Subject,
  meta?: { title?: string; unitTitle?: string }
): UseNotesReturn

// ===== useBookmarks =====

export interface UseBookmarksReturn {
  isBookmarked: Ref<boolean>
  toggleBookmark: () => Promise<void>
  removeBookmark: () => Promise<void>
}

export function useBookmarks(
  pageKey: string,
  subject: Subject,
  meta?: { title?: string; unitTitle?: string; unitNum?: string }
): UseBookmarksReturn

// ===== useTheme =====

export interface UseThemeReturn {
  theme: Ref<'light' | 'dark'>
  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
}

export function useTheme(themeKey?: string): UseThemeReturn

// ===== useMathJax =====

export interface UseMathJaxReturn {
  render: (el?: HTMLElement) => void
  isLoaded: Ref<boolean>
}

export function useMathJax(): UseMathJaxReturn

// ===== useMermaid =====

export interface UseMermaidReturn {
  render: (el: HTMLElement, code: string) => Promise<void>
  isLoaded: Ref<boolean>
}

export function useMermaid(): UseMermaidReturn

// ===== usePomodoro =====

export interface UsePomodoroReturn {
  mode: Ref<'focus' | 'break' | 'longBreak'>
  timeLeft: Ref<number>
  isRunning: Ref<boolean>
  completedSessions: Ref<number>
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
}

export function usePomodoro(): UsePomodoroReturn

// ===== useSpacedReview =====

export interface ReviewItem {
  id: number
  question: string
  correctAnswer: string
  userAnswer: string
  explanation: string
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
}

export interface UseSpacedReviewReturn {
  dueItems: Ref<ReviewItem[]>
  loadDueItems: () => Promise<void>
  review: (id: number, quality: number) => Promise<void>
}

export function useSpacedReview(): UseSpacedReviewReturn
