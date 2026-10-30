import type { ReactNode } from 'react'

export type FilterFieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}

/** A filter group: small uppercase label, optional quiet hint, then the control. */
export function FilterField({ label, htmlFor, hint, children }: FilterFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[10.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
          {label}
        </label>
        {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

/** Shared look for inputs and selects. */
export const CONTROL_CLASS =
  'h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink shadow-card transition-colors hover:border-line-strong focus-visible:border-accent'
