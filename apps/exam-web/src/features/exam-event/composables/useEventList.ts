import { computed, type Ref } from 'vue'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import { examEventApi } from '../api/examEventApi'
import type { ExamEventStatus } from '../types'

export interface EventFilters {
  status: Ref<string>
  semesterId: Ref<string>
}

const unless = (value: string) => (value === 'ALL' ? undefined : value)

export function useEventList(
  filters: EventFilters,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-event', 'events'],
    filters: { status: filters.status, semesterId: filters.semesterId },
    fetchPage: async (current, limit) =>
      (
        await examEventApi.getEvents({
          page: current,
          limit,
          status: unless(filters.status.value) as ExamEventStatus | undefined,
          semesterId: filters.semesterId.value || undefined,
        })
      ).data,
    errorMessage: 'Gagal memuat kegiatan ujian.',
  })

  return {
    ...list,
    filtersPending: computed(() => list.isPlaceholderData.value),
    events: list.items,
  }
}
