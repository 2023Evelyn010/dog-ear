import { today as todayOf } from '../lib/date'
import { initialSchedule } from '../lib/scheduler'
import { optionalText } from './questions'
import { db as defaultDb, type DogEarDB, type Question, type ReviewLog } from './schema'

// 單題詳情的操作：docs/PRD.md 3.4

/** 這題的作答紀錄，舊到新 */
export async function getQuestionLogs(questionId: string, database: DogEarDB = defaultDb): Promise<ReviewLog[]> {
  const logs = await database.reviewLogs.where('questionId').equals(questionId).toArray()
  return logs.sort((a, b) => (a.reviewedAt < b.reviewedAt ? -1 : a.reviewedAt > b.reviewedAt ? 1 : 0))
}

export type QuestionEdit = Pick<Question, 'images' | 'part' | 'myAnswer' | 'correctAnswer' | 'errorTagIds'> & {
  source?: string
  pageRef?: string
  note?: string
}

/** 編輯錯題：只改內容，不動複習排程 */
export async function editQuestion(
  id: string,
  edit: QuestionEdit,
  database: DogEarDB = defaultDb,
  now: Date = new Date(),
): Promise<void> {
  const q = await database.questions.get(id)
  if (!q) throw new Error(`question not found: ${id}`)
  await database.questions.put({
    ...q,
    images: edit.images,
    part: edit.part,
    myAnswer: edit.myAnswer,
    correctAnswer: edit.correctAnswer,
    errorTagIds: [...new Set(edit.errorTagIds)],
    source: optionalText(edit.source),
    pageRef: optionalText(edit.pageRef),
    note: optionalText(edit.note),
    updatedAt: now.toISOString(),
  })
}

/** 加入今日複習：下次複習設為今天；已掌握的題目改回學習中，等級不變 */
export async function addToTodayReview(id: string, database: DogEarDB = defaultDb, now: Date = new Date()): Promise<void> {
  await database.questions.update(id, {
    status: 'learning',
    nextReviewDate: todayOf(now),
    updatedAt: now.toISOString(),
  })
}

/** 重設進度：等級 0、學習中、下次複習明天 */
export async function resetProgress(id: string, database: DogEarDB = defaultDb, now: Date = new Date()): Promise<void> {
  // 與新增錯題相同：等級 0、明天開始複習
  await database.questions.update(id, { ...initialSchedule(todayOf(now)), updatedAt: now.toISOString() })
}

/** 刪除題目與它的作答紀錄 */
export async function deleteQuestion(id: string, database: DogEarDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.questions, database.reviewLogs, async () => {
    // 用索引條件 delete() 會開 cursor（iOS Safari 可能失敗），先取主鍵再 bulkDelete
    const logIds = await database.reviewLogs.where('questionId').equals(id).primaryKeys()
    await database.reviewLogs.bulkDelete(logIds)
    await database.questions.delete(id)
  })
}
