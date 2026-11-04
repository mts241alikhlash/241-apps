import { computed, type Ref } from 'vue'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'

interface Page<T> {
  data?: T[]
  meta?: { total?: number }
}

export function usePagedList<T>(options: {
  scope: string[]
  filters: Record<string, unknown>
  page: Ref<number>
  pageSize: Ref<number>
  fetchPage: (page: number, limit: number) => Promise<Page<T>>
  errorMessage: string
}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [
      ...options.scope,
      options.filters,
      options.page,
      options.pageSize,
    ],
    queryFn: () =>
      options.fetchPage(options.page.value, options.pageSize.value),
    placeholderData: keepPreviousData,
  })

  const items = computed(() => query.data.value?.data ?? [])
  const totalItems = computed(() => query.data.value?.meta?.total ?? 0)
  const listError = computed(() =>
    query.error.value
      ? getIndonesianErrorMessage(query.error.value, options.errorMessage)
      : null,
  )

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: options.scope })
  }

  return {
    items,
    totalItems,
    listError,
    loading: query.isPending,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    refresh,
  }
}
