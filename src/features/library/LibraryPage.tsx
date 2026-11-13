import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { TabHeader } from '../../components/Header'
import { PART_BG } from '../../components/partColor'
import { Photo } from '../../components/Photo'
import { Sheet } from '../../components/Sheet'
import { db, type Part, type Question } from '../../db/schema'
import { today as todayOf } from '../../lib/date'
import { EmptyState } from '../review/HomePage'
import {
  CLEARED_FILTER,
  DEFAULT_FILTER,
  filterQuestions,
  filterTagOptions,
  partFilterLabel,
  questionSubtitle,
  questionTitle,
  SORT_LABEL,
  sortQuestions,
  STATUS_LABEL,
  tagFilterLabel,
  tagNameMap,
  toggle,
  type LibraryFilter,
  type SortKey,
  type StatusFilter,
} from './listing'

const PARTS: Part[] = [5, 6, 7]
const STATUSES: StatusFilter[] = ['all', 'learning', 'mastered']

// 篩選與排序在 App 執行期間保留（看完詳情回來還在），重開 App 才回到預設
let savedFilter: LibraryFilter = DEFAULT_FILTER
let savedSort: SortKey = 'created'

type SheetKind = 'none' | 'part' | 'tag' | 'status'

/** 錯題庫列表：docs/PRD.md 3.4、Figma 4-1 */
export function LibraryPage() {
  // 讀整張表（getAll，不開 cursor）；縮圖本來就需要照片
  const questions = useLiveQuery(() => db.questions.toArray())
  const tags = useLiveQuery(() => db.errorTags.toArray())
  const [filter, setFilter] = useState(savedFilter)
  const [sort, setSort] = useState(savedSort)
  const [sheet, setSheet] = useState<SheetKind>('none')

  useEffect(() => {
    savedFilter = filter
    savedSort = sort
  }, [filter, sort])

  if (!questions || !tags) return <TabHeader title="錯題庫" />
  if (questions.length === 0)
    return (
      <>
        <TabHeader title="錯題庫" />
        <EmptyState />
      </>
    )

  const names = tagNameMap(tags)
  const today = todayOf()
  const shown = sortQuestions(filterQuestions(questions, filter), sort)
  const tagOptions = filterTagOptions(tags, questions)

  return (
    <>
      <TabHeader title="錯題庫" />
      <div className="flex gap-2 px-6 pt-2">
        <FilterButton active={filter.parts.length > 0} onClick={() => setSheet('part')}>
          {partFilterLabel(filter.parts)}
        </FilterButton>
        <FilterButton active={filter.tagIds.length > 0} onClick={() => setSheet('tag')}>
          {tagFilterLabel(filter.tagIds, names)}
        </FilterButton>
        <FilterButton active={filter.status !== DEFAULT_FILTER.status} onClick={() => setSheet('status')}>
          {STATUS_LABEL[filter.status]}
        </FilterButton>
      </div>

      <div className="flex items-center justify-between px-6 pt-5 pb-2 text-small text-sub">
        <span>共 {shown.length} 題</span>
        <button type="button" onClick={() => setSort((s) => (s === 'created' ? 'next' : 'created'))} className="py-1">
          {SORT_LABEL[sort]} ⇅
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center px-6 pt-16 text-center">
          <p className="text-body text-sub">沒有符合的題目</p>
          <Button variant="secondary" fullWidth={false} className="mt-4" onClick={() => setFilter(CLEARED_FILTER)}>
            清除篩選
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 px-6 pt-1 pb-6">
          {shown.map((q) => (
            <li key={q.id}>
              <Row q={q} title={questionTitle(q, names)} subtitle={questionSubtitle(q, today)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={sheet === 'part'} onClose={() => setSheet('none')} title="Part">
        <ChipGroup>
          {PARTS.map((p) => (
            <Chip key={p} selected={filter.parts.includes(p)} onClick={() => setFilter({ ...filter, parts: toggle(filter.parts, p) })}>
              Part {p}
            </Chip>
          ))}
        </ChipGroup>
        <DoneButton onClick={() => setSheet('none')} />
      </Sheet>
      <Sheet open={sheet === 'tag'} onClose={() => setSheet('none')} title="錯因">
        <ChipGroup>
          {tagOptions.map((t) => (
            <Chip
              key={t.id}
              selected={filter.tagIds.includes(t.id)}
              onClick={() => setFilter({ ...filter, tagIds: toggle(filter.tagIds, t.id) })}
            >
              {t.name}
            </Chip>
          ))}
        </ChipGroup>
        <DoneButton onClick={() => setSheet('none')} />
      </Sheet>
      <Sheet open={sheet === 'status'} onClose={() => setSheet('none')} title="狀態">
        <ChipGroup>
          {STATUSES.map((s) => (
            <Chip key={s} selected={filter.status === s} onClick={() => setFilter({ ...filter, status: s })}>
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </ChipGroup>
        <DoneButton onClick={() => setSheet('none')} />
      </Sheet>
    </>
  )
}

/** 篩選標籤：膠囊形＋⌄；有選條件時為選取樣式 */
function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Chip selected={active} onClick={onClick} className="max-w-[45%] truncate">
      {children} <span aria-hidden="true">⌄</span>
    </Chip>
  )
}

function ChipGroup({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>
}

function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="mt-6" onClick={onClick}>
      完成
    </Button>
  )
}

/** 列表項：Part 色書籤條、縮圖、標題、副標、› */
function Row({ q, title, subtitle }: { q: Question; title: string; subtitle: string }) {
  return (
    <Link to={`/library/${q.id}`} className="flex h-14 items-center gap-2.5">
      <span className={`h-full w-1 shrink-0 rounded-[2px] ${PART_BG[q.part]}`} aria-hidden="true" />
      <Photo blob={q.images[0]} alt="" className="size-14 shrink-0" />
      <div className="min-w-0 flex-1 pl-1">
        <p className="truncate text-button font-medium">{title}</p>
        <p className="mt-0.5 truncate text-caption text-sub">{subtitle}</p>
      </div>
      <span className="text-sub" aria-hidden="true">
        ›
      </span>
    </Link>
  )
}
