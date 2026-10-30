/** Shared chart chrome: recessive hairline axes, quiet labels, themed tooltip. */
import type { ChartTheme } from '../hooks/useTheme'

export const CHART_FONT = 'Inter, ui-sans-serif, system-ui, sans-serif'

export function axisStyle(t: ChartTheme) {
  return {
    axisLabel: { color: t.text3, fontSize: 11, fontFamily: CHART_FONT },
    axisLine: { lineStyle: { color: t.border } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: t.grid } },
    nameTextStyle: { color: t.text3, fontSize: 11, fontFamily: CHART_FONT },
  }
}

export function tooltipStyle(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.border,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: { color: t.text, fontSize: 12, fontFamily: CHART_FONT },
    extraCssText: `border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,${t.mode === 'dark' ? 0.4 : 0.08});`,
  }
}

/** One tooltip row: a colour key, a label, a right-aligned value. */
export function tooltipRow(t: ChartTheme, color: string | null, label: string, value: string): string {
  const key = color
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></span>`
    : ''
  return `<div style="display:flex;align-items:center;gap:16px;justify-content:space-between;line-height:1.7"><span style="color:${t.text2}">${key}${label}</span><span style="font-variant-numeric:tabular-nums;font-weight:500">${value}</span></div>`
}

export function tooltipTitle(t: ChartTheme, text: string): string {
  return `<div style="color:${t.text3};font-size:11px;margin-bottom:2px">${text}</div>`
}

/** "12.5" for a GW axis tick. */
export function gwTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
