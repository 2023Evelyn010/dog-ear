import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import logo from '../../assets/logo.svg'
import { Button } from '../../components/Button'
import { Card, StatCard } from '../../components/Card'
import { Chip } from '../../components/Chip'
import { FlowHeader } from '../../components/Header'
import { Option, OptionGroup } from '../../components/Option'
import { PART_TEXT } from '../../components/partColor'
import { PhotoPager } from '../../components/PhotoPager'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { useGoBack } from '../../components/useGoBack'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { updateQuestion } from '../../db/questions'
import { getReviewOverview, loadTodayQueue, recordReview } from '../../db/review'
import { db, type Choice, type Question } from '../../db/schema'
import { getCaptureTags } from '../../db/tags'
import type { ReviewResult } from '../../lib/scheduler'
import { AddTagSheet } from '../capture/AddTagSheet'
import { upcomingText } from './copy'

const CHOICES: Choice[] = ['A', 'B', 'C', 'D']

/** 今日複習流程（全螢幕）：docs/PRD.md 3.3、Figma 3-1～3-4 */
export function ReviewPage() {
  // 出題清單在開始時決定並固定，中途不變
  const [queue, setQueue] = useState<Question[] | null>(null)
  useEffect(() => {
    let alive = true
    void loadTodayQueue().then((q) => alive && setQueue(q))
    return () => {
      alive = false
    }
  }, [])

  if (!queue) return null
  if (queue.length === 0) return <Navigate to="/" replace /> // 複習清單為空：直接導回複習頁
  return <ReviewSession queue={queue} />
}

type Phase =
  | { kind: 'answer' }
  | { kind: 'wrong'; answer: Choice | 'unknown' }
  | { kind: 'correct' }
  | { kind: 'done' }

type SheetKind = 'none' | 'leave' | 'addTag' | 'newTag' | 'note'

function ReviewSession({ queue }: { queue: Question[] }) {
  const goBack = useGoBack()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>({ kind: 'answer' })
  const [current, setCurrent] = useState<Question>(queue[0]) // 目前這題（追加錯因、改筆記後即時更新）
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<SheetKind>('none')

  // 已作答（寫入資料庫）的題數：答錯在揭曉時就寫入，答對在選完有把握／猜的才寫入
  const answered = index + (phase.kind === 'wrong' || phase.kind === 'done' ? 1 : 0)
  const hasUnanswered = phase.kind !== 'done' && answered < queue.length

  async function write(answer: Choice | 'unknown', result: ReviewResult): Promise<boolean> {
    setBusy(true)
    setError(null)
    try {
      await recordReview(current.id, answer, result)
      return true
    } catch (err) {
      console.error(err)
      setError(STORAGE_ERROR_MESSAGE)
      return false
    } finally {
      setBusy(false)
    }
  }

  function next() {
    const i = index + 1
    if (i >= queue.length) {
      setPhase({ kind: 'done' })
      return
    }
    setIndex(i)
    setCurrent(queue[i])
    setPhase({ kind: 'answer' })
    window.scrollTo({ top: 0 })
  }

  async function choose(answer: Choice | 'unknown') {
    if (busy) return
    if (answer === current.correctAnswer) {
      setPhase({ kind: 'correct' })
    } else if (await write(answer, 'wrong')) {
      setPhase({ kind: 'wrong', answer })
    }
  }

  async function rateCorrect(result: 'sure' | 'guessed') {
    if (busy) return
    if (await write(current.correctAnswer, result)) next()
  }

  async function patchCurrent(patch: Partial<Pick<Question, 'errorTagIds' | 'note'>>) {
    try {
      await updateQuestion(current.id, patch)
      setCurrent((q) => ({ ...q, ...patch }))
      setSheet('none')
    } catch (err) {
      console.error(err)
      setError(STORAGE_ERROR_MESSAGE)
    }
  }

  if (phase.kind === 'done') return <DoneScreen onClose={goBack} />

  return (
    <div className="flex min-h-dvh flex-col">
      <FlowHeader
        leading="close"
        title={`${index + 1} / ${queue.length}`}
        onLeading={() => (hasUnanswered ? setSheet('leave') : goBack())}
        right={<span className={`text-label font-bold ${PART_TEXT[current.part]}`}>Part {current.part}</span>}
      />
      <div className="px-6">
        <div className="h-1 overflow-hidden rounded-[2px] bg-line">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-4 px-6 pt-4">
        <PhotoPager
          key={current.id}
          images={current.images}
          className={phase.kind === 'answer' ? 'min-h-[260px] flex-1' : 'h-[220px] shrink-0'}
        />
        {phase.kind === 'wrong' && (
          <WrongCard
            question={current}
            answer={phase.answer}
            onAddTag={() => setSheet('addTag')}
            onEditNote={() => setSheet('note')}
          />
        )}
        {phase.kind === 'correct' && (
          <Card fold className="p-4">
            <h2 className="pr-6 font-heading text-heading-card font-bold">答對了！正解 {current.correctAnswer}</h2>
            <p className="mt-1 text-small text-sub">這題你是有把握，還是猜的？</p>
          </Card>
        )}
      </main>

      <footer className="sticky bottom-0 bg-bg px-6 pt-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        {error && (
          <p role="alert" className="mb-2 text-center text-small text-ink">
            {error}
          </p>
        )}
        {phase.kind === 'answer' && (
          <>
            <p className="mb-3 text-center text-small text-sub">選出你的答案</p>
            <OptionGroup label="選出你的答案">
              {CHOICES.map((c) => (
                <Option key={c} selected={false} onSelect={() => void choose(c)}>
                  {c}
                </Option>
              ))}
            </OptionGroup>
            <Button variant="secondary" className="mt-4" disabled={busy} onClick={() => void choose('unknown')}>
              不會
            </Button>
          </>
        )}
        {phase.kind === 'wrong' && (
          <Button onClick={next} disabled={busy}>
            下一題
          </Button>
        )}
        {phase.kind === 'correct' && (
          <>
            <div className="flex gap-3">
              <Button variant="secondary" disabled={busy} onClick={() => void rateCorrect('guessed')}>
                猜的／憑印象
              </Button>
              <Button disabled={busy} onClick={() => void rateCorrect('sure')}>
                有把握
              </Button>
            </div>
            <p className="mt-3 text-center text-caption text-sub">選「猜的」這題不會升級，會照原本的間隔再出現</p>
          </>
        )}
      </footer>

      <ConfirmSheet
        open={sheet === 'leave'}
        title="要先離開嗎？"
        description="已作答的題目會保留進度。"
        confirmLabel="離開"
        cancelLabel="繼續複習"
        onConfirm={goBack}
        onCancel={() => setSheet('none')}
      />
      <AddTagToQuestionSheet
        open={sheet === 'addTag'}
        question={current}
        onPick={(id) => void patchCurrent({ errorTagIds: [...current.errorTagIds, id] })}
        onNew={() => setSheet('newTag')}
        onClose={() => setSheet('none')}
      />
      <AddTagSheet
        open={sheet === 'newTag'}
        onClose={() => setSheet('none')}
        onCreated={(tag) => void patchCurrent({ errorTagIds: [...current.errorTagIds, tag.id] })}
      />
      <NoteSheet
        key={`${current.id}-${sheet === 'note'}`}
        open={sheet === 'note'}
        initial={current.note ?? ''}
        onSave={(note) => void patchCurrent({ note })}
        onClose={() => setSheet('none')}
      />
    </div>
  )
}

