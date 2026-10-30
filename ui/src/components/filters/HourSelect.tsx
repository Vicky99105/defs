import { useId } from 'react'
import { formatHour } from '../../lib/format'
import { CONTROL_CLASS, FilterField } from './FilterField'

export type HourSelectProps = {
  /** UK hour 0..23, or null for all hours. */
  value: number | null
  onChange: (hour: number | null) => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function HourSelect({ value, onChange }: HourSelectProps) {
  const id = useId()
  return (
    <FilterField label="Hour" htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value === null ? '' : String(value)}
          onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
          className={`${CONTROL_CLASS} num cursor-pointer appearance-none pr-8`}
        >
          <option value="">All hours</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-3"
          fill="none"
          aria-hidden="true"
        >
          <path d="m4.5 6.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </FilterField>
  )
}
