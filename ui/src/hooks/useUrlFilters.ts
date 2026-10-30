import { useCallback, useSyncExternalStore } from 'react'

/** Dashboard filters. They live in the URL query, so a link reproduces the view. */
export type Filters = {
  /** Delivery date, "YYYY-MM-DD". */
  date: string
  /** Error-history window in days: 7, 14 or 30. */
  window: number
  /** UK delivery hour 0..23, or null for all hours. */
  hour: number | null
}

export const DEFAULT_FILTERS: Filters = { date: '2026-01-15', window: 7, hour: null }
export const WINDOW_OPTIONS = [7, 14, 30] as const

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parse(search: string): Filters {
  const q = new URLSearchParams(search)
  const date = q.get('date')
  const window = Number(q.get('window'))
  const hourRaw = q.get('hour')
  const hour = hourRaw === null || hourRaw === '' ? NaN : Number(hourRaw)
  return {
    date: date && DATE_PATTERN.test(date) ? date : DEFAULT_FILTERS.date,
    window: (WINDOW_OPTIONS as readonly number[]).includes(window) ? window : DEFAULT_FILTERS.window,
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null,
  }
}

function serialize(filters: Filters): string {
  const q = new URLSearchParams({ date: filters.date, window: String(filters.window) })
  if (filters.hour !== null) q.set('hour', String(filters.hour))
  return `?${q.toString()}`
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

const getSearch = () => window.location.search

export function useUrlFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const search = useSyncExternalStore(subscribe, getSearch)
  const filters = parse(search)

  const update = useCallback((patch: Partial<Filters>) => {
    const next = serialize({ ...parse(window.location.search), ...patch })
    if (next === window.location.search) return
    window.history.pushState(null, '', next)
    listeners.forEach((listener) => listener())
  }, [])

  return [filters, update]
}
