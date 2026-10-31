import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_ERROR_TAG_NAMES, DogEarDB } from './schema'

let n = 0
const opened: DogEarDB[] = []
function freshDb(name = `test-${n++}`) {
  const db = new DogEarDB(name)
  opened.push(db)
  return db
}

afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete()
})

describe('首次啟動', () => {
  it('建立 8 個預設錯因，依順序排列', async () => {
    const db = freshDb()
    const tags = await db.errorTags.orderBy('order').toArray()
    expect(tags.map((t) => t.name)).toEqual([...DEFAULT_ERROR_TAG_NAMES])
    expect(tags.every((t) => t.isDefault && !t.archived)).toBe(true)
    expect(new Set(tags.map((t) => t.id)).size).toBe(8)
  })

  it('建立預設設定', async () => {
    const db = freshDb()
    expect(await db.settings.get('app')).toEqual({ id: 'app', dailyLimit: 20, onboardingSeen: false })
  })

  it('再次開啟不會重複建立', async () => {
    const name = `test-reopen-${n++}`
    const first = freshDb(name)
    await first.errorTags.count()
    first.close()

    const second = new DogEarDB(name)
    expect(await second.errorTags.count()).toBe(8)
    second.close()
  })
})
