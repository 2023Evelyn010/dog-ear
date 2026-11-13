import type { ButtonHTMLAttributes } from 'react'

/**
 * Chip（錯因）：膠囊形、左右 14／上下 8；預設白底＋line 框線；選取時主色底白字。
 * dashed：「＋ 新增錯因」，1.5px 虛線、sub 色字。
 */
export function Chip({
  selected,
  dashed = false,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; dashed?: boolean }) {
  const look = dashed
    ? 'border-[1.5px] border-dashed border-sub/60 bg-transparent text-sub'
    : selected
      ? 'border border-primary bg-primary text-on-primary'
      : 'border border-line bg-card text-ink'
  return (
    <button
      type="button"
      aria-pressed={dashed ? undefined : !!selected}
      className={`rounded-chip px-3.5 py-2 text-body transition-colors ${look} ${className}`}
      {...rest}
    />
  )
}
