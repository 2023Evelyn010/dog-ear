import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'

/** 錄入流程（全螢幕）— Day 5 實作內容 */
export function CapturePage() {
  const goBack = useGoBack()
  return <FlowHeader leading="close" title="新增錯題" onLeading={goBack} />
}
