import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { addToTodayReview, deleteQuestion, editQuestion, getQuestionLogs, resetProgress } from './library'
import { addQuestion, type NewQuestionInput } from './questions'
import { recordReview } from './review'
import { DogEarDB } from './schema'

let n = 0
const opened: DogEarDB[] = []
function freshDb() {
  const db = new DogEarDB(`library-test-${n++}`)
  opened.push(db)
  return db
}
afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete()
})

const input: NewQuestionInput = {
  part: 5,
  images: [new Blob(['x'])],
  myAnswer: 'B',
  correctAnswer: 'D',
  errorTagIds: ['t'],
  source: '題本',
}
const at = (d: number, h = 9) => new Date(2026, 10, d, h) // 2026-11-d 本地時間

describe('作答紀錄', () => {
  it('只取這題的紀錄，舊到新', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    const other = await addQuestion(input, db, at(10))
    await recordReview(q.id, 'B', 'wrong', db, at(11))
    await recordReview(other.id, 'D', 'sure', db, at(11))
    await recordReview(q.id, 'D', 'guessed', db, at(12))
    const logs = await getQuestionLogs(q.id, db)
    expect(logs.map((l) => [l.reviewDate, l.result])).toEqual([
      ['2026-11-11', 'wrong'],
      ['2026-11-12', 'guessed'],
    ])
  })
})

describe('編輯錯題', () => {
  it('改內容，不動複習排程；空白欄位存成 undefined', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    await recordReview(q.id, 'D', 'sure', db, at(11)) // 等級 1、11/13
    const photo = new Blob(['y'])
    await editQuestion(
      q.id,
      { images: [photo], part: 7, myAnswer: 'blank', correctAnswer: 'A', errorTagIds: ['u', 'u', 't'], source: '  ', pageRef: 'p.3 ', note: '筆記' },
      db,
      at(12),
    )
    const after = await db.questions.get(q.id)
    expect(after).toMatchObject({
      part: 7,
      myAnswer: 'blank',
      correctAnswer: 'A',
      errorTagIds: ['u', 't'],
      source: undefined,
      pageRef: 'p.3',
      note: '筆記',
      level: 1,
      status: 'learning',
      nextReviewDate: '2026-11-13',
      createdAt: q.createdAt,
      updatedAt: at(12).toISOString(),
    })
    expect(after?.images).toHaveLength(1)
  })
})

describe('加入今日複習', () => {
  it('學習中：下次複習改成今天，等級不變', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    await recordReview(q.id, 'D', 'sure', db, at(11))
    await addToTodayReview(q.id, db, at(12))
    expect(await db.questions.get(q.id)).toMatchObject({ level: 1, status: 'learning', nextReviewDate: '2026-11-12' })
  })

  it('已掌握：改回學習中，等級不變', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    await db.questions.update(q.id, { level: 5, status: 'mastered', nextReviewDate: null })
    await addToTodayReview(q.id, db, at(12))
    expect(await db.questions.get(q.id)).toMatchObject({ level: 5, status: 'learning', nextReviewDate: '2026-11-12' })
  })
})

describe('重設進度', () => {
  it('等級 0、學習中、明天複習；作答紀錄保留', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    await db.questions.update(q.id, { level: 5, status: 'mastered', nextReviewDate: null })
    await recordReview(q.id, 'D', 'sure', db, at(11))
    await resetProgress(q.id, db, at(12))
    expect(await db.questions.get(q.id)).toMatchObject({ level: 0, status: 'learning', nextReviewDate: '2026-11-13' })
    expect(await db.reviewLogs.count()).toBe(1)
  })
})

describe('刪除錯題', () => {
  it('題目與它的作答紀錄一起刪除，其他題目不受影響', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    const other = await addQuestion(input, db, at(10))
    await recordReview(q.id, 'B', 'wrong', db, at(11))
    await recordReview(q.id, 'D', 'sure', db, at(12))
    await recordReview(other.id, 'D', 'sure', db, at(11))
    await deleteQuestion(q.id, db)
    expect(await db.questions.get(q.id)).toBeUndefined()
    expect(await db.questions.get(other.id)).toBeDefined()
    const logs = await db.reviewLogs.toArray()
    expect(logs.map((l) => l.questionId)).toEqual([other.id])
  })
})
