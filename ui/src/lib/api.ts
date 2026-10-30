/**
 * Typed client for the Wind Desk API. Types mirror the HTTP contract in the build plan,
 * section 4.3. All times are ISO 8601 with offset. All power values are MW.
 * Every data call carries the session's bearer token; a 401 ends the session.
 */

import { clearSession, getSession, setSession, type Session } from './session'

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

async function errorFrom(response: Response): Promise<ApiError> {
  let message = `Request failed with HTTP ${response.status}`
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
      message = body.detail
    }
  } catch {
    // Keep the generic message when the body is not JSON.
  }
  return new ApiError(response.status, message)
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const token = getSession()?.token
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(`${API_BASE}${path}`, { signal, headers })
  if (!response.ok) {
    // An expired or rejected token: drop the session, which shows the sign-in page.
    if (response.status === 401) clearSession()
    throw await errorFrom(response)
  }
  return (await response.json()) as T
}

/** POST /api/auth/login. Stores the session on success; throws ApiError (401, 503) otherwise. */
export async function signIn(username: string, password: string): Promise<Session> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) throw await errorFrom(response)
  const body = (await response.json()) as { token: string; expiresAt: string }
  const session: Session = { token: body.token, expiresAt: body.expiresAt, username }
  setSession(session)
  return session
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
