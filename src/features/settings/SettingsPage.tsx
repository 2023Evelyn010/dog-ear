import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { FlowHeader } from '../../components/Header'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { useGoBack } from '../../components/useGoBack'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { devMakeAllDueToday } from '../../db/review'
import { db } from '../../db/schema'
import {
  DAILY_LIMIT_MAX,
  DAILY_LIMIT_MIN,
  DAILY_LIMIT_STEP,
  getSettings,
  setDailyLimit,
} from '../../db/settings'
import { InvalidBackupError, parseBackup, restoreBackup, type ParsedBackup } from '../../lib/backup'
import { BackupReadySheet } from './BackupReadySheet'
import { useBackupExport } from './useBackupExport'

const INVALID_BACKUP_MESSAGE = '這不是 Dog-ear 的備份檔'

/** M/D（本地日期） */
const monthDay = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

/** 設定（docs/PRD.md 3.5、Figma 5-1） */
export function SettingsPage() {
  const goBack = useGoBack()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const [settings, tags] = await Promise.all([getSettings(), db.errorTags.toArray()])
    return { settings, activeTags: tags.filter((t) => !t.archived).length }
  })
  const backup = useBackupExport()
  const [limitOpen, setLimitOpen] = useState(false)

  // 匯入：選檔 → 摘要＋確認 → 寫入 → 完成
  const fileInput = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [parsed, setParsed] = useState<ParsedBackup | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function pickFile(file: File | undefined) {
    if (!file) return
    setReading(true)
    setImportError(null)
    try {
      setParsed(await parseBackup(file))
    } catch (err) {
      if (!(err instanceof InvalidBackupError)) console.error(err)
      setImportError(INVALID_BACKUP_MESSAGE)
    } finally {
      setReading(false)
    }
  }

  async function confirmImport() {
    if (!parsed || importing) return
    setImporting(true)
    try {
      await restoreBackup(parsed)
      setImported(parsed.questionCount)
      setParsed(null)
    } catch (err) {
      console.error(err)
      setParsed(null)
      setImportError(STORAGE_ERROR_MESSAGE)
    } finally {
      setImporting(false)
    }
  }

  if (!data) return <FlowHeader title="設定" onLeading={goBack} />
  const { settings, activeTags } = data
  const lastBackup = settings.lastBackupAt ? `上次 ${monthDay(new Date(settings.lastBackupAt))}` : '尚未備份'

  return (
    <>
      <FlowHeader title="設定" onLeading={goBack} />
      <ul className="mt-2 px-6">
        <Row label="每日複習上限" value={`${settings.dailyLimit} 題`} onClick={() => setLimitOpen(true)} />
        <Row label="錯因管理" value={`${activeTags} 個使用中`} to="/settings/tags" />
        <Row label="匯出備份" value={backup.busy ? '匯出中…' : lastBackup} onClick={backup.start} disabled={backup.busy} />
        <Row
          label="匯入備份"
          sub="會覆蓋目前所有資料"
          value={reading ? '讀取中…' : undefined}
          onClick={() => fileInput.current?.click()}
          disabled={reading || importing}
        />
        <Row label="關於 Dog-ear" value={__APP_VERSION__} />
      </ul>
      {(backup.error || importError) && (
        <p role="alert" className="mx-6 mt-3 text-small text-ink">
          {backup.error ?? importError}
        </p>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={(e) => {
          void pickFile(e.target.files?.[0])
          e.target.value = '' // 同一個檔案可以再選一次
        }}
      />

      <DailyLimitSheet open={limitOpen} value={settings.dailyLimit} onClose={() => setLimitOpen(false)} />
      <BackupReadySheet backup={backup} />
      <ConfirmSheet
        open={parsed !== null}
        title="匯入會覆蓋目前所有資料，確定嗎？"
        description={parsed ? `備份日期 ${monthDay(new Date(parsed.exportedAt))}・錯題 ${parsed.questionCount} 題` : ''}
        confirmLabel={importing ? '匯入中…' : '匯入'}
        cancelLabel="取消"
        onConfirm={() => void confirmImport()}
        onCancel={() => !importing && setParsed(null)}
      />
      <Sheet open={imported !== null} title="匯入完成">
        <p className="mt-2 text-small text-sub">已還原 {imported} 題錯題。</p>
        <Button className="mt-6" onClick={() => navigate('/', { replace: true })}>
          好
        </Button>
      </Sheet>

      {/* import.meta.env.DEV 在正式版建置時為 false，整段會被移除 */}
      {import.meta.env.DEV && <DevTools />}
    </>
  )
}

function Row({
  label,
  sub,
  value,
  to,
  onClick,
  disabled,
}: {
  label: string
  sub?: string
  value?: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const interactive = !!(to || onClick)
  const body = (
    <>
      <span className="flex flex-col">
        <span className="text-button">{label}</span>
        {sub && <span className="text-caption text-sub">{sub}</span>}
      </span>
      <span className="flex items-center gap-1 text-small text-sub">
        {value}
        {interactive && <span aria-hidden="true">›</span>}
      </span>
    </>
  )
  const cls = 'flex min-h-[51px] w-full items-center justify-between gap-3 py-3 text-left'
  return (
    <li className="border-b border-line">
      {to ? (
        <Link to={to} className={cls}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} disabled={disabled} className={`${cls} disabled:opacity-60`}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

/** 每日複習上限：− ／ ＋ 每次 5 題，改了立即生效 */
function DailyLimitSheet({ open, value, onClose }: { open: boolean; value: number; onClose: () => void }) {
  const [error, setError] = useState(false)
  const change = (n: number) => {
    setError(false)
    setDailyLimit(n).catch((err: unknown) => {
      console.error(err)
      setError(true)
    })
  }
  const stepCls =
    'flex size-12 items-center justify-center rounded-option border-[1.5px] border-line bg-card text-title text-primary disabled:opacity-40'
  return (
    <Sheet open={open} onClose={onClose} title="每日複習上限">
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          aria-label="減少"
          className={stepCls}
          disabled={value <= DAILY_LIMIT_MIN}
          onClick={() => change(value - DAILY_LIMIT_STEP)}
        >
          −
        </button>
        <p className="font-heading text-display font-bold" aria-live="polite">
          {value} 題
        </p>
        <button
          type="button"
          aria-label="增加"
          className={stepCls}
          disabled={value >= DAILY_LIMIT_MAX}
          onClick={() => change(value + DAILY_LIMIT_STEP)}
        >
          ＋
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-small text-ink">
          {STORAGE_ERROR_MESSAGE}
        </p>
      )}
      <Button className="mt-6" onClick={onClose}>
        完成
      </Button>
    </Sheet>
  )
}

/** 僅開發環境：測試複習流程用 */
function DevTools() {
  const [msg, setMsg] = useState('')
  return (
    <section className="mx-6 mt-8 rounded-card border border-dashed border-line p-4">
      <p className="text-caption text-sub">僅開發環境</p>
      <Button
        variant="secondary"
        className="mt-2"
        onClick={async () => setMsg(`已把 ${await devMakeAllDueToday()} 題設為今天複習`)}
      >
        把所有題目設為今天複習
      </Button>
      {msg && <p className="mt-2 text-small text-sub">{msg}</p>}
    </section>
  )
}
