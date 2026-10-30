export type WindMarkProps = {
  className?: string
}

/** Product mark: three wind strokes on an accent tile. */
export function WindMark({ className = 'size-6' }: WindMarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--accent)" />
      <g stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
        <path d="M5.5 9.5h8a2.5 2.5 0 1 0-2.5-2.5" />
        <path d="M5.5 13h11a2.5 2.5 0 1 1-2.5 2.5" />
        <path d="M5.5 16.5h4.5" />
      </g>
    </svg>
  )
}
