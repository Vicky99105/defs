export type LegendSwatch = 'line' | 'faint-line' | 'dot' | 'dash' | 'square'

export type LegendItem = {
  label: string
  /** Any CSS colour; usually a token such as var(--accent). */
  color: string
  swatch: LegendSwatch
}

export type LegendProps = {
  items: LegendItem[]
}

function Swatch({ color, swatch }: Pick<LegendItem, 'color' | 'swatch'>) {
  if (swatch === 'dot') {
    return <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
  }
  if (swatch === 'square') {
    return <span className="size-2 shrink-0 rounded-[2px]" style={{ background: color }} />
  }
  if (swatch === 'dash') {
    return (
      <span
        className="h-0 w-3.5 shrink-0 border-t-[1.5px] border-dashed"
        style={{ borderColor: color }}
      />
    )
  }
  return (
    <span
      className={`w-3.5 shrink-0 rounded-full ${swatch === 'line' ? 'h-[2.5px]' : 'h-px'}`}
      style={{ background: color }}
    />
  )
}

export function Legend({ items }: LegendProps) {
  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-[11.5px] text-ink-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <Swatch color={item.color} swatch={item.swatch} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
