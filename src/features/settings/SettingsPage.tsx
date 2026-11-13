import { useState } from 'react'
import { Button } from '../../components/Button'
import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'
import { devMakeAllDueToday } from '../../db/review'

/** 設定 — Day 8 實作內容 */
export function SettingsPage() {
  const goBack = useGoBack()
  return (
    <>
      <FlowHeader title="設定" onLeading={goBack} />
      {/* import.meta.env.DEV 在正式版建置時為 false，整段會被移除 */}
      {import.meta.env.DEV && <DevTools />}
    </>
  )
}

/** 僅開發環境：測試複習流程用 */
function DevTools() {
  const [msg, setMsg] = useState('')
  return (
    <section className="mx-6 mt-4 rounded-card border border-dashed border-line p-4">
      <p className="text-caption text-sub">僅開發環境</p>
      <Button
        variant="secondary"
        className="mt-2"
        onClick={async () => setMsg(`已把 ${await devMakeAllDueToday()} 題設為今天複習`)}
      >
        把所有題目設為今天複習
      </Button>
      {msg && <p className="mt-2 text-small text-sub">{msg}</p>}
    </section>
  )
}
