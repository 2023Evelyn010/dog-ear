import type { HTMLAttributes } from 'react'

/**
 * FoldCorner（折角）：24×24 貼在卡片右上角；左下三角形 fold 色、右上三角形與頁面底色相同。
 * 只用在重點卡片（複習頁主卡片、今天沒有到期、揭曉答錯／答對）。
 */
export function FoldCorner() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="absolute -top-px -right-px">
      <polygon points="0,0 24,0 24,24" className="fill-bg" />
      <polygon points="0,0 0,24 24,24" className="fill-fold" />
    </svg>
  )
}

/** Card：白底、1px line 框線、圓角 12，右上角 0（留給折角） */
export function Card({ fold = false, className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { fold?: boolean }) {
  return (
    <div className={`relative rounded-card rounded-tr-none border border-line bg-card ${className}`} {...rest}>
      {fold && <FoldCorner />}
      {children}
    </div>
  )
}

/** 數據小卡：標籤＋昭源甜圓數字 */
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-card px-4 py-3.5">
      <p className="text-caption text-sub">{label}</p>
      <p className="mt-1 font-heading text-[20px] leading-7 font-bold">{value}</p>
    </div>
  )
}
