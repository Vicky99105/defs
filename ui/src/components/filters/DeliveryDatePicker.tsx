import { useId } from 'react'
import { CONTROL_CLASS, FilterField } from './FilterField'

export type DeliveryDatePickerProps = {
  /** Selected delivery date, "YYYY-MM-DD". */
  value: string
  min: string
  max: string
  onChange: (date: string) => void
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function StepButton({ dir, disabled, onClick }: { dir: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? 'Previous day' : 'Next day'}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink-2 shadow-card transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
        <path
          d={dir < 0 ? 'M10 3.5 5.5 8l4.5 4.5' : 'M6 3.5 10.5 8 6 12.5'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export function DeliveryDatePicker({ value, min, max, onChange }: DeliveryDatePickerProps) {
  const id = useId()
  return (
    <FilterField label="Delivery date" htmlFor={id}>
      <div className="flex gap-1.5">
        <StepButton dir={-1} disabled={value <= min} onClick={() => onChange(shiftDate(value, -1))} />
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          required
          onChange={(event) => {
            const next = event.target.value
            // Ignore cleared or out-of-range input; the backend would answer 422 anyway.
            if (next && next >= min && next <= max) onChange(next)
          }}
          className={`${CONTROL_CLASS} num min-w-0`}
        />
        <StepButton dir={1} disabled={value >= max} onClick={() => onChange(shiftDate(value, 1))} />
      </div>
    </FilterField>
  )
}
