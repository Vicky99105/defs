import { useMemo, useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'wind-desk-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Storage can be blocked (private mode). Fall back to the OS setting.
  }
  return 'system'
}

let preference: ThemePreference = readPreference()

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return media.matches ? 'dark' : 'light'
  return pref
}

let snapshot = { preference, resolved: resolve(preference) }

function apply() {
  snapshot = { preference, resolved: resolve(preference) }
  // index.html sets the same attribute before first paint; keep it in step from here on.
  document.documentElement.setAttribute('data-theme', snapshot.resolved)
  listeners.forEach((listener) => listener())
}

media.addEventListener('change', () => {
  if (preference === 'system') apply()
})

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, () => snapshot)
}

/** Resolved colour tokens for canvas charts, which cannot read CSS variables themselves. */
export type ChartTheme = {
  mode: ResolvedTheme
  surface: string
  text: string
  text2: string
  text3: string
  border: string
  grid: string
  accent: string
  accentFaint: string
  earlier: string
  neutralDot: string
  above: string
  below: string
  amber: string
  tooltipBg: string
}

export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme()
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    const v = (name: string) => style.getPropertyValue(name).trim()
    return {
      mode: resolved,
      surface: v('--surface'),
      text: v('--text'),
      text2: v('--text-2'),
      text3: v('--text-3'),
      border: v('--border'),
      grid: v('--grid'),
      accent: v('--accent'),
      accentFaint: v('--accent-faint'),
      earlier: v('--earlier'),
      neutralDot: v('--neutral-dot'),
      above: v('--above'),
      below: v('--below'),
      amber: v('--amber'),
      tooltipBg: v('--tooltip-bg'),
    }
  }, [resolved])
}
