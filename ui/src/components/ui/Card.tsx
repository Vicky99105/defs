import type { ReactNode } from 'react'

export type CardProps = {
  title: ReactNode
  aside?: ReactNode
  children: ReactNode
}

export function Card({ title, aside, children }: CardProps) {
  return (
    <section className="rounded-xl border border-line bg-surface px-5 py-4">
      <h2 className="m-0 mb-2 flex items-baseline justify-between gap-2 text-[15px] font-semibold">
        <span>{title}</span>
        {aside ? <small className="text-xs font-medium text-muted">{aside}</small> : null}
      </h2>
      {children}
    </section>
  )
}
