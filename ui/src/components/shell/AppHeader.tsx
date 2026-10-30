import { ThemeToggle } from './ThemeToggle'

export type AppHeaderProps = {
  /** "Thu 15 Jan 2026" */
  deliveryLabel: string
  /** "Decision 11:00 UK, Wed 14 Jan", or null while loading. */
  decisionLabel: string | null
}

export function DecisionPill({ label }: { label: string | null }) {
  if (!label) return <span className="skeleton inline-block h-7 w-48 rounded-full" aria-hidden="true" />
  return (
    <span className="num inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[12px] font-medium whitespace-nowrap text-ink-2 shadow-card">
      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
      {label}
    </span>
  )
}

/** Page header of the main column: the delivery day and the decision it serves. */
export function AppHeader({ deliveryLabel, decisionLabel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">Delivery day</p>
          <h1 className="num m-0 text-[17px] leading-6 font-semibold tracking-[-0.015em] text-ink">{deliveryLabel}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <DecisionPill label={decisionLabel} />
          <span className="hidden lg:inline-flex">
            <ThemeToggle />
          </span>
        </div>
      </div>
    </header>
  )
}
