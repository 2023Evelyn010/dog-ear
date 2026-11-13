import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { addQuestion, buildNewQuestion, isGuessed, type NewQuestionInput } from './questions'
import { DogEarDB, type ErrorTag } from './schema'
import { addPracticeSession, checkAttempted, countSession, sessionSummary } from './sessions'
import {
  addErrorTag,
  countTagUsage,
  DuplicateTagError,
  getCaptureTags,
  isDuplicateTagName,
  sortTagsForCapture,
} from './tags'

let n = 0
const opened: DogEarDB[] = []
function freshDb() {
  const db = new DogEarDB(`capture-test-${n++}`)
  opened.push(db)
  return db
}
afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete()
})

const tag = (id: string, order: number, archived = false): ErrorTag => ({
  id,
  name: id,
  order,
  archived,
  isDefault: false,
})

function input(over: Partial<NewQuestionInput> = {}): NewQuestionInput {
  return {
    part: 5,
    images: [new Blob(['x'], { type: 'image/jpeg' })],
    myAnswer: 'B',
    correctAnswer: 'D',
    errorTagIds: ['t1'],
    ...over,
  }
}

describe('錄入畫面的錯因排序', () => {
  it('使用次數多到少，同數依手動排序，排除封存', () => {
    const tags = [tag('a', 0), tag('b', 1), tag('c', 2), tag('d', 3, true)]
    const usage = countTagUsage(['c', 'c', 'b', 'd', 'd', 'd'])
    expect(sortTagsForCapture(tags, usage).map((t) => t.id)).toEqual(['c', 'b', 'a'])
  })

  it('沒有人用過時依手動排序', () => {
    const tags = [tag('b', 1), tag('a', 0)]
    expect(sortTagsForCapture(tags, new Map()).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('從資料庫的多值索引計數（一題多個錯因各算一次）', async () => {
    const db = freshDb()
    const defaults = await db.errorTags.orderBy('order').toArray()
    const [t0, t1, t2] = defaults
    await addQuestion(input({ errorTagIds: [t2.id, t1.id] }), db)
    await addQuestion(input({ errorTagIds: [t2.id] }), db)
    const sorted = await getCaptureTags(db)
    expect(sorted.slice(0, 3).map((t) => t.id)).toEqual([t2.id, t1.id, t0.id])
  })
})

describe('新增錯因', () => {
  it('名稱比對去掉前後空白，含封存的錯因', () => {
    expect(isDuplicateTagName(' a ', [tag('a', 0, true)])).toBe(true)
    expect(isDuplicateTagName('A', [tag('a', 0)])).toBe(false)
  })

  it('排在最後，不是預設錯因', async () => {
    const db = freshDb()
    const t = await addErrorTag('  介系詞 ', db)
    expect(t).toMatchObject({ name: '介系詞', order: 8, archived: false, isDefault: false })
    expect(await db.errorTags.count()).toBe(9)
  })

  it('名稱重複時拒絕', async () => {
    const db = freshDb()
    await expect(addErrorTag('單字', db)).rejects.toBeInstanceOf(DuplicateTagError)
    expect(await db.errorTags.count()).toBe(8)
  })
})

describe('新增錯題', () => {
  it('等級 0、學習中、明天開始複習（本地日期，早上 8 點前也正確）', () => {
    // 台灣 2026-11-01 07:30 = UTC 10/31 23:30
    const q = buildNewQuestion(input(), new Date(2026, 10, 1, 7, 30))
    expect(q).toMatchObject({ level: 0, status: 'learning', nextReviewDate: '2026-11-02' })
  })

  it('跨月：月底錄入，下個月 1 號複習', () => {
    expect(buildNewQuestion(input(), new Date(2026, 11, 31, 22)).nextReviewDate).toBe('2027-01-01')
  })

  it('選填欄位空白存成 undefined，錯因去重', () => {
    const q = buildNewQuestion(input({ source: '  ', pageRef: ' p.12 ', errorTagIds: ['a', 'a', 'b'] }))
    expect(q.source).toBeUndefined()
    expect(q.pageRef).toBe('p.12')
    expect(q.errorTagIds).toEqual(['a', 'b'])
  })

  it('寫入題目（含照片 Blob）並記住題本來源', async () => {
    const db = freshDb()
    const q = await addQuestion(input({ source: '新制多益 1' }), db)
    const saved = await db.questions.get(q.id)
    expect(saved?.images).toHaveLength(1)
    expect((await db.settings.get('app'))?.lastSource).toBe('新制多益 1')
  })

  it('猜對 = 我的答案與正確答案相同；未作答不算猜對', () => {
    expect(isGuessed({ myAnswer: 'C', correctAnswer: 'C' })).toBe(true)
    expect(isGuessed({ myAnswer: 'blank', correctAnswer: 'C' })).toBe(false)
  })
})

describe('這次寫了幾題', () => {
  it('摘要：猜對為 0 時省略', () => {
    expect(sessionSummary(countSession([false, false, true, false]))).toBe('本次錄入 4 題：答錯 3 題、猜對 1 題')
    expect(sessionSummary(countSession([false, false]))).toBe('本次錄入 2 題：答錯 2 題')
  })

  it('答錯率 = 答錯 ÷ 寫的題數，四捨五入', () => {
    expect(checkAttempted('30', 3)).toEqual({ ok: true, attempted: 30, wrongRate: 10 })
    expect(checkAttempted('7', 2)).toEqual({ ok: true, attempted: 7, wrongRate: 29 })
    expect(checkAttempted('3', 3)).toEqual({ ok: true, attempted: 3, wrongRate: 100 })
  })

  it('少於答錯題數時提示；空白或非數字不可送出', () => {
    expect(checkAttempted('2', 3)).toEqual({ ok: false, error: '寫的題數不能少於答錯的題數' })
    expect(checkAttempted('', 3)).toEqual({ ok: false })
    expect(checkAttempted('1.5', 0)).toEqual({ ok: false })
    expect(checkAttempted('0', 0)).toEqual({ ok: false })
  })

  it('略過時 attempted 留空', async () => {
    const db = freshDb()
    await addPracticeSession({ id: 's1', wrongCount: 2, guessedCount: 0 }, db, new Date(2026, 10, 1, 7))
    expect(await db.sessions.get('s1')).toEqual({
      id: 's1',
      date: '2026-11-01',
      attempted: undefined,
      wrongCount: 2,
      guessedCount: 0,
      source: undefined,
    })
  })
})
