import type { ReviewOverview } from '../../db/review'
import { formatShort } from '../../lib/date'

type Upcoming = Pick<ReviewOverview, 'tomorrowCount' | 'nextDate'>

/** 明天有幾題；明天沒有時給下一個有題目的日期；都沒有排程時為 null */
export function upcomingText(o: Upcoming): string | null {
  if (o.tomorrowCount > 0) return `明天有 ${o.tomorrowCount} 題`
  if (o.nextDate) return `下次複習在 ${formatShort(o.nextDate)}`
  return null
}

/** 「今天沒有到期」與「今日已複習完」卡片的說明 */
export function noDueText(o: Upcoming & { reviewedToday: number }): string {
  const upcoming = upcomingText(o)
  if (o.reviewedToday > 0) return upcoming ? `今天的複習完成了！${upcoming}。` : '今天的複習完成了！'
  return upcoming ? `${upcoming}，記得回來。` : ''
}
