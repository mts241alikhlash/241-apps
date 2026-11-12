import { computed, type Ref } from 'vue'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import type { ExamCategory } from '@/features/exam-shared/examType'
import { examScheduleApi } from '../api/examScheduleApi'
import type { ExamScheduleStatus } from '../types'

export interface ScheduleFilters {
  status: Ref<string>
  category?: Ref<ExamCategory | undefined>
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
    filters: { status: filters.status, category: filters.category },
    fetchPage: async (current, limit) =>
      examScheduleApi.getSchedules({
        page: current,
        limit,
        status: unless(filters.status.value) as ExamScheduleStatus | undefined,
        category: filters.category?.value,
      }),
    errorMessage: 'Gagal memuat daftar jadwal.',
  })

  return {
    ...list,
    filtersPending: computed(() => list.isPlaceholderData.value),
    schedules: list.items,
  }
}
