import { toast } from 'vue-sonner'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examGradingApi } from '../api/examGradingApi'
import type { GradePayload, GradingDetail, GradingItem } from '../types'

export type LoadResult =
  { success: true; data: GradingDetail } | { success: false; error: string }

export const examGradingService = {
  async loadSession(sessionId: string): Promise<LoadResult> {
    try {
      return { success: true, data: await examGradingApi.getSession(sessionId) }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal memuat jawaban siswa.'),
      }
    }
  },

  async grade(
    sessionId: string,
    questionId: string,
    payload: GradePayload,
  ): Promise<GradingItem | null> {
    try {
      const item = await examGradingApi.grade(sessionId, questionId, payload)
      toast.success('Nilai disimpan.')
      return item
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal menyimpan nilai.'))
      return null
    }
  },
}
