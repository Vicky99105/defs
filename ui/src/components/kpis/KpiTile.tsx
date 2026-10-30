import type { ReactNode } from 'react'
import { InfoTooltip } from '../ui/InfoTooltip'

export type KpiTileProps = {
  label: string
  /** Big value, already formatted, without unit. Null renders "n/a". */
  value: string | null
  unit?: string
  /** Arrow or sign glyph before the value, with its own colour. */
  prefix?: ReactNode
  caption: ReactNode
  definition: ReactNode
}

export function KpiTile({ label, value, unit = 'GW', prefix, caption, definition }: KpiTileProps) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-card sm:px-5">
      <div className="relative flex items-center gap-1.5">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        <InfoTooltip label={`About ${label.toLowerCase()}`}>{definition}</InfoTooltip>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        {value === null ? (
          <span className="text-[26px] leading-8 font-semibold tracking-[-0.02em] text-ink-3">n/a</span>
        ) : (
          <>
            {prefix}
            <span className="text-[26px] leading-8 font-semibold tracking-[-0.02em] text-ink">{value}</span>
            <span className="text-[13px] font-medium text-ink-3">{unit}</span>
          </>
        )}
      </div>
      <p className="num m-0 mt-1 truncate text-[12px] text-ink-3">{caption}</p>
    </div>
  )
}
