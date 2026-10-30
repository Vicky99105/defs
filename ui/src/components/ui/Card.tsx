import type { ReactNode } from 'react'

export type CardProps = {
  title: ReactNode
  /** One quiet line under the title saying what the chart plots. */
  subtitle?: ReactNode
  /** Right side of the title row: a legend or a quiet meta line. */
  aside?: ReactNode
  /** Legend row under the title. Reserves two lines from sm up so sibling charts align. */
  legend?: ReactNode
  /** One-line, data-driven observation in a tinted strip under the chart. */
  footer?: ReactNode
  className?: string
  children: ReactNode
}

/** Shared surface for KPI tiles, chart cards and skeletons. */
export const SURFACE_CLASS = 'rounded-[14px] border border-line bg-surface shadow-card'

export function Card({ title, subtitle, aside, legend, footer, className = '', children }: CardProps) {
  return (
    <section className={`flex min-w-0 flex-col overflow-hidden ${SURFACE_CLASS} ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <header className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="m-0 text-[13.5px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
            {subtitle ? <p className="num m-0 mt-0.5 text-[12px] text-ink-3">{subtitle}</p> : null}
          </div>
          {aside}
        </header>
        {legend ? <div className="mb-2 sm:min-h-[38px]">{legend}</div> : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {footer ? <div className="border-t border-line bg-surface-2 px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  )
}
