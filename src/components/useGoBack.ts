import { useNavigate } from 'react-router'

/**
 * 返回上一頁；如果是直接開啟這個網址（沒有上一頁），改去 fallback。
 * 用於流程頁的 ✕ 與 ‹（「結束後回到進入前的頁面」）。
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
