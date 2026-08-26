/**
 * Composable 类型定义
 * 为 Vue3 composables 提供 TypeScript 类型支持
 * 注意：本声明需与实际实现保持一致，修改 composables 时请同步更新
 */
import type { Ref } from 'vue'
import type { Subject } from './site'

// ===== useNotes =====

export type NotesStatus = 'ready' | 'loading' | 'editing' | 'saving' | 'saved' | 'error'

export interface UseNotesReturn {
  content: Ref<string>
  status: Ref<string>
  statusType: Ref<NotesStatus>
  wordCount: Ref<number>
  isLoaded: Ref<boolean>
  loadNote: () => Promise<void>
  saveNote: (manual?: boolean) => Promise<void>
  manualSave: () => Promise<void>
  scheduleAutosave: () => void
  updateWordCount: () => void
}

export function useNotes(
  pageKey: string | Ref<string>,
  subject?: Subject | Ref<Subject>,
  pageInfo?: any
): UseNotesReturn

// ===== useBookmarks =====

export interface UseBookmarksReturn {
  isBookmarked: Ref<boolean>
  loadBookmarkState: () => Promise<void>
  toggleBookmark: () => Promise<void>
}

export function useBookmarks(
  pageKey: string | Ref<string>,
  subject?: Subject | Ref<Subject>,
  pageInfo?: any
): UseBookmarksReturn

// ===== useTheme =====

export interface UseThemeReturn {
  isDark: Ref<boolean>
  toggleTheme: () => boolean
}

export function useTheme(): UseThemeReturn

// ===== useKatex（替代旧 MathJax 的公式渲染） =====

export function renderMath(text: string, forceBlock?: boolean): string
export function typesetMath(root?: HTMLElement): Promise<void>
export function loadMathJax(): Promise<void>

// ===== useMermaid（模块级函数，无组合式函数） =====

export function loadMermaid(): Promise<object | null>
export function renderMermaidTo(
  container: HTMLElement,
  source: string,
  opts?: { decorate?: boolean }
): Promise<void>
export function decorateMindmap(source: string): string
export function updateMermaidTheme(theme: 'dark' | 'light'): Promise<void>

// ===== usePomodoro =====

export type PomodoroMode = 'focus' | 'break' | 'long_break'

export interface UsePomodoroReturn {
  running: Ref<boolean>
  mode: Ref<PomodoroMode>
  timeLeft: Ref<number>
  sessionsCompleted: Ref<number>
  cycleCount: Ref<number>
  display: Ref<string>
  progress: Ref<number>
  modeLabel: Ref<string>
  totalDuration: Ref<number>
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
  reviewed: boolean
}

export interface ReviewStats {
  total: number
  dueToday: number
  reviewed: number
  mastered: number
  newCards: number
  bySubject: { math: number; chinese: number; computer: number }
}

export interface SessionStats {
  reviewed: number
  correct: number
  wrong: number
}

export function calculateSM2(
  error: Partial<ReviewItem>,
  grade: number
): { interval: number; repetitions: number; easeFactor: number; nextReviewDate: string }

export interface UseSpacedReviewReturn {
  dueReviews: Ref<ReviewItem[]>
  reviewStats: Ref<ReviewStats | null>
  sessionStats: Ref<SessionStats>
  loadDueReviews: (subject?: string | null) => Promise<void>
  loadReviewStats: () => Promise<ReviewStats>
  reviewCard: (error: ReviewItem, grade: number) => Promise<{ interval: number; repetitions: number; easeFactor: number; nextReviewDate: string }>
  removeMastered: () => Promise<number>
  resetSession: () => void
  calculateSM2: typeof calculateSM2
  getDateStr: (d?: Date) => string
}

export function useSpacedReview(): UseSpacedReviewReturn