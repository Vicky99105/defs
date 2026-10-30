import { setThemePreference, useTheme, type ThemePreference } from '../../hooks/useTheme'

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  {
    value: 'light',
    label: 'Light theme',
    icon: 'M8 2.5v1M8 12.5v1M13.5 8h-1M3.5 8h-1M11.9 4.1l-.7.7M4.8 11.2l-.7.7M11.9 11.9l-.7-.7M4.8 4.8l-.7-.7M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  },
  { value: 'dark', label: 'Dark theme', icon: 'M13 9.6A5.5 5.5 0 0 1 6.4 3 5.5 5.5 0 1 0 13 9.6Z' },
  { value: 'system', label: 'System theme', icon: 'M2.5 3.5h11v7.5h-11zM6 13.5h4M8 11v2.5' },
]

export function ThemeToggle() {
  const { preference } = useTheme()
  return (
    <div role="radiogroup" aria-label="Theme" className="flex h-7 items-center rounded-md border border-line bg-surface-2 p-0.5">
      {OPTIONS.map((option) => {
        const active = option.value === preference
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setThemePreference(option.value)}
            className={`grid h-full w-7 place-items-center rounded-[5px] transition-colors ${
              active ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--border)]' : 'text-ink-3 hover:text-ink'
            }`}
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
              <path d={option.icon} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
