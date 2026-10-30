export type AppFooterProps = {
  /** "12:04", or null before any data has loaded. */
  updatedAt: string | null
  /** One item per line, for the sidebar. */
  stacked?: boolean
}

export function AppFooter({ updatedAt, stacked = false }: AppFooterProps) {
  const items = ['Elexon BMRS: FUELHH, WINDFOR', 'All times UK', `Fetched live${updatedAt ? `, ${updatedAt}` : ''}`]
  if (stacked) {
    return (
      <footer className="num flex flex-col gap-1 text-[11px] leading-5 text-side-muted">
        {items.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </footer>
    )
  }
  return (
    <footer className="num flex flex-wrap gap-x-2 gap-y-1 border-t border-line pt-4 text-[11.5px] text-ink-3">
      {items.map((item, i) => (
        <span key={item}>
          {i > 0 ? <span aria-hidden="true">· </span> : null}
          {item}
        </span>
      ))}
    </footer>
  )
}
