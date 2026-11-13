import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { Button } from '../../components/Button'
import { FlowHeader } from '../../components/Header'
import { Option, OptionGroup } from '../../components/Option'
import { ConfirmSheet } from '../../components/Sheet'
import { useGoBack } from '../../components/useGoBack'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { addQuestion, isGuessed } from '../../db/questions'
import { db, SETTINGS_ID, type Choice, type Part } from '../../db/schema'
import { addPracticeSession, countSession } from '../../db/sessions'
import { getCaptureTags } from '../../db/tags'
import { compressImage, IMAGE_READ_ERROR_MESSAGE } from '../../lib/image'
import { AddTagSheet } from './AddTagSheet'
import { NextSheet, PracticeSheet } from './AfterSaveSheets'
import {
  draftForNextQuestion,
  draftWithSamePhotos,
  emptyDraft,
  firstMissing,
  isDirty,
  toggleTag,
  type Draft,
} from './draft'
import { PhotoRow } from './PhotoRow'
import { TagPicker } from './TagPicker'

const PARTS: Part[] = [5, 6, 7]
const CHOICES: Choice[] = ['A', 'B', 'C', 'D']

/** 錄入流程（全螢幕）：docs/PRD.md 3.2、Figma 2-1／2-2／2-3 */
export function CapturePage() {
  // 等設定載入後再建立表單，題本來源才能預設帶入上次的值
  const settings = useLiveQuery(async () => ({ value: await db.settings.get(SETTINGS_ID) }))
  if (!settings) return null
  return <CaptureFlow initialSource={settings.value?.lastSource ?? ''} />
}

type SheetKind = 'none' | 'next' | 'practice' | 'discard' | 'addTag'

function CaptureFlow({ initialSource }: { initialSource: string }) {
  const goBack = useGoBack()
  const tags = useLiveQuery(() => getCaptureTags())

  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialSource))
  const [baseline, setBaseline] = useState<Draft>(draft) // 表單重設時的狀態，用來判斷有沒有未存檔的內容
  const [sessionId] = useState(() => crypto.randomUUID())
  const [saved, setSaved] = useState<boolean[]>([]) // 本次已存檔各題是否為猜對
  const [sessionSource, setSessionSource] = useState<string>()

  const [sheet, setSheet] = useState<SheetKind>('none')
  const [processing, setProcessing] = useState(0)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [moreTags, setMoreTags] = useState(false)
  const [optionalOpen, setOptionalOpen] = useState(false)

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const missing = firstMissing(draft)
  const guessed = draft.myAnswer !== undefined && draft.myAnswer === draft.correctAnswer
  const counts = countSession(saved)

  async function addFiles(files: File[]) {
    setPhotoError(null)
    setProcessing((p) => p + files.length)
    for (const file of files) {
      try {
        const blob = await compressImage(file)
        setDraft((d) => ({ ...d, images: [...d.images, blob] }))
      } catch (err) {
        console.error(err)
        setPhotoError(IMAGE_READ_ERROR_MESSAGE)
      } finally {
        setProcessing((p) => p - 1)
      }
    }
  }

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
    setDraft(next)
    setBaseline(next)
    setPhotoError(null)
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
        <PhotoRow
          images={draft.images}
          processing={processing}
          error={photoError}
          onAddFiles={(files) => void addFiles(files)}
          onRemove={(i) => update({ images: draft.images.filter((_, j) => j !== i) })}
        />

        <Field label="Part">
          <OptionGroup label="Part">
            {PARTS.map((p) => (
              <Option key={p} selected={draft.part === p} onSelect={() => update({ part: p })} label={`Part ${p}`}>
                {p}
              </Option>
            ))}
          </OptionGroup>
        </Field>

        <Field label="我的答案">
          <OptionGroup label="我的答案">
            {CHOICES.map((c) => (
              <Option key={c} selected={draft.myAnswer === c} onSelect={() => update({ myAnswer: c })}>
                {c}
              </Option>
            ))}
            <Option small selected={draft.myAnswer === 'blank'} onSelect={() => update({ myAnswer: 'blank' })}>
              未作答
            </Option>
          </OptionGroup>
        </Field>

        <Field label="正確答案">
          <OptionGroup label="正確答案">
            {CHOICES.map((c) => (
              <Option key={c} selected={draft.correctAnswer === c} onSelect={() => update({ correctAnswer: c })}>
                {c}
              </Option>
            ))}
          </OptionGroup>
          {guessed && (
            <p className="mt-3 rounded-button bg-primary-soft px-3.5 py-2.5 text-small text-primary">
              猜對的題目也可以收錄，一樣要選一個錯因。
            </p>
          )}
        </Field>

        <Field label="錯因（可多選）">
          {tags && (
            <TagPicker
              tags={tags}
              selected={draft.tagIds}
              expanded={moreTags}
              onToggle={(id) => update({ tagIds: toggleTag(draft.tagIds, id) })}
              onExpand={() => setMoreTags(true)}
              onAdd={() => setSheet('addTag')}
            />
          )}
        </Field>

        <div>
          <button
            type="button"
            aria-expanded={optionalOpen}
            onClick={() => setOptionalOpen((o) => !o)}
            className="py-1 text-small text-sub"
          >
            選填：題本來源、頁碼、筆記 <span className={`inline-block ${optionalOpen ? 'rotate-180' : ''}`}>⌄</span>
          </button>
          {optionalOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <TextField label="題本來源" value={draft.source} onChange={(v) => update({ source: v })} />
              <TextField label="頁碼／題號" value={draft.pageRef} onChange={(v) => update({ pageRef: v })} />
              <TextField label="筆記" value={draft.note} onChange={(v) => update({ note: v })} multiline />
            </div>
          )}
        </div>
      </main>

      {/* 存檔按鈕固定在底部 */}
      <div className="sticky bottom-0 z-10 border-t border-line bg-bg px-6 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        <p role="status" className="mb-2 min-h-[18px] text-center text-caption text-sub">
          {saveError ?? (processing > 0 ? '' : missing)}
        </p>
        <Button onClick={() => void save()} disabled={!!missing || processing > 0 || busy}>
          存檔
        </Button>
      </div>

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
      <ConfirmSheet
        open={sheet === 'discard'}
        title="要捨棄這題嗎？"
        confirmLabel="捨棄"
        cancelLabel="繼續填寫"
        onConfirm={() => void leave()}
        onCancel={() => setSheet('none')}
      />
      <AddTagSheet
        open={sheet === 'addTag'}
        onClose={() => setSheet('none')}
        onCreated={(tag) => {
          update({ tagIds: [...draft.tagIds, tag.id] })
          setMoreTags(true) // 新錯因使用次數為 0，可能排在「更多錯因」裡，展開才看得到
          setSheet('none')
        }}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-label font-medium">{label}</h2>
      {children}
    </section>
  )
}

function TextField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  // 字級 16px：iOS Safari 對小於 16px 的輸入框會自動放大畫面
  const cls = 'mt-1.5 w-full rounded-option border border-line bg-card px-3.5 py-2.5 text-button outline-primary'
  return (
    <label className="block text-label font-medium">
      {label}
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${cls} resize-none font-normal`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={`${cls} font-normal`} />
      )}
    </label>
  )
}
