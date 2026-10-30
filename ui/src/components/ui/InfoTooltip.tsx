import { useId, useState, type ReactNode } from 'react'

export type InfoTooltipProps = {
  /** Accessible name of the trigger, e.g. "About typical error". */
  label: string
  children: ReactNode
}

/** A small (i) trigger that reveals a definition on hover, focus or tap. */
export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className="grid size-4 cursor-help place-items-center rounded-full text-ink-3 transition-colors hover:text-ink-2"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
          <path d="M8 7.25v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="absolute top-full left-0 z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-line bg-surface p-3 text-[12px] leading-[1.55] font-normal text-ink-2 shadow-[0_8px_24px_rgb(0_0_0/0.10)]"
        >
          {children}
        </span>
      ) : null}
    </span>
  )
}
