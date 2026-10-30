import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchAccuracy, fetchDeliveryDay, fetchMeta, type AccuracyParams } from '../lib/api'

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
    placeholderData: keepPreviousData,
  })
}

/** Accuracy over the error-history window. Pass `enabled: false` until the inputs are known. */
export function useAccuracy(params: AccuracyParams, enabled = true) {
  const hour = params.hour ?? null
  return useQuery({
    queryKey: ['accuracy', params.date, params.window, hour],
    queryFn: ({ signal }) => fetchAccuracy({ ...params, hour }, signal),
    enabled,
    // Hold the previous view while a new filter loads, instead of flashing skeletons.
    placeholderData: keepPreviousData,
  })
}
