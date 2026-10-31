import { Link } from 'react-router'
import { TabHeader } from '../../components/Header'
import { GearIcon } from '../../components/icons'

/** 複習頁（首頁）— Day 6 實作內容 */
export function HomePage() {
  return (
    <TabHeader
      title="複習"
      right={
        <Link to="/settings" aria-label="設定" className="-mr-3 flex size-12 items-center justify-center text-ink">
          <GearIcon size={24} />
        </Link>
      }
    />
  )
}
