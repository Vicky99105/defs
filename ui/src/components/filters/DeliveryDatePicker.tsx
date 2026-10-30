import { useId, useRef } from 'react'
import { formatCalendarDate, formatCalendarDateLong } from '../../lib/format'
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
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink-2 shadow-card transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
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

/**
 * Shows the date as "Thu 15 Jan" rather than the browser's locale format.
 * A visually hidden native date input still supplies the calendar.
 */
export function DeliveryDatePicker({ value, min, max, onChange }: DeliveryDatePickerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <FilterField label="Delivery date" htmlFor={id}>
      <div className="flex gap-1.5">
        <StepButton dir={-1} disabled={value <= min} onClick={() => onChange(shiftDate(value, -1))} />
        <div className="relative min-w-0 flex-1">
          <button
            id={id}
            type="button"
            onClick={() => inputRef.current?.showPicker?.()}
            aria-label={`Delivery date, ${formatCalendarDateLong(value)}. Open calendar`}
            className={`${CONTROL_CLASS} num flex items-center justify-between gap-2 text-left font-medium`}
          >
            <span className="truncate">{formatCalendarDate(value)}</span>
            <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink-3" fill="none" aria-hidden="true">
              <rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="date"
            value={value}
            min={min}
            max={max}
            required
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const next = event.target.value
              // Ignore cleared or out-of-range input; the backend would answer 422 anyway.
              if (next && next >= min && next <= max) onChange(next)
            }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-0 opacity-0"
          />
        </div>
        <StepButton dir={1} disabled={value >= max} onClick={() => onChange(shiftDate(value, 1))} />
      </div>
    </FilterField>
  )
}
