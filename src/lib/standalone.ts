/** 主畫面偵測與持久儲存（docs/PRD.md 3.8） */

/** 是否從主畫面啟動（PWA 獨立視窗） */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

/** 從主畫面啟動時申請持久儲存，降低空間不足時被系統清除的機會。不支援或被拒絕都沒關係。 */
export async function requestPersistentStorage(): Promise<void> {
  if (!isStandalone() || !navigator.storage?.persist) return
  try {
    await navigator.storage.persist()
  } catch {
    // 沒有持久儲存也能用
  }
}
