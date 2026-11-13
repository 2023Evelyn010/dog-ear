import { useState, type ReactNode } from 'react'
import { Option, OptionGroup } from '../../components/Option'
import type { Choice, ErrorTag, Part } from '../../db/schema'
import { AddTagSheet } from './AddTagSheet'
import { toggleTag } from './draft'
import { PhotoRow } from './PhotoRow'
import { TagPicker } from './TagPicker'
import type { QuestionFormState } from './useQuestionForm'

const PARTS: Part[] = [5, 6, 7]
const CHOICES: Choice[] = ['A', 'B', 'C', 'D']

/** 錄入表單的欄位：照片、Part、我的答案、正確答案、錯因、選填欄位（Figma 2-1） */
export function QuestionFields({
  form,
  tags,
  optionalInitiallyOpen = false,
}: {
  form: QuestionFormState
  /** 可選的錯因（已排序） */
  tags: ErrorTag[] | undefined
  optionalInitiallyOpen?: boolean
}) {
  const { draft, update } = form
  const [moreTags, setMoreTags] = useState(false)
  const [optionalOpen, setOptionalOpen] = useState(optionalInitiallyOpen)
  const [addingTag, setAddingTag] = useState(false)
  const guessed = draft.myAnswer !== undefined && draft.myAnswer === draft.correctAnswer

  return (
    <>
      <PhotoRow
        images={draft.images}
        processing={form.processing}
        error={form.photoError}
        onAddFiles={(files) => void form.addFiles(files)}
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
            onAdd={() => setAddingTag(true)}
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

      <AddTagSheet
        open={addingTag}
        onClose={() => setAddingTag(false)}
        onCreated={(tag) => {
          update({ tagIds: [...draft.tagIds, tag.id] })
          setMoreTags(true) // 新錯因使用次數為 0，可能排在「更多錯因」裡，展開才看得到
          setAddingTag(false)
        }}
      />
    </>
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
