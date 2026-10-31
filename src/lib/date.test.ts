import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDays, diffDays, formatShort, parseDate, toDateString, today } from './date'

describe('測試環境', () => {
  it('在台灣時區（UTC+8）執行', () => {
    expect(new Date('2026-10-31T00:00:00Z').getTimezoneOffset()).toBe(-480)
  })
})

describe('today()', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('回傳本地日期 YYYY-MM-DD', () => {
    expect(today(new Date(2026, 9, 31, 15, 0))).toBe('2026-10-31')
  })

  it('早上 8 點前不會被算成前一天（UTC 仍是前一天）', () => {
    // 台灣 2026-11-01 07:30 = UTC 2026-10-31 23:30
    const earlyMorning = new Date('2026-10-31T23:30:00Z')
    expect(earlyMorning.toISOString().slice(0, 10)).toBe('2026-10-31') // 錯誤做法的結果
    expect(today(earlyMorning)).toBe('2026-11-01')
  })

  it('午夜剛過就換日', () => {
    // 台灣 2026-11-01 00:00:30
    expect(today(new Date('2026-10-31T16:00:30Z'))).toBe('2026-11-01')
    // 台灣 2026-10-31 23:59:59
    expect(today(new Date('2026-10-31T15:59:59Z'))).toBe('2026-10-31')
  })

  it('預設使用目前時間', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T05:00:00+08:00'))
    expect(today()).toBe('2027-01-01')
  })
})

describe('addDays()', () => {
  it('一般加減', () => {
    expect(addDays('2026-10-31', 0)).toBe('2026-10-31')
    expect(addDays('2026-10-10', 1)).toBe('2026-10-11')
    expect(addDays('2026-10-10', -3)).toBe('2026-10-07')
  })

  it('跨月', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('跨年', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-12-20', 15)).toBe('2027-01-04')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })

  it('二月與閏年', () => {
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })

  it('長間隔（複習間隔最長 30 天）', () => {
    expect(addDays('2026-10-31', 30)).toBe('2026-11-30')
    expect(addDays('2026-12-15', 30)).toBe('2027-01-14')
  })
})

describe('diffDays()', () => {
  it('to 較晚為正、較早為負、同日為 0', () => {
    expect(diffDays('2026-10-31', '2026-11-03')).toBe(3)
    expect(diffDays('2026-11-03', '2026-10-31')).toBe(-3)
    expect(diffDays('2026-10-31', '2026-10-31')).toBe(0)
  })

  it('跨年與閏年', () => {
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1)
    expect(diffDays('2028-01-01', '2029-01-01')).toBe(366)
  })

  it('與 addDays 互為反運算', () => {
    for (const n of [-40, -1, 0, 1, 2, 4, 7, 15, 30, 365]) {
      expect(diffDays('2026-10-31', addDays('2026-10-31', n))).toBe(n)
    }
  })
})

describe('formatShort()', () => {
  const base = '2026-10-31'

  it('今天／明天', () => {
    expect(formatShort('2026-10-31', base)).toBe('今天')
    expect(formatShort('2026-11-01', base)).toBe('明天')
  })

  it('其餘顯示 M/D（不補零）', () => {
    expect(formatShort('2026-11-03', base)).toBe('11/3')
    expect(formatShort('2026-10-28', base)).toBe('10/28')
    expect(formatShort('2026-10-30', base)).toBe('10/30')
    expect(formatShort('2027-01-05', base)).toBe('1/5')
  })

  it('預設以今天為基準', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-01T07:30:00+08:00'))
    expect(formatShort('2026-11-01')).toBe('今天')
    expect(formatShort('2026-11-02')).toBe('明天')
    vi.useRealTimers()
  })
})

describe('parseDate() / toDateString()', () => {
  it('互為反運算', () => {
    expect(toDateString(parseDate('2026-03-09'))).toBe('2026-03-09')
  })

  it('拒絕格式錯誤或不存在的日期', () => {
    expect(() => parseDate('2026-2-1')).toThrow()
    expect(() => parseDate('2027-02-29')).toThrow()
    expect(() => parseDate('2026-13-01')).toThrow()
  })
})
