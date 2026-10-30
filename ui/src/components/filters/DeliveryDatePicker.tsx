import { useId } from 'react'

export type DeliveryDatePickerProps = {
  /** Selected delivery date, "YYYY-MM-DD". */
  value: string
  min: string
  max: string
  onChange: (date: string) => void
}

export function DeliveryDatePicker({ value, min, max, onChange }: DeliveryDatePickerProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-0.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-[0.04em] text-muted uppercase"
      >
        Delivery date
      </label>
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
        className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-ink"
      />
    </div>
  )
}
