import type { ReactNode } from 'react'

export type ObservationProps = {
  children: ReactNode
}

export function Observation({ children }: ObservationProps) {
  return (
    <p className="mt-2 mb-0 rounded-md border-l-[3px] border-brand bg-obs-bg px-3 py-2 text-[13px] [&_b]:font-mono [&_b]:font-semibold">
      {children}
    </p>
  )
}
