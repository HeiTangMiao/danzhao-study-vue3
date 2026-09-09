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

// ===== 学习记录类型 =====

/** 每日统计（学习记录，无游戏化字段） */
export interface DailyStat {
  date: string
  filesVisited: number
  questionsAnswered: number
  studyMinutes: number
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
}

/** 学习日志 */
export interface StudyLog {
  date: string
  timestamp: number
  subject: Subject
  unitNum: string
  fileKey: string
  action: 'page_visit' | 'answer_question' | 'complete_test' | 'test_complete'
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
  page_progress: PageProgress[]
  error_book: ErrorRecord[]
  notes: NoteRecord[]
  bookmarks: BookmarkRecord[]
  localStorage: Record<string, string>
}
