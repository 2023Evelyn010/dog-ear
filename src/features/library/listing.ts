import { isGuessed } from '../../db/questions'
import type { ErrorTag, Part, Question, ReviewLog } from '../../db/schema'
import { formatShort, parseDate, type DateString } from '../../lib/date'

// 錯題庫列表與詳情的篩選、排序、文案：docs/PRD.md 3.4

export type StatusFilter = 'all' | 'learning' | 'mastered'
export type SortKey = 'created' | 'next'

export interface LibraryFilter {
  parts: Part[]
  tagIds: string[]
  status: StatusFilter
}

export const DEFAULT_FILTER: LibraryFilter = { parts: [], tagIds: [], status: 'learning' }
/** 清除篩選：狀態也改成「全部」，否則全部已掌握時清除後仍然是空的 */
export const CLEARED_FILTER: LibraryFilter = { parts: [], tagIds: [], status: 'all' }

export const STATUS_LABEL: Record<StatusFilter, string> = { all: '全部', learning: '學習中', mastered: '已掌握' }
export const SORT_LABEL: Record<SortKey, string> = { created: '依新增日期', next: '依下次複習' }

/** Part 與錯因多選；錯因選多個時，有其中任一個就符合 */
export function filterQuestions<T extends Pick<Question, 'part' | 'errorTagIds' | 'status'>>(
  questions: T[],
  f: LibraryFilter,
): T[] {
  return questions.filter(
    (q) =>
      (f.parts.length === 0 || f.parts.includes(q.part)) &&
      (f.tagIds.length === 0 || q.errorTagIds.some((id) => f.tagIds.includes(id))) &&
      (f.status === 'all' || q.status === f.status),
  )
}

type Sortable = Pick<Question, 'createdAt' | 'nextReviewDate'>

/** 依新增日期：新到舊。依下次複習：近到遠，已掌握（沒有下次複習日）排最後；同一天新到舊 */
export function sortQuestions<T extends Sortable>(questions: T[], key: SortKey): T[] {
  const newestFirst = (a: T, b: T) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)
  return [...questions].sort((a, b) => {
    if (key === 'next' && a.nextReviewDate !== b.nextReviewDate) {
      if (a.nextReviewDate === null) return 1
      if (b.nextReviewDate === null) return -1
      return a.nextReviewDate < b.nextReviewDate ? -1 : 1
    }
    return newestFirst(a, b)
  })
}

/** 錯因名稱對照（含封存的錯因），依手動排序 */
export function tagNameMap(tags: ErrorTag[]): Map<string, string> {
  return new Map([...tags].sort((a, b) => a.order - b.order).map((t) => [t.id, t.name]))
}

/** 題目的錯因名稱，依錯因的手動排序 */
export function tagNamesOf(q: Pick<Question, 'errorTagIds'>, names: Map<string, string>): string[] {
  return [...names].filter(([id]) => q.errorTagIds.includes(id)).map(([, name]) => name)
}

/** 列表標題「Part 5・單字、文法」；猜對的題目「Part 5・猜對・單字」 */
export function questionTitle(q: Pick<Question, 'part' | 'errorTagIds' | 'myAnswer' | 'correctAnswer'>, names: Map<string, string>): string {
  const parts = [`Part ${q.part}`]
  if (isGuessed(q)) parts.push('猜對')
  parts.push(tagNamesOf(q, names).join('、'))
  return parts.join('・')
}

/** 下次複習日：今天以前（逾期）也顯示「今天」，因為已經到期 */
export function reviewDateText(date: DateString, today: DateString): string {
  return formatShort(date < today ? today : date, today)
}

/** 列表副標「下次複習：明天・等級 2」或「已掌握」 */
export function questionSubtitle(q: Pick<Question, 'status' | 'nextReviewDate' | 'level'>, today: DateString): string {
  if (q.status === 'mastered' || q.nextReviewDate === null) return '已掌握'
  return `下次複習：${reviewDateText(q.nextReviewDate, today)}・等級 ${q.level}`
}

/** 詳情「複習進度：等級 2・下次複習 11/3」或「複習進度：已掌握」 */
export function progressText(q: Pick<Question, 'status' | 'nextReviewDate' | 'level'>, today: DateString): string {
  if (q.status === 'mastered' || q.nextReviewDate === null) return '複習進度：已掌握'
  return `複習進度：等級 ${q.level}・下次複習 ${reviewDateText(q.nextReviewDate, today)}`
}

/** 作答紀錄的結果：「答錯（選 B）」「不會」「答對・有把握」「答對・猜的」 */
export function logResultText(log: Pick<ReviewLog, 'answer' | 'result'>): string {
  if (log.result === 'sure') return '答對・有把握'
  if (log.result === 'guessed') return '答對・猜的'
  return log.answer === 'unknown' ? '不會' : `答錯（選 ${log.answer}）`
}

/** 作答紀錄的日期「10/28」 */
export function logDateText(date: DateString): string {
  const d = parseDate(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 「加入今日複習」可不可以按：學習中且今天（或更早）已經到期就不用再加 */
export function isInTodayReview(q: Pick<Question, 'status' | 'nextReviewDate'>, today: DateString): boolean {
  return q.status === 'learning' && q.nextReviewDate !== null && q.nextReviewDate <= today
}

/** 篩選按鈕文字：沒選時是欄位名稱；錯因超過兩個時顯示數量 */
export function partFilterLabel(parts: Part[]): string {
  return parts.length === 0 ? 'Part' : `Part ${[...parts].sort().join('、')}`
}

export function tagFilterLabel(tagIds: string[], names: Map<string, string>): string {
  if (tagIds.length === 0) return '錯因'
  if (tagIds.length > 2) return `錯因 ${tagIds.length}`
  return tagNamesOf({ errorTagIds: tagIds }, names).join('、')
}

/** 篩選面板的錯因：使用中的依手動排序，後面接還有題目在用的封存錯因 */
export function filterTagOptions(tags: ErrorTag[], questions: Pick<Question, 'errorTagIds'>[]): ErrorTag[] {
  const used = new Set(questions.flatMap((q) => q.errorTagIds))
  const byOrder = [...tags].sort((a, b) => a.order - b.order)
  return [...byOrder.filter((t) => !t.archived), ...byOrder.filter((t) => t.archived && used.has(t.id))]
}

export function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}
