import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { addQuestion, type NewQuestionInput } from './questions'
import { getReviewOverview, loadTodayQueue, recordReview } from './review'
import { DogEarDB } from './schema'

let n = 0
const opened: DogEarDB[] = []
function freshDb() {
  const db = new DogEarDB(`review-test-${n++}`)
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
}
const at = (d: number, h = 9) => new Date(2026, 10, d, h) // 2026-11-d 本地時間

async function seed(db: DogEarDB, count: number, day: number) {
  for (let i = 0; i < count; i++) await addQuestion(input, db, new Date(2026, 10, day, 9, 0, i))
}

describe('作答寫入', () => {
  it('更新題目排程並寫一筆 ReviewLog', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    const updated = await recordReview(q.id, 'D', 'sure', db, at(11))
    expect(updated).toMatchObject({ level: 1, status: 'learning', nextReviewDate: '2026-11-13' })
    expect(await db.questions.get(q.id)).toMatchObject({ level: 1, nextReviewDate: '2026-11-13' })
    const logs = await db.reviewLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ questionId: q.id, reviewDate: '2026-11-11', answer: 'D', result: 'sure', levelBefore: 0, levelAfter: 1 })
  })

  it('不會 → wrong，明天再出', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    await recordReview(q.id, 'unknown', 'wrong', db, at(11, 7)) // 早上 7 點也是 11/11
    expect(await db.questions.get(q.id)).toMatchObject({ level: 0, nextReviewDate: '2026-11-12' })
    expect((await db.reviewLogs.toArray())[0].reviewDate).toBe('2026-11-11')
  })
})

describe('出題清單', () => {
  it('錄入當天不出題，隔天出', async () => {
    const db = freshDb()
    await seed(db, 2, 10)
    expect(await loadTodayQueue(db, at(10))).toHaveLength(0)
    expect(await loadTodayQueue(db, at(11))).toHaveLength(2)
  })

  it('中途離開再進來：只出還沒作答的題目，且每日上限扣掉今天做過的', async () => {
    const db = freshDb()
    await db.settings.update('app', { dailyLimit: 5 })
    await seed(db, 8, 10)
    const first = await loadTodayQueue(db, at(11))
    expect(first).toHaveLength(5)
    for (const q of first.slice(0, 2)) await recordReview(q.id, 'D', 'sure', db, at(11))
    const again = await loadTodayQueue(db, at(11, 15))
    expect(again).toHaveLength(3)
    expect(again.map((q) => q.id)).toEqual(first.slice(2).map((q) => q.id))
  })
})

describe('複習頁數據', () => {
  it('今天要複習、順延、明天題數（受上限）、本週新增', async () => {
    const db = freshDb()
    await db.settings.update('app', { dailyLimit: 3 })
    await seed(db, 4, 10) // 週二
    await seed(db, 1, 12)
    const o = await getReviewOverview(db, at(12)) // 週四
    expect(o).toMatchObject({ total: 5, weekNew: 5, addedToday: 1, todayCount: 3, deferred: 1, tomorrowCount: 3, streak: 0 })
  })

  it('今天做完：完成數據、連續天數、明天題數', async () => {
    const db = freshDb()
    await seed(db, 3, 10)
    const queue = await loadTodayQueue(db, at(11))
    await recordReview(queue[0].id, 'D', 'sure', db, at(11))
    await recordReview(queue[1].id, 'D', 'guessed', db, at(11))
    await recordReview(queue[2].id, 'A', 'wrong', db, at(11))
    const o = await getReviewOverview(db, at(11, 20))
    expect(o).toMatchObject({ todayCount: 0, reviewedToday: 3, streak: 1, tomorrowCount: 2, nextDate: null })
    expect(o.day).toEqual({ done: 3, accuracy: 33, newlyMastered: 0 })
  })

  it('明天沒有題目時給下一個日期；全部已掌握時為 null', async () => {
    const db = freshDb()
    const q = await addQuestion(input, db, at(10))
    await recordReview(q.id, 'D', 'sure', db, at(11)) // 等級 1 → 11/13
    expect(await getReviewOverview(db, at(11))).toMatchObject({ tomorrowCount: 0, nextDate: '2026-11-13' })
    await db.questions.update(q.id, { level: 5, nextReviewDate: '2026-11-13' })
    await recordReview(q.id, 'D', 'sure', db, at(13))
    expect(await getReviewOverview(db, at(13))).toMatchObject({ tomorrowCount: 0, nextDate: null })
  })
})

describe('iOS Safari 相容', () => {
  // iOS Safari 開 cursor 可能丟 UnknownError「Unable to open cursor」，首頁整頁掛掉
  it('首頁數據不開任何 cursor（空資料與有資料都一樣）', async () => {
    const methods = ['openCursor', 'openKeyCursor'] as const
    const protos = [IDBObjectStore.prototype, IDBIndex.prototype]
    const originals = protos.map((p) => methods.map((m) => p[m]))
    let opened = 0
    for (const p of protos)
      for (const m of methods) {
        const orig = p[m] as (...args: unknown[]) => IDBRequest
        ;(p as unknown as Record<string, unknown>)[m] = function (this: unknown, ...args: unknown[]) {
          opened++
          return orig.apply(this, args)
        }
      }
    try {
      const db = freshDb()
      await getReviewOverview(db, at(10))
      const q = await addQuestion(input, db, at(10))
      await recordReview(q.id, 'D', 'sure', db, at(11))
      await getReviewOverview(db, at(11))
      expect(opened).toBe(0)
    } finally {
      protos.forEach((p, i) => methods.forEach((m, j) => ((p as unknown as Record<string, unknown>)[m] = originals[i][j])))
    }
  })
})
