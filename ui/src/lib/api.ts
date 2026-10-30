/**
 * Typed client for the Wind Desk API. Types mirror the HTTP contract in the build plan,
 * section 4.3. All times are ISO 8601 with offset. All power values are MW.
 */

export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? 'http://localhost:8000').replace(
  /\/$/,
  '',
)

export type Meta = {
  minDeliveryDate: string
  maxDeliveryDate: string
  decisionTimeLocal: string
  timeZone: string
  windowsDays: number[]
}

export type Point = {
  startTime: string
  mw: number
}

export type ForecastSeries = {
  publishTime: string
  points: Point[]
}

export type DeliveryDaySummary = {
  peak: Point
  low: Point
  biggestRevision: Point
}

export type DeliveryDay = {
  deliveryDate: string
  decisionTime: string
  latest: ForecastSeries
  earlier: ForecastSeries[]
  summary: DeliveryDaySummary
}

/** A run of whole delivery days, "YYYY-MM-DD", both ends inclusive. */
export type Period = {
  from: string
  to: string
  days: number
}

export type AccuracyKpis = {
  /** Mean of |forecast - actual|. */
  typicalErrorMw: number
  /** Mean of (forecast - actual). Positive means the forecast ran above actual. */
  biasMw: number
  /** typicalErrorMw minus the previous period's. Null when there is no previous period. */
  trendMw: number | null
  previousTypicalErrorMw: number | null
}

export type AccuracyHour = {
  startTime: string
  forecastMw: number
  actualMw: number
  /** forecastMw - actualMw. Positive means the forecast ran above actual. */
  errorMw: number
}

export type LeadTimeBucket = {
  fromHours: number
  toHours: number
  typicalErrorMw: number
  count: number
}

export type Accuracy = {
  period: Period
  previousPeriod: Period | null
  kpis: AccuracyKpis
  hours: AccuracyHour[]
  leadTime: LeadTimeBucket[]
}

export type AccuracyParams = {
  date: string
  window: number
  /** UK hour 0..23. Omit for all hours. */
  hour?: number | null
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal })
  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}`
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        message = body.detail
      }
    } catch {
      // Keep the generic message when the body is not JSON.
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}

export function fetchMeta(signal?: AbortSignal): Promise<Meta> {
  return getJson<Meta>('/api/meta', signal)
}

export function fetchDeliveryDay(date: string, signal?: AbortSignal): Promise<DeliveryDay> {
  return getJson<DeliveryDay>(`/api/delivery-day?date=${encodeURIComponent(date)}`, signal)
}

export function fetchAccuracy(
  { date, window, hour }: AccuracyParams,
  signal?: AbortSignal,
): Promise<Accuracy> {
  const query = new URLSearchParams({ date, window: String(window) })
  if (hour != null) query.set('hour', String(hour))
  return getJson<Accuracy>(`/api/accuracy?${query.toString()}`, signal)
}
