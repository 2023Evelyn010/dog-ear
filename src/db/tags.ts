import { db as defaultDb, type DogEarDB, type ErrorTag } from './schema'

/** 錄入畫面一次最多顯示幾個錯因，其餘收進「更多錯因」 */
export const VISIBLE_TAG_LIMIT = 8

/** 從題目的錯因 ID 清單（multiEntry 索引的所有 key）算出每個錯因的使用題數 */
export function countTagUsage(tagIds: Iterable<string>): Map<string, number> {
  const usage = new Map<string, number>()
  for (const id of tagIds) usage.set(id, (usage.get(id) ?? 0) + 1)
  return usage
}

/** 錄入畫面的錯因順序：排除封存，使用題數多到少，同數時依手動排序 */
export function sortTagsForCapture(tags: ErrorTag[], usage: Map<string, number>): ErrorTag[] {
  return tags
    .filter((t) => !t.archived)
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.order - b.order)
}

export function normalizeTagName(name: string): string {
  return name.trim()
}

/** 名稱不可與現有錯因（含封存）重複 */
export function isDuplicateTagName(name: string, tags: ErrorTag[]): boolean {
  const n = normalizeTagName(name)
  return tags.some((t) => normalizeTagName(t.name) === n)
}

/** 讀取錄入畫面要用的錯因（已排序）。只讀索引 key，不會載入題目照片。 */
export async function getCaptureTags(database: DogEarDB = defaultDb): Promise<ErrorTag[]> {
  const [tags, keys] = await Promise.all([
    database.errorTags.toArray(),
    database.questions.orderBy('errorTagIds').keys(),
  ])
  return sortTagsForCapture(tags, countTagUsage(keys as string[]))
}

export class DuplicateTagError extends Error {
  constructor() {
    super('duplicate tag name')
    this.name = 'DuplicateTagError'
  }
}

/** 新增錯因，排在手動排序的最後。名稱重複時丟出 DuplicateTagError。 */
export async function addErrorTag(name: string, database: DogEarDB = defaultDb): Promise<ErrorTag> {
  const n = normalizeTagName(name)
  if (!n) throw new Error('empty tag name')
  return database.transaction('rw', database.errorTags, async () => {
    const tags = await database.errorTags.toArray()
    if (isDuplicateTagName(n, tags)) throw new DuplicateTagError()
    const tag: ErrorTag = {
      id: crypto.randomUUID(),
      name: n,
      order: tags.reduce((max, t) => Math.max(max, t.order), -1) + 1,
      archived: false,
      isDefault: false,
    }
    await database.errorTags.add(tag)
    return tag
  })
}

/** 每個錯因的使用題數（含封存）。只讀索引 key，不會載入題目照片。 */
export async function getTagUsage(database: DogEarDB = defaultDb): Promise<Map<string, number>> {
  return countTagUsage((await database.questions.orderBy('errorTagIds').keys()) as string[])
}

/** 封存／刪除／合併最後一個使用中的錯因時丟出 */
export class LastActiveTagError extends Error {
  constructor() {
    super('at least one active tag is required')
    this.name = 'LastActiveTagError'
  }
}

async function assertNotLastActive(database: DogEarDB, id: string) {
  const active = (await database.errorTags.toArray()).filter((t) => !t.archived)
  if (active.length <= 1 && active.some((t) => t.id === id)) throw new LastActiveTagError()
}

/** 標了這個錯因的題目（多值索引的 getAll，不開 cursor） */
function questionsWithTag(database: DogEarDB, id: string) {
  return database.questions.where('errorTagIds').equals(id).toArray()
}

/** 改名：題目只記 ID，不必變動。名稱重複時丟出 DuplicateTagError。 */
export async function renameErrorTag(id: string, name: string, database: DogEarDB = defaultDb): Promise<void> {
  const n = normalizeTagName(name)
  if (!n) throw new Error('empty tag name')
  await database.transaction('rw', database.errorTags, async () => {
    const tags = await database.errorTags.toArray()
    if (isDuplicateTagName(n, tags.filter((t) => t.id !== id))) throw new DuplicateTagError()
    await database.errorTags.update(id, { name: n })
  })
}

/** 拖曳排序：依傳入的 ID 順序重寫使用中錯因的 order，封存的排在後面 */
export async function reorderErrorTags(ids: string[], database: DogEarDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.errorTags, async () => {
    const tags = await database.errorTags.toArray()
    const rest = tags.filter((t) => !ids.includes(t.id)).sort((a, b) => a.order - b.order)
    const ordered = [...ids.map((id) => tags.find((t) => t.id === id)), ...rest].filter((t) => t !== undefined)
    await database.errorTags.bulkPut(ordered.map((t, order) => ({ ...t, order })))
  })
}

/** 刪除：只限沒有題目使用的錯因 */
export async function deleteErrorTag(id: string, database: DogEarDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.errorTags, database.questions, async () => {
    await assertNotLastActive(database, id)
    if ((await questionsWithTag(database, id)).length > 0) throw new Error('tag is in use')
    await database.errorTags.delete(id)
  })
}

/** 封存：舊題目保留這個標記，錄入時不再出現 */
export async function archiveErrorTag(id: string, database: DogEarDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.errorTags, async () => {
    await assertNotLastActive(database, id)
    await database.errorTags.update(id, { archived: true })
  })
}

/** 取消封存：回到使用中，排在最後 */
export async function unarchiveErrorTag(id: string, database: DogEarDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.errorTags, async () => {
    const tags = await database.errorTags.toArray()
    const order = tags.reduce((max, t) => Math.max(max, t.order), -1) + 1
    await database.errorTags.update(id, { archived: false, order })
  })
}

/** 合併：把 `fromId` 的題目改標為 `toId`（已同時有兩者的去重），再刪除 `fromId`。回傳改標的題數。 */
export async function mergeErrorTag(fromId: string, toId: string, database: DogEarDB = defaultDb): Promise<number> {
  if (fromId === toId) throw new Error('cannot merge a tag into itself')
  return database.transaction('rw', database.errorTags, database.questions, async () => {
    await assertNotLastActive(database, fromId)
    const target = await database.errorTags.get(toId)
    if (!target || target.archived) throw new Error('merge target must be an active tag')
    const qs = await questionsWithTag(database, fromId)
    const now = new Date().toISOString()
    await database.questions.bulkPut(
      qs.map((q) => ({
        ...q,
        errorTagIds: [...new Set(q.errorTagIds.map((t) => (t === fromId ? toId : t)))],
        updatedAt: now,
      })),
    )
    await database.errorTags.delete(fromId)
    return qs.length
  })
}
