/**
 * App 更新策略（Service Worker）。
 *
 * iPhone 從背景切回 App 不算重新開啟，瀏覽器不會自己檢查新版；所以在回到前景時主動檢查。
 * 新版下載好後先等待，使用者不在錄入、複習、編輯錯題中才套用並重新整理，避免清掉填到一半的表單。
 */

/** 這些畫面有尚未存檔的進度，不能自動重新整理 */
const BUSY_PATHS = ['/capture', '/review']
const EDIT_PATH = /^\/library\/[^/]+\/edit\/?$/ // 編輯錯題

export function canReloadAt(pathname: string): boolean {
  if (EDIT_PATH.test(pathname)) return false
  return !BUSY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

interface RouterLike {
  state: { location: { pathname: string } }
  subscribe: (fn: (state: { location: { pathname: string } }) => void) => unknown
}

export async function setupAppUpdates(router: RouterLike): Promise<void> {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  const { registerSW } = await import('virtual:pwa-register')

  let updateReady = false
  const applyIfIdle = (pathname: string) => {
    if (updateReady && canReloadAt(pathname)) {
      updateReady = false
      void applyUpdate() // 新版接手後會自動重新整理
    }
  }

  const applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true
      applyIfIdle(router.state.location.pathname)
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {}) // 離線時檢查失敗沒關係
        }
      })
    },
  })

  // 離開錄入、複習畫面時，套用等待中的新版
  router.subscribe((state) => applyIfIdle(state.location.pathname))
}
