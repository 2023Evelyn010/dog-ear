import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'

/** 單題詳情 — Day 7 實作內容 */
export function QuestionDetailPage() {
  const goBack = useGoBack('/library')
  return <FlowHeader title="錯題詳情" onLeading={goBack} />
}
