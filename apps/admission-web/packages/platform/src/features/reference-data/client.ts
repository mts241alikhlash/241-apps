import { QueryClient } from '@tanstack/vue-query'
import type { ReferenceListKey } from './types'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 400,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
    },
  },
})

export const referenceQueryKey = (key: ReferenceListKey) =>
  ['reference', key] as const
