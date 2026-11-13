import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { FlowHeader } from '../../components/Header'
import { ConfirmSheet } from '../../components/Sheet'
import { useGoBack } from '../../components/useGoBack'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { addQuestion, isGuessed } from '../../db/questions'
import { db, SETTINGS_ID } from '../../db/schema'
import { addPracticeSession, countSession } from '../../db/sessions'
import { getCaptureTags } from '../../db/tags'
import { NextSheet, PracticeSheet } from './AfterSaveSheets'
import { draftForNextQuestion, draftWithSamePhotos, emptyDraft, firstMissing, isDirty, type Draft } from './draft'
import { QuestionFields } from './QuestionForm'
import { useQuestionForm } from './useQuestionForm'

/** 錄入流程（全螢幕）：docs/PRD.md 3.2、Figma 2-1／2-2／2-3 */
export function CapturePage() {
  // 等設定載入後再建立表單，題本來源才能預設帶入上次的值
  const settings = useLiveQuery(async () => ({ value: await db.settings.get(SETTINGS_ID) }))
  if (!settings) return null
  return <CaptureFlow initialSource={settings.value?.lastSource ?? ''} />
}

type SheetKind = 'none' | 'next' | 'practice' | 'discard'

function CaptureFlow({ initialSource }: { initialSource: string }) {
  const goBack = useGoBack()
  const tags = useLiveQuery(() => getCaptureTags())

  const form = useQuestionForm(() => emptyDraft(initialSource))
  const { draft, processing } = form
  const [baseline, setBaseline] = useState<Draft>(draft) // 表單重設時的狀態，用來判斷有沒有未存檔的內容
  const [sessionId] = useState(() => crypto.randomUUID())
  const [saved, setSaved] = useState<boolean[]>([]) // 本次已存檔各題是否為猜對
  const [sessionSource, setSessionSource] = useState<string>()

  const [sheet, setSheet] = useState<SheetKind>('none')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const missing = firstMissing(draft)
  const counts = countSession(saved)

  async function save() {
    const { part, myAnswer, correctAnswer } = draft
    if (missing || processing > 0 || busy || !part || !myAnswer || !correctAnswer) return
    setBusy(true)
    setSaveError(null)
    try {
      await addQuestion({
        part,
        images: draft.images,
        myAnswer,
        correctAnswer,
        errorTagIds: draft.tagIds,
        source: draft.source,
        pageRef: draft.pageRef,
        note: draft.note,
        sessionId,
      })
      setSaved((s) => [...s, isGuessed({ myAnswer, correctAnswer })])
      setSessionSource(draft.source)
      setSheet('next')
    } catch (err) {
      console.error(err)
      setSaveError(STORAGE_ERROR_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  function resetTo(next: Draft) {
    form.reset(next)
    setBaseline(next)
    setSheet('none')
    window.scrollTo({ top: 0 })
  }

  /** 寫入 PracticeSession（attempted 為 undefined = 略過），回到進入錄入前的頁面 */
  async function finishSession(attempted: number | undefined) {
    setBusy(true)
    setSaveError(null)
    try {
      await addPracticeSession({ id: sessionId, attempted, source: sessionSource, ...counts })
      goBack()
    } catch (err) {
      console.error(err)
      setSaveError(STORAGE_ERROR_MESSAGE)
      setBusy(false)
    }
  }

  /** ✕ 離開：已存過題目但沒按「完成」時，視同略過寫入 PracticeSession */
  async function leave() {
    setSheet('none')
    if (saved.length === 0) return goBack()
    try {
      await addPracticeSession({ id: sessionId, source: sessionSource, ...counts })
    } catch (err) {
      console.error(err) // 題目都已存檔，練習量紀錄寫入失敗不擋離開
    }
    goBack()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <FlowHeader
        leading="close"
        title="新增錯題"
        onLeading={() => (isDirty(draft, baseline) ? setSheet('discard') : void leave())}
        right={`第 ${saved.length + 1} 題`}
      />

      <main className="flex flex-1 flex-col gap-5 px-6 pt-4 pb-6">
        <QuestionFields form={form} tags={tags} />
      </main>

      <SaveBar error={saveError} hint={processing > 0 ? '' : missing} disabled={!!missing || processing > 0 || busy} onSave={() => void save()} />

      <NextSheet
        open={sheet === 'next'}
        savedCount={saved.length}
        onNext={() => resetTo(draftForNextQuestion(draft))}
        onSamePhotos={() => resetTo(draftWithSamePhotos(draft))}
        onFinish={() => setSheet('practice')}
      />
      <PracticeSheet
        open={sheet === 'practice'}
        counts={counts}
        error={sheet === 'practice' ? saveError : null}
        busy={busy}
        onDone={(attempted) => void finishSession(attempted)}
      />
      <DiscardSheet open={sheet === 'discard'} onConfirm={() => void leave()} onCancel={() => setSheet('none')} />
    </div>
  )
}

/** 存檔按鈕固定在底部，上方一行顯示缺少的欄位或錯誤 */
export function SaveBar({
  error,
  hint,
  disabled,
  onSave,
}: {
  error: string | null
  hint: string | null
  disabled: boolean
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-bg px-6 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
      <p role="status" className="mb-2 min-h-[18px] text-center text-caption text-sub">
        {error ?? hint}
      </p>
      <Button onClick={onSave} disabled={disabled}>
        存檔
      </Button>
    </div>
  )
}

/** 中途離開確認（錄入與編輯共用） */
export function DiscardSheet({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <ConfirmSheet
      open={open}
      title="要捨棄這題嗎？"
      confirmLabel="捨棄"
      cancelLabel="繼續填寫"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
