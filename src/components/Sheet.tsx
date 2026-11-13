import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

/**
 * Sheet（底部面板）：白底、上方圓角 20、padding 24（底部 40）；背後遮罩 overlay 45%。
 * 有 onClose 時點遮罩或按 Esc 可關閉；沒有時必須在面板內做選擇。
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  children: ReactNode
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] max-w-app overflow-y-auto rounded-t-sheet bg-card px-6 pt-6 pb-[max(40px,calc(env(safe-area-inset-bottom)+16px))]"
      >
        {title && (
          <h2 id={titleId} className="font-heading text-section font-bold">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** 確認面板：標題＋主要動作＋取消 */
export function ConfirmSheet({
  open,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </Sheet>
  )
}
