/**
 * Pure helpers that turn API numbers into what the charts highlight and what the
 * observation lines say. Wording lives in the UI; numbers come from the backend.
 */
import type { AccuracyHour, DeliveryDay, ForecastSeries, LeadTimeBucket, Point } from './api'
import { formatShortDate, formatUkTime, ukHour } from './format'

/** Similar-forecast band: within this many MW of the selected hour's decision forecast. */
export const SIMILAR_BAND_MW = 1000

/** Lead times the trader buys on: forecasts made 12 to 42 hours before delivery. */
export const BUY_LEAD_FROM_H = 12
export const BUY_LEAD_TO_H = 42

export function isBuyLead(bucket: Pick<LeadTimeBucket, 'fromHours' | 'toHours'>): boolean {
  return bucket.fromHours >= BUY_LEAD_FROM_H && bucket.toHours <= BUY_LEAD_TO_H
}

export function pointAtHour(series: ForecastSeries, hour: number): Point | undefined {
  return series.points.find((p) => ukHour(p.startTime) === hour)
}

/** The earliest pre-cutoff forecast for an hour, or undefined if only the decision one exists. */
export function firstForecastAtHour(day: DeliveryDay, hour: number): { publishTime: string; mw: number } | undefined {
  const versions = [...day.earlier].sort((a, b) => a.publishTime.localeCompare(b.publishTime))
  for (const version of versions) {
    const point = pointAtHour(version, hour)
    if (point) return { publishTime: version.publishTime, mw: point.mw }
  }
  return undefined
}

export type SimilarMarker = { mw: number; label: string }

export type SimilarRange = {
  lo: number
  hi: number
  /** Dashed reference lines on the scatter: one for an hour, two (low, high) for a whole day. */
  markers: SimilarMarker[]
}

/**
 * Which past hours count as "similar" on the scatter.
 * With an hour selected: within 1,000 MW of that hour's decision forecast.
 * With all hours: between the day's lowest and highest hourly decision forecast.
 */
export function similarRange(day: DeliveryDay, hour: number | null): SimilarRange | null {
  const points = day.latest.points
  if (points.length === 0) return null
  const dayLabel = formatShortDate(day.deliveryDate)
  const markerLabel = (p: Point) => `${dayLabel} ${formatUkTime(p.startTime)} · ${Math.round(p.mw).toLocaleString('en-GB')} MW`
  if (hour !== null) {
    const point = pointAtHour(day.latest, hour)
    if (!point) return null
    return {
      lo: point.mw - SIMILAR_BAND_MW,
      hi: point.mw + SIMILAR_BAND_MW,
      markers: [{ mw: point.mw, label: markerLabel(point) }],
    }
  }
  const low = points.reduce((a, b) => (b.mw < a.mw ? b : a))
  const high = points.reduce((a, b) => (b.mw > a.mw ? b : a))
  return {
    lo: low.mw,
    hi: high.mw,
    markers: [
      { mw: low.mw, label: markerLabel(low) },
      { mw: high.mw, label: markerLabel(high) },
    ],
  }
}

export function isSimilar(row: AccuracyHour, range: SimilarRange): boolean {
  return row.forecastMw >= range.lo && row.forecastMw <= range.hi
}

export type SimilarSummary = {
  count: number
  /** Hours where the actual came in below the forecast. */
  belowForecast: number
  /** Mean of (forecast - actual) over the similar hours. Positive: forecast above actual. */
  meanGapMw: number
}

export function summariseSimilar(rows: AccuracyHour[], range: SimilarRange): SimilarSummary | null {
  const similar = rows.filter((r) => isSimilar(r, range))
  if (similar.length === 0) return null
  return {
    count: similar.length,
    belowForecast: similar.filter((r) => r.actualMw < r.forecastMw).length,
    meanGapMw: similar.reduce((sum, r) => sum + r.errorMw, 0) / similar.length,
  }
}

export type LeadTimeSummary = {
  /** Count-weighted typical error over the 12 to 42 h buckets. */
  buyMw: number | null
  /** Typical error of the 0 to 6 h bucket. */
  shortestMw: number | null
}

export function summariseLeadTime(buckets: LeadTimeBucket[]): LeadTimeSummary {
  const buy = buckets.filter(isBuyLead)
  const buyCount = buy.reduce((n, b) => n + b.count, 0)
  const shortest = buckets.find((b) => b.fromHours === 0)
  return {
    buyMw: buyCount > 0 ? buy.reduce((sum, b) => sum + b.typicalErrorMw * b.count, 0) / buyCount : null,
    shortestMw: shortest ? shortest.typicalErrorMw : null,
  }
}

/** Rows where the forecast ran above actual. */
export function countAbove(rows: AccuracyHour[]): number {
  return rows.filter((r) => r.errorMw > 0).length
}
