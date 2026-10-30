import { useMemo } from 'react'
import type { ForecastSeries } from '../../lib/api'
import type { EChartsCoreOption } from '../../lib/echarts'
import { formatMw, formatPublishTime, formatUkTime } from '../../lib/format'
import { EChart } from '../ui/EChart'

export type ForecastChartProps = {
  /** The decision-time forecast: bold blue line. */
  latest: ForecastSeries
  /** Versions published before the decision time, oldest first: faint grey lines. */
  earlier: ForecastSeries[]
}

// Canvas cannot read CSS variables, so the mockup tokens are repeated here.
const COLORS = {
  forecast: '#2563eb',
  old: 'rgba(100, 116, 139, 0.35)',
  muted: '#64748b',
  line: '#e2e8f0',
} as const

const EARLIER_NAME = 'Earlier forecasts'

const axisStyle = {
  axisLabel: { color: COLORS.muted },
  axisLine: { lineStyle: { color: COLORS.line } },
  splitLine: { lineStyle: { color: COLORS.line } },
}

type TooltipParam = { seriesName?: string; axisValue?: string; value?: number | null }

export function ForecastChart({ latest, earlier }: ForecastChartProps) {
  const option = useMemo<EChartsCoreOption>(() => {
    const hours = latest.points.map((p) => p.startTime)
    const latestName = `Latest forecast (${formatPublishTime(latest.publishTime)})`
    const valuesFor = (series: ForecastSeries) => {
      const byHour = new Map(series.points.map((p) => [p.startTime, p.mw]))
      return hours.map((h) => byHour.get(h) ?? null)
    }

    return {
      animation: false,
      grid: { left: 56, right: 16, top: 36, bottom: 44 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: TooltipParam[]) => {
          const p = params.find((x) => x.seriesName === latestName)
          return p && p.value != null
            ? `${p.axisValue}<br>Latest forecast: <b>${formatMw(p.value)} MW</b>`
            : ''
        },
      },
      legend: { top: 0, data: [latestName, EARLIER_NAME] },
      xAxis: {
        type: 'category',
        data: hours.map(formatUkTime),
        name: 'delivery hour (UK time)',
        nameLocation: 'middle',
        nameGap: 26,
        ...axisStyle,
      },
      yAxis: { type: 'value', name: 'MW', min: 0, ...axisStyle },
      series: [
        ...earlier.map((series) => ({
          name: EARLIER_NAME,
          type: 'line',
          symbol: 'none',
          data: valuesFor(series),
          color: COLORS.old,
          lineStyle: { width: 1 },
          z: 1,
          connectNulls: false,
          silent: true,
        })),
        {
          name: latestName,
          type: 'line',
          symbol: 'circle',
          symbolSize: 6,
          data: valuesFor(latest),
          color: COLORS.forecast,
          lineStyle: { width: 3 },
          z: 10,
        },
      ],
    }
  }, [latest, earlier])

  return (
    <EChart
      option={option}
      className="h-[340px] w-full"
      ariaLabel={`Wind forecast by delivery hour, latest published ${formatPublishTime(latest.publishTime)}, with ${earlier.length} earlier versions`}
    />
  )
}
