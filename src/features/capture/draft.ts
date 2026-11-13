import type { Choice, Part, Question } from '../../db/schema'

/** 錄入表單的暫存狀態（還沒存檔的一題） */
export interface Draft {
  images: Blob[]
  part?: Part
  myAnswer?: Choice | 'blank'
  correctAnswer?: Choice
  tagIds: string[]
  source: string
  pageRef: string
  note: string
}

export function emptyDraft(source = ''): Draft {
  return { images: [], tagIds: [], source, pageRef: '', note: '' }
}

/** 「再拍一題」：清空表單，保留 Part 與題本來源 */
export function draftForNextQuestion(d: Draft): Draft {
  return { ...emptyDraft(d.source), part: d.part }
}

/** 「沿用這組照片，再新增一題」：保留照片、Part、題本來源 */
export function draftWithSamePhotos(d: Draft): Draft {
  return { ...emptyDraft(d.source), images: d.images, part: d.part }
}

/** 必填欄位缺少的第一項（依表單順序）；全部填好回傳 null */
export function firstMissing(d: Draft): string | null {
  if (d.images.length === 0) return '還沒加照片'
  if (d.part === undefined) return '還沒選 Part'
  if (d.myAnswer === undefined) return '還沒選我的答案'
  if (d.correctAnswer === undefined) return '還沒選正確答案'
  if (d.tagIds.length === 0) return '還沒選錯因'
  return null
}

/**
 * 是否有還沒存檔的內容（按 ✕ 時要不要確認）。
 * 與表單重設（或載入）時的狀態比較：自動帶入的題本來源、沿用的照片與 Part 不算「已填」。
 */
export function isDirty(d: Draft, baseline: Draft): boolean {
  return (
    d.images.length !== baseline.images.length ||
    d.images.some((img, i) => img !== baseline.images[i]) ||
    d.part !== baseline.part ||
    d.myAnswer !== baseline.myAnswer ||
    d.correctAnswer !== baseline.correctAnswer ||
    d.tagIds.length !== baseline.tagIds.length ||
    d.tagIds.some((id) => !baseline.tagIds.includes(id)) ||
    d.source.trim() !== baseline.source.trim() ||
    d.pageRef.trim() !== baseline.pageRef.trim() ||
    d.note.trim() !== baseline.note.trim()
  )
}

/** 編輯錯題：把題目載入表單 */
export function draftFromQuestion(q: Question): Draft {
  return {
    images: q.images,
    part: q.part,
    myAnswer: q.myAnswer,
    correctAnswer: q.correctAnswer,
    tagIds: q.errorTagIds,
    source: q.source ?? '',
    pageRef: q.pageRef ?? '',
    note: q.note ?? '',
  }
}

export function toggleTag(tagIds: string[], id: string): string[] {
  return tagIds.includes(id) ? tagIds.filter((t) => t !== id) : [...tagIds, id]
}
