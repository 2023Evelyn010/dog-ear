import { useState } from 'react'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { checkAttempted, sessionSummary, type SessionCounts } from '../../db/sessions'

/** 2-2 存檔後：再拍一題／沿用這組照片／完成 */
export function NextSheet({
  open,
  savedCount,
  onNext,
  onSamePhotos,
  onFinish,
}: {
  open: boolean
  savedCount: number
  onNext: () => void
  onSamePhotos: () => void
  onFinish: () => void
}) {
  return (
    <Sheet open={open}>
      <p className="text-caption text-sub">已存檔第 {savedCount} 題</p>
      <h2 className="mt-3 font-heading text-section font-bold">接下來？</h2>
      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={onNext}>
          再拍一題
        </Button>
        <Button variant="secondary" onClick={onSamePhotos}>
          沿用這組照片，再新增一題
        </Button>
        <Button variant="secondary" onClick={onFinish}>
          完成
        </Button>
      </div>
    </Sheet>
  )
}

/** 2-3 這次寫了幾題 */
export function PracticeSheet({
  open,
  counts,
  error,
  busy,
  onDone,
}: {
  open: boolean
  counts: SessionCounts
  error: string | null
  busy: boolean
  /** attempted 為 undefined 表示略過 */
  onDone: (attempted: number | undefined) => void
}) {
  const [value, setValue] = useState('')
  const check = checkAttempted(value, counts.wrongCount)

  return (
    <Sheet open={open} title="這次練習寫了幾題？">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (check.ok && !busy) onDone(check.attempted)
        }}
      >
        <p className="mt-3 text-small text-sub">{sessionSummary(counts)}</p>
        <label className="mt-4 flex items-baseline gap-2 rounded-card border border-line bg-card px-4 py-3 focus-within:border-primary">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="這次寫了幾題"
            aria-invalid={!check.ok && !!check.error}
            style={{ width: `${Math.max(value.length, 1) + 0.5}ch` }}
            className="min-w-0 bg-transparent font-heading text-section font-bold outline-none"
          />
          <span className="text-body text-sub">題</span>
        </label>
        <p role="status" className="mt-3 min-h-5 text-small text-sub">
          {check.ok ? `這次答錯率約 ${check.wrongRate}%` : check.error}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-small text-ink">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!check.ok || busy} className="mt-6">
          完成
        </Button>
        <Button variant="text" disabled={busy} onClick={() => onDone(undefined)} className="mt-2">
          略過
        </Button>
      </form>
    </Sheet>
  )
}
