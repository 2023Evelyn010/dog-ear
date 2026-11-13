/**
 * 間隔複習排程（docs/PRD.md 第 4 節）。純函式，不碰資料庫。
 *
 * 固定間隔（Leitner），等級 0–5。所有日期為本地日期 YYYY-MM-DD，一律從「今天」起算，
 * 所以逾期的題目答對時不會被逾期天數影響。
 */
import { addDays, type DateString } from './date'

/** 天，索引 = 等級 */
export const INTERVALS = [1, 2, 4, 7, 15, 30] as const
export const MAX_LEVEL = 5

export type Level = 0 | 1 | 2 | 3 | 4 | 5
/** 「不會」視為 wrong */
export type ReviewResult = 'sure' | 'guessed' | 'wrong'

export interface ScheduleState {
  level: Level
  status: 'learning' | 'mastered'
  nextReviewDate: DateString | null // 已掌握為 null
}

/** 新增錯題：等級 0，明天開始複習（錄入當天不出題） */
export function initialSchedule(today: DateString): ScheduleState {
  return { level: 0, status: 'learning', nextReviewDate: addDays(today, 1) }
}

/** 依作答結果重新排程 */
export function schedule(level: Level, result: ReviewResult, today: DateString): ScheduleState {
  if (result === 'wrong') return { level: 0, status: 'learning', nextReviewDate: addDays(today, 1) }
  // 猜的：不升級，照原本等級的間隔再出現
  if (result === 'guessed') return { level, status: 'learning', nextReviewDate: addDays(today, INTERVALS[level]) }
  // 有把握
  if (level >= MAX_LEVEL) return { level: MAX_LEVEL, status: 'mastered', nextReviewDate: null }
  const next = (level + 1) as Level
  return { level: next, status: 'learning', nextReviewDate: addDays(today, INTERVALS[next]) }
}

export interface Schedulable {
  status: 'learning' | 'mastered'
  nextReviewDate: DateString | null
  level: number
  createdAt: string
}

export function isDue(q: Schedulable, today: DateString): boolean {
  return q.status === 'learning' && q.nextReviewDate !== null && q.nextReviewDate <= today
}

/** 出題順序：逾期最久（nextReviewDate 最早）→ 等級最低 → 建立時間最早 */
export function compareForReview(a: Schedulable, b: Schedulable): number {
  const da = a.nextReviewDate ?? ''
  const db = b.nextReviewDate ?? ''
  if (da !== db) return da < db ? -1 : 1
  if (a.level !== b.level) return a.level - b.level
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}

/** 今天還能出幾題：每日上限扣掉今天已複習的題數（中途離開再進來不會超過上限） */
export function remainingToday(dailyLimit: number, reviewedToday: number): number {
  return Math.max(0, dailyLimit - reviewedToday)
}

/** 今日出題清單：篩選到期題目、排序、取前 limit 題；其餘順延（不受懲罰） */
export function buildReviewQueue<T extends Schedulable>(
  questions: T[],
  today: DateString,
  limit: number,
): { queue: T[]; deferred: number } {
  const due = questions.filter((q) => isDue(q, today)).sort(compareForReview)
  const queue = due.slice(0, Math.max(0, limit))
  return { queue, deferred: due.length - queue.length }
}
