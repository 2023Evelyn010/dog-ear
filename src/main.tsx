import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './app/router'
import { db } from './db/schema'
import './index.css'
import { setupAppUpdates } from './lib/pwa'

// 首次啟動時建立資料庫（populate：預設錯因與設定）
db.open().catch((err: unknown) => {
  console.error('無法開啟資料庫', err)
})

// 回到前景時檢查新版；不在錄入、複習中才套用
void setupAppUpdates(router)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="mx-auto max-w-app">
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
)
