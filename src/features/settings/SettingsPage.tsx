import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'

/** 設定 — Day 8 實作內容 */
export function SettingsPage() {
  const goBack = useGoBack()
  return <FlowHeader title="設定" onLeading={goBack} />
}
