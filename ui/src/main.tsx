import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { ApiError } from './lib/api'

const queryClient = new QueryClient({
  defaultOptions: {
    // Past Elexon data does not change, so a fetched day stays fresh for the session.
    queries: {
      staleTime: Infinity,
      // Retry once on network and server errors; a 4xx (bad input, signed out) will not change.
      retry: (failures, error) => failures < 1 && !(error instanceof ApiError && error.status < 500),
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
