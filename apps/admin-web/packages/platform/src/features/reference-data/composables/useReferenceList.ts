import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { queryClient, referenceQueryKey } from '../client'
import { REFERENCE_EXPIRY_MS } from '../constants'
import type { ReferenceListKey, ReferenceListStatus } from '../types'

function warnIfTruncated(key: ReferenceListKey, value: unknown) {
  if (!Array.isArray(value) || value.length < PAGINATION.REFERENCE_LIMIT) return
  console.warn(
    `[reference-data] "${key}" returned ${value.length} rows, which is the ` +
      `request limit (${PAGINATION.REFERENCE_LIMIT}). The list is probably ` +
      `truncated and this dropdown is missing options. It needs server-side ` +
      `search rather than a bigger limit: PaginationQueryDto caps it here.`,
  )
}

export function useReferenceList() {
  async function read<T>(
    key: ReferenceListKey,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    return queryClient.fetchQuery({
      queryKey: referenceQueryKey(key),
      queryFn: async () => {
        const value = await fetcher()
        warnIfTruncated(key, value)
        return value
      },
      staleTime: REFERENCE_EXPIRY_MS[key],
    })
  }

  function invalidate(key: ReferenceListKey) {
    void queryClient.invalidateQueries({ queryKey: referenceQueryKey(key) })
  }

  function clear() {
    queryClient.clear()
  }

  function statusOf(key: ReferenceListKey): ReferenceListStatus {
    const state = queryClient.getQueryState(referenceQueryKey(key))
    if (!state) return 'idle'
    if (state.fetchStatus === 'fetching') return 'loading'
    if (state.status === 'error') return 'failed'
    if (state.status === 'success') return 'ready'
    return 'idle'
  }

  return { read, invalidate, clear, statusOf }
}
