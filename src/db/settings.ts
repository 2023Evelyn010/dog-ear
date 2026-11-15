import { createDefaultSettings, db as defaultDb, SETTINGS_ID, type DogEarDB, type Settings } from './schema'

/** 每日複習上限的範圍與調整間距（docs/PRD.md 3.5） */
export const DAILY_LIMIT_MIN = 5
export const DAILY_LIMIT_MAX = 100
export const DAILY_LIMIT_STEP = 5

export function clampDailyLimit(n: number): number {
  return Math.min(DAILY_LIMIT_MAX, Math.max(DAILY_LIMIT_MIN, Math.round(n)))
}

/** 讀取設定；資料庫還沒建立好或被清掉時回預設值 */
export async function getSettings(database: DogEarDB = defaultDb): Promise<Settings> {
  return (await database.settings.get(SETTINGS_ID)) ?? createDefaultSettings()
}

async function patchSettings(patch: Partial<Omit<Settings, 'id'>>, database: DogEarDB): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    await database.settings.put({ ...(await getSettings(database)), ...patch })
  })
}

export function setDailyLimit(n: number, database: DogEarDB = defaultDb): Promise<void> {
  return patchSettings({ dailyLimit: clampDailyLimit(n) }, database)
}

export function markOnboardingSeen(database: DogEarDB = defaultDb): Promise<void> {
  return patchSettings({ onboardingSeen: true }, database)
}

export function markBackedUp(at: Date, database: DogEarDB = defaultDb): Promise<void> {
  return patchSettings({ lastBackupAt: at.toISOString() }, database)
}

export interface BackupStatus {
  lastBackupAt?: string
  firstQuestionAt?: string // 最早一題的新增時間；沒有錯題為 undefined
}

/** 首頁備份提示需要的資料（只用 getAll 類查詢，不開 cursor） */
export async function getBackupStatus(database: DogEarDB = defaultDb): Promise<BackupStatus> {
  const [settings, [first]] = await Promise.all([
    getSettings(database),
    database.questions.orderBy('createdAt').limit(1).toArray(),
  ])
  return { lastBackupAt: settings.lastBackupAt, firstQuestionAt: first?.createdAt }
}
