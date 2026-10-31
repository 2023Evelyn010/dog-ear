import { Outlet } from 'react-router'
import { NavBar } from '../components/NavBar'

/** 有底部導覽列的分頁（複習、錯題庫） */
export function TabLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
