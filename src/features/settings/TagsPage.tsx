import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'

/** 錯因管理 — Day 8 實作內容 */
export function TagsPage() {
  const goBack = useGoBack('/settings')
  return <FlowHeader title="錯因管理" onLeading={goBack} />
}
