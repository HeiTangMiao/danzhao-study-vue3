/**
 * Store 类型定义
 * 为 Pinia stores 提供 TypeScript 类型支持
 * 项目使用 .js 文件 + .d.ts 声明文件的方式获得类型提示
 */
import type { Subject } from './site'

// ===== Progress Store =====

/** 最近学习位置（由 page_progress.visitTime 推导，供首页「继续学习」直达） */
export interface LastStudied {
  subject: Subject
  unitNum: string
  fileIndex: number
  unitTitle: string
  fileTitle: string
  time: number
}

/** 进度 Store 的 State */
export interface ProgressState {
  /** 进度记录：按学科 → 单元号 → 文件索引 */
  completed: Record<string, Record<string, Record<number, boolean>>>
  /** 最近学习时间戳 */
  lastStudiedAt: number | null
  /** 最近学习位置坐标（唯一事实源，替代原 localStorage.last_study） */
  lastStudied: LastStudied | null
}

/** 进度 Store 实例类型 */
export interface ProgressStore {
  completed: ProgressState['completed']
  lastStudiedAt: ProgressState['lastStudiedAt']
  lastStudied: ProgressState['lastStudied']
  completedCount: (subject: Subject, unitNum: string) => number
  isCompleted: (subject: Subject, unitNum: string, fileIndex: number) => boolean
  subjectTotalCompleted: (subject: Subject) => number
  init: () => Promise<void>
  /** 由 page_progress 重建完成快照（访问/交卷后调用） */
  refresh: () => Promise<void>
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
  /** v6 起为业务生成 UUID（历史行保留旧数字 id） */
  id?: string | number
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
  /** v6 起为业务生成 UUID（历史行保留旧数字 id） */
  id?: string | number
  /** 软删墓碑：true 表示已删除待同步清理 */
  deleted?: boolean
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
  /** 软删墓碑 */
  deleted?: boolean
}

/** 书签记录 */
export interface BookmarkRecord {
  pageKey: string
  subject: Subject
  title?: string
  unitTitle?: string
  unitNum?: string
  createdAt: number
  /** 软删墓碑 */
  deleted?: boolean
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
