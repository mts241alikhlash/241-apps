import type { Ref } from 'vue'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import { examScoreApi } from '../api/examScoreApi'

export function useScoreList(
  page: Ref<number>,
  pageSize: Ref<number>,
  semesterId: Ref<string>,
) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-score', 'scores'],
    filters: { semesterId },
    fetchPage: async (current, limit) =>
      (
        await examScoreApi.getScores({
          page: current,
          limit,
          ...(semesterId.value ? { semesterId: semesterId.value } : {}),
        })
      ).data,
    errorMessage: 'Gagal memuat nilai ujian.',
  })
  return { ...list, scores: list.items }
}
