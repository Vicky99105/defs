import { ThemeToggle } from './ThemeToggle'
import { WindMark } from './WindMark'

export type AppHeaderProps = {
  /** "Thu 15 Jan 2026" */
  deliveryLabel: string
  /** "Decision 11:00 UK, Wed 14 Jan", or null while loading. */
  decisionLabel: string | null
}

export function DecisionPill({ label }: { label: string | null }) {
  if (!label) return <span className="skeleton inline-block h-6 w-44 rounded-full" aria-hidden="true" />
  return (
    <span className="num inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 text-[11.5px] font-medium whitespace-nowrap text-ink-2">
      <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
      {label}
    </span>
  )
}

export function AppHeader({ deliveryLabel, decisionLabel }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2 text-ink no-underline" aria-label="Wind Desk home">
          <WindMark />
          <span className="text-[14px] font-semibold tracking-[-0.01em]">Wind Desk</span>
        </a>
        <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
        <h1 className="num m-0 hidden text-[14px] font-medium text-ink-2 sm:block">{deliveryLabel}</h1>
        <span className="hidden md:inline-flex">
          <DecisionPill label={decisionLabel} />
        </span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
