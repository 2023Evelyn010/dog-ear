import { describe, expect, it } from 'vitest'
import type { ErrorTag, Part } from '../../db/schema'
import {
  CLEARED_FILTER,
  DEFAULT_FILTER,
  filterQuestions,
  filterTagOptions,
  isInTodayReview,
  logDateText,
  logResultText,
  partFilterLabel,
  progressText,
  questionSubtitle,
  questionTitle,
  sortQuestions,
  tagFilterLabel,
  tagNameMap,
} from './listing'

const tag = (id: string, name: string, order: number, archived = false): ErrorTag => ({ id, name, order, archived, isDefault: false })
const tags = [tag('g', '文法', 2), tag('v', '單字', 0), tag('c', '搭配詞', 1), tag('x', '舊錯因', 3, true), tag('y', '沒用到', 4, true)]
const names = tagNameMap(tags)

const q = (o: Partial<{ part: Part; errorTagIds: string[]; status: 'learning' | 'mastered'; createdAt: string; nextReviewDate: string | null }>) => ({
  part: 5 as Part,
  errorTagIds: ['v'],
  status: 'learning' as const,
  createdAt: '2026-11-10T01:00:00.000Z',
  nextReviewDate: '2026-11-14' as string | null,
  ...o,
})

describe('篩選', () => {
  const list = [
    q({ part: 5, errorTagIds: ['v', 'g'] }),
    q({ part: 6, errorTagIds: ['c'] }),
    q({ part: 7, errorTagIds: ['g'], status: 'mastered', nextReviewDate: null }),
  ]

  it('預設只顯示學習中', () => {
    expect(filterQuestions(list, DEFAULT_FILTER)).toHaveLength(2)
    expect(filterQuestions(list, CLEARED_FILTER)).toHaveLength(3)
  })

  it('Part 可多選', () => {
    expect(filterQuestions(list, { ...CLEARED_FILTER, parts: [5, 7] }).map((x) => x.part)).toEqual([5, 7])
  })

  it('錯因多選：有其中任一個就符合', () => {
    expect(filterQuestions(list, { ...CLEARED_FILTER, tagIds: ['v'] })).toHaveLength(1)
    expect(filterQuestions(list, { ...CLEARED_FILTER, tagIds: ['v', 'c'] }).map((x) => x.part)).toEqual([5, 6])
    expect(filterQuestions(list, { ...CLEARED_FILTER, tagIds: ['g'], status: 'mastered' }).map((x) => x.part)).toEqual([7])
  })
})

describe('排序', () => {
  const a = q({ createdAt: '2026-11-01T00:00:00.000Z', nextReviewDate: '2026-11-20' })
  const b = q({ createdAt: '2026-11-05T00:00:00.000Z', nextReviewDate: null, status: 'mastered' })
  const c = q({ createdAt: '2026-11-03T00:00:00.000Z', nextReviewDate: '2026-11-14' })
  const d = q({ createdAt: '2026-11-04T00:00:00.000Z', nextReviewDate: '2026-11-14' })

  it('依新增日期：新到舊', () => {
    expect(sortQuestions([a, b, c, d], 'created')).toEqual([b, d, c, a])
  })

  it('依下次複習：近到遠，已掌握排最後，同一天新到舊', () => {
    expect(sortQuestions([a, b, c, d], 'next')).toEqual([d, c, a, b])
  })
})

describe('列表文案', () => {
  it('標題依錯因手動排序；猜對加前綴', () => {
    expect(questionTitle({ part: 5, errorTagIds: ['g', 'v'], myAnswer: 'B', correctAnswer: 'D' }, names)).toBe('Part 5・單字、文法')
    expect(questionTitle({ part: 5, errorTagIds: ['v'], myAnswer: 'C', correctAnswer: 'C' }, names)).toBe('Part 5・猜對・單字')
    expect(questionTitle({ part: 7, errorTagIds: ['x'], myAnswer: 'blank', correctAnswer: 'A' }, names)).toBe('Part 7・舊錯因')
  })

  it('副標：今天／明天／日期；逾期顯示今天；已掌握', () => {
    const today = '2026-11-13'
    expect(questionSubtitle({ status: 'learning', nextReviewDate: '2026-11-14', level: 2 }, today)).toBe('下次複習：明天・等級 2')
    expect(questionSubtitle({ status: 'learning', nextReviewDate: '2026-11-13', level: 0 }, today)).toBe('下次複習：今天・等級 0')
    expect(questionSubtitle({ status: 'learning', nextReviewDate: '2026-11-08', level: 1 }, today)).toBe('下次複習：今天・等級 1')
    expect(questionSubtitle({ status: 'learning', nextReviewDate: '2026-12-03', level: 3 }, today)).toBe('下次複習：12/3・等級 3')
    expect(questionSubtitle({ status: 'mastered', nextReviewDate: null, level: 5 }, today)).toBe('已掌握')
  })

  it('篩選按鈕文字', () => {
    expect(partFilterLabel([])).toBe('Part')
    expect(partFilterLabel([7, 5])).toBe('Part 5、7')
    expect(tagFilterLabel([], names)).toBe('錯因')
    expect(tagFilterLabel(['g', 'v'], names)).toBe('單字、文法')
    expect(tagFilterLabel(['g', 'v', 'c'], names)).toBe('錯因 3')
  })

  it('篩選面板的錯因：使用中依手動排序，接著有題目在用的封存錯因', () => {
    expect(filterTagOptions(tags, [{ errorTagIds: ['x'] }]).map((t) => t.id)).toEqual(['v', 'c', 'g', 'x'])
  })
})

describe('詳情文案', () => {
  it('複習進度', () => {
    expect(progressText({ status: 'learning', nextReviewDate: '2026-11-16', level: 2 }, '2026-11-13')).toBe('複習進度：等級 2・下次複習 11/16')
    expect(progressText({ status: 'mastered', nextReviewDate: null, level: 5 }, '2026-11-13')).toBe('複習進度：已掌握')
  })

  it('作答紀錄', () => {
    expect(logDateText('2026-10-28')).toBe('10/28')
    expect(logResultText({ answer: 'B', result: 'wrong' })).toBe('答錯（選 B）')
    expect(logResultText({ answer: 'unknown', result: 'wrong' })).toBe('不會')
    expect(logResultText({ answer: 'C', result: 'sure' })).toBe('答對・有把握')
    expect(logResultText({ answer: 'C', result: 'guessed' })).toBe('答對・猜的')
  })

  it('已經在今日複習的題目不能再加入', () => {
    expect(isInTodayReview({ status: 'learning', nextReviewDate: '2026-11-13' }, '2026-11-13')).toBe(true)
    expect(isInTodayReview({ status: 'learning', nextReviewDate: '2026-11-10' }, '2026-11-13')).toBe(true)
    expect(isInTodayReview({ status: 'learning', nextReviewDate: '2026-11-14' }, '2026-11-13')).toBe(false)
    expect(isInTodayReview({ status: 'mastered', nextReviewDate: null }, '2026-11-13')).toBe(false)
  })
})
