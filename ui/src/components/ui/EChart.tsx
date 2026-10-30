import { useEffect, useRef } from 'react'
import { echarts, type EChartsCoreOption } from '../../lib/echarts'

export type EChartProps = {
  option: EChartsCoreOption
  className?: string
  ariaLabel: string
}

/** Thin ECharts wrapper: one chart instance per mount, option replaced on change. */
export function EChart({ option, className, ariaLabel }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(el)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={containerRef} className={className} role="img" aria-label={ariaLabel} />
}
