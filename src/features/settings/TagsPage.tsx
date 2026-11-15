import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { FlowHeader } from '../../components/Header'
import { GripIcon, MoreIcon, PlusIcon } from '../../components/icons'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { useGoBack } from '../../components/useGoBack'
import { STORAGE_ERROR_MESSAGE } from '../../db/errors'
import { db, type ErrorTag } from '../../db/schema'
import {
  archiveErrorTag,
  deleteErrorTag,
  DuplicateTagError,
  getTagUsage,
  LastActiveTagError,
  mergeErrorTag,
  normalizeTagName,
  renameErrorTag,
  reorderErrorTags,
  unarchiveErrorTag,
} from '../../db/tags'
import { AddTagSheet } from '../capture/AddTagSheet'

const LAST_ACTIVE_MESSAGE = '至少要保留一個使用中的錯因'
const DUPLICATE_MESSAGE = '已經有這個錯因了'

type Dialog =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'menu'; tag: ErrorTag }
  | { kind: 'rename'; tag: ErrorTag }
  | { kind: 'mergeTarget'; tag: ErrorTag }
  | { kind: 'mergeConfirm'; tag: ErrorTag; target: ErrorTag }
  | { kind: 'archive'; tag: ErrorTag }
  | { kind: 'delete'; tag: ErrorTag }

