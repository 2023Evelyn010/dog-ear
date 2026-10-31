import { Outlet } from 'react-router'

/** 沒有導覽列的頁面（錄入、今日複習、詳情、設定、首次開啟） */
export function FullLayout() {
  return (
    <div className="flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]">
      <Outlet />
    </div>
  )
}
