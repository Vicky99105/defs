import { useEffect, useId, useRef, useState } from 'react'

export type ProfileMenuProps = {
  username: string
  onSignOut: () => void
  /** "up" for the sidebar footer, "down" for the phone header. */
  placement: 'up' | 'down'
  /** Show the username next to the avatar. */
  showName?: boolean
}

/** Avatar button that opens a one-item menu with Sign out. Closes on outside click or Escape. */
export function ProfileMenu({ username, onSignOut, placement, showName = true }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const itemRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    itemRef.current?.focus()
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${showName ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${username}`}
        className={`flex items-center gap-2.5 rounded-[10px] text-left transition-colors hover:bg-side-raised ${
          showName ? 'w-full px-2 py-1.5' : 'p-0.5'
        } ${open ? 'bg-side-raised' : ''}`}
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full border border-gold bg-side-raised text-[12px] font-semibold text-gold uppercase"
          aria-hidden="true"
        >
          {username.slice(0, 1)}
        </span>
        {showName ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-side-ink">{username}</span>
            <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-side-muted" fill="none" aria-hidden="true">
              <path d="m4.5 9.5 3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={`absolute z-30 min-w-[180px] rounded-[10px] border border-side-line bg-side-raised p-1 shadow-[0_12px_30px_rgb(0_0_0/0.35)] ${
            placement === 'up' ? 'bottom-full left-0 mb-2 w-full' : 'top-full right-0 mt-2'
          }`}
        >
          <p className="m-0 truncate px-2.5 pt-1.5 pb-2 text-[11.5px] text-side-muted">Signed in as {username}</p>
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-side-ink transition-colors hover:bg-side-line focus-visible:bg-side-line focus-visible:outline-none"
          >
            <svg viewBox="0 0 16 16" className="size-3.5 text-side-muted" fill="none" aria-hidden="true">
              <path
                d="M6.5 3H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 13h2.5M10 5.5 12.5 8 10 10.5M12.5 8H6"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
