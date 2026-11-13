import type { ReactNode } from 'react'

/** Option（A–D、Part）：高 52、圓角 10；預設白底＋line 框線；選取時主色底白字 */
export function Option({
  selected,
  onSelect,
  children,
  label,
  small = false,
}: {
  selected: boolean
  onSelect: () => void
  children: ReactNode
  label?: string
  /** 文字選項（未作答）用較小的字 */
  small?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onSelect}
      className={`flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-option border transition-colors ${
        selected ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card text-ink'
      } ${small ? 'text-small font-bold' : 'font-heading text-card font-bold'}`}
    >
      {children}
    </button>
  )
}

/** 一組單選 Option */
export function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {children}
    </div>
  )
}
