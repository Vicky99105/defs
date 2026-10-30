import { useSyncExternalStore } from 'react'
import { getSession, subscribeSession, type Session } from '../lib/session'

/** The live session, or null when signed out. Re-renders on sign-in, sign-out and expiry. */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession)
}
