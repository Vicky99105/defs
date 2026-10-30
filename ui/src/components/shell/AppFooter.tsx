export type AppFooterProps = {
  /** "12:04", or null before any data has loaded. */
  updatedAt: string | null
}

export function AppFooter({ updatedAt }: AppFooterProps) {
  return (
    <footer className="num flex flex-wrap gap-x-2 gap-y-1 border-t border-line pt-4 text-[11.5px] text-ink-3">
      <span>Data: Elexon BMRS (FUELHH, WINDFOR)</span>
      <span aria-hidden="true">·</span>
      <span>Times in UK time</span>
      <span aria-hidden="true">·</span>
      <span>Fetched live{updatedAt ? `, updated ${updatedAt}` : ''}</span>
    </footer>
  )
}
