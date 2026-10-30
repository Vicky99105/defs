import type { ReactNode } from 'react'

export type CardProps = {
  title: ReactNode
  /** Right side of the title row: a legend or a quiet meta line. */
  aside?: ReactNode
  /** Legend row under the title. Reserves two lines from sm up so sibling charts align. */
  legend?: ReactNode
  /** One-line, data-driven observation under the chart. */
  footer?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, aside, legend, footer, className = '', children }: CardProps) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5 ${className}`}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="m-0 text-[13px] font-semibold tracking-[-0.005em] text-ink">{title}</h2>
        {aside}
      </header>
      {legend ? <div className="-mt-1 mb-2 sm:min-h-[38px]">{legend}</div> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {footer ? <div className="mt-3 border-t border-line pt-3">{footer}</div> : null}
    </section>
  )
}
