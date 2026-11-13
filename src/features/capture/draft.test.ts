import { describe, expect, it } from 'vitest'
import { draftForNextQuestion, draftWithSamePhotos, emptyDraft, firstMissing, isDirty, type Draft } from './draft'

const img = new Blob(['x'])
const full: Draft = {
  images: [img],
  part: 7,
  myAnswer: 'blank',
  correctAnswer: 'A',
  tagIds: ['t'],
  source: '題本',
  pageRef: '153',
  note: '筆記',
}

describe('缺少欄位提示', () => {
  it('依表單順序回報第一個缺少的欄位', () => {
    expect(firstMissing(emptyDraft())).toBe('還沒加照片')
    expect(firstMissing({ ...full, part: undefined, correctAnswer: undefined })).toBe('還沒選 Part')
    expect(firstMissing({ ...full, myAnswer: undefined })).toBe('還沒選我的答案')
    expect(firstMissing({ ...full, correctAnswer: undefined })).toBe('還沒選正確答案')
    expect(firstMissing({ ...full, tagIds: [] })).toBe('還沒選錯因')
    expect(firstMissing({ ...full, source: '', pageRef: '', note: '' })).toBeNull()
  })
})

describe('存檔後的下一題', () => {
  it('再拍一題：只保留 Part 與題本來源', () => {
    expect(draftForNextQuestion(full)).toEqual({ ...emptyDraft('題本'), part: 7 })
  })

  it('沿用這組照片：保留照片、Part、題本來源', () => {
    expect(draftWithSamePhotos(full)).toEqual({ ...emptyDraft('題本'), images: [img], part: 7 })
  })
})

describe('中途離開確認', () => {
  it('自動帶入的值不算已填', () => {
    const base = emptyDraft('上次的題本')
    expect(isDirty(base, base)).toBe(false)
    const next = draftWithSamePhotos(full)
    expect(isDirty(next, next)).toBe(false)
  })

  it('加照片、選答案、改來源都算已填', () => {
    const base = emptyDraft('A')
    expect(isDirty({ ...base, images: [img] }, base)).toBe(true)
    expect(isDirty({ ...base, myAnswer: 'blank' }, base)).toBe(true)
    expect(isDirty({ ...base, source: 'B' }, base)).toBe(true)
    expect(isDirty({ ...base, note: ' ' }, base)).toBe(false)
  })
})

describe('編輯錯題', () => {
  it('載入後沒改動不算已填；改錯因、頁碼、筆記都算', () => {
    const base = { ...full }
    expect(isDirty({ ...base }, base)).toBe(false)
    expect(isDirty({ ...base, tagIds: ['u'] }, base)).toBe(true)
    expect(isDirty({ ...base, tagIds: [] }, base)).toBe(true)
    expect(isDirty({ ...base, pageRef: '154' }, base)).toBe(true)
    expect(isDirty({ ...base, note: '' }, base)).toBe(true)
    expect(isDirty({ ...base, note: '筆記 ' }, base)).toBe(false)
  })
})
