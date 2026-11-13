import { today } from '../lib/date'
import { db as defaultDb, type DogEarDB, type PracticeSession } from './schema'

export interface SessionCounts {
  wrongCount: number // 答錯（不含猜對）
  guessedCount: number
}

export function countSession(guessedFlags: boolean[]): SessionCounts {
  const guessedCount = guessedFlags.filter(Boolean).length
  return { wrongCount: guessedFlags.length - guessedCount, guessedCount }
}

/** 「本次錄入 N 題：答錯 X 題、猜對 Y 題」；Y 為 0 時省略後半 */
export function sessionSummary({ wrongCount, guessedCount }: SessionCounts): string {
  const total = wrongCount + guessedCount
  const base = `本次錄入 ${total} 題：答錯 ${wrongCount} 題`
  return guessedCount > 0 ? `${base}、猜對 ${guessedCount} 題` : base
}

export type AttemptedCheck =
  | { ok: true; attempted: number; wrongRate: number } // wrongRate 為四捨五入後的百分比整數
  | { ok: false; error?: string } // error 為空表示還沒輸入

/** 驗證「這次寫了幾題」：必須是正整數，且不能少於答錯題數 */
export function checkAttempted(input: string, wrongCount: number): AttemptedCheck {
  const s = input.trim()
  if (!s) return { ok: false }
  if (!/^\d+$/.test(s)) return { ok: false }
  const attempted = Number(s)
  if (attempted < wrongCount) return { ok: false, error: '寫的題數不能少於答錯的題數' }
  if (attempted === 0) return { ok: false }
  return { ok: true, attempted, wrongRate: Math.round((wrongCount / attempted) * 100) }
}

export async function addPracticeSession(
  session: { id: string; attempted?: number; source?: string } & SessionCounts,
  database: DogEarDB = defaultDb,
  now: Date = new Date(),
): Promise<PracticeSession> {
  const record: PracticeSession = {
    id: session.id,
    date: today(now),
    attempted: session.attempted,
    wrongCount: session.wrongCount,
    guessedCount: session.guessedCount,
    source: session.source?.trim() || undefined,
  }
  await database.sessions.put(record)
  return record
}
