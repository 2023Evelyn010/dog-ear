import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { FlowHeader } from '../../components/Header'
import { useGoBack } from '../../components/useGoBack'
import { DiscardSheet, SaveBar } from '../capture/CapturePage'
import { draftFromQuestion, firstMissing, isDirty } from '../capture/draft'
import { QuestionFields } from '../capture/QuestionForm'
import { useQuestionForm } from '../capture/useQuestionForm'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { editQuestion } from '../../db/library'
import { db, type Question } from '../../db/schema'
import { getCaptureTags } from '../../db/tags'

/** 編輯錯題：與錄入相同的表單，存檔後回到詳情（docs/PRD.md 3.4） */
export function EditQuestionPage() {
  const { id = '' } = useParams()
  // 只在進入時讀一次，編輯中不被資料庫變動覆蓋
  const [loaded, setLoaded] = useState<{ question: Question | undefined } | null>(null)
  useEffect(() => {
    let alive = true
    void db.questions.get(id).then((question) => {
      if (alive) setLoaded({ question })
    })
    return () => {
      alive = false
    }
  }, [id])

  if (!loaded) return null
  if (!loaded.question) return <Navigate to="/library" replace />
  return <EditForm question={loaded.question} />
}

function EditForm({ question }: { question: Question }) {
  const goBack = useGoBack(`/library/${question.id}`)
  const form = useQuestionForm(() => draftFromQuestion(question))
  const [baseline] = useState(form.draft)
  const { draft, processing } = form

  // 錯因：錄入時的順序；這題標了已封存的錯因也要列出來，才能看到並取消
  const tags = useLiveQuery(async () => {
    const [active, all] = await Promise.all([getCaptureTags(), db.errorTags.toArray()])
    return [...active, ...all.filter((t) => t.archived && question.errorTagIds.includes(t.id))]
  }, [question])

  const [discarding, setDiscarding] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const missing = firstMissing(draft)

  async function save() {
    const { part, myAnswer, correctAnswer } = draft
    if (missing || processing > 0 || busy || !part || !myAnswer || !correctAnswer) return
    setBusy(true)
    setSaveError(null)
    try {
      await editQuestion(question.id, {
        images: draft.images,
        part,
        myAnswer,
        correctAnswer,
        errorTagIds: draft.tagIds,
        source: draft.source,
        pageRef: draft.pageRef,
        note: draft.note,
      })
      goBack()
    } catch (err) {
      console.error(err)
      setSaveError(STORAGE_ERROR_MESSAGE)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <FlowHeader
        leading="close"
        title="編輯錯題"
        onLeading={() => (isDirty(draft, baseline) ? setDiscarding(true) : goBack())}
      />
      <main className="flex flex-1 flex-col gap-5 px-6 pt-4 pb-6">
        <QuestionFields
          form={form}
          tags={tags}
          optionalInitiallyOpen={!!(question.source || question.pageRef || question.note)}
        />
      </main>
      <SaveBar error={saveError} hint={processing > 0 ? '' : missing} disabled={!!missing || processing > 0 || busy} onSave={() => void save()} />
      <DiscardSheet open={discarding} onConfirm={goBack} onCancel={() => setDiscarding(false)} />
    </div>
  )
}