/** 錯因管理（docs/PRD.md 3.6、Figma 5-2） */
export function TagsPage() {
  const goBack = useGoBack('/settings')
  const data = useLiveQuery(async () => {
    const [tags, usage] = await Promise.all([db.errorTags.toArray(), getTagUsage()])
    return { tags: tags.sort((a, b) => a.order - b.order), usage }
  })
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' })
  const [notice, setNotice] = useState<string | null>(null)
  const close = () => setDialog({ kind: 'none' })

  // 拖曳後先用新順序顯示；資料庫的順序一有變動（寫入完成）就改回以資料庫為準
  const [dragOrder, setDragOrder] = useState<{ base: string; ids: string[] } | null>(null)

  if (!data) return <FlowHeader title="錯因管理" onLeading={goBack} />
  const { tags, usage } = data
  const dbActive = tags.filter((t) => !t.archived)
  const dbOrder = dbActive.map((t) => t.id).join()
  const byId = new Map(tags.map((t) => [t.id, t]))
  const active =
    dragOrder && dragOrder.base === dbOrder
      ? dragOrder.ids.map((id) => byId.get(id)).filter((t) => t !== undefined)
      : dbActive
  const archived = tags.filter((t) => t.archived)
  const used = (t: ErrorTag) => usage.get(t.id) ?? 0

  /** 執行一個操作；失敗時顯示原因 */
  async function run(action: () => Promise<unknown>) {
    setNotice(null)
    try {
      await action()
      close()
    } catch (err) {
      close()
      if (err instanceof LastActiveTagError) setNotice(LAST_ACTIVE_MESSAGE)
      else {
        console.error(err)
        setNotice(STORAGE_ERROR_MESSAGE)
      }
    }
  }

  /** 封存、刪除、合併前先檢查是不是最後一個使用中的錯因 */
  function guardLast(next: Dialog) {
    if (active.length <= 1) {
      close()
      setNotice(LAST_ACTIVE_MESSAGE)
    } else setDialog(next)
  }

  function onDragEnd({ active: from, over }: DragEndEvent) {
    if (!over || from.id === over.id) return
    const ids = active.map((t) => t.id)
    const next = arrayMove(ids, ids.indexOf(String(from.id)), ids.indexOf(String(over.id)))
    setDragOrder({ base: dbOrder, ids: next })
    reorderErrorTags(next).catch((err: unknown) => {
      console.error(err)
      setDragOrder(null)
      setNotice(STORAGE_ERROR_MESSAGE)
    })
  }

  return (
    <div className="pb-10">
      <FlowHeader
        title="錯因管理"
        onLeading={goBack}
        right={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setDialog({ kind: 'add' })}
              className="flex h-12 items-center gap-1 pr-4 text-small whitespace-nowrap text-ink"
            >
              <PlusIcon size={16} />
              新增
            </button>
          </div>
        }
      />
      {notice && (
        <p role="alert" className="mx-6 mt-2 rounded-button bg-primary-soft px-4 py-3 text-small text-primary">
          {notice}
        </p>
      )}

      <section className="mt-3 px-6">
        <h2 className="text-small text-sub">使用中（拖曳排序）</h2>
        <SortableTags tags={active} onDragEnd={onDragEnd} used={used} onMenu={(tag) => setDialog({ kind: 'menu', tag })} />
      </section>

      {archived.length > 0 && (
        <section className="mt-6 px-6">
          <h2 className="text-small text-sub">已封存</h2>
          <ul>
            {archived.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex flex-col">
                  <span className="text-button">{t.name}</span>
                  <span className="text-caption text-sub">{used(t)} 題保留原本的標記</span>
                </span>
                <button
                  type="button"
                  onClick={() => void run(() => unarchiveErrorTag(t.id))}
                  className="py-2 text-small whitespace-nowrap text-sub"
                >
                  取消封存
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mx-6 mt-6 text-caption text-sub">已使用的錯因只能封存或合併，未使用的才能刪除。</p>

      <AddTagSheet open={dialog.kind === 'add'} onClose={close} onCreated={close} />

      {dialog.kind === 'menu' && (
        <Sheet open onClose={close} title={dialog.tag.name}>
          <div className="mt-5 flex flex-col gap-3">
            <Button variant="secondary" onClick={() => setDialog({ kind: 'rename', tag: dialog.tag })}>
              改名
            </Button>
            {used(dialog.tag) > 0 ? (
              <>
                <Button variant="secondary" onClick={() => guardLast({ kind: 'mergeTarget', tag: dialog.tag })}>
                  合併到…
                </Button>
                <Button variant="secondary" onClick={() => guardLast({ kind: 'archive', tag: dialog.tag })}>
                  封存
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => guardLast({ kind: 'delete', tag: dialog.tag })}>
                刪除
              </Button>
            )}
            <Button variant="text" onClick={close}>
              取消
            </Button>
          </div>
        </Sheet>
      )}

      {dialog.kind === 'rename' && <RenameSheet tag={dialog.tag} onClose={close} />}

      {dialog.kind === 'mergeTarget' && (
        <Sheet open onClose={close} title="合併到…">
          <div className="mt-5 flex flex-col gap-3">
            {active
              .filter((t) => t.id !== dialog.tag.id)
              .map((t) => (
                <Button
                  key={t.id}
                  variant="secondary"
                  onClick={() => setDialog({ kind: 'mergeConfirm', tag: dialog.tag, target: t })}
                >
                  {t.name}
                </Button>
              ))}
            <Button variant="text" onClick={close}>
              取消
            </Button>
          </div>
        </Sheet>
      )}

      <ConfirmSheet
        open={dialog.kind === 'mergeConfirm'}
        title={dialog.kind === 'mergeConfirm' ? `將有 ${used(dialog.tag)} 題改標為 ${dialog.target.name}` : ''}
        confirmLabel="合併"
        cancelLabel="取消"
        onConfirm={() => dialog.kind === 'mergeConfirm' && void run(() => mergeErrorTag(dialog.tag.id, dialog.target.id))}
        onCancel={close}
      />
      <ConfirmSheet
        open={dialog.kind === 'archive'}
        title={dialog.kind === 'archive' ? `要封存「${dialog.tag.name}」嗎？` : ''}
        description="舊題目會保留這個標記，但錄入時不會再出現"
        confirmLabel="封存"
        cancelLabel="取消"
        onConfirm={() => dialog.kind === 'archive' && void run(() => archiveErrorTag(dialog.tag.id))}
        onCancel={close}
      />
      <ConfirmSheet
        open={dialog.kind === 'delete'}
        title={dialog.kind === 'delete' ? `要刪除「${dialog.tag.name}」嗎？` : ''}
        confirmLabel="刪除"
        cancelLabel="取消"
        onConfirm={() => dialog.kind === 'delete' && void run(() => deleteErrorTag(dialog.tag.id))}
        onCancel={close}
      />
    </div>
  )
}

function SortableTags({
  tags,
  used,
  onDragEnd,
  onMenu,
}: {
  tags: ErrorTag[]
  used: (t: ErrorTag) => number
  onDragEnd: (e: DragEndEvent) => void
  onMenu: (t: ErrorTag) => void
}) {
  // 只有把手能拖曳，所以觸控不用長按，也不會影響頁面捲動
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={tags.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul>
          {tags.map((t) => (
            <SortableRow key={t.id} tag={t} count={used(t)} onMenu={() => onMenu(t)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({ tag, count, onMenu }: { tag: ErrorTag; count: number; onMenu: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex h-[51px] items-center border-b border-line bg-bg ${isDragging ? 'z-10 shadow-md' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`拖曳排序：${tag.name}`}
        className="-ml-3 flex size-12 touch-none items-center justify-center text-ink"
      >
        <GripIcon size={18} />
      </button>
      <span className="flex-1 text-button">{tag.name}</span>
      <span className="text-small text-sub">{count} 題</span>
      <button
        type="button"
        onClick={onMenu}
        aria-label={`${tag.name}的選項`}
        className="-mr-3 flex size-12 items-center justify-center text-sub"
      >
        <MoreIcon size={18} />
      </button>
    </li>
  )
}

function RenameSheet({ tag, onClose }: { tag: ErrorTag; onClose: () => void }) {
  const [name, setName] = useState(tag.name)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!normalizeTagName(name) || busy) return
    setBusy(true)
    try {
      await renameErrorTag(tag.id, name)
      onClose()
    } catch (err) {
      setError(err instanceof DuplicateTagError ? DUPLICATE_MESSAGE : STORAGE_ERROR_MESSAGE)
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="改名">
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          maxLength={20}
          aria-label="錯因名稱"
          aria-invalid={!!error}
          className="w-full rounded-option border border-line bg-card px-3.5 py-3 text-button outline-primary"
        />
        {error && (
          <p role="alert" className="text-small text-ink">
            {error}
          </p>
        )}
        <Button type="submit" disabled={!normalizeTagName(name) || busy} className="mt-2">
          存檔
        </Button>
        <Button variant="text" onClick={onClose}>
          取消
        </Button>
      </form>
    </Sheet>
  )
}
