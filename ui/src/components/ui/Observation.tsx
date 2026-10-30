import type { ReactNode } from 'react'

export type ObservationProps = {
  children: ReactNode
}

/** A one-line reading of the chart. Numbers inside <b> get the emphasis. */
export function Observation({ children }: ObservationProps) {
  return (
    <p className="num m-0 text-[12.5px] leading-5 text-ink-2 [&_b]:font-semibold [&_b]:text-ink">
      {children}
    </p>
  )
}
