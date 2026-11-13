import { today } from '../lib/date'
import { initialSchedule } from '../lib/scheduler'
import { db as defaultDb, SETTINGS_ID, type Choice, type DogEarDB, type Part, type Question } from './schema'

export interface NewQuestionInput {
  part: Part
  images: Blob[]
  myAnswer: Choice | 'blank'
  correctAnswer: Choice
  errorTagIds: string[]
  source?: string
  pageRef?: string
  note?: string
  sessionId?: string
}

/** 選填文字欄位：去掉前後空白，空字串存成 undefined */
export function optionalText(s: string | undefined): string | undefined {
  const t = s?.trim()
  return t ? t : undefined
}

/** 新錯題：等級 0、學習中、明天開始複習（錄入當天不出題） */
export function buildNewQuestion(input: NewQuestionInput, now: Date = new Date()): Question {
  const iso = now.toISOString() // 時間戳記用 ISO（UTC）沒問題；「日期」才必須用本地日期
  return {
    id: crypto.randomUUID(),
    part: input.part,
    images: input.images,
    myAnswer: input.myAnswer,
    correctAnswer: input.correctAnswer,
    errorTagIds: [...new Set(input.errorTagIds)],
    source: optionalText(input.source),
    pageRef: optionalText(input.pageRef),
    note: optionalText(input.note),
    sessionId: input.sessionId,
    ...initialSchedule(today(now)),
    createdAt: iso,
    updatedAt: iso,
  }
}

/** 猜對的題目：我的答案與正確答案相同 */
export function isGuessed(q: { myAnswer: Choice | 'blank'; correctAnswer: Choice }): boolean {
  return q.myAnswer === q.correctAnswer
}

/** 更新題目欄位（複習時追加錯因、編輯筆記） */
export async function updateQuestion(
  id: string,
  patch: Partial<Pick<Question, 'errorTagIds' | 'note'>>,
  database: DogEarDB = defaultDb,
): Promise<void> {
  const changes: Partial<Question> = { ...patch, updatedAt: new Date().toISOString() }
  if ('note' in patch) changes.note = optionalText(patch.note)
  if (patch.errorTagIds) changes.errorTagIds = [...new Set(patch.errorTagIds)]
  await database.questions.update(id, changes)
}

/** 新增錯題，並把題本來源記為下次的預設值 */
export async function addQuestion(
  input: NewQuestionInput,
  database: DogEarDB = defaultDb,
  now: Date = new Date(),
): Promise<Question> {
  const q = buildNewQuestion(input, now)
  await database.transaction('rw', database.questions, database.settings, async () => {
    await database.questions.add(q)
    await database.settings.update(SETTINGS_ID, { lastSource: q.source })
  })
  return q
}
