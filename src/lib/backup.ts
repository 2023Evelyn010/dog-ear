import JSZip from 'jszip'
import {
  createDefaultSettings,
  db as defaultDb,
  type DogEarDB,
  type ErrorTag,
  type PracticeSession,
  type Question,
  type ReviewLog,
  type Settings,
} from '../db/schema'
import { today as todayOf } from './date'

/**
 * ZIP 備份（docs/PRD.md 3.7）：
 * `data.json`（所有資料表，照片欄位改存檔名）＋ `images/`（照片原檔）。
 */

export const SCHEMA_VERSION = 1

type StoredQuestion = Omit<Question, 'images'> & { images: string[] }

interface BackupData {
  schemaVersion: typeof SCHEMA_VERSION
  exportedAt: string // ISO 時間
  questions: StoredQuestion[]
  errorTags: ErrorTag[]
  reviewLogs: ReviewLog[]
  sessions: PracticeSession[]
  settings: Settings[]
}

const EXT_BY_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const TYPE_BY_EXT: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

export function backupFileName(now: Date): string {
  return `dog-ear-backup-${todayOf(now).replaceAll('-', '')}.zip`
}

/** 產生備份 ZIP。備份檔裡的「上次備份」記為這次匯出的時間，匯入後提醒才會從這次算起。 */
export async function createBackup(database: DogEarDB = defaultDb, now: Date = new Date()): Promise<File> {
  const [questions, errorTags, reviewLogs, sessions, settings] = await Promise.all([
    database.questions.toArray(),
    database.errorTags.toArray(),
    database.reviewLogs.toArray(),
    database.sessions.toArray(),
    database.settings.toArray(),
  ])
  const zip = new JSZip()
  const exportedAt = now.toISOString()
  const data: BackupData = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    questions: questions.map((q) => ({
      ...q,
      images: q.images.map((blob, i) => {
        const path = `images/${q.id}-${i + 1}.${EXT_BY_TYPE[blob.type] ?? 'jpg'}`
        zip.file(path, blob)
        return path
      }),
    })),
    errorTags,
    reviewLogs,
    sessions,
    settings: settings.map((s) => ({ ...s, lastBackupAt: exportedAt })),
  }
  zip.file('data.json', JSON.stringify(data))
  // 照片已經是壓縮過的 JPEG，再壓縮沒有效果
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  return new File([blob], backupFileName(now), { type: 'application/zip' })
}

/** 檔案不是 Dog-ear 的備份（或格式版本不支援） */
export class InvalidBackupError extends Error {
  constructor(reason: string) {
    super(`invalid backup: ${reason}`)
    this.name = 'InvalidBackupError'
  }
}

export interface ParsedBackup {
  exportedAt: string
  questionCount: number
  tables: {
    questions: Question[]
    errorTags: ErrorTag[]
    reviewLogs: ReviewLog[]
    sessions: PracticeSession[]
    settings: Settings[]
  }
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v)

/** 讀取並檢查備份檔，照片一併讀出；任何不符都丟出 InvalidBackupError */
export async function parseBackup(file: Blob): Promise<ParsedBackup> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new InvalidBackupError('not a zip')
  }
  const json = zip.file('data.json')
  if (!json) throw new InvalidBackupError('missing data.json')
  let data: BackupData
  try {
    data = JSON.parse(await json.async('string')) as BackupData
  } catch {
    throw new InvalidBackupError('data.json is not JSON')
  }
  if (data?.schemaVersion !== SCHEMA_VERSION) throw new InvalidBackupError('unsupported schemaVersion')
  const { questions, errorTags, reviewLogs, sessions, settings } = data
  if (![questions, errorTags, reviewLogs, sessions, settings].every(isArray) || typeof data.exportedAt !== 'string') {
    throw new InvalidBackupError('missing tables')
  }

  const restored: Question[] = await Promise.all(
    questions.map(async (q) => {
      if (!isArray(q.images)) throw new InvalidBackupError('bad images')
      const images = await Promise.all(
        q.images.map(async (path) => {
          const entry = typeof path === 'string' ? zip.file(path) : null
          if (!entry) throw new InvalidBackupError(`missing image ${String(path)}`)
          const ext = path.split('.').pop() ?? ''
          return new Blob([await entry.async('blob')], { type: TYPE_BY_EXT[ext] ?? 'image/jpeg' })
        }),
      )
      return { ...q, images }
    }),
  )
  return {
    exportedAt: data.exportedAt,
    questionCount: restored.length,
    tables: { questions: restored, errorTags, reviewLogs, sessions, settings },
  }
}

/** 匯入：清空所有資料表後寫入備份內容（同一個交易，失敗時保留原資料） */
export async function restoreBackup(backup: ParsedBackup, database: DogEarDB = defaultDb): Promise<void> {
  const { questions, errorTags, reviewLogs, sessions, settings } = backup.tables
  const tables = [database.questions, database.errorTags, database.reviewLogs, database.sessions, database.settings]
  await database.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await database.questions.bulkAdd(questions)
    await database.errorTags.bulkAdd(errorTags)
    await database.reviewLogs.bulkAdd(reviewLogs)
    await database.sessions.bulkAdd(sessions)
    await database.settings.bulkAdd(settings.length > 0 ? settings : [createDefaultSettings()])
  })
}

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * 交出備份檔：優先用 Web Share API（iOS 可存到「檔案」或雲端硬碟），不支援時改為下載。
 * 使用者在分享選單按取消回傳 'cancelled'（不算備份成功）。
 * iOS 在產生檔案花太久時會判定不是使用者操作而丟出 NotAllowedError，交給呼叫端請使用者再按一次。
 */
export async function deliverFile(file: File): Promise<DeliverResult> {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      throw err
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}

export function isNotAllowedError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError'
}
