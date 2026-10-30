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
        className="grid h-10 gap-0.5 rounded-[10px] border border-side-line bg-side-raised p-[3px]"
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
              className={`num rounded-[7px] text-[12.5px] font-medium transition-colors ${
                active
                  ? 'bg-gold text-side'
                  : 'text-side-muted hover:text-side-ink'
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
