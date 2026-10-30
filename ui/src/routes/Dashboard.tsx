import { lazy, Suspense, type ReactNode } from 'react'
import { DeliveryDatePicker } from '../components/filters/DeliveryDatePicker'
import { HourSelect } from '../components/filters/HourSelect'
import { WindowToggle } from '../components/filters/WindowToggle'
import { KpiStrip } from '../components/kpis/KpiStrip'
import { AppFooter } from '../components/shell/AppFooter'
import { AppHeader, DecisionPill } from '../components/shell/AppHeader'
import { Card } from '../components/ui/Card'
import { Legend } from '../components/ui/Legend'
import { Observation } from '../components/ui/Observation'
import { CardSkeleton, ChartSkeleton, Skeleton } from '../components/ui/Skeleton'
import { StateCard } from '../components/ui/StateCard'
import { useAccuracy, useDeliveryDay, useMeta } from '../hooks/useDashboardData'
import { useUrlFilters, WINDOW_OPTIONS } from '../hooks/useUrlFilters'
import { ApiError, type Accuracy, type DeliveryDay } from '../lib/api'
import {
  formatCalendarDate,
  formatCalendarDateLong,
  formatClock,
  formatGw,
  formatHour,
  formatPeriod,
  formatPublishTime,
  formatSignedGw,
  formatUkDay,
  formatUkTime,
} from '../lib/format'
import {
  countAbove,
  firstForecastAtHour,
  pointAtHour,
  similarRange,
  summariseLeadTime,
  summariseSimilar,
} from '../lib/insights'

// Chart code (ECharts) loads in its own chunk, so the shell and KPIs paint first.
const ForecastChart = lazy(() => import('../components/delivery-forecast/ForecastChart'))
const PastErrorsChart = lazy(() => import('../components/past-errors/PastErrorsChart'))
const ScatterChart = lazy(() => import('../components/forecast-vs-actual/ScatterChart'))
const LeadTimeChart = lazy(() => import('../components/lead-time/LeadTimeChart'))

const HERO_HEIGHT = 'h-[240px] sm:h-[300px]'
const CARD_HEIGHT = 'h-[240px]'

