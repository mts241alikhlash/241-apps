import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { studentEnrollmentApi } from '@/features/lookup/classroom'
import type { StudentEnrollment } from '@/features/lookup/classroom'
import { examEventApi } from '../api/examEventApi'
import { staffApi } from './staffApi'
import type {
  EventCreatePayload,
  EventQueryParams,
  EventUpdatePayload,
  ExamEvent,
  ExamRoom,
  RoomAccessCode,
  RoomCreatePayload,
  RoomSeat,
  RoomUpdatePayload,
  SeatAssignPayload,
  SeatFlag,
  SupervisorSlot,
  UserOption,
  AuditLogEntry,
} from '../types'

export type Outcome<T> =
  { success: true; data: T } | { success: false; error: string }

export interface SeatedStudent extends RoomSeat {
  name: string | null
  nis: string | null
  classroomName: string | null
}

export interface CandidateStudent {
  studentId: string
  classroomId: string
  name: string | null
  nis: string | null
  classroomName: string | null
}

const failure = <T>(err: unknown, fallback: string): Outcome<T> => ({
  success: false,
  error: messageOf(err, fallback),
})

const toCandidate = (row: StudentEnrollment): CandidateStudent => ({
  studentId: row.studentId,
  classroomId: row.classroomId,
  name: row.student?.user?.profile?.name ?? null,
  nis: null,
  classroomName: row.classroom?.displayName ?? null,
})

export const examEventService = {
  async loadEvents(params?: EventQueryParams): Promise<Outcome<ExamEvent[]>> {
    try {
      const response = await examEventApi.getEvents(params)
      return { success: true, data: response.data }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat kegiatan ujian.')
    }
  },

  async loadEventOptions(semesterId: string): Promise<ExamEvent[]> {
    const result = await examEventService.loadEvents({
      semesterId,
      status: 'ACTIVE',
      limit: 1000,
    })
    return result.success ? result.data : []
  },

  async loadEvent(id: string): Promise<Outcome<ExamEvent>> {
    try {
      const response = await examEventApi.getEvent(id)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat kegiatan ujian.')
    }
  },

  async saveEvent(
    target: { mode: 'create' } | { mode: 'edit'; id: string },
    payload: EventCreatePayload | EventUpdatePayload,
  ): Promise<Outcome<ExamEvent>> {
    try {
      const response =
        target.mode === 'create'
          ? await examEventApi.createEvent(payload as EventCreatePayload)
          : await examEventApi.updateEvent(target.id, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal menyimpan kegiatan ujian.')
    }
  },

  async loadRooms(eventId: string): Promise<Outcome<ExamRoom[]>> {
    try {
      const response = await examEventApi.getRooms(eventId)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat daftar ruangan.')
    }
  },

  async saveRoom(
    target:
      { mode: 'create'; eventId: string } | { mode: 'edit'; roomId: string },
    payload: RoomCreatePayload | RoomUpdatePayload,
  ): Promise<Outcome<ExamRoom>> {
    try {
      const response =
        target.mode === 'create'
          ? await examEventApi.createRoom(
              target.eventId,
              payload as RoomCreatePayload,
            )
          : await examEventApi.updateRoom(target.roomId, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal menyimpan ruangan.')
    }
  },

  async loadSeats(
    roomId: string,
    semesterId: string,
  ): Promise<Outcome<SeatedStudent[]>> {
    try {
      const [seats, candidates] = await Promise.all([
        examEventApi.getSeats(roomId),
        examEventService.loadCandidates(semesterId),
      ])
      const byStudent = new Map(
        candidates.map((row) => [row.studentId, row] as const),
      )
      return {
        success: true,
        data: seats.map((seat) => ({
          ...seat,
          name: byStudent.get(seat.studentId)?.name ?? null,
          nis: byStudent.get(seat.studentId)?.nis ?? null,
          classroomName: byStudent.get(seat.studentId)?.classroomName ?? null,
        })),
      }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat kursi siswa.')
    }
  },

  async assignSeats(
    roomId: string,
    students: SeatAssignPayload[],
  ): Promise<Outcome<RoomSeat[]>> {
    try {
      const response = await examEventApi.assignSeats(roomId, students)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal membagi kursi.')
    }
  },

  async distributeSeats(
    roomId: string,
    students: SeatAssignPayload[],
    roomIds: string[],
    interleaveByClassroom: boolean,
  ): Promise<Outcome<RoomSeat[]>> {
    try {
      const response = await examEventApi.distributeSeats(roomId, {
        students,
        roomIds,
        interleaveByClassroom,
      })
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal membagi kursi otomatis.')
    }
  },

  async loadSupervisors(roomId: string): Promise<Outcome<SupervisorSlot[]>> {
    try {
      const response = await examEventApi.getSupervisors(roomId)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat jadwal pengawas.')
    }
  },

  async substituteSupervisor(
    roomId: string,
    slotId: string,
    actualUserId: string,
    reason: string,
  ): Promise<Outcome<SupervisorSlot>> {
    try {
      const response = await examEventApi.substituteSupervisor(roomId, slotId, {
        actualUserId,
        reason,
      })
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal mengganti pengawas.')
    }
  },

  async loadAccessCode(roomId: string): Promise<Outcome<RoomAccessCode>> {
    try {
      const response = await examEventApi.getAccessCode(roomId)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat token ruangan.')
    }
  },

  async rotateToken(
    roomId: string,
    reason: string,
  ): Promise<Outcome<RoomAccessCode>> {
    try {
      const response = await examEventApi.rotateToken(roomId, { reason })
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memutar token ruangan.')
    }
  },

  async extendRoomTime(
    roomId: string,
    minutes: number,
    reason: string,
  ): Promise<boolean> {
    try {
      await examEventApi.extendRoomTime(roomId, { minutes, reason })
      toast.success(`Waktu ruangan ditambah ${minutes} menit.`)
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal menambah waktu ruangan.'))
      return false
    }
  },

  async allowLate(
    roomId: string,
    studentId: string,
    reason: string,
  ): Promise<Outcome<SeatFlag>> {
    try {
      const response = await examEventApi.allowLate(roomId, studentId, {
        reason,
      })
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal mengizinkan masuk terlambat.')
    }
  },

  async loadAuditLogs(roomId: string): Promise<AuditLogEntry[]> {
    try {
      const response = await examEventApi.getAuditLogs(roomId)
      return response
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat riwayat.'))
      return []
    }
  },

  async assignSupervisor(
    roomId: string,
    payload: {
      scheduledUserId: string
      startsAt: string
      endsAt: string
      reason: string
    },
  ): Promise<Outcome<SupervisorSlot>> {
    try {
      const response = await examEventApi.assignSupervisor(roomId, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal menyimpan jadwal pengawas.')
    }
  },

  async loadStaff(roleCode: string): Promise<UserOption[]> {
    try {
      const response = await staffApi.getUsers({
        roleCode,
        limit: 1000,
      })
      return response.data
        .map((row) => ({ id: row.id, identifier: row.identifier }))
        .sort((a, b) => a.identifier.localeCompare(b.identifier))
    } catch (err: unknown) {
      toast.error(
        getIndonesianErrorMessage(err, 'Gagal memuat daftar petugas.'),
      )
      return []
    }
  },

  async loadCandidates(
    semesterId: string,
    classroomId?: string,
  ): Promise<CandidateStudent[]> {
    try {
      const response = await studentEnrollmentApi.getEnrollments({
        semesterId,
        classroomId,
        status: 'ACTIVE',
        limit: 1000,
      })
      return response.data.map(toCandidate)
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar siswa.'))
      return []
    }
  },
}
