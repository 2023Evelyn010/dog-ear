import { ConfirmSheet } from '../../components/Sheet'
import type { BackupExport } from './useBackupExport'

/** iOS 沒讓分享選單跳出時，請使用者再按一次（這次按鈕直接呼叫分享） */
export function BackupReadySheet({ backup }: { backup: BackupExport }) {
  return (
    <ConfirmSheet
      open={backup.pending !== null}
      title="備份檔已準備好"
      confirmLabel="分享備份檔"
      cancelLabel="取消"
      onConfirm={backup.sharePending}
      onCancel={backup.cancelPending}
    />
  )
}
