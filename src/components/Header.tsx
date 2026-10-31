import type { ReactNode } from 'react'
import { BackIcon, CloseIcon } from './icons'

/** Header / Tab：高 64、左右 padding 24、標題 Heading/Title */
export function TabHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between px-6">
      <h1 className="font-heading text-title font-bold">{title}</h1>
      {right}
    </header>
  )
}

/** Header / Flow：高 56、左 ✕ 或 ‹、中間標題 Body/Button、右側次要文字 */
export function FlowHeader({
  title,
  leading = 'back',
  onLeading,
  right,
}: {
  title: ReactNode
  leading?: 'back' | 'close'
  onLeading: () => void
  right?: ReactNode
}) {
  return (
    <header className="grid h-14 grid-cols-[48px_1fr_48px] items-center px-2">
      <button
        type="button"
        onClick={onLeading}
        aria-label={leading === 'close' ? '關閉' : '返回'}
        className="flex size-12 items-center justify-center text-ink"
      >
        {leading === 'close' ? <CloseIcon /> : <BackIcon />}
      </button>
      <h1 className="text-center text-button font-medium">{title}</h1>
      <div className="text-right text-small text-sub">{right}</div>
    </header>
  )
}