/** The backend answers 502 with this wording when the window has no forecast/actual pairs. */
function isNoHistory(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

function errorText(error: unknown): string {
  if (error instanceof ApiError && error.status === 422) return error.message
  return 'Elexon is unavailable. Try again.'
}

export function Dashboard() {
  const [filters, setFilters] = useUrlFilters()
  const meta = useMeta()
  const min = meta.data?.minDeliveryDate
  const max = meta.data?.maxDeliveryDate
  const date =
    min && max ? (filters.date < min ? min : filters.date > max ? max : filters.date) : filters.date
  const ready = Boolean(meta.data)

  const day = useDeliveryDay(ready ? date : undefined)
  const accuracy = useAccuracy({ date, window: filters.window, hour: filters.hour }, ready)
  // The scatter always shows every past hour; with no hour selected this is the same query.
  const accuracyAll = useAccuracy({ date, window: filters.window, hour: null }, ready)

  const decisionLabel = day.data
    ? `Decision ${formatUkTime(day.data.decisionTime)} UK, ${formatUkDay(day.data.decisionTime)}`
    : null
  const updated = Math.max(day.dataUpdatedAt, accuracy.dataUpdatedAt, accuracyAll.dataUpdatedAt)

  const filterControls = (
    <>
      <DeliveryDatePicker
        value={date}
        min={min ?? '2026-01-02'}
        max={max ?? '2026-02-01'}
        onChange={(next) => setFilters({ date: next })}
      />
      <HourSelect value={filters.hour} onChange={(hour) => setFilters({ hour })} />
      <WindowToggle
        value={filters.window}
        options={meta.data?.windowsDays ?? WINDOW_OPTIONS}
        onChange={(window) => setFilters({ window })}
      />
    </>
  )

  return (
    <div className="min-h-screen">
      <AppHeader deliveryLabel={formatCalendarDateLong(date)} decisionLabel={decisionLabel} />

      <div className="lg:flex">
        <aside
          aria-label="Filters"
          className="border-b border-line bg-surface lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0 lg:bg-transparent"
        >
          <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-3 sm:px-6 lg:flex lg:flex-col lg:gap-6 lg:px-5 lg:py-6">
            {filterControls}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-6">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 sm:gap-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:hidden">
              <p className="num m-0 text-[15px] font-semibold text-ink sm:hidden">{formatCalendarDateLong(date)}</p>
              <DecisionPill label={decisionLabel} />
            </div>

            {meta.error ? (
              <StateCard
                tone="error"
                title={errorText(meta.error)}
                action={{ label: 'Retry', onClick: () => void meta.refetch() }}
              />
            ) : (
              <>
                <AccuracySummary query={accuracy} hour={filters.hour} />
                <HeroCard
                  query={day}
                  hour={filters.hour}
                  onHourClick={(hour) => setFilters({ hour: hour === filters.hour ? null : hour })}
                  onClearHour={() => setFilters({ hour: null })}
                  onRetry={() => {
                    void day.refetch()
                    if (accuracy.error) void accuracy.refetch()
                    if (accuracyAll.error) void accuracyAll.refetch()
                  }}
                />
                <AccuracyCards
                  query={accuracy}
                  allHours={accuracyAll}
                  day={day.data}
                  hour={filters.hour}
                  upstreamShown={Boolean(day.error && !day.data)}
                />
              </>
            )}

            <AppFooter updatedAt={updated > 0 ? formatClock(updated) : null} />
          </div>
        </main>
      </div>
    </div>
  )
}

type QueryState<T> = {
  data: T | undefined
  error: Error | null
  isPending: boolean
  isPlaceholderData: boolean
  refetch: () => unknown
}

function Fade({ stale, children }: { stale: boolean; children: ReactNode }) {
  return (
    <div className={`transition-opacity duration-200 ${stale ? 'opacity-60' : 'opacity-100'}`} aria-busy={stale}>
      {children}
    </div>
  )
}

function AccuracySummary({ query, hour }: { query: QueryState<Accuracy>; hour: number | null }) {
  if (query.error && !query.data) return null // The cards below show the message once.
  if (!query.data) {
    return (
      <section aria-label="Accuracy summary" className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-56" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-4 shadow-card sm:px-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
      </section>
    )
  }
  const { period, kpis, previousPeriod } = query.data
  return (
    <section aria-label="Accuracy summary" className="flex flex-col gap-3">
      <p className="num m-0 text-[12px] text-ink-3">
        Error history <span className="text-ink-2">{formatPeriod(period.from, period.to)}</span>
        {' · '}
        {hour === null ? 'All hours' : formatHour(hour)}
      </p>
      <Fade stale={query.isPlaceholderData}>
        <KpiStrip kpis={kpis} previousPeriod={previousPeriod} />
      </Fade>
    </section>
  )
}

type HeroCardProps = {
  query: QueryState<DeliveryDay>
  hour: number | null
  onHourClick: (hour: number) => void
  onClearHour: () => void
  onRetry: () => void
}

function HeroCard({ query, hour, onHourClick, onClearHour, onRetry }: HeroCardProps) {
  if (query.error && !query.data) {
    return (
      <StateCard
        tone="error"
        title={errorText(query.error)}
        action={{ label: 'Retry', onClick: onRetry }}
      />
    )
  }
  if (!query.data) return <CardSkeleton heightClass={HERO_HEIGHT} />
  const data = query.data

  return (
    <Card
      title={`Wind forecast · ${formatCalendarDate(data.deliveryDate)}`}
      aside={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Legend
            items={[
              { label: `Decision forecast, ${formatPublishTime(data.latest.publishTime)}`, color: 'var(--accent)', swatch: 'line' },
              { label: `Earlier versions (${data.earlier.length})`, color: 'var(--text-3)', swatch: 'faint-line' },
            ]}
          />
          {hour !== null ? (
            <button
              type="button"
              onClick={onClearHour}
              className="num inline-flex h-6 items-center gap-1 rounded-full bg-accent-soft pr-1.5 pl-2.5 text-[11.5px] font-medium text-accent-text transition-opacity hover:opacity-80"
              aria-label={`Clear hour ${formatHour(hour)}`}
            >
              {formatHour(hour)}
              <svg viewBox="0 0 16 16" className="size-3" fill="none" aria-hidden="true">
                <path d="m5 5 6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <span className="hidden text-[11.5px] text-ink-3 sm:inline">Click an hour to focus</span>
          )}
        </div>
      }
      footer={<Observation>{heroObservation(data, hour)}</Observation>}
    >
      <Fade stale={query.isPlaceholderData}>
        <Suspense fallback={<ChartSkeleton heightClass={HERO_HEIGHT} />}>
          <ForecastChart latest={data.latest} earlier={data.earlier} selectedHour={hour} onHourClick={onHourClick} />
        </Suspense>
      </Fade>
    </Card>
  )
}

function heroObservation(data: DeliveryDay, hour: number | null): ReactNode {
  if (hour !== null) {
    const point = pointAtHour(data.latest, hour)
    if (!point) return <>No decision forecast for {formatHour(hour)}.</>
    const first = firstForecastAtHour(data, hour)
    return (
      <>
        <b>{formatHour(hour)}</b>: <b>{formatGw(point.mw)} GW</b> at decision
        {first ? (
          <>
            , moved <b>{formatSignedGw(point.mw - first.mw)} GW</b> since {formatPublishTime(first.publishTime)}
          </>
        ) : (
          ', one forecast before the cutoff'
        )}
      </>
    )
  }
  const { peak, low, biggestRevision } = data.summary
  return (
    <>
      Peak <b>{formatGw(peak.mw)} GW</b> at {formatUkTime(peak.startTime)} · low <b>{formatGw(low.mw)} GW</b> at{' '}
      {formatUkTime(low.startTime)} · biggest revision <b>{formatSignedGw(biggestRevision.mw)} GW</b> at{' '}
      {formatUkTime(biggestRevision.startTime)}
    </>
  )
}

type AccuracyCardsProps = {
  query: QueryState<Accuracy>
  allHours: QueryState<Accuracy>
  day: DeliveryDay | undefined
  hour: number | null
  /** The hero card already shows an upstream error; do not repeat it. */
  upstreamShown: boolean
}

const GRID = 'grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3'
const LAST_CARD = 'md:col-span-2 xl:col-span-1'

function AccuracyCards({ query, allHours, day, hour, upstreamShown }: AccuracyCardsProps) {
  if (query.error && !query.data) {
    if (isNoHistory(query.error)) {
      return <StateCard tone="empty" title="No past days with known actuals yet" detail="Try a later delivery date." />
    }
    if (upstreamShown) return null
    return (
      <StateCard
        tone="error"
        title={errorText(query.error)}
        action={{ label: 'Retry', onClick: () => void query.refetch() }}
      />
    )
  }
  if (!query.data) {
    return (
      <div className={GRID}>
        <CardSkeleton heightClass={CARD_HEIGHT} />
        <CardSkeleton heightClass={CARD_HEIGHT} />
        <CardSkeleton heightClass={CARD_HEIGHT} className={LAST_CARD} />
      </div>
    )
  }

  const data = query.data
  const perDay = hour !== null
  const above = countAbove(data.hours)
  const unit = perDay ? 'days' : 'hours'
  const lead = summariseLeadTime(data.leadTime)
  const range = day ? similarRange(day, hour) : null
  const scatterRows = allHours.data?.hours
  const similar = range && scatterRows ? summariseSimilar(scatterRows, range) : null
  const dayShort = day ? formatCalendarDate(day.deliveryDate) : ''

  return (
    <Fade stale={query.isPlaceholderData}>
      <div className={GRID}>
        <Card
          title="Past errors"
          legend={
            <Legend
              items={[
                { label: 'Above actual', color: 'var(--above)', swatch: 'square' },
                { label: 'Below actual', color: 'var(--below)', swatch: 'square' },
              ]}
            />
          }
          footer={
            <Observation>
              Forecast above actual {perDay ? 'on' : 'in'}{' '}
              <b>
                {above} of {data.hours.length}
              </b>{' '}
              {unit}
            </Observation>
          }
        >
          <Suspense fallback={<ChartSkeleton heightClass={CARD_HEIGHT} />}>
            <PastErrorsChart rows={data.hours} perDay={perDay} />
          </Suspense>
        </Card>

        <Card
          title="Forecast vs actual"
          legend={
            range ? (
              <Legend
                items={[
                  { label: 'Other past hours', color: 'var(--neutral-dot)', swatch: 'dot' },
                  { label: 'Similar forecast', color: 'var(--accent)', swatch: 'dot' },
                  {
                    label: hour !== null ? `${dayShort} ${formatHour(hour)} forecast` : `${dayShort} low and high`,
                    color: 'var(--accent)',
                    swatch: 'dash',
                  },
                  { label: 'Perfect forecast', color: 'var(--amber)', swatch: 'line' },
                ]}
              />
            ) : null
          }
          footer={
            <Observation>
              {similar ? (
                <>
                  <b>{similar.count}</b> similar {similar.count === 1 ? 'hour' : 'hours'} · <b>{similar.belowForecast}</b> came in
                  below forecast · average gap <b>{formatSignedGw(similar.meanGapMw)} GW</b>
                </>
              ) : range && scatterRows ? (
                'No past hours with a similar forecast in this window'
              ) : (
                '\u00a0'
              )}
            </Observation>
          }
        >
          {range && scatterRows ? (
            <Suspense fallback={<ChartSkeleton heightClass={CARD_HEIGHT} />}>
              <ScatterChart rows={scatterRows} range={range} />
            </Suspense>
          ) : allHours.error && !allHours.data ? (
            <p className="m-0 grid h-[240px] place-items-center text-[12.5px] text-ink-3">{errorText(allHours.error)}</p>
          ) : (
            <ChartSkeleton heightClass={CARD_HEIGHT} />
          )}
        </Card>

        <Card
          title="Error by lead time"
          className={LAST_CARD}
          legend={
            <Legend
              items={[
                { label: '12 to 42 h, bought on', color: 'var(--accent)', swatch: 'square' },
                { label: 'Other', color: 'var(--accent-faint)', swatch: 'square' },
              ]}
            />
          }
          footer={
            <Observation>
              {lead.buyMw !== null ? (
                <>
                  12 to 42 h ahead missed by <b>{formatGw(lead.buyMw)} GW</b>
                  {lead.shortestMw !== null ? (
                    <>
                      , vs <b>{formatGw(lead.shortestMw)} GW</b> at 0 to 6 h
                    </>
                  ) : null}
                </>
              ) : (
                'No forecasts 12 to 42 h ahead in this window'
              )}
            </Observation>
          }
        >
          <Suspense fallback={<ChartSkeleton heightClass={CARD_HEIGHT} />}>
            <LeadTimeChart buckets={data.leadTime} />
          </Suspense>
        </Card>
      </div>
    </Fade>
  )
}
