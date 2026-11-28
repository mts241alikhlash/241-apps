import { toast } from 'vue-sonner'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import type { Outcome } from '@/features/exam-room/services/examRoomService'
import { examOfflineApi } from '../api/examOfflineApi'
import {
  SCORES_MISSING_CODE,
  type OfflineImportResult,
  type OfflinePublicationCounts,
  type OfflineRosterRow,
  type OfflineSchedule,
  type SaveOfflineScorePayload,
} from '../types'

export type SaveOutcome =
  | { success: true; data: OfflineRosterRow }
  | { success: false; error: string; code?: string }

export type PublishOutcome =
  | { success: true; data: OfflinePublicationCounts }
  | { success: false; error: string; missing: boolean }

const codeOf = (err: unknown): string | undefined => {
  const code = (err as { response?: { data?: { code?: unknown } } } | null)
    ?.response?.data?.code
  return typeof code === 'string' ? code : undefined
}

async function attempt<T>(
  call: () => Promise<T>,
  fallback: string,
): Promise<Outcome<T>> {
  try {
    return { success: true, data: await call() }
  } catch (err: unknown) {
    return { success: false, error: messageOf(err, fallback) }
  }
}

export const examOfflineService = {
  loadSchedules: (): Promise<Outcome<OfflineSchedule[]>> =>
    attempt(
      async () => (await examOfflineApi.schedules()) ?? [],
      'Gagal memuat ujian offline.',
    ),

  loadRoster: (scheduleId: string): Promise<Outcome<OfflineRosterRow[]>> =>
    attempt(
      async () => (await examOfflineApi.roster(scheduleId)) ?? [],
      'Gagal memuat daftar siswa.',
    ),

  async save(
    scheduleId: string,
    studentId: string,
    body: SaveOfflineScorePayload,
  ): Promise<SaveOutcome> {
    try {
      return {
        success: true,
        data: await examOfflineApi.save(scheduleId, studentId, body),
      }
    } catch (err: unknown) {
      const code = codeOf(err)
      return {
        success: false,
        error: messageOf(err, 'Gagal menyimpan nilai.'),
        ...(code === undefined ? {} : { code }),
      }
    }
  },

  importScores: (
    scheduleId: string,
    file: File,
  ): Promise<Outcome<OfflineImportResult>> =>
    attempt(
      () => examOfflineApi.importScores(scheduleId, file),
      'Gagal mengimpor nilai.',
    ),

  async downloadSheet(scheduleId: string): Promise<boolean> {
    try {
      const { blob, fileName } = await examOfflineApi.sheet(scheduleId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal mengunduh lembar nilai.'))
      return false
    }
  },

  async publish(
    scheduleId: string,
    confirmMissing: boolean,
  ): Promise<PublishOutcome> {
    try {
      return {
        success: true,
        data: await examOfflineApi.publish(
          scheduleId,
          confirmMissing ? { confirmMissing: true } : {},
        ),
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal mengirim nilai ke penilaian.'),
        missing: codeOf(err) === SCORES_MISSING_CODE,
      }
    }
  },
}
