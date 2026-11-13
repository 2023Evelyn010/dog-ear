import { describe, expect, it } from 'vitest'
import { estimateMinutes, startOfLocalDay, streakDays, summarizeDay, weekStart } from './stats'

describe('預估時間', () => {
  it('每題 20 秒，無條件進位到分鐘', () => {
    expect(estimateMinutes(1)).toBe(1)
    expect(estimateMinutes(3)).toBe(1)
    expect(estimateMinutes(4)).toBe(2)
    expect(estimateMinutes(12)).toBe(4)
  })
})

describe('連續天數', () => {
  const T = '2026-11-13'
  it('今天已複習：從今天往回數', () => {
    expect(streakDays(['2026-11-13', '2026-11-12', '2026-11-11', '2026-11-09'], T)).toBe(3)
  })
  it('今天還沒複習：從昨天往回數，不中斷', () => {
    expect(streakDays(['2026-11-12', '2026-11-11'], T)).toBe(2)
  })
  it('昨天也沒複習：0', () => {
    expect(streakDays(['2026-11-11'], T)).toBe(0)
  })
  it('跨月', () => {
    expect(streakDays(['2026-12-01', '2026-11-30', '2026-11-29'], '2026-12-01')).toBe(3)
  })
})

describe('本週', () => {
  it('從星期一開始', () => {
    expect(weekStart('2026-11-13')).toBe('2026-11-09') // 週五
    expect(weekStart('2026-11-09')).toBe('2026-11-09') // 週一
    expect(weekStart('2026-11-15')).toBe('2026-11-09') // 週日
    expect(weekStart('2027-01-01')).toBe('2026-12-28') // 跨年
  })
  it('本地日期 00:00', () => {
    const d = startOfLocalDay('2026-11-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 9, 0])
  })
})

describe('完成畫面數據', () => {
  it('答對率 = 有把握 ÷ 完成題數；等級 5 有把握算新增已掌握', () => {
    const logs = [
      { questionId: 'a', result: 'sure' as const, levelBefore: 5, levelAfter: 5 },
      { questionId: 'b', result: 'sure' as const, levelBefore: 1, levelAfter: 2 },
      { questionId: 'c', result: 'guessed' as const, levelBefore: 2, levelAfter: 2 },
      { questionId: 'd', result: 'wrong' as const, levelBefore: 3, levelAfter: 0 },
    ]
    expect(summarizeDay(logs)).toEqual({ done: 4, accuracy: 50, newlyMastered: 1 })
    expect(summarizeDay([])).toEqual({ done: 0, accuracy: 0, newlyMastered: 0 })
  })
})
