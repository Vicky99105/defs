import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Dashboard } from './routes/Dashboard.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    // Past Elexon data does not change, so a fetched day stays fresh for the session.
    queries: { staleTime: Infinity, retry: 1, refetchOnWindowFocus: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  </StrictMode>,
)
