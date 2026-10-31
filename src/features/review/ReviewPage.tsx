import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'

/** 今日複習流程（全螢幕）— Day 6 實作內容 */
export function ReviewPage() {
  const goBack = useGoBack()
  return <FlowHeader leading="close" title="今日複習" onLeading={goBack} />
}
