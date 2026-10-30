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
