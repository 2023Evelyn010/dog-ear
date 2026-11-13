import Dexie, { type EntityTable } from 'dexie'
import type { DateString } from '../lib/date'
import type { Level, ReviewResult } from '../lib/scheduler'

// 資料結構見 docs/PRD.md 第 5 節

export type Choice = 'A' | 'B' | 'C' | 'D'
export type Part = 5 | 6 | 7
export type { Level, ReviewResult } // 定義在排程模組

export interface Question {
  id: string // crypto.randomUUID()
  part: Part
  images: Blob[] // 壓縮後的照片
  myAnswer: Choice | 'blank' // blank = 未作答
  correctAnswer: Choice
  errorTagIds: string[] // 至少一個；記 ID 不記名稱
  source?: string // 題本名稱
  pageRef?: string // 頁碼／題號
  note?: string
  sessionId?: string // 所屬 PracticeSession
  level: Level
  status: 'learning' | 'mastered'
  nextReviewDate: DateString | null // 已掌握為 null
  createdAt: string // ISO 時間
  updatedAt: string
  ocrText?: string // v2 預留
}
// 衍生：myAnswer === correctAnswer 即為「猜對」的題目

export interface ErrorTag {
  id: string
  name: string
  order: number // 手動排序
  archived: boolean
  isDefault: boolean
}

export interface ReviewLog {
  id: string
  questionId: string
  reviewedAt: string // ISO 時間
  reviewDate: DateString // 計算連續天數用
  answer: Choice | 'unknown' // unknown = 不會
  result: ReviewResult
  levelBefore: number
  levelAfter: number
}

export interface PracticeSession {
  // 一次連續錄入 = 一筆
  id: string
  date: DateString
  attempted?: number // 這次寫了幾題；略過則為空
  wrongCount: number // 答錯題數（不含猜對）
  guessedCount: number
  source?: string
}

export interface Settings {
  // 單筆，id 固定為 'app'
  id: 'app'
  dailyLimit: number
  lastSource?: string
  lastBackupAt?: string
  onboardingSeen: boolean
}

export const SETTINGS_ID = 'app' as const
export const DEFAULT_DAILY_LIMIT = 20

export const DEFAULT_ERROR_TAG_NAMES = [
  '單字',
  '搭配詞',
  '文法',
  '同義改寫',
  '定位失敗',
  '推論',
  '時間不夠',
  '粗心',
] as const

export function createDefaultErrorTags(): ErrorTag[] {
  return DEFAULT_ERROR_TAG_NAMES.map((name, order) => ({
    id: crypto.randomUUID(),
    name,
    order,
    archived: false,
    isDefault: true,
  }))
}

export function createDefaultSettings(): Settings {
  return { id: SETTINGS_ID, dailyLimit: DEFAULT_DAILY_LIMIT, onboardingSeen: false }
}

export class DogEarDB extends Dexie {
  questions!: EntityTable<Question, 'id'>
  errorTags!: EntityTable<ErrorTag, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  sessions!: EntityTable<PracticeSession, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'dog-ear') {
    super(name)
    this.version(1).stores({
      questions: 'id, status, nextReviewDate, part, createdAt, *errorTagIds',
      reviewLogs: 'id, questionId, reviewDate',
      errorTags: 'id, order',
      sessions: 'id, date',
      settings: 'id',
    })

    // 只在資料庫第一次建立時執行：建立預設錯因與設定
    this.on('populate', async (tx) => {
      await tx.table<ErrorTag, string>('errorTags').bulkAdd(createDefaultErrorTags())
      await tx.table<Settings, string>('settings').add(createDefaultSettings())
    })
  }
}

export const db = new DogEarDB()
