import { useSyncExternalStore } from 'react'
import { today } from './date'

/**
 * 今天的本地日期，跨過午夜會自動更新。
 * iOS 從背景切回 App 時常常不會重新載入頁面，只靠 render 時算一次的話，
 * 隔天早上首頁還會顯示昨天的狀態。切回前景時重新檢查，開著時每分鐘檢查一次。
 */
export function useToday() {
  return useSyncExternalStore(subscribe, () => today())
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000)
  document.addEventListener('visibilitychange', onChange)
  window.addEventListener('focus', onChange)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onChange)
    window.removeEventListener('focus', onChange)
  }
}
