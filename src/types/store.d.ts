/**
 * Store 类型定义
 * 为 Pinia stores 提供 TypeScript 类型支持
 * 项目使用 .js 文件 + .d.ts 声明文件的方式获得类型提示
 */
import type { Subject } from './site'

// ===== Progress Store =====

/** 进度 Store 的 State */
export interface ProgressState {
  /** 进度记录：按学科 → 单元号 → 文件索引 */
  completed: Record<string, Record<string, Record<number, boolean>>>
  /** 最近学习时间戳 */
  lastStudiedAt: number | null
}

/** 进度 Store 实例类型 */
export interface ProgressStore {
  completed: ProgressState['completed']
  lastStudiedAt: ProgressState['lastStudiedAt']
  completedCount: (subject: Subject, unitNum: string) => number
  isCompleted: (subject: Subject, unitNum: string, fileIndex: number) => boolean
  subjectTotalCompleted: (subject: Subject) => number
  toggleComplete: (subject: Subject, unitNum: string, fileIndex: number) => void
  setBatchComplete: (subject: Subject, unitNum: string, indices: number[], done: boolean) => void
  resetSubject: (subject: Subject) => void
  resetAll: () => void
}

// ===== GameEngine Store =====

/** 等级信息 */
export interface LevelInfo {
  level: Level
  next: Level | null
  progress: number
  needXP: number
  totalXP: number
}

/** 等级定义 */
export interface Level {
  lv: number
  title: string
  xp: number
}

/** 成就定义 */
export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  unlockedDate?: string
}

/** 每日统计 */
export interface DailyStat {
  date: string
  xp: number
  filesVisited: number
  questionsAnswered: number
  checkin: boolean
  subjects?: Record<string, { xp: number; files: number; questions: number }>
}

/** 页面进度 */
export interface PageProgress {
  key: string
  subject: Subject
  unitNum: string
  unitTitle?: string
  fileTitle?: string
  visited: boolean
  visitTime?: number
  questionsAnswered: number
  questionsTotal: number
  testScore: number | null
  testPoints?: string
  xpEarned: number
}

/** 学习日志 */
export interface StudyLog {
  date: string
  timestamp: number
  subject: Subject
  unitNum: string
  fileKey: string
  action: 'page_visit' | 'answer_question' | 'complete_test' | 'test_complete'
  xp: number
  testScore?: number
}

/** 错题记录 */
export interface ErrorRecord {
  id?: number
  subject: Subject
  unitNum: string
  question: string
  correctAnswer: string
  userAnswer: string
  explanation: string
  createdAt: number
  createdAtDate: string
  reviewed: boolean
  reviewCount: number
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: string
  lastReviewedAt: number | null
  fileKey?: string
  fileTitle?: string
  unitTitle?: string
}

/** 仪表盘数据 */
export interface DashboardData {
  totalXP: number
  levelInfo: LevelInfo
  streak: number
  todayStat: DailyStat
  heatmap: Array<{ date: string; xp: number; checkin: boolean }>
  subjects: Record<Subject, {
    total: number
    visited: number
    xp: number
    units: Record<string, { visited: number; xp: number }>
  }>
  achievements: Achievement[]
  allProgress: PageProgress[]
  allErrors: ErrorRecord[]
  totalVisited: number
  totalQuestions: number
}

/** XP 奖励规则 */
export interface XPRules {
  READ_PAGE: number
  ANSWER_QUESTION: number
  COMPLETE_TEST: number
  HIGH_SCORE_BONUS: number
  PERFECT_SCORE_BONUS: number
  DAILY_STREAK_BASE: number
}

/** 追踪访问结果 */
export interface TrackVisitResult {
  xpGained: number
  alreadyVisited?: boolean
  error?: unknown
}

// ===== StudyDB Store =====

/** 笔记记录 */
export interface NoteRecord {
  pageKey: string
  subject: Subject
  title?: string
  unitTitle?: string
  content: string
  updatedAt: number
}

/** 书签记录 */
export interface BookmarkRecord {
  pageKey: string
  subject: Subject
  title?: string
  unitTitle?: string
  unitNum?: string
  createdAt: number
}

/** 数据导出结构 */
export interface ExportData {
  version: number
  exportedAt: string
  study_log: StudyLog[]
  daily_stats: DailyStat[]
  achievements: Achievement[]
  page_progress: PageProgress[]
  error_book: ErrorRecord[]
  notes: NoteRecord[]
  bookmarks: BookmarkRecord[]
  localStorage: Record<string, string>
}
