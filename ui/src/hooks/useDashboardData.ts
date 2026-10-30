import { useQuery } from '@tanstack/react-query'
import { fetchDeliveryDay, fetchMeta } from '../lib/api'

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: ({ signal }) => fetchMeta(signal),
  })
}

export function useDeliveryDay(date: string | undefined) {
  return useQuery({
    queryKey: ['delivery-day', date],
    queryFn: ({ signal }) => fetchDeliveryDay(date as string, signal),
    enabled: Boolean(date),
  })
}
