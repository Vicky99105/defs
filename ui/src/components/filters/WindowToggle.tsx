import { FilterField } from './FilterField'

export type WindowToggleProps = {
  /** Window in days. */
  value: number
  options: readonly number[]
  onChange: (days: number) => void
}

export function WindowToggle({ value, options, onChange }: WindowToggleProps) {
  return (
    <FilterField label="Error history" hint="max 30 days">
      <div
        role="radiogroup"
        aria-label="Error history window"
        className="grid h-8 rounded-md border border-line bg-surface-2 p-0.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((days) => {
          const active = days === value
          return (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(days)}
              className={`num rounded-[5px] text-[12.5px] font-medium transition-colors ${
                active
                  ? 'bg-surface text-accent-text shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--border)]'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {days} days
            </button>
          )
        })}
      </div>
    </FilterField>
  )
}
