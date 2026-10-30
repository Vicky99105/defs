import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/useTheme'
import type { ForecastSeries } from '../../lib/api'
import { axisStyle, CHART_FONT, fadeDown, gwTick, tooltipRow, tooltipStyle, tooltipTitle } from '../../lib/chartStyle'
import type { EChartsCoreOption } from '../../lib/echarts'
import { formatMw, formatPublishTime, formatUkTime, ukHour } from '../../lib/format'
import { EChart } from '../ui/EChart'

export type ForecastChartProps = {
  /** The decision forecast: bold accent line. */
  latest: ForecastSeries
  /** Versions published before the decision time: faint neutral lines. */
  earlier: ForecastSeries[]
  /** Selected UK hour, marked with a subtle vertical rule. */
  selectedHour: number | null
  /** Click on an hour: select it, or clear it when it is already selected. */
  onHourClick: (hour: number) => void
}

type AxisParam = { dataIndex: number }

export default function ForecastChart({ latest, earlier, selectedHour, onHourClick }: ForecastChartProps) {
  const t = useChartTheme()
  const hours = useMemo(() => latest.points.map((p) => ukHour(p.startTime)), [latest])

  const option = useMemo<EChartsCoreOption>(() => {
    const times = latest.points.map((p) => p.startTime)
    const valuesFor = (series: ForecastSeries) => {
      const byTime = new Map(series.points.map((p) => [p.startTime, p.mw]))
      return times.map((time) => {
        const mw = byTime.get(time)
        return mw == null ? null : mw / 1000
      })
    }
    const ordered = [...earlier].sort((a, b) => a.publishTime.localeCompare(b.publishTime))
    const selectedIndex = selectedHour === null ? -1 : hours.indexOf(selectedHour)
    const axis = axisStyle(t)

    return {
      animation: false,
      textStyle: { fontFamily: CHART_FONT },
      grid: { left: 4, right: 12, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(t),
        axisPointer: { type: 'line', lineStyle: { color: t.text3, width: 1, type: [3, 3] } },
        formatter: (params: AxisParam[]) => {
          const index = params[0]?.dataIndex
          if (index == null) return ''
          const point = latest.points[index]
          const firstVersion = ordered.find((s) => s.points.some((p) => p.startTime === point.startTime))
          const first = firstVersion?.points.find((p) => p.startTime === point.startTime)
          return (
            tooltipTitle(t, `${formatUkTime(point.startTime)} delivery`) +
            tooltipRow(t, t.accent, 'Decision forecast', `${formatMw(point.mw)} MW`) +
            (first ? tooltipRow(t, t.earlier, `First, ${formatPublishTime(firstVersion!.publishTime)}`, `${formatMw(first.mw)} MW`) : '')
          )
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: times.map(formatUkTime),
        ...axis,
        axisLabel: { ...axis.axisLabel, interval: 2, margin: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        splitNumber: 4,
        ...axis,
        axisLine: { show: false },
        axisLabel: { ...axis.axisLabel, formatter: (v: number) => `${gwTick(v)} GW` },
      },
      series: [
        ...earlier.map((series) => ({
          type: 'line',
          symbol: 'none',
          data: valuesFor(series),
          color: t.earlier,
          lineStyle: { width: 1 },
          z: 1,
          silent: true,
          emphasis: { disabled: true },
        })),
        {
          type: 'line',
          data: valuesFor(latest),
          color: t.accent,
          lineStyle: { width: 2.5, cap: 'round', join: 'round' },
          areaStyle: { color: fadeDown(t.accent, t.mode === 'dark' ? 0.16 : 0.12), origin: 'start' },
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { borderColor: t.surface, borderWidth: 2 },
          z: 10,
          emphasis: { scale: false },
          markLine:
            selectedIndex >= 0
              ? {
                  symbol: 'none',
                  silent: true,
                  animation: false,
                  label: { show: false },
                  lineStyle: { color: t.accentFaint, width: 1, type: 'solid' },
                  data: [{ xAxis: selectedIndex }],
                }
              : undefined,
        },
        ...(selectedIndex >= 0
          ? [
              {
                type: 'scatter',
                data: [[selectedIndex, latest.points[selectedIndex].mw / 1000]],
                symbolSize: 10,
                color: t.accent,
                itemStyle: { borderColor: t.surface, borderWidth: 2 },
                z: 20,
                silent: true,
              },
            ]
          : []),
      ],
    }
  }, [latest, earlier, hours, selectedHour, t])

  return (
    <EChart
      option={option}
      className="h-[240px] w-full sm:h-[320px]"
      ariaLabel={`Wind forecast by delivery hour. Decision forecast published ${formatPublishTime(latest.publishTime)}, with ${earlier.length} earlier versions.`}
      onCategoryClick={(index) => {
        const hour = hours[index]
        if (hour !== undefined) onHourClick(hour)
      }}
    />
  )
}
