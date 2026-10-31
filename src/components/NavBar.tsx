import type { ComponentType } from 'react'
import { Link, NavLink } from 'react-router'
import { LibraryIcon, PlusIcon, ReviewIcon } from './icons'

function TabLink({ to, label, Icon }: { to: string; label: string; Icon: ComponentType<{ size?: number }> }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 pt-1.5 text-caption ${
          isActive ? 'font-bold text-primary' : 'text-sub'
        }`
      }
    >
      <Icon size={24} />
      {label}
    </NavLink>
  )
}

/** NavBar：白底、上方 1px line；左右兩項圖示＋文字；中間 48px 主色圓形「＋」 */
export function NavBar() {
  return (
    <nav
      aria-label="主選單"
      className="sticky bottom-0 z-10 border-t border-line bg-card pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div className="flex h-[50px] items-start">
        <TabLink to="/" label="複習" Icon={ReviewIcon} />
        <Link to="/capture" className="flex flex-1 flex-col items-center text-caption text-sub" aria-label="新增">
          <span className="-mt-3 flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/25">
            <PlusIcon size={26} />
          </span>
          新增
        </Link>
        <TabLink to="/library" label="錯題庫" Icon={LibraryIcon} />
      </div>
    </nav>
  )
}
