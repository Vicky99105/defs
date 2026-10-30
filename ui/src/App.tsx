import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSession } from './hooks/useSession'
import { Dashboard } from './routes/Dashboard'
import { SignIn } from './routes/SignIn'

/** Shows the dashboard while a session is live, otherwise the sign-in page. */
export function App() {
  const session = useSession()
  const queryClient = useQueryClient()
  const signedIn = session !== null

  // Drop cached data on sign-out, so the next user starts clean.
  useEffect(() => {
    if (!signedIn) queryClient.clear()
  }, [signedIn, queryClient])

  return signedIn ? <Dashboard username={session.username} /> : <SignIn />
}
