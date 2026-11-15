import { describe, expect, it } from 'vitest'
import { daysWithoutBackup, pickBanner } from './banner'

const iso = (d: number, h = 9) => new Date(2026, 10, d, h).toISOString() // 2026-11-d 本地時間

describe('備份提醒天數', () => {
  it('沒有錯題不提醒', () => {
    expect(daysWithoutBackup(undefined, undefined, '2026-11-30')).toBeNull()
  })
  it('從沒備份：從第一題的新增日算，滿 7 天才提醒', () => {
    expect(daysWithoutBackup(undefined, iso(1), '2026-11-07')).toBeNull()
    expect(daysWithoutBackup(undefined, iso(1), '2026-11-08')).toBe(7)
  })
  it('有備份：從上次備份的本地日期算', () => {
    // 11/1 早上 7 點（UTC 還是 10/31）備份
    expect(daysWithoutBackup(iso(1, 7), iso(1), '2026-11-08')).toBe(7)
    expect(daysWithoutBackup(iso(5), iso(1), '2026-11-08')).toBeNull()
  })
})

describe('提示列優先序', () => {
  it('不是從主畫面開啟時，優先顯示加入主畫面', () => {
    expect(pickBanner(false, 10)).toEqual({ kind: 'install' })
    expect(pickBanner(true, 10)).toEqual({ kind: 'backup', days: 10 })
    expect(pickBanner(true, null)).toBeNull()
  })
})
