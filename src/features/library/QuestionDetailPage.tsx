import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import { FlowHeader } from '../../components/Header'
import { PhotoPager } from '../../components/PhotoPager'
import { ConfirmSheet } from '../../components/Sheet'
import { useGoBack } from '../../components/useGoBack'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { addToTodayReview, deleteQuestion, getQuestionLogs, resetProgress } from '../../db/library'
import { db, type Question, type ReviewLog } from '../../db/schema'
import { today as todayOf } from '../../lib/date'
import { isInTodayReview, logDateText, logResultText, progressText, tagNameMap, tagNamesOf } from './listing'

type SheetKind = 'none' | 'reset' | 'delete'

/** 單題詳情：docs/PRD.md 3.4、Figma 4-2 */
export function QuestionDetailPage() {
  const { id = '' } = useParams()
  const data = useLiveQuery(
    async () => {
      const [question, logs, tags] = await Promise.all([db.questions.get(id), getQuestionLogs(id), db.errorTags.toArray()])
      return { question, logs, names: tagNameMap(tags) }
    },
    [id],
  )
  // 刪除中資料消失時不導向錯題庫（由刪除流程自己返回），避免多跳一次
  const [deleting, setDeleting] = useState(false)

  if (!data) return null
  // 找不到這題（網址錯誤或已刪除）
  if (!data.question) return deleting ? null : <Navigate to="/library" replace />
  return <Detail question={data.question} logs={data.logs} names={data.names} onDeleting={setDeleting} />
}

function Detail({
  question: q,
  logs,
  names,
  onDeleting,
}: {
  question: Question
  logs: ReviewLog[]
  names: Map<string, string>
  onDeleting: (deleting: boolean) => void
}) {
  const goBack = useGoBack('/library')
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<SheetKind>('none')
  const [error, setError] = useState<string | null>(null)
  const today = todayOf()
  const inToday = isInTodayReview(q, today)
  const heading = [`Part ${q.part}`, [q.source, q.pageRef].filter(Boolean).join(' ')].filter(Boolean).join(' ・ ')

  async function run(action: () => Promise<void>) {
    setSheet('none')
    setError(null)
    try {
      await action()
    } catch (err) {
      console.error(err)
      setError(STORAGE_ERROR_MESSAGE)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <FlowHeader
        title="錯題詳情"
        onLeading={goBack}
        right={
          <button type="button" onClick={() => navigate(`/library/${q.id}/edit`)} className="px-2 py-3 text-small text-sub">
            編輯
          </button>
        }
      />

      <main className="flex flex-1 flex-col px-6 pt-3 pb-6">
        <PhotoPager images={q.images} className="h-[180px] shrink-0" />

        <h2 className="mt-5 text-button font-bold">{heading}</h2>
        <p className="mt-3 text-small text-sub">
          你的答案 {q.myAnswer === 'blank' ? '未作答' : q.myAnswer} ・ 正解 {q.correctAnswer}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tagNamesOf(q, names).map((name) => (
            <span key={name} className="rounded-chip bg-primary px-3.5 py-2 text-body text-on-primary">
              {name}
            </span>
          ))}
        </div>
        {q.note && <p className="mt-3 text-small whitespace-pre-wrap text-sub">筆記：{q.note}</p>}
        <p className="mt-3 text-small text-sub">{progressText(q, today)}</p>

        <hr className="mt-4 border-line" />
        <h3 className="mt-4 text-label font-medium">作答紀錄</h3>
        {logs.length === 0 ? (
          <p className="mt-3 text-small text-sub">還沒有複習過</p>
        ) : (
          <ul className="mt-1">
            {logs.map((log) => (
              <li key={log.id} className="flex gap-4 py-2 text-small text-sub">
                <span className="w-10 shrink-0">{logDateText(log.reviewDate)}</span>
                <span>{logResultText(log)}</span>
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="sticky bottom-0 z-10 bg-bg px-6 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        {error && (
          <p role="alert" className="mb-2 text-center text-caption text-ink">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" disabled={inToday} onClick={() => void run(() => addToTodayReview(q.id))}>
            {inToday ? '已在今日複習' : '加入今日複習'}
          </Button>
          <Button variant="secondary" onClick={() => setSheet('reset')}>
            重設進度
          </Button>
        </div>
        <Button variant="text" className="mt-2" onClick={() => setSheet('delete')}>
          刪除這題
        </Button>
      </div>

      <ConfirmSheet
        open={sheet === 'reset'}
        title="要重設這題的進度嗎？"
        description="等級會歸零，明天開始重新複習。"
        confirmLabel="重設"
        cancelLabel="取消"
        onConfirm={() => void run(() => resetProgress(q.id))}
        onCancel={() => setSheet('none')}
      />
      <ConfirmSheet
        open={sheet === 'delete'}
        title="要刪除這題嗎？"
        description="照片和作答紀錄會一起刪除，無法復原。"
        confirmLabel="刪除"
        cancelLabel="取消"
        onConfirm={() =>
          void run(async () => {
            onDeleting(true)
            try {
              await deleteQuestion(q.id)
            } catch (err) {
              onDeleting(false)
              throw err
            }
            goBack()
          })
        }
        onCancel={() => setSheet('none')}
      />
    </div>
  )
}
