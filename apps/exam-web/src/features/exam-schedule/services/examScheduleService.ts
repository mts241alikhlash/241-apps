import { toast } from 'vue-sonner'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examPackageApi } from '@/features/exam-package/api/examPackageApi'
import type { ExamPackageSummary } from '@/features/exam-package/types'
import { classroomApi, type Classroom } from '@/features/lookup/classroom'
import { examEventService } from '@/features/exam-event/services/examEventService'
import type { ExamEvent } from '@/features/exam-event/types'
import { semesterApi } from '@/features/lookup/semester'
import { examScheduleApi } from '../api/examScheduleApi'
import type {
  AccessCode,
  SessionAuditEntry,
  Absentee,
  ExamSchedule,
  MakeupCreatePayload,
  MakeupParticipant,
  MakeupParticipantInput,
  ScheduleCreatePayload,
  SchedulePayload,
  ScheduleSession,
} from '../types'

export type SaveResult =
  { success: true; data: ExamSchedule } | { success: false; error: string }

export type AccessCodeResult =
  { success: true; data: AccessCode } | { success: false; error: string }

export type Outcome<T> =
  { success: true; data: T } | { success: false; error: string }

export type SaveTarget = { mode: 'create' } | { mode: 'edit'; id: string }

export const examScheduleService = {
  async loadPackages(): Promise<ExamPackageSummary[]> {
    try {
      const responses = await Promise.all(
        (['APPROVED', 'LOCKED'] as const).map((status) =>
          examPackageApi.getPackages({
            status,
            limit: PAGINATION.REFERENCE_LIMIT,
          }),
        ),
      )
      return responses
        .flatMap((response) => response.data)
        .sort((a, b) => a.title.localeCompare(b.title))
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar paket.'))
      return []
    }
  },

  async loadClassrooms(gradeId: string): Promise<Classroom[]> {
    try {
      const semesters = await semesterApi.getSemesters({
        isActive: true,
        limit: 1,
      })
      const academicYearId = semesters.data[0]?.academicYearId
      if (!academicYearId) return []
      const response = await classroomApi.getClassrooms({
        gradeId,
        academicYearId,
        isActive: true,
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      return response.data
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar kelas.'))
      return []
    }
  },

  async loadEvents(): Promise<ExamEvent[]> {
    try {
      const semesters = await semesterApi.getSemesters({
        isActive: true,
        limit: 1,
      })
      const semesterId = semesters.data[0]?.id
      if (!semesterId) return []
      return await examEventService.loadEventOptions(semesterId)
    } catch {
      return []
    }
  },

  async saveSchedule(
    target: SaveTarget,
    payload: ScheduleCreatePayload | SchedulePayload,
  ): Promise<SaveResult> {
    try {
      const response =
        target.mode === 'create'
          ? await examScheduleApi.createSchedule(
              payload as ScheduleCreatePayload,
            )
          : await examScheduleApi.updateSchedule(target.id, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal menyimpan jadwal.'),
      }
    }
  },

  async loadAbsentees(id: string): Promise<Outcome<Absentee[]>> {
    try {
      const response = await examScheduleApi.getAbsentees(id)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal memuat siswa yang belum mengerjakan.'),
      }
    }
  },

  async createMakeup(
    id: string,
    payload: MakeupCreatePayload,
  ): Promise<Outcome<ExamSchedule>> {
    try {
      const response = await examScheduleApi.createMakeup(id, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal membuat ujian susulan.'),
      }
    }
  },

  async loadParticipants(id: string): Promise<Outcome<MakeupParticipant[]>> {
    try {
      const response = await examScheduleApi.getParticipants(id)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal memuat peserta susulan.'),
      }
    }
  },

  async addParticipants(
    id: string,
    participants: MakeupParticipantInput[],
  ): Promise<Outcome<null>> {
    try {
      await examScheduleApi.addParticipants(id, participants)
      return { success: true, data: null }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal menambah peserta susulan.'),
      }
    }
  },

  async removeParticipant(
    id: string,
    studentId: string,
  ): Promise<Outcome<null>> {
    try {
      await examScheduleApi.removeParticipant(id, studentId)
      return { success: true, data: null }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal menghapus peserta susulan.'),
      }
    }
  },

  async cancelSchedule(id: string): Promise<boolean> {
    try {
      await examScheduleApi.cancelSchedule(id)
      toast.success('Jadwal dibatalkan.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal membatalkan jadwal.'))
      return false
    }
  },

  async loadAccessCode(id: string): Promise<AccessCodeResult> {
    try {
      const response = await examScheduleApi.getAccessCode(id)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal memuat token ujian.'),
      }
    }
  },

  async rotateAccessCode(id: string): Promise<AccessCodeResult> {
    try {
      const response = await examScheduleApi.rotateAccessCode(id)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal mengganti token ujian.'),
      }
    }
  },

  async loadSessions(
    id: string,
  ): Promise<
    | { success: true; data: ScheduleSession[]; total: number }
    | { success: false; error: string }
  > {
    try {
      const response = await examScheduleApi.getSessions(id, {
        page: 1,
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      const data = response.data
      return {
        success: true,
        data,
        total: response.meta.total || data.length,
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal memuat daftar sesi.'),
      }
    }
  },

  async releaseSession(sessionId: string, reason: string): Promise<boolean> {
    try {
      await examScheduleApi.releaseSession(sessionId, reason)
      toast.success('Sesi dilepas. Siswa bisa masuk lagi dengan token.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal melepas sesi.'))
      return false
    }
  },

  async resetSession(sessionId: string, reason: string): Promise<boolean> {
    try {
      await examScheduleApi.resetSession(sessionId, reason)
      toast.success('Sesi direset. Siswa mulai dari awal dengan token baru.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal mereset sesi.'))
      return false
    }
  },

  async loadSessionAudit(sessionId: string): Promise<SessionAuditEntry[]> {
    try {
      const response = await examScheduleApi.getSessionAuditLogs(sessionId)
      return response
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal memuat riwayat sesi.'))
      return []
    }
  },
}
