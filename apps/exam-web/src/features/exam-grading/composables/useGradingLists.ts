import type { Ref } from 'vue'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import type { ExamSessionStatus } from '@/features/exam-schedule/types'
import { examGradingApi } from '../api/examGradingApi'

export function useGradingSchedules(page: Ref<number>, pageSize: Ref<number>) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-grading', 'schedules'],
    filters: {},
    fetchPage: async (current, limit) =>
      (await examGradingApi.getSchedules({ page: current, limit })).data,
    errorMessage: 'Gagal memuat daftar ujian.',
  })
  return { ...list, schedules: list.items }
}

export function useGradingSessions(
  scheduleId: Ref<string>,
  status: Ref<string>,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-grading', 'sessions'],
    filters: { scheduleId, status },
    fetchPage: async (current, limit) =>
      (
        await examGradingApi.getSessions(scheduleId.value, {
          page: current,
          limit,
          status:
            status.value === 'ALL'
              ? undefined
              : (status.value as ExamSessionStatus),
        })
      ).data,
    errorMessage: 'Gagal memuat daftar siswa.',
  })
  return { ...list, sessions: list.items }
}
