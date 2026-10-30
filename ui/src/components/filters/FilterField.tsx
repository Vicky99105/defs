import type { ReactNode } from 'react'

export type FilterFieldProps = {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}

/** A filter group on the dark sidebar: a quiet label, optional hint, then the control. */
export function FilterField({ label, htmlFor, hint, children }: FilterFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[12px] text-side-muted">
          {label}
        </label>
        {hint ? <span className="text-[11px] text-side-muted opacity-80">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

/** Shared look for inputs and selects. */
export const CONTROL_CLASS =
  'h-10 w-full rounded-[10px] border border-side-line bg-side-raised px-3 text-[13.5px] font-medium text-side-ink transition-colors hover:border-side-muted focus-visible:border-gold'
