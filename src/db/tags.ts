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
