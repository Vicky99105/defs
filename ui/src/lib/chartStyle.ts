/** Shared chart chrome: recessive hairline axes, quiet labels, themed tooltip. */
import type { ChartTheme } from '../hooks/useTheme'

export const CHART_FONT = 'Inter, ui-sans-serif, system-ui, sans-serif'

export function axisStyle(t: ChartTheme) {
  return {
    axisLabel: { color: t.text3, fontSize: 11, fontFamily: CHART_FONT },
    axisLine: { lineStyle: { color: t.border } },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: t.grid, type: [3, 3] as number[] } },
    nameTextStyle: { color: t.text3, fontSize: 11, fontFamily: CHART_FONT },
  }
}

export function tooltipStyle(t: ChartTheme) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.border,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: t.text, fontSize: 12, fontFamily: CHART_FONT },
    extraCssText: `border-radius:10px;box-shadow:0 10px 30px rgba(16,24,40,${t.mode === 'dark' ? 0.45 : 0.1});`,
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

/** "#2563eb" plus 0.2 gives "rgba(37,99,235,0.2)". Chart tokens are hex or rgb(); rgb() passes through. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.match(/^#([0-9a-f]{6})$/i)
  if (!hex) return color
  const n = parseInt(hex[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** Vertical gradient from the colour at the top to transparent at the bottom. */
export function fadeDown(color: string, alpha: number) {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, alpha) },
      { offset: 1, color: withAlpha(color, 0) },
    ],
  }
}
