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
/** 引擎未就绪时的纯文本兜底（剥掉数学定界符） */
export function renderPlainFallback(text: string): string
/** 幂等预热 KaTeX（阶段 7.1：引擎已移出内容页关键路径） */
export function warmKatex(): Promise<object | null>
export function isKatexReady(): boolean
/** 就绪版本号（响应式）：组件依赖它，在引擎到位后重渲染 */
export const engineVersion: { value: number }
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
  id: string | number
  question: string
  correctAnswer: string
  userAnswer: string
  explanation: string
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
  reviewed: boolean
  // ===== 批 C 新增/补全（行内加字段，零升版）=====
  /** 学科（error_book 行） */
  subject?: string
  /** 单元号 */
  unitNum?: string
  /** 所属内容页 fileKey（卡点用虚拟键 'stuck:<module>'） */
  fileKey?: string
  /** 来源页面标题 */
  fileTitle?: string
  /** 单元标题 */
  unitTitle?: string
  /** 入本时间戳 */
  createdAt?: number
  /** 入本日期 YYYY-MM-DD */
  createdAtDate?: string
  /** 最近复习时间戳（=「已复习过」判据 hasReviewed） */
  lastReviewedAt?: number | null
  /** 复习次数 */
  reviewCount?: number
  /** 入本（重复答错）次数 */
  wrongCount?: number
  /** 存量手动标注的「已掌握」固化副本（迁移写入） */
  legacyMastered?: boolean
  /** 卡片种类：'stuck' = 卡点（错题行无此字段）。注意与 blockTypes.kind 同名不同义 */
  kind?: 'stuck'
  /** 卡点所属模块/作品名（仅 kind='stuck'） */
  module?: string
  /** 来源：'cloze' = 默写专项，'stuck' = 卡点（其余来源无此字段） */
  source?: string
  /** 归因（A-3，六选一） */
  reason?: string
  /** 知识点关键词（A-3） */
  kp?: string
  /** 软删墓碑（读接口已过滤） */
  deleted?: boolean
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

/** 单次复习上限（单一真相源，P0-6 验收 2） */
export const REVIEW_SESSION_LIMIT: number

/** 四档元信息（UI 文案与 grade 值唯一来源） */
export const GRADE_META: Array<{ grade: number; key: string; label: string; tone: string }>

/** 「已掌握」唯一判据（SM-2 真掌握 OR 存量手动标注 legacyMastered/reviewed） */
export function isMastered(e: Partial<ReviewItem> | null | undefined): boolean

/** 「已复习过」判据（lastReviewedAt 非空），与 isMastered 彻底分开 */
export function hasReviewed(e: Partial<ReviewItem> | null | undefined): boolean

/** due 判据唯一真相源 */
export function isDue(e: Partial<ReviewItem> | null | undefined, today?: string): boolean

/** 今日到期计数（与复习页队列同一判据） */
export function countDue(list: Array<Partial<ReviewItem>>, today?: string): number

/** 复习页队列：筛选到期 → 排期升序 → 截断（不改入参） */
export function pickDue(
  list: Array<Partial<ReviewItem>>,
  opts?: { limit?: number; kind?: 'error' | 'stuck' | null; today?: string }
): Array<Partial<ReviewItem>>

/** 卡片种类取值域（error_book.kind） */
export const CARD_KINDS: { ERROR: 'error'; STUCK: 'stuck' }

/** 统一评分入口（唯一写库点；不写 reviewed） */
export function gradeCard(
  db: any,
  error: Partial<ReviewItem>,
  grade: number
): Promise<{
  next: Partial<ReviewItem>
  sm2: { interval: number; repetitions: number; easeFactor: number; nextReviewDate: string }
}>

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