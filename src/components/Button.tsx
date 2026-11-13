import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'text'

const VARIANTS: Record<Variant, string> = {
  // Button / Primary：主色底、白字、圓角 10、上下 padding 14、滿寬
  primary: 'w-full rounded-button bg-primary py-3.5 text-button font-medium text-on-primary',
  // Button / Secondary：白底、1.5px line 框線、主色字
  secondary: 'w-full rounded-button border-[1.5px] border-line bg-card py-3 text-button font-medium text-primary',
  // 文字按鈕（略過、刪除這題）
  text: 'w-full py-2 text-small text-sub',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`${VARIANTS[variant]} transition-opacity active:opacity-80 disabled:cursor-default disabled:opacity-40 ${className}`}
      {...rest}
    />
  )
}
