import { useMemo } from 'react'
import { useChartTheme } from '../../hooks/useTheme'
import type { LeadTimeBucket } from '../../lib/api'
import { axisStyle, CHART_FONT, gwTick, tooltipRow, tooltipStyle, tooltipTitle } from '../../lib/chartStyle'
import type { EChartsCoreOption } from '../../lib/echarts'
import { formatMw } from '../../lib/format'
import { isBuyLead } from '../../lib/insights'
import { EChart } from '../ui/EChart'

export type LeadTimeChartProps = {
  buckets: LeadTimeBucket[]
}

type AxisParam = { dataIndex: number }

export default function LeadTimeChart({ buckets }: LeadTimeChartProps) {
  const t = useChartTheme()

  const option = useMemo<EChartsCoreOption>(() => {
    const axis = axisStyle(t)
    return {
      animation: false,
      textStyle: { fontFamily: CHART_FONT },
      grid: { left: 4, right: 8, top: 12, bottom: 22, containLabel: true },
      tooltip: {
        trigger: 'axis',
        ...tooltipStyle(t),
        axisPointer: { type: 'shadow', shadowStyle: { color: t.grid, opacity: 0.6 } },
        formatter: (params: AxisParam[]) => {
          const b = buckets[params[0]?.dataIndex ?? -1]
          if (!b) return ''
          return (
            tooltipTitle(t, `${b.fromHours} to ${b.toHours} h before delivery`) +
            tooltipRow(t, isBuyLead(b) ? t.accent : t.accentFaint, 'Typical error', `${formatMw(b.typicalErrorMw)} MW`) +
            tooltipRow(t, null, 'Forecasts', b.count.toLocaleString('en-GB'))
          )
        },
      },
      xAxis: {
        type: 'category',
        data: buckets.map((b) => `${b.fromHours}h`),
        name: 'Hours ahead, 6 h buckets',
        nameLocation: 'middle',
        nameGap: 26,
        ...axis,
        axisLabel: { ...axis.axisLabel, margin: 10, interval: 0 },
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
        {
          type: 'bar',
          barMaxWidth: 24,
          barWidth: '52%',
          data: buckets.map((b) => ({
            value: b.typicalErrorMw / 1000,
            itemStyle: { color: isBuyLead(b) ? t.accent : t.accentFaint, borderRadius: [4, 4, 0, 0] },
          })),
        },
      ],
    }
  }, [buckets, t])

  return (
    <EChart
      option={option}
      className="h-[240px] w-full"
      ariaLabel="Typical forecast error by hours ahead of delivery, in 6-hour buckets."
    />
  )
}
