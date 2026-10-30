import { useState } from 'react'
import { ForecastChart } from '../components/delivery-forecast/ForecastChart'
import { DeliveryDatePicker } from '../components/filters/DeliveryDatePicker'
import { Card } from '../components/ui/Card'
import { Observation } from '../components/ui/Observation'
import { useDeliveryDay, useMeta } from '../hooks/useDashboardData'
import type { DeliveryDay } from '../lib/api'
import { formatCalendarDate, formatMw, formatSignedMw, formatUkDay, formatUkTime } from '../lib/format'

const DEFAULT_DELIVERY_DATE = '2026-01-15'

export function Dashboard() {
  const [deliveryDate, setDeliveryDate] = useState(DEFAULT_DELIVERY_DATE)
  const meta = useMeta()
  const day = useDeliveryDay(meta.data ? deliveryDate : undefined)

  return (
    <>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-6 border-b border-line bg-surface px-4 py-3 min-[901px]:px-8">
        <div className="mr-2 flex items-center gap-2 text-[17px] font-bold">
          <span className="size-2.5 rounded-full bg-brand" aria-hidden="true" />
          Wind Desk
        </div>
        {meta.data ? (
          <DeliveryDatePicker
            value={deliveryDate}
            min={meta.data.minDeliveryDate}
            max={meta.data.maxDeliveryDate}
            onChange={setDeliveryDate}
          />
        ) : null}
        <div className="text-xs text-muted min-[901px]:ml-auto min-[901px]:text-right">
          Decision time{' '}
          <b className="text-ink">
            {day.data ? `${formatUkDay(day.data.decisionTime)}, ${formatUkTime(day.data.decisionTime)} UK time` : '...'}
          </b>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pt-6 pb-16 min-[901px]:px-8">
        <Card
          title={`Wind forecast for ${formatCalendarDate(deliveryDate)}`}
          aside="latest forecast before the 11:00 decision, earlier versions in grey"
        >
          <DeliveryDayBody
            data={day.data}
            isPending={meta.isPending || day.isPending}
            error={meta.error ?? day.error}
          />
        </Card>
      </main>
    </>
  )
}

type DeliveryDayBodyProps = {
  data: DeliveryDay | undefined
  isPending: boolean
  error: Error | null
}

function DeliveryDayBody({ data, isPending, error }: DeliveryDayBodyProps) {
  if (error) {
    return <Observation>Could not load the forecast. {error.message}</Observation>
  }
  if (isPending || !data) {
    return <div className="flex h-[340px] items-center justify-center text-muted">Loading forecast...</div>
  }
  const { peak, low, biggestRevision } = data.summary
  return (
    <>
      <ForecastChart latest={data.latest} earlier={data.earlier} />
      <Observation>
        Peak <b>{formatMw(peak.mw)} MW</b> at {formatUkTime(peak.startTime)}, low{' '}
        <b>{formatMw(low.mw)} MW</b> at {formatUkTime(low.startTime)}. Biggest revision:{' '}
        <b>{formatSignedMw(biggestRevision.mw)} MW</b> at {formatUkTime(biggestRevision.startTime)} across{' '}
        {data.earlier.length + 1} forecasts.
      </Observation>
    </>
  )
}
