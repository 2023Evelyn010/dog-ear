import { diffDays, today as todayOf, toDateString, type DateString } from '../../lib/date'

/** 超過幾天沒備份就提醒 */
export const BACKUP_REMIND_DAYS = 7

/**
 * 備份提示列的天數；不需要提醒時回 null。
 * 從沒備份過時從第一題的新增日開始算，剛開始用不會馬上被提醒。
 */
export function daysWithoutBackup(
  lastBackupAt: string | undefined,
  firstQuestionAt: string | undefined,
  today: DateString = todayOf(),
): number | null {
  if (!firstQuestionAt) return null // 沒有錯題
  const since = toDateString(new Date(lastBackupAt ?? firstQuestionAt))
  const days = diffDays(since, today)
  return days >= BACKUP_REMIND_DAYS ? days : null
}

export type HomeBanner = { kind: 'install' } | { kind: 'backup'; days: number } | null

/** 同時最多一條，加入主畫面優先 */
export function pickBanner(standalone: boolean, backupDays: number | null): HomeBanner {
  if (!standalone) return { kind: 'install' }
  if (backupDays !== null) return { kind: 'backup', days: backupDays }
  return null
}
