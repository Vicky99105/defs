import type { ReactNode } from 'react'
import { SURFACE_CLASS } from './Card'

export type StateCardProps = {
  tone: 'empty' | 'error'
  title: string
  detail?: ReactNode
  action?: { label: string; onClick: () => void }
  className?: string
}

/** Full-width message card for empty history and upstream failures. */
export function StateCard({ tone, title, detail, action, className = '' }: StateCardProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${SURFACE_CLASS} ${className}`}
    >
      <span className="grid size-9 place-items-center rounded-full border border-line bg-surface-2 text-ink-3">
        {tone === 'error' ? (
          <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
            <path d="M10 6.5v4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10" cy="13.6" r="0.95" fill="currentColor" />
            <path
              d="M8.7 3.2a1.5 1.5 0 0 1 2.6 0l6 10.6a1.5 1.5 0 0 1-1.3 2.2H4a1.5 1.5 0 0 1-1.3-2.2l6-10.6Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 8h14M7 2.5v3M13 2.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <div>
        <p className="m-0 text-[13px] font-medium text-ink">{title}</p>
        {detail ? <p className="m-0 mt-1 text-[12.5px] text-ink-3">{detail}</p> : null}
      </div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 h-8 rounded-md border border-line-strong bg-surface px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-hover"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
