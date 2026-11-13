import { describe, expect, it } from 'vitest'
import { noDueText, upcomingText } from './copy'

describe('複習頁文案', () => {
  it('今天沒有到期', () => {
    expect(noDueText({ tomorrowCount: 5, nextDate: null, reviewedToday: 0 })).toBe('明天有 5 題，記得回來。')
    expect(noDueText({ tomorrowCount: 0, nextDate: '2026-11-16', reviewedToday: 0 })).toBe('下次複習在 11/16，記得回來。')
    expect(noDueText({ tomorrowCount: 0, nextDate: null, reviewedToday: 0 })).toBe('')
  })

  it('今日已複習完', () => {
    expect(noDueText({ tomorrowCount: 9, nextDate: null, reviewedToday: 3 })).toBe('今天的複習完成了！明天有 9 題。')
    expect(noDueText({ tomorrowCount: 0, nextDate: '2026-11-16', reviewedToday: 3 })).toBe('今天的複習完成了！下次複習在 11/16。')
    expect(noDueText({ tomorrowCount: 0, nextDate: null, reviewedToday: 3 })).toBe('今天的複習完成了！')
  })

  it('完成畫面', () => {
    expect(upcomingText({ tomorrowCount: 9, nextDate: null })).toBe('明天有 9 題')
    expect(upcomingText({ tomorrowCount: 0, nextDate: null })).toBeNull()
  })
})
