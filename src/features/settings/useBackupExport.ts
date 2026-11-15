import { useState } from 'react'
import { markBackedUp } from '../../db/settings'
import { createBackup, deliverFile, isNotAllowedError } from '../../lib/backup'

export const EXPORT_ERROR_MESSAGE = '匯出失敗，請再試一次'

/**
 * 匯出備份（設定頁與首頁提示列共用）。
 * 產生 ZIP 要一點時間，iOS 可能因此不讓分享選單跳出（NotAllowedError）；
 * 這時保留檔案，請使用者再按一次「分享備份檔」。
 */
export function useBackupExport() {
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function deliver(file: File) {
    try {
      const result = await deliverFile(file)
      setPending(null)
      if (result !== 'cancelled') await markBackedUp(new Date())
    } catch (err) {
      if (isNotAllowedError(err)) setPending(file)
      else {
        console.error(err)
        setPending(null)
        setError(EXPORT_ERROR_MESSAGE)
      }
    }
  }

  async function start() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await deliver(await createBackup())
    } catch (err) {
      console.error(err)
      setError(EXPORT_ERROR_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  return {
    busy,
    error,
    start: () => void start(),
    /** 等待使用者再按一次分享的檔案 */
    pending,
    sharePending: () => void (pending && deliver(pending)),
    cancelPending: () => setPending(null),
  }
}

export type BackupExport = ReturnType<typeof useBackupExport>
