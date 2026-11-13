/** 複習頁與完成畫面的統計（純函式） */
import { addDays, parseDate, type DateString } from './date'

/** 每題約 20 秒，無條件進位到分鐘 */
export const SECONDS_PER_QUESTION = 20

export function estimateMinutes(count: number): number {
  return Math.ceil((count * SECONDS_PER_QUESTION) / 60)
}

/**
 * 連續天數：從今天（若今天已複習至少一題）或昨天往回數，連續「有至少一筆 ReviewLog」的天數。
 * 今天還沒複習時不中斷昨天以前的連續紀錄。
 */
export function streakDays(reviewDates: Iterable<DateString>, today: DateString): number {
  const days = new Set(reviewDates)
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** 本週第一天（星期一） */
export function weekStart(today: DateString): DateString {
  const offset = (parseDate(today).getDay() + 6) % 7 // 星期一 = 0
  return addDays(today, -offset)
}

/** 本地日期當天 00:00 的時間點（用來和 ISO 時間戳記 createdAt 比較） */
export function startOfLocalDay(s: DateString): Date {
  const d = parseDate(s)
  d.setHours(0, 0, 0, 0)
  return d
}

export interface DayLog {
  questionId: string
  result: 'sure' | 'guessed' | 'wrong'
  levelBefore: number
  levelAfter: number
}

export interface DaySummary {
  done: number // 完成題數
  accuracy: number // 答對率 = 有把握 ÷ 完成題數，四捨五入的百分比
  newlyMastered: number // 等級 5 答「有把握」→ 已掌握
}

/** 今天全部的作答紀錄 → 完成畫面的數據 */
export function summarizeDay(logs: DayLog[]): DaySummary {
  const done = logs.length
  const sure = logs.filter((l) => l.result === 'sure').length
  return {
    done,
    accuracy: done ? Math.round((sure / done) * 100) : 0,
    newlyMastered: logs.filter((l) => l.result === 'sure' && l.levelBefore >= 5).length,
  }
}
