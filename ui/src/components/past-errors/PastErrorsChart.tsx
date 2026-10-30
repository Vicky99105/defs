import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/useTheme'
import type { AccuracyHour } from '../../lib/api'
import { axisStyle, CHART_FONT, gwTick, tooltipRow, tooltipStyle, tooltipTitle } from '../../lib/chartStyle'
import type { EChartsCoreOption } from '../../lib/echarts'
import { formatMw, formatSignedMw, formatUkDay, formatUkTime, ukHour } from '../../lib/format'
import { EChart } from '../ui/EChart'

export type PastErrorsChartProps = {
  /** Past hours in time order. One per day when an hour is selected. */
  rows: AccuracyHour[]
  /** True when the rows are one hour per day; labels then name days, not hours. */
  perDay: boolean
}

type AxisParam = { dataIndex: number }

export default function PastErrorsChart({ rows, perDay }: PastErrorsChartProps) {
  const t = useChartTheme()

  const option = useMemo<EChartsCoreOption>(() => {
    const axis = axisStyle(t)
    const labels = rows.map((r) => formatUkDay(r.startTime))
    const above = rows.map((r) => (r.errorMw > 0 ? r.errorMw / 1000 : null))
    const below = rows.map((r) => (r.errorMw <= 0 ? r.errorMw / 1000 : null))
    const barWidth = perDay ? '56%' : undefined
    const common = { type: 'bar', barGap: '-100%', barMaxWidth: 24, barWidth, barMinHeight: 1 }

    return {
      animation: false,
      textStyle: { fontFamily: CHART_FONT },
      grid: { left: 4, right: 8, top: 12, bottom: 22, containLabel: true },
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(t),
        axisPointer: { type: 'shadow', shadowStyle: { color: t.grid, opacity: 0.6 } },
        formatter: (params: AxisParam[]) => {
          const row = rows[params[0]?.dataIndex ?? -1]
          if (!row) return ''
          return (
            tooltipTitle(t, `${formatUkDay(row.startTime)}, ${formatUkTime(row.startTime)}`) +
            tooltipRow(t, null, 'Forecast', `${formatMw(row.forecastMw)} MW`) +
            tooltipRow(t, null, 'Actual', `${formatMw(row.actualMw)} MW`) +
            tooltipRow(t, row.errorMw > 0 ? t.above : t.below, 'Error', `${formatSignedMw(row.errorMw)} MW`)
          )
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        ...axis,
        axisLabel: {
          ...axis.axisLabel,
          margin: 10,
          hideOverlap: true,
          // Hourly bars: label each day once, at its first hour.
          interval: perDay ? 'auto' : (index: number) => ukHour(rows[index].startTime) === 0,
          formatter: (value: string) => value.replace(/^\w+ /, ''),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitNumber: 4,
        ...axis,
        axisLine: { show: false },
        axisLabel: { ...axis.axisLabel, formatter: (v: number) => `${v > 0 ? '+' : ''}${gwTick(v)} GW` },
      },
      series: [
        { ...common, data: above, color: t.above, itemStyle: { borderRadius: [3, 3, 0, 0] } },
        { ...common, data: below, color: t.below, itemStyle: { borderRadius: [0, 0, 3, 3] } },
      ],
    }
  }, [rows, perDay, t])

  return (
    <EChart
      option={option}
      className="h-[240px] w-full"
      ariaLabel={`Forecast error for ${rows.length} past ${perDay ? 'days' : 'hours'}. Bars above zero: forecast above actual.`}
    />
  )
}
