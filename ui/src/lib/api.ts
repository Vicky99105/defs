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
