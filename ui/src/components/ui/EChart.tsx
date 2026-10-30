import { useEffect, useRef } from 'react'
import { echarts, type EChartsCoreOption } from '../../lib/echarts'

export type EChartProps = {
  option: EChartsCoreOption
  className?: string
  ariaLabel: string
  /** Called with the category index under a click anywhere in the plot. */
  onCategoryClick?: (index: number) => void
}

/** Thin ECharts wrapper: one chart instance per mount, option replaced on change. */
export function EChart({ option, className, ariaLabel, onCategoryClick }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const clickRef = useRef(onCategoryClick)

  useEffect(() => {
    clickRef.current = onCategoryClick
  }, [onCategoryClick])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = echarts.init(el)
    chartRef.current = chart
    const zr = chart.getZr()
    const toIndex = (x: number, y: number): number | null => {
      if (!chart.containPixel({ gridIndex: 0 }, [x, y])) return null
      const [index] = chart.convertFromPixel({ gridIndex: 0 }, [x, y]) as number[]
      return Number.isFinite(index) ? Math.round(index) : null
    }
    zr.on('click', (event) => {
      if (!clickRef.current) return
      const index = toIndex(event.offsetX, event.offsetY)
      if (index !== null) clickRef.current(index)
    })
    zr.on('mousemove', (event) => {
      if (!clickRef.current) return
      zr.setCursorStyle(toIndex(event.offsetX, event.offsetY) !== null ? 'pointer' : 'default')
    })
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
