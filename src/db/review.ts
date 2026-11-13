import { addDays, today as todayOf, type DateString } from '../lib/date'
import { buildReviewQueue, remainingToday, schedule, type ReviewResult } from '../lib/scheduler'
import { startOfLocalDay, streakDays, summarizeDay, weekStart, type DaySummary } from '../lib/stats'
import {
  db as defaultDb,
  DEFAULT_DAILY_LIMIT,
  SETTINGS_ID,
  type Choice,
  type DogEarDB,
  type Question,
  type ReviewLog,
} from './schema'

async function dailyLimitOf(database: DogEarDB): Promise<number> {
  return (await database.settings.get(SETTINGS_ID))?.dailyLimit ?? DEFAULT_DAILY_LIMIT
}

async function todayLogs(database: DogEarDB, today: DateString): Promise<ReviewLog[]> {
  return database.reviewLogs.where('reviewDate').equals(today).toArray()
}

/** 今天已複習的題數（同一題算一次） */
function reviewedCount(logs: ReviewLog[]): number {
  return new Set(logs.map((l) => l.questionId)).size
}

/** 今日出題清單：開始時決定並固定，中途不變。每日上限會扣掉今天已複習的題數。 */
export async function loadTodayQueue(database: DogEarDB = defaultDb, now: Date = new Date()): Promise<Question[]> {
  const today = todayOf(now)
  const [due, logs, limit] = await Promise.all([
    database.questions.where('nextReviewDate').belowOrEqual(today).toArray(),
    todayLogs(database, today),
    dailyLimitOf(database),
  ])
  return buildReviewQueue(due, today, remainingToday(limit, reviewedCount(logs))).queue
}

/** 寫入一題的作答結果：更新題目排程＋一筆 ReviewLog（同一個交易） */
export async function recordReview(
  questionId: string,
  answer: Choice | 'unknown',
  result: ReviewResult,
  database: DogEarDB = defaultDb,
  now: Date = new Date(),
): Promise<Question> {
  const today = todayOf(now)
  return database.transaction('rw', database.questions, database.reviewLogs, async () => {
    const q = await database.questions.get(questionId)
    if (!q) throw new Error(`question not found: ${questionId}`)
    const next = schedule(q.level, result, today)
    const updated: Question = { ...q, ...next, updatedAt: now.toISOString() }
    await database.questions.put(updated)
    await database.reviewLogs.add({
      id: crypto.randomUUID(),
      questionId,
      reviewedAt: now.toISOString(),
      reviewDate: today,
      answer,
      result,
      levelBefore: q.level,
      levelAfter: next.level,
    })
    return updated
  })
}

export interface ReviewOverview {
  total: number // 錯題總數
  weekNew: number // 本週新增（星期一起）
  addedToday: number
  streak: number // 連續天數
  todayCount: number // 今天要複習（已扣掉今天做過的）
  deferred: number // 超過每日上限、順延到明天
  reviewedToday: number
  tomorrowCount: number // 明天有幾題（受每日上限限制）
  nextDate: DateString | null // 明天沒有題目時，下一個有題目的日期；沒有任何排程為 null
  day: DaySummary // 今天全部的作答數據（完成畫面）
}

/** 複習頁與完成畫面需要的數據 */
export async function getReviewOverview(database: DogEarDB = defaultDb, now: Date = new Date()): Promise<ReviewOverview> {
  const today = todayOf(now)
  const tomorrow = addDays(today, 1)
  const [total, weekNew, addedToday, reviewDates, logs, dueToday, dueByTomorrow, limit] = await Promise.all([
    database.questions.count(),
    database.questions.where('createdAt').aboveOrEqual(startOfLocalDay(weekStart(today)).toISOString()).count(),
    database.questions.where('createdAt').aboveOrEqual(startOfLocalDay(today).toISOString()).count(),
    database.reviewLogs.orderBy('reviewDate').uniqueKeys(),
    todayLogs(database, today),
    // 已掌握的題目 nextReviewDate 為 null，不在索引裡
    database.questions.where('nextReviewDate').belowOrEqual(today).count(),
    database.questions.where('nextReviewDate').belowOrEqual(tomorrow).count(),
    dailyLimitOf(database),
  ])
  const reviewedToday = reviewedCount(logs)
  const todayCount = Math.min(dueToday, remainingToday(limit, reviewedToday))
  const tomorrowCount = Math.min(dueByTomorrow, limit)
  let nextDate: DateString | null = null
  if (tomorrowCount === 0) {
    const first = await database.questions.where('nextReviewDate').above(tomorrow).first()
    nextDate = first?.nextReviewDate ?? null
  }
  return {
    total,
    weekNew,
    addedToday,
    streak: streakDays(reviewDates as string[], today),
    todayCount,
    deferred: dueToday - todayCount,
    reviewedToday,
    tomorrowCount,
    nextDate,
    day: summarizeDay(logs),
  }
}

/** 僅開發環境：把所有學習中題目的下次複習日設為今天 */
export async function devMakeAllDueToday(database: DogEarDB = defaultDb): Promise<number> {
  return database.questions.where('status').equals('learning').modify({ nextReviewDate: todayOf() })
}
