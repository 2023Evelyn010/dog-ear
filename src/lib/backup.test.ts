import 'fake-indexeddb/auto'
import JSZip from 'jszip'
import { afterEach, describe, expect, it } from 'vitest'
import { addQuestion } from '../db/questions'
import { recordReview } from '../db/review'
import { DogEarDB } from '../db/schema'
import { getSettings, markBackedUp, setDailyLimit } from '../db/settings'
import { backupFileName, createBackup, InvalidBackupError, parseBackup, restoreBackup } from './backup'

let n = 0
const opened: DogEarDB[] = []
async function freshDb() {
  const db = new DogEarDB(`backup-test-${n++}`)
  opened.push(db)
  await db.open()
  return db
}
afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete()
})

const at = (d: number, h = 9) => new Date(2026, 10, d, h) // 2026-11-d 本地時間
const bytes = (b: Blob) => b.arrayBuffer().then((buf) => [...new Uint8Array(buf)])

describe('備份檔名', () => {
  it('用本地日期', () => {
    expect(backupFileName(new Date(2026, 10, 14, 7, 30))).toBe('dog-ear-backup-20261114.zip')
  })
})

describe('匯出 → 匯入（驗收）', () => {
  it('題目、照片、作答紀錄、錯因、設定完整還原', async () => {
    const src = await freshDb()
    const [tag] = await src.errorTags.toArray()
    const photo1 = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
    const photo2 = new Blob([new Uint8Array([4, 5])], { type: 'image/jpeg' })
    const q = await addQuestion(
      { part: 7, images: [photo1, photo2], myAnswer: 'blank', correctAnswer: 'C', errorTagIds: [tag.id], note: '筆記' },
      src,
      at(10),
    )
    await recordReview(q.id, 'B', 'wrong', src, at(11))
    await setDailyLimit(35, src)
    await src.sessions.add({ id: 's1', date: '2026-11-10', wrongCount: 1, guessedCount: 0 })

    const file = await createBackup(src, at(14))
    expect(file.name).toBe('dog-ear-backup-20261114.zip')

    // 匯入到另一個已有資料的資料庫：原本的資料要被覆蓋
    const dst = await freshDb()
    await addQuestion({ part: 5, images: [], myAnswer: 'A', correctAnswer: 'B', errorTagIds: ['x'] }, dst)
    const parsed = await parseBackup(file)
    expect(parsed.questionCount).toBe(1)
    expect(parsed.exportedAt).toBe(at(14).toISOString())
    await restoreBackup(parsed, dst)

    const [restored] = await dst.questions.toArray()
    expect(await dst.questions.count()).toBe(1)
    const { images, ...rest } = restored
    const { images: srcImages, ...srcRest } = (await src.questions.get(q.id))!
    expect(rest).toEqual(srcRest)
    expect(images.map((b) => b.type)).toEqual(['image/jpeg', 'image/jpeg'])
    expect(await Promise.all(images.map(bytes))).toEqual(await Promise.all(srcImages.map(bytes)))
    expect(await dst.reviewLogs.toArray()).toEqual(await src.reviewLogs.toArray())
    expect(await dst.errorTags.toArray()).toEqual(await src.errorTags.toArray())
    expect(await dst.sessions.toArray()).toEqual(await src.sessions.toArray())
    const settings = await getSettings(dst)
    expect(settings.dailyLimit).toBe(35)
    // 備份檔裡的「上次備份」是這次匯出的時間
    expect(settings.lastBackupAt).toBe(at(14).toISOString())
  })

  it('匯出不會改動原資料庫的「上次備份」（分享成功才由呼叫端記錄）', async () => {
    const db = await freshDb()
    await markBackedUp(at(1), db)
    await createBackup(db, at(14))
    expect((await getSettings(db)).lastBackupAt).toBe(at(1).toISOString())
  })
})

describe('不是 Dog-ear 的備份檔', () => {
  const zipWith = async (files: Record<string, string>) => {
    const zip = new JSZip()
    for (const [k, v] of Object.entries(files)) zip.file(k, v)
    return zip.generateAsync({ type: 'blob' })
  }

  it('不是 ZIP', async () => {
    await expect(parseBackup(new Blob(['hello']))).rejects.toBeInstanceOf(InvalidBackupError)
  })
  it('沒有 data.json', async () => {
    await expect(parseBackup(await zipWith({ 'a.txt': 'x' }))).rejects.toBeInstanceOf(InvalidBackupError)
  })
  it('版本不符', async () => {
    const data = { schemaVersion: 2, exportedAt: '', questions: [], errorTags: [], reviewLogs: [], sessions: [], settings: [] }
    await expect(parseBackup(await zipWith({ 'data.json': JSON.stringify(data) }))).rejects.toBeInstanceOf(InvalidBackupError)
  })
  it('照片檔遺失', async () => {
    const data = {
      schemaVersion: 1,
      exportedAt: '2026-11-14T00:00:00.000Z',
      questions: [{ id: 'q', images: ['images/q-1.jpg'] }],
      errorTags: [],
      reviewLogs: [],
      sessions: [],
      settings: [],
    }
    await expect(parseBackup(await zipWith({ 'data.json': JSON.stringify(data) }))).rejects.toBeInstanceOf(InvalidBackupError)
  })
  it('解析失敗時不動到資料庫', async () => {
    const db = await freshDb()
    await addQuestion({ part: 5, images: [], myAnswer: 'A', correctAnswer: 'B', errorTagIds: ['x'] }, db)
    await expect(parseBackup(new Blob(['hello']))).rejects.toThrow()
    expect(await db.questions.count()).toBe(1)
  })
})

describe('設定', () => {
  it('每日上限限制在 5–100', async () => {
    const db = await freshDb()
    await setDailyLimit(3, db)
    expect((await getSettings(db)).dailyLimit).toBe(5)
    await setDailyLimit(120, db)
    expect((await getSettings(db)).dailyLimit).toBe(100)
  })
})
