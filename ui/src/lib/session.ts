/**
 * The signed-in session: a bearer token from POST /api/auth/login and when it expires.
 * Kept in sessionStorage, so closing the tab signs out. Storage can be blocked, so every
 * access is guarded and the in-memory copy stays the source of truth.
 */

export type Session = {
  token: string
  username: string
  /** ISO 8601 instant. */
  expiresAt: string
}

const STORAGE_KEY = 'wind-desk-session'
const listeners = new Set<() => void>()

function isLive(session: Session | null): session is Session {
  return session !== null && Date.parse(session.expiresAt) > Date.now()
}

function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    return isLive(parsed) ? parsed : null
  } catch {
    return null
  }
}

let current: Session | null = readStored()

function emit() {
  listeners.forEach((listener) => listener())
}

export function setSession(session: Session) {
  current = session
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Not persisted; the session still lasts for this page load.
  }
  emit()
}

export function clearSession() {
  if (current === null) return
  current = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored to remove.
  }
  emit()
}

/** The live session, or null when signed out or expired. */
export function getSession(): Session | null {
  if (current !== null && !isLive(current)) {
    current = null
    // Defer, so readers inside a render never trigger a synchronous store update.
    queueMicrotask(emit)
  }
  return current
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
