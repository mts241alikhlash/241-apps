import { computed, type Ref } from 'vue'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import { examScheduleApi } from '../api/examScheduleApi'
import type { ExamScheduleStatus } from '../types'

export interface ScheduleFilters {
  status: Ref<string>
}

const unless = (value: string) => (value === 'ALL' ? undefined : value)

export function useScheduleList(
  filters: ScheduleFilters,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-schedule', 'schedules'],
    filters: { status: filters.status },
    fetchPage: async (current, limit) =>
      (
        await examScheduleApi.getSchedules({
          page: current,
          limit,
          status: unless(filters.status.value) as
            ExamScheduleStatus | undefined,
        })
      ).data,
    errorMessage: 'Gagal memuat daftar jadwal.',
  })

  return {
    ...list,
    filtersPending: computed(() => list.isPlaceholderData.value),
    schedules: list.items,
  }
}
