import { describe, expect, it } from 'vitest'
import { today } from './date'
import {
  buildReviewQueue,
  compareForReview,
  initialSchedule,
  INTERVALS,
  remainingToday,
  schedule,
  type Level,
  type Schedulable,
} from './scheduler'

const T = '2026-11-13'

describe('新題排程', () => {
  it('等級 0、學習中、明天複習', () => {
    expect(initialSchedule(T)).toEqual({ level: 0, status: 'learning', nextReviewDate: '2026-11-14' })
  })

  it('早上 8 點前錄入不會被算成前一天（台灣 07:30 = UTC 前一天 23:30）', () => {
    const now = new Date(2026, 10, 13, 7, 30)
    expect(now.toISOString().slice(0, 10)).toBe('2026-11-12') // 錯誤做法會算錯
    expect(initialSchedule(today(now)).nextReviewDate).toBe('2026-11-14')
  })
})

describe('每個等級的作答結果', () => {
  const levels: Level[] = [0, 1, 2, 3, 4, 5]

  it.each(levels)('等級 %i 答錯 → 等級 0、明天', (level) => {
    expect(schedule(level, 'wrong', T)).toEqual({ level: 0, status: 'learning', nextReviewDate: '2026-11-14' })
  })

  it.each([
    [0, '2026-11-14'],
    [1, '2026-11-15'],
    [2, '2026-11-17'],
    [3, '2026-11-20'],
    [4, '2026-11-28'],
    [5, '2026-12-13'],
  ] as const)('等級 %i 猜的 → 等級不變、照原本間隔（%s）', (level, next) => {
    expect(schedule(level, 'guessed', T)).toEqual({ level, status: 'learning', nextReviewDate: next })
  })

  it.each([
    [0, 1, '2026-11-15'],
    [1, 2, '2026-11-17'],
    [2, 3, '2026-11-20'],
    [3, 4, '2026-11-28'],
    [4, 5, '2026-12-13'],
  ] as const)('等級 %i 有把握 → 等級 %i（%s）', (level, nextLevel, next) => {
    expect(schedule(level, 'sure', T)).toEqual({ level: nextLevel, status: 'learning', nextReviewDate: next })
  })

  it('等級 5 有把握 → 已掌握，不再排程', () => {
    expect(schedule(5, 'sure', T)).toEqual({ level: 5, status: 'mastered', nextReviewDate: null })
  })

  it('連續 6 次有把握：第 1、3、7、14、29、59 天複習後成為已掌握', () => {
    const start = '2026-01-01'
    let s = initialSchedule(start)
    const reviewDays: string[] = []
    while (s.status === 'learning') {
      const day = s.nextReviewDate!
      reviewDays.push(day)
      s = schedule(s.level, 'sure', day)
    }
    expect(reviewDays).toEqual(['2026-01-02', '2026-01-04', '2026-01-08', '2026-01-15', '2026-01-30', '2026-03-01'])
    expect(INTERVALS).toEqual([1, 2, 4, 7, 15, 30])
  })
})

describe('逾期題目', () => {
  it('答對時從「今天」起算，不是從原本的到期日', () => {
    // 原定 11/1 複習的等級 2 題目，拖到 11/13 才做
    expect(schedule(2, 'sure', T).nextReviewDate).toBe('2026-11-20')
    expect(schedule(2, 'guessed', T).nextReviewDate).toBe('2026-11-17')
  })
})

describe('跨月與跨年的日期加法', () => {
  it('跨月', () => {
    expect(schedule(4, 'sure', '2026-01-20').nextReviewDate).toBe('2026-02-19')
    expect(schedule(3, 'sure', '2026-02-20').nextReviewDate).toBe('2026-03-07') // 2026 非閏年
    expect(schedule(3, 'sure', '2028-02-20').nextReviewDate).toBe('2028-03-06') // 2028 閏年
  })

  it('跨年', () => {
    expect(schedule(0, 'wrong', '2026-12-31').nextReviewDate).toBe('2027-01-01')
    expect(schedule(4, 'sure', '2026-12-20').nextReviewDate).toBe('2027-01-19')
  })
})

describe('出題清單與每日上限', () => {
  const q = (id: string, nextReviewDate: string | null, level: number, createdAt: string, status: Schedulable['status'] = 'learning') => ({
    id,
    nextReviewDate,
    level,
    createdAt,
    status,
  })

  it('排序：逾期最久 → 等級最低 → 建立時間最早', () => {
    const list = [
      q('c', '2026-11-13', 0, '2026-11-01T00:00:00Z'),
      q('b', '2026-11-10', 2, '2026-11-01T00:00:00Z'),
      q('a', '2026-11-10', 1, '2026-11-02T00:00:00Z'),
      q('d', '2026-11-13', 0, '2026-10-01T00:00:00Z'),
    ]
    expect([...list].sort(compareForReview).map((x) => x.id)).toEqual(['a', 'b', 'd', 'c'])
  })

  it('只出學習中且已到期的題目，取前 limit 題，其餘順延', () => {
    const list = [
      q('future', '2026-11-14', 0, '2026-11-01T00:00:00Z'),
      q('mastered', null, 5, '2026-11-01T00:00:00Z', 'mastered'),
      q('d1', '2026-11-11', 0, '2026-11-01T00:00:00Z'),
      q('d2', '2026-11-12', 0, '2026-11-01T00:00:00Z'),
      q('d3', '2026-11-13', 0, '2026-11-01T00:00:00Z'),
    ]
    const { queue, deferred } = buildReviewQueue(list, T, 2)
    expect(queue.map((x) => x.id)).toEqual(['d1', 'd2'])
    expect(deferred).toBe(1)
  })

  it('每日上限扣掉今天已複習的題數', () => {
    expect(remainingToday(20, 0)).toBe(20)
    expect(remainingToday(20, 5)).toBe(15)
    expect(remainingToday(20, 25)).toBe(0)
  })
})
