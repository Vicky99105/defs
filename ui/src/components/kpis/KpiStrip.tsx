import type { AccuracyKpis, Period } from '../../lib/api'
import { formatGw } from '../../lib/format'
import { KpiTile } from './KpiTile'

export type KpiStripProps = {
  kpis: AccuracyKpis
  previousPeriod: Period | null
}

function Arrow({ up, className }: { up: boolean; className: string }) {
  return (
    <span className={`text-[15px] leading-9 ${className}`} aria-hidden="true">
      {up ? '▲' : '▼'}
    </span>
  )
}

function Definition({ text, example }: { text: string; example: [string, string] }) {
  return (
    <>
      <span className="block text-ink">{text}</span>
      <span className="mt-2 block text-ink-3">
        {example[0]}
        <br />
        {example[1]}
      </span>
    </>
  )
}

export function KpiStrip({ kpis, previousPeriod }: KpiStripProps) {
  const { typicalErrorMw, biasMw, trendMw, previousTypicalErrorMw } = kpis
  const biasUp = biasMw > 0
  const trend =
    trendMw !== null && previousTypicalErrorMw !== null && previousPeriod !== null
      ? { mw: trendMw, previousMw: previousTypicalErrorMw, days: previousPeriod.days }
      : null
  const trendUp = trend !== null && trend.mw > 0

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiTile
        label="Typical error"
        value={formatGw(typicalErrorMw)}
        caption="average miss per hour"
        definition={
          <Definition
            text="Mean of |forecast minus actual| over every past hour. Direction is ignored, so misses never cancel."
            example={['Example: 2 GW too high, then 2 GW too low.', 'Typical error = 2 GW.']}
          />
        }
      />
      <KpiTile
        label="Forecast bias"
        value={formatGw(Math.abs(biasMw))}
        prefix={
          Math.round(biasMw / 100) !== 0 ? (
            <Arrow up={biasUp} className="text-ink-3" />
          ) : undefined
        }
        caption="▲ above actual · ▼ below"
        definition={
          <Definition
            text="Mean of (forecast minus actual), keeping the sign. What is left after highs and lows cancel is the lean."
            example={['Example: 2 GW too high, then 2 GW too low.', 'Bias = 0 GW.']}
          />
        }
      />
      <KpiTile
        label="Error trend"
        value={trend ? formatGw(Math.abs(trend.mw)) : null}
        prefix={
          trend && Math.round(trend.mw / 100) !== 0 ? (
            <Arrow up={trendUp} className={trendUp ? 'text-above-text' : 'text-below-text'} />
          ) : undefined
        }
        caption={
          trend
            ? `vs previous ${trend.days} ${trend.days === 1 ? 'day' : 'days'} (${formatGw(trend.previousMw)} GW)`
            : 'no earlier window to compare'
        }
        definition={
          <Definition
            text="Typical error now minus typical error over the same number of days just before. Red ▲ is worse, green ▼ is better."
            example={['Example: 2.4 GW now, 1.9 GW before.', 'Trend = ▲ 0.5 GW (worse).']}
          />
        }
      />
    </div>
  )
}
