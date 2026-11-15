import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { addQuestion, type NewQuestionInput } from './questions'
import { DogEarDB } from './schema'
import {
  addErrorTag,
  archiveErrorTag,
  deleteErrorTag,
  DuplicateTagError,
  getCaptureTags,
  getTagUsage,
  LastActiveTagError,
  mergeErrorTag,
  renameErrorTag,
  reorderErrorTags,
  unarchiveErrorTag,
} from './tags'

let n = 0
const opened: DogEarDB[] = []
async function freshDb() {
  const db = new DogEarDB(`tag-manage-test-${n++}`)
  opened.push(db)
  await db.open() // populate：建立 8 個預設錯因
  return db
}
afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete()
})

async function tagId(db: DogEarDB, name: string) {
  const t = (await db.errorTags.toArray()).find((t) => t.name === name)
  if (!t) throw new Error(`no tag ${name}`)
  return t.id
}
const input = (errorTagIds: string[]): NewQuestionInput => ({
  part: 5,
  images: [new Blob(['x'])],
  myAnswer: 'B',
  correctAnswer: 'D',
  errorTagIds,
})

/** 計算執行期間開了幾次 cursor（iOS Safari 開 cursor 可能失敗） */
async function countCursors(fn: () => Promise<unknown>): Promise<number> {
  const methods = ['openCursor', 'openKeyCursor'] as const
  const protos = [IDBObjectStore.prototype, IDBIndex.prototype]
  const originals = protos.map((p) => methods.map((m) => p[m]))
  let count = 0
  for (const p of protos)
    for (const m of methods) {
      const orig = p[m] as (...args: unknown[]) => IDBRequest
      ;(p as unknown as Record<string, unknown>)[m] = function (this: unknown, ...args: unknown[]) {
        count++
        return orig.apply(this, args)
      }
    }
  try {
    await fn()
    return count
  } finally {
    protos.forEach((p, i) => methods.forEach((m, j) => ((p as unknown as Record<string, unknown>)[m] = originals[i][j])))
  }
}

describe('合併（驗收）', () => {
  it('「搭配詞」合併到「單字」：相關題目改標，同時有兩者的去重，原錯因刪除', async () => {
    const db = await freshDb()
    const [vocab, colloc, grammar] = [await tagId(db, '單字'), await tagId(db, '搭配詞'), await tagId(db, '文法')]
    const onlyColloc = await addQuestion(input([colloc]), db)
    const both = await addQuestion(input([vocab, colloc]), db)
    const withGrammar = await addQuestion(input([colloc, grammar]), db)
    const untouched = await addQuestion(input([grammar]), db)

    expect(await mergeErrorTag(colloc, vocab, db)).toBe(3)

    expect((await db.questions.get(onlyColloc.id))?.errorTagIds).toEqual([vocab])
    expect((await db.questions.get(both.id))?.errorTagIds).toEqual([vocab])
    expect((await db.questions.get(withGrammar.id))?.errorTagIds).toEqual([vocab, grammar])
    expect((await db.questions.get(untouched.id))?.errorTagIds).toEqual([grammar])
    expect(await db.errorTags.get(colloc)).toBeUndefined()
    const usage = await getTagUsage(db)
    expect(usage.get(vocab)).toBe(3)
    expect(usage.get(colloc)).toBeUndefined()
  })

  it('不能合併到封存的錯因或自己', async () => {
    const db = await freshDb()
    const [vocab, colloc] = [await tagId(db, '單字'), await tagId(db, '搭配詞')]
    await addQuestion(input([vocab]), db)
    await archiveErrorTag(vocab, db)
    await expect(mergeErrorTag(colloc, vocab, db)).rejects.toThrow()
    await expect(mergeErrorTag(colloc, colloc, db)).rejects.toThrow()
  })

  it('合併不開 cursor', async () => {
    const db = await freshDb()
    const [vocab, colloc] = [await tagId(db, '單字'), await tagId(db, '搭配詞')]
    await addQuestion(input([colloc]), db)
    expect(await countCursors(() => mergeErrorTag(colloc, vocab, db))).toBe(0)
  })
})

describe('改名', () => {
  it('只改名稱，題目不變', async () => {
    const db = await freshDb()
    const vocab = await tagId(db, '單字')
    const q = await addQuestion(input([vocab]), db)
    await renameErrorTag(vocab, '  字彙 ', db)
    expect((await db.errorTags.get(vocab))?.name).toBe('字彙')
    expect((await db.questions.get(q.id))?.errorTagIds).toEqual([vocab])
  })

  it('不能和其他錯因（含封存）同名；和自己原名相同可以', async () => {
    const db = await freshDb()
    const [vocab, colloc] = [await tagId(db, '單字'), await tagId(db, '搭配詞')]
    await addQuestion(input([colloc]), db)
    await archiveErrorTag(colloc, db)
    await expect(renameErrorTag(vocab, '搭配詞', db)).rejects.toBeInstanceOf(DuplicateTagError)
    await expect(renameErrorTag(vocab, '單字', db)).resolves.toBeUndefined()
  })
})

describe('排序', () => {
  it('依拖曳後的順序重寫 order；錄入頁使用次數相同時照手動排序', async () => {
    const db = await freshDb()
    const tags = (await db.errorTags.toArray()).sort((a, b) => a.order - b.order)
    const reversed = tags.map((t) => t.id).reverse()
    await reorderErrorTags(reversed, db)
    expect((await getCaptureTags(db)).map((t) => t.id)).toEqual(reversed)
  })
})

describe('刪除、封存、取消封存', () => {
  it('只有沒用過的錯因可以刪除', async () => {
    const db = await freshDb()
    const [vocab, colloc] = [await tagId(db, '單字'), await tagId(db, '搭配詞')]
    await addQuestion(input([vocab]), db)
    await expect(deleteErrorTag(vocab, db)).rejects.toThrow()
    await deleteErrorTag(colloc, db)
    expect(await db.errorTags.get(colloc)).toBeUndefined()
  })

  it('封存後錄入頁不出現，題目保留標記；取消封存回到使用中並排在最後', async () => {
    const db = await freshDb()
    const vocab = await tagId(db, '單字')
    const q = await addQuestion(input([vocab]), db)
    await archiveErrorTag(vocab, db)
    expect((await getCaptureTags(db)).some((t) => t.id === vocab)).toBe(false)
    expect((await db.questions.get(q.id))?.errorTagIds).toEqual([vocab])
    const extra = await addErrorTag('代名詞指涉', db)
    await unarchiveErrorTag(vocab, db)
    const tag = await db.errorTags.get(vocab)
    expect(tag?.archived).toBe(false)
    expect(tag!.order).toBeGreaterThan((await db.errorTags.get(extra.id))!.order)
  })

  it('至少保留一個使用中的錯因', async () => {
    const db = await freshDb()
    const tags = await db.errorTags.toArray()
    const [last, ...others] = tags
    for (const t of others) await deleteErrorTag(t.id, db)
    await expect(deleteErrorTag(last.id, db)).rejects.toBeInstanceOf(LastActiveTagError)
    await expect(archiveErrorTag(last.id, db)).rejects.toBeInstanceOf(LastActiveTagError)
    // 有封存的錯因也不算「使用中」
    const other = await addErrorTag('文法', db)
    await addQuestion(input([other.id]), db)
    await archiveErrorTag(other.id, db)
    await expect(archiveErrorTag(last.id, db)).rejects.toBeInstanceOf(LastActiveTagError)
  }, 15_000) // 連續十幾次交易，電腦忙時可能超過預設的 5 秒
})
