import type { ReactNode } from 'react'
import { ProfileMenu } from './ProfileMenu'
import { ThemeToggle } from './ThemeToggle'
import { WindMark } from './WindMark'

export type SidebarFact = { label: string; value: string }

export type SidebarSection = {
  title: string
  /** Quiet note on the right of the title, e.g. "max 30 days". */
  hint?: string
  content: ReactNode
}

export type SidebarProps = {
  /** Filter groups, each in its own padded section. */
  sections: SidebarSection[]
  /** Facts about the selected decision, or null while loading. Desktop only. */
  facts: SidebarFact[] | null
  /** Signed-in username, shown in the profile menu with Sign out. */
  username: string
  onSignOut: () => void
}

function Section({ title, hint, children, className = '' }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`border-b border-side-line px-4 py-5 sm:px-6 lg:py-6 ${className}`}>
      <div className="mb-3.5 flex items-baseline justify-between gap-2">
        <h2 className="m-0 text-[10.5px] font-semibold tracking-[0.14em] text-side-muted uppercase">{title}</h2>
        {hint ? <span className="text-[11px] text-side-muted opacity-80">{hint}</span> : null}
      </div>
      {children}
    </section>
  )
}

/** App rail: brand, filter sections, decision facts and a profile menu. Becomes a top block below lg. */
export function Sidebar({ sections, facts, username, onSignOut }: SidebarProps) {
  return (
    <aside
      aria-label="Filters"
      className="border-b border-side-line bg-side text-side-ink [color-scheme:dark] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[280px] lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0"
    >
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-side-line px-4 sm:px-6">
        <a href="/" className="flex items-center gap-3 text-side-ink no-underline" aria-label="Wind Desk home">
          <WindMark className="size-9" />
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Wind Desk</span>
            <span className="text-[11px] tracking-[0.04em] text-side-muted">GB day-ahead wind</span>
          </span>
        </a>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <ThemeToggle tone="side" />
          <ProfileMenu username={username} onSignOut={onSignOut} placement="down" showName={false} />
        </div>
      </div>

      <div className="sm:grid sm:grid-cols-2 lg:block lg:flex-1 lg:overflow-y-auto">
        {sections.map((section) => (
          <Section key={section.title} title={section.title} hint={section.hint}>
            <div className="flex flex-col gap-4">{section.content}</div>
          </Section>
        ))}

        <Section title="Decision" className="hidden border-b-0 lg:block">
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
              <span className="skeleton h-3.5 w-full opacity-20" />
              <span className="skeleton h-3.5 w-full opacity-20" />
              <span className="skeleton h-3.5 w-4/5 opacity-20" />
            </div>
          )}
        </Section>
      </div>

      <div className="hidden shrink-0 border-t border-side-line px-3 py-2 lg:block">
        <ProfileMenu username={username} onSignOut={onSignOut} placement="up" />
      </div>
    </aside>
  )
}