/** 3-2 揭曉：答錯 */
function WrongCard({
  question,
  answer,
  onAddTag,
  onEditNote,
}: {
  question: Question
  answer: Choice | 'unknown'
  onAddTag: () => void
  onEditNote: () => void
}) {
  // 錯因記 ID，名稱即時查（含封存的錯因）
  const names = useLiveQuery(async () => new Map((await db.errorTags.toArray()).map((t) => [t.id, t.name])))
  return (
    <Card fold className="p-4">
      <h2 className="pr-6 font-heading text-heading-card font-bold">答錯了！下次再努力</h2>
      <p className="mt-1 text-small text-sub">
        {answer === 'unknown' ? '你選了不會' : `你的答案 ${answer}`} ・ 正解 {question.correctAnswer}
      </p>
      <p className="mt-2 text-caption text-sub">原本的錯因</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {question.errorTagIds.map((id) => (
          <span key={id} className="rounded-chip bg-primary px-3.5 py-2 text-body text-on-primary">
            {names?.get(id) ?? ''}
          </span>
        ))}
        <Chip dashed onClick={onAddTag}>
          ＋ 追加錯因
        </Chip>
      </div>
      {question.note ? (
        <button type="button" onClick={onEditNote} className="mt-3 block w-full text-left text-small text-sub">
          筆記：{question.note}
        </button>
      ) : (
        <button type="button" onClick={onEditNote} className="mt-3 text-small text-primary">
          ＋ 新增筆記
        </button>
      )}
    </Card>
  )
}

/** 追加錯因：列出這題還沒標的錯因（使用中，依使用次數排序），另可新增 */
function AddTagToQuestionSheet({
  open,
  question,
  onPick,
  onNew,
  onClose,
}: {
  open: boolean
  question: Question
  onPick: (id: string) => void
  onNew: () => void
  onClose: () => void
}) {
  const tags = useLiveQuery(() => getCaptureTags())
  const options = (tags ?? []).filter((t) => !question.errorTagIds.includes(t.id))
  return (
    <Sheet open={open} onClose={onClose} title="追加錯因">
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((t) => (
          <Chip key={t.id} onClick={() => onPick(t.id)}>
            {t.name}
          </Chip>
        ))}
        <Chip dashed onClick={onNew}>
          ＋ 新增錯因
        </Chip>
      </div>
    </Sheet>
  )
}

function NoteSheet({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  initial: string
  onSave: (note: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <Sheet open={open} onClose={onClose} title="筆記">
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        aria-label="筆記"
        className="mt-4 w-full resize-none rounded-option border border-line bg-card px-3.5 py-2.5 text-button outline-primary"
      />
      <Button className="mt-4" onClick={() => onSave(value)}>
        儲存
      </Button>
      <Button variant="text" className="mt-2" onClick={onClose}>
        取消
      </Button>
    </Sheet>
  )
}

/** 3-4 完成：數據為今天全部的作答（中途離開再回來也算在內） */
function DoneScreen({ onClose }: { onClose: () => void }) {
  const o = useLiveQuery(() => getReviewOverview())
  const upcoming = o ? upcomingText(o) : null
  return (
    <div className="flex min-h-dvh flex-col">
      <FlowHeader leading="close" title="今日複習" onLeading={onClose} />
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <img src={logo} alt="" width={96} height={96} />
        <h2 className="mt-4 font-heading text-title font-bold">今日複習完成</h2>
        {upcoming && <p className="mt-2 text-small text-sub">{upcoming}</p>}
        {o && (
          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            <StatCard label="完成" value={`${o.day.done} 題`} />
            <StatCard label="答對率" value={`${o.day.accuracy}%`} />
            <StatCard label="連續天數" value={`${o.streak} 天`} />
            <StatCard label="新增已掌握" value={`${o.day.newlyMastered} 題`} />
          </div>
        )}
      </main>
      <footer className="px-6 pt-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Button onClick={onClose}>完成</Button>
      </footer>
    </div>
  )
}
