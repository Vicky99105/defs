import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { WindMark } from './WindMark'

export type SidebarFact = { label: string; value: string }

export type SidebarProps = {
  /** The filter controls, stacked on desktop and in a row on tablets. */
  filters: ReactNode
  /** Facts about the selected decision, or null while loading. Desktop only. */
  facts: SidebarFact[] | null
  /** Data source line pinned to the bottom on desktop. */
  footer: ReactNode
  /** Signed-in username, shown with a sign-out button. */
  username: string
  onSignOut: () => void
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      aria-label="Sign out"
      className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-side-line px-2.5 text-[12px] font-medium text-side-muted transition-colors hover:border-side-muted hover:text-side-ink"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
        <path
          d="M6.5 3H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 13h2.5M10 5.5 12.5 8 10 10.5M12.5 8H6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Sign out</span>
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="m-0 mb-3.5 text-[10.5px] font-semibold tracking-[0.14em] text-side-muted uppercase">{children}</p>
}

/** App rail: brand, filters and decision facts. Becomes a top block below lg. */
export function Sidebar({ filters, facts, footer, username, onSignOut }: SidebarProps) {
  return (
    <aside
      aria-label="Filters"
      className="border-b border-side-line bg-side text-side-ink [color-scheme:dark] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[280px] lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0"
    >
      <div className="flex h-[72px] items-center gap-3 border-b border-side-line px-4 sm:px-6">
        <a href="/" className="flex items-center gap-3 text-side-ink no-underline" aria-label="Wind Desk home">
          <WindMark className="size-9" />
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Wind Desk</span>
            <span className="text-[11px] tracking-[0.04em] text-side-muted">GB day-ahead wind</span>
          </span>
        </a>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle tone="side" />
          <SignOutButton onSignOut={onSignOut} />
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 lg:flex-1 lg:overflow-y-auto lg:py-7">
        <div className="hidden lg:block">
          <SectionLabel>Filters</SectionLabel>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:flex-col lg:gap-5">{filters}</div>

        <div className="mt-8 hidden border-t border-side-line pt-7 lg:block">
          <SectionLabel>Decision</SectionLabel>
          {facts ? (
            <dl className="m-0 flex flex-col gap-2.5">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <dt className="text-side-muted">{fact.label}</dt>
                  <dd className="num m-0 text-right font-medium text-side-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="flex flex-col gap-3" aria-hidden="true">
              <span className="skeleton h-3.5 opacity-20 w-full" />
              <span className="skeleton h-3.5 opacity-20 w-full" />
              <span className="skeleton h-3.5 opacity-20 w-4/5" />
            </div>
          )}
        </div>
      </div>

      <div className="hidden border-t border-side-line px-6 py-5 lg:block">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full border border-gold bg-side-raised text-[12px] font-semibold text-gold uppercase"
              aria-hidden="true"
            >
              {username.slice(0, 1)}
            </span>
            <span className="truncate text-[13px] font-medium text-side-ink">{username}</span>
          </span>
          <SignOutButton onSignOut={onSignOut} />
        </div>
        {footer}
      </div>
    </aside>
  )
}
