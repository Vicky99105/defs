/** Display formatting. Every time is shown in UK time, whatever the browser's zone. */

const UK_TIME_ZONE = 'Europe/London'

const hourFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: UK_TIME_ZONE, weekday: 'short' })

const dayMonthFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIME_ZONE,
  day: 'numeric',
  month: 'short',
})

const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

/** "00:00" for an ISO instant, in UK time. */
export function formatUkTime(iso: string): string {
  return hourFormat.format(new Date(iso))
}

/** "Thu 15 Jan" for an ISO instant, in UK time. */
export function formatUkDay(iso: string): string {
  const d = new Date(iso)
  return `${weekdayFormat.format(d)} ${dayMonthFormat.format(d)}`
}

/** "Thu 15 Jan" for a calendar date "YYYY-MM-DD". Noon UTC avoids any zone edge. */
export function formatCalendarDate(date: string): string {
  return formatUkDay(`${date}T12:00:00Z`)
}

/** "Wed 09:30" for a publish time, in UK time. */
export function formatPublishTime(iso: string): string {
  const d = new Date(iso)
  return `${weekdayFormat.format(d)} ${hourFormat.format(d)}`
}

/** "15,828" */
export function formatMw(mw: number): string {
  return numberFormat.format(Math.round(mw))
}

/** "+1,904" or "−1,904" (true minus sign), "0" for zero. */
export function formatSignedMw(mw: number): string {
  const rounded = Math.round(mw)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${numberFormat.format(Math.abs(rounded))}`
}

/** "15.8" (GW, one decimal) */
export function formatGw(mw: number): string {
  return (mw / 1000).toFixed(1)
}

const hourNumberFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIME_ZONE,
  hour: 'numeric',
  hourCycle: 'h23',
})

const dayMonthYearFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** UK delivery hour 0..23 for an ISO instant. */
export function ukHour(iso: string): number {
  return Number(hourNumberFormat.format(new Date(iso))) % 24
}

/** "18:00" for an hour number. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** "Thu 15 Jan 2026" for a calendar date "YYYY-MM-DD". */
export function formatCalendarDateLong(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  return `${weekdayFormat.format(d)} ${dayMonthYearFormat.format(d)}`
}

/** "7 Jan" for a calendar date "YYYY-MM-DD". */
export function formatShortDate(date: string): string {
  return dayMonthFormat.format(new Date(`${date}T12:00:00Z`))
}

/** "7 to 13 Jan 2026", or "31 Dec 2025 to 6 Jan 2026" across a year. */
export function formatPeriod(from: string, to: string): string {
  const a = new Date(`${from}T12:00:00Z`)
  const b = new Date(`${to}T12:00:00Z`)
  if (from === to) return dayMonthYearFormat.format(b)
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear()
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth()
  const start = sameMonth ? String(a.getUTCDate()) : sameYear ? dayMonthFormat.format(a) : dayMonthYearFormat.format(a)
  return `${start} to ${dayMonthYearFormat.format(b)}`
}

/** "+1.2" or "−1.2" GW with a true minus sign. */
export function formatSignedGw(mw: number): string {
  const gw = Math.round(mw / 100) / 10
  const sign = gw > 0 ? '+' : gw < 0 ? '−' : ''
  return `${sign}${Math.abs(gw).toFixed(1)}`
}

/** "12:04" in UK time for a millisecond timestamp. */
export function formatClock(ms: number): string {
  return hourFormat.format(new Date(ms))
}
