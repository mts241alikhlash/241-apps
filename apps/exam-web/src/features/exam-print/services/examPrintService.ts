import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examPrintApi } from '../api/examPrintApi'
import type { PrintPack, PrintSchedule } from '../types'

export type PrintOutcome<T> =
  { success: true; data: T } | { success: false; error: string }

const failure = <T>(err: unknown, fallback: string): PrintOutcome<T> => ({
  success: false,
  error: messageOf(err, fallback),
})

export const examPrintService = {
  async loadPack(eventId: string): Promise<PrintOutcome<PrintPack>> {
    try {
      return { success: true, data: await examPrintApi.getPrintPack(eventId) }
    } catch (err: unknown) {
      return failure(err, 'Data cetak tidak dapat dimuat.')
    }
  },

  async loadSchedules(eventId: string): Promise<PrintOutcome<PrintSchedule[]>> {
    try {
      const page = await examPrintApi.getSchedules(eventId)
      return {
        success: true,
        data: page.data.filter((schedule) => schedule.status === 'SCHEDULED'),
      }
    } catch (err: unknown) {
      return failure(err, 'Jadwal ujian tidak dapat dimuat.')
    }
  },
}
