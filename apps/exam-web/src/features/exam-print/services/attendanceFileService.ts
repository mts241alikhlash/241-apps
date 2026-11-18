import { toast } from 'vue-sonner'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import type { Outcome } from '@/features/exam-room/services/examRoomService'
import { attendanceFileApi } from '../api/attendanceFileApi'
import type {
  AttendanceFile,
  AttendanceKind,
  AttendanceTarget,
} from '../attendanceFileTypes'

const KIND_LABEL: Record<AttendanceKind, string> = {
  STUDENT: 'daftar hadir peserta',
  SUPERVISOR: 'daftar hadir pengawas',
  TECHNICIAN: 'daftar hadir teknisi',
}

export const attendanceFileService = {
  async uploadAttendanceFile(
    eventId: string,
    kind: AttendanceKind,
    target: AttendanceTarget,
    file: File,
  ): Promise<Outcome<AttendanceFile>> {
    try {
      const data = await attendanceFileApi.upload(eventId, kind, target, file)
      return { success: true, data }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, `Gagal mengunggah ${KIND_LABEL[kind]}.`),
      }
    }
  },

  async listAttendanceFiles(
    eventId: string,
    query?: { kind?: AttendanceKind; day?: string },
  ): Promise<Outcome<AttendanceFile[]>> {
    try {
      return {
        success: true,
        data: (await attendanceFileApi.list(eventId, query)) ?? [],
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal memuat berkas daftar hadir.'),
      }
    }
  },

  async downloadAttendanceFile(
    eventId: string,
    file: Pick<AttendanceFile, 'id' | 'originalName'>,
  ): Promise<void> {
    try {
      const blob = await attendanceFileApi.download(eventId, file.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.originalName
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal mengunduh berkas daftar hadir.'))
    }
  },
}
