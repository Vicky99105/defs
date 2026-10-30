import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/useTheme'
import type { AccuracyHour } from '../../lib/api'
import { axisStyle, CHART_FONT, gwTick, tooltipRow, tooltipStyle, tooltipTitle } from '../../lib/chartStyle'
import type { EChartsCoreOption } from '../../lib/echarts'
import { formatMw, formatUkDay, formatUkTime } from '../../lib/format'
import { isSimilar, type SimilarRange } from '../../lib/insights'
import { EChart } from '../ui/EChart'

export type ScatterChartProps = {
  /** Every past hour in the window, all hours of the day. */
  rows: AccuracyHour[]
  range: SimilarRange
}

type ScatterParam = { seriesIndex: number; dataIndex: number }

export default function ScatterChart({ rows, range }: ScatterChartProps) {
  const t = useChartTheme()

  const option = useMemo<EChartsCoreOption>(() => {
    const axis = axisStyle(t)
    const similar = rows.filter((r) => isSimilar(r, range))
    const other = rows.filter((r) => !isSimilar(r, range))
    const toPoint = (r: AccuracyHour) => [r.forecastMw / 1000, r.actualMw / 1000]
    const peak = Math.max(2, ...rows.map((r) => Math.max(r.forecastMw, r.actualMw) / 1000), ...range.markers.map((m) => m.mw / 1000))
    const step = peak > 20 ? 5 : peak > 8 ? 4 : 2
    const max = Math.ceil(peak / step) * step
    const valueAxis = {
      type: 'value',
      min: 0,
      max,
      interval: step,
      ...axis,
      axisLine: { show: false },
      axisLabel: { ...axis.axisLabel, formatter: (v: number) => gwTick(v) },
    }

    return {
      animation: false,
      textStyle: { fontFamily: CHART_FONT },
      grid: { left: 8, right: 12, top: 18, bottom: 22, containLabel: true },
      tooltip: {
        trigger: 'item',
        ...tooltipStyle(t),
        formatter: (p: ScatterParam) => {
          const row = p.seriesIndex === 0 ? other[p.dataIndex] : p.seriesIndex === 1 ? similar[p.dataIndex] : undefined
          if (!row) return ''
          return (
            tooltipTitle(t, `${formatUkDay(row.startTime)}, ${formatUkTime(row.startTime)}`) +
            tooltipRow(t, null, 'Forecast', `${formatMw(row.forecastMw)} MW`) +
            tooltipRow(t, null, 'Actual', `${formatMw(row.actualMw)} MW`)
          )
        },
      },
      xAxis: {
        ...valueAxis,
        name: 'Forecast, GW',
        nameLocation: 'middle',
        nameGap: 26,
      },
      yAxis: { ...valueAxis, name: 'Actual, GW', nameLocation: 'end', nameGap: 8, nameTextStyle: { ...axis.nameTextStyle, align: 'left' } },
      series: [
        {
          type: 'scatter',
          data: other.map(toPoint),
          symbolSize: 6,
          color: t.neutralDot,
          emphasis: { scale: 1.6 },
        },
        {
          type: 'scatter',
          data: similar.map(toPoint),
          symbolSize: 8,
          color: t.accent,
          itemStyle: { borderColor: t.surface, borderWidth: 1 },
          z: 5,
          emphasis: { scale: 1.4 },
          markLine: {
            symbol: 'none',
            silent: true,
            animation: false,
            lineStyle: { color: t.accent, type: [4, 4], width: 1 },
            label: {
              show: true,
              position: 'insideEndTop',
              color: t.text2,
              fontSize: 10,
              fontFamily: CHART_FONT,
              backgroundColor: t.surface,
              padding: [1, 4],
              borderRadius: 3,
              formatter: (p: { dataIndex: number }) => range.markers[p.dataIndex]?.label ?? '',
            },
            data: range.markers.map((m) => ({ xAxis: m.mw / 1000 })),
          },
        },
        {
          type: 'line',
          data: [
            [0, 0],
            [max, max],
          ],
          symbol: 'none',
          silent: true,
          color: t.amber,
          lineStyle: { width: 1.5 },
          z: 2,
        },
      ],
    }
  }, [rows, range, t])

  return (
    <EChart
      option={option}
      className="h-[240px] w-full"
      ariaLabel="Forecast against actual for past hours. Highlighted dots had a forecast similar to the selected delivery."
    />
  )
}
