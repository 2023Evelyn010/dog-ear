/**
 * 本地日期工具。全 App 的「日期」都是本地日曆上的 `YYYY-MM-DD` 字串，午夜換日。
 *
 * 不要用 `toISOString().slice(0, 10)`：那是 UTC 日期，台灣早上 8 點前會算成前一天。
 * 日期加減一律在本地日曆上做（setDate），不要用毫秒相加。
 */

/** 本地日期字串，格式 YYYY-MM-DD */
export type DateString = string

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 把 Date 轉為它在本地時區的日期字串 */
export function toDateString(d: Date): DateString {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 解析 YYYY-MM-DD 為本地時間當天中午（中午可避開任何日光節約時間的邊界） */
export function parseDate(s: DateString): Date {
  const m = DATE_RE.exec(s)
  if (!m) throw new Error(`Invalid date string: ${s}`)
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d, 12)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    throw new Error(`Invalid date string: ${s}`)
  }
  return date
}

/** 今天的本地日期。`now` 供測試注入。 */
export function today(now: Date = new Date()): DateString {
  return toDateString(now)
}

/** 在本地日曆上加 n 天（n 可為負） */
export function addDays(s: DateString, n: number): DateString {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

/** 從 `from` 到 `to` 相差幾天：to 較晚為正數。例如 diffDays('2026-10-31', '2026-11-03') === 3 */
export function diffDays(from: DateString, to: DateString): number {
  const a = parseDate(from)
  const b = parseDate(to)
  // 用兩個日期的日曆欄位計算，與時區、日光節約時間無關
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86_400_000)
}

/** 短日期顯示：今天→「今天」、明天→「明天」，其餘「11/3」。 */
export function formatShort(s: DateString, base: DateString = today()): string {
  const diff = diffDays(base, s)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  const d = parseDate(s)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
