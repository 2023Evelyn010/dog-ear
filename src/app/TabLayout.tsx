import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, Outlet } from 'react-router'
import { NavBar } from '../components/NavBar'
import { getSettings } from '../db/settings'
import { isStandalone } from '../lib/standalone'

/** 有底部導覽列的分頁（複習、錯題庫） */
export function TabLayout() {
  const settings = useLiveQuery(() => getSettings())
  // 第一次開啟且不是從主畫面啟動 → 加入主畫面引導（docs/PRD.md 3.8）
  if (settings && !settings.onboardingSeen && !isStandalone()) return <Navigate to="/welcome" replace />
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
