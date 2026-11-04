import type { Ref } from 'vue'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import { examScoreApi } from '../api/examScoreApi'

export function useScoreList(page: Ref<number>, pageSize: Ref<number>) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-score', 'scores'],
    filters: {},
    fetchPage: async (current, limit) =>
      (await examScoreApi.getScores({ page: current, limit })).data,
    errorMessage: 'Gagal memuat nilai ujian.',
  })
  return { ...list, scores: list.items }
}
