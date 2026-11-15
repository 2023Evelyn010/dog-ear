import type { ReactNode } from 'react'

/** Banner（提示列）：primary-soft 底、主色字、圓角 10、Body/Small */
export function Banner({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-button bg-primary-soft px-4 py-3 text-left text-small text-primary transition-opacity active:opacity-80 disabled:opacity-60"
    >
      {children}
    </button>
  )
}
