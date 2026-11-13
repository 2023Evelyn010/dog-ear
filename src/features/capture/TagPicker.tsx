import { Chip } from '../../components/Chip'
import type { ErrorTag } from '../../db/schema'
import { VISIBLE_TAG_LIMIT } from '../../db/tags'

/** 錯因膠囊標籤：依使用次數排序（由呼叫端排好），最多顯示 8 個，其餘收進「更多錯因」 */
export function TagPicker({
  tags,
  selected,
  expanded,
  onToggle,
  onExpand,
  onAdd,
}: {
  tags: ErrorTag[]
  selected: string[]
  expanded: boolean
  onToggle: (id: string) => void
  onExpand: () => void
  onAdd: () => void
}) {
  const hidden = tags.slice(VISIBLE_TAG_LIMIT)
  // 已勾選的錯因不能被收起來
  const showAll = expanded || hidden.some((t) => selected.includes(t.id))
  const visible = showAll ? tags : tags.slice(0, VISIBLE_TAG_LIMIT)

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((t) => (
        <Chip key={t.id} selected={selected.includes(t.id)} onClick={() => onToggle(t.id)}>
          {t.name}
        </Chip>
      ))}
      {!showAll && hidden.length > 0 && (
        <Chip aria-expanded={false} onClick={onExpand}>
          更多錯因 ⌄
        </Chip>
      )}
      <Chip dashed onClick={onAdd}>
        ＋ 新增錯因
      </Chip>
    </div>
  )
}
