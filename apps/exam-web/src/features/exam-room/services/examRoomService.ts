import { toast } from 'vue-sonner'
import { examRoomApi } from '../api/examRoomApi'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import type {
  Letterhead,
  MonitorAbilities,
  RoomAbsencePayload,
  RoomFieldNotePayload,
  RoomMonitorMeta,
  RoomMonitorParticipant,
  RoomMonitorQuery,
  RoomOverview,
  RoomReport,
  RoomReportPayload,
  SessionTimelineEntry,
  SupervisorSlotRow,
} from '../types'

export type Outcome<T> =
  { success: true; data: T } | { success: false; error: string }

export interface MonitorPage {
  data: RoomMonitorParticipant[]
  meta: RoomMonitorMeta | null
}

export interface RosterPage {
  data: RoomMonitorParticipant[]
  meta: RoomMonitorMeta | null
  total: number
}

const ROSTER_PAGE_LIMIT = 100

const failure = <T>(err: unknown, fallback: string): Outcome<T> => ({
  success: false,
  error: messageOf(err, fallback),
})

export const examRoomService = {
  async loadOverview(eventId?: string): Promise<Outcome<RoomOverview[]>> {
    try {
      const response = await examRoomApi.getOverview(
        eventId === undefined ? undefined : { eventId },
      )
      return { success: true, data: response ?? [] }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat daftar ruangan.')
    }
  },

  async loadMonitor(
    roomId: string,
    query: RoomMonitorQuery,
  ): Promise<MonitorPage> {
    try {
      const response = await examRoomApi.getMonitor(roomId, query)
      return {
        data: response.data,
        meta: response.meta.room ? response.meta : null,
      }
    } catch {
      throw new Error('monitor-failed')
    }
  },

  async loadRoster(roomId: string, slotId: string): Promise<RosterPage> {
    const collected: RoomMonitorParticipant[] = []
    const seen = new Set<string>()
    let page = 1
    for (;;) {
      const result = await examRoomService.loadMonitor(roomId, {
        page,
        limit: ROSTER_PAGE_LIMIT,
        ...(slotId === '' ? {} : { slotId }),
      })
      const added = result.data.filter((row) => !seen.has(row.studentId))
      for (const row of added) {
        seen.add(row.studentId)
        collected.push(row)
      }
      const total = result.meta?.total ?? collected.length
      if (
        result.data.length === 0 ||
        added.length === 0 ||
        collected.length >= total
      ) {
        return { data: collected, meta: result.meta, total }
      }
      page += 1
    }
  },

  async loadSupervisors(roomId: string): Promise<SupervisorSlotRow[]> {
    try {
      const response = await examRoomApi.getSupervisors(roomId)
      return response ?? []
    } catch {
      return []
    }
  },

  async loadTimeline(
    sessionId: string,
  ): Promise<Outcome<SessionTimelineEntry[]>> {
    try {
      const response = await examRoomApi.getTimeline(sessionId)
      return { success: true, data: response ?? [] }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat riwayat kejadian.')
    }
  },

  async releaseSession(sessionId: string, reason: string): Promise<boolean> {
    try {
      await examRoomApi.releaseSession(sessionId, reason)
      toast.success('Perangkat siswa dilepas.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal melepas perangkat.'))
      return false
    }
  },

  async reopenSession(sessionId: string, reason: string): Promise<boolean> {
    try {
      await examRoomApi.reopenSession(sessionId, reason)
      toast.success('Sesi dibuka kembali dengan jawaban tersimpan.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal membuka kembali sesi.'))
      return false
    }
  },

  async resetSession(sessionId: string, reason: string): Promise<boolean> {
    try {
      await examRoomApi.resetSession(sessionId, reason)
      toast.success('Sesi direset. Siswa mulai dari awal.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal mereset sesi.'))
      return false
    }
  },

  async extendTime(
    sessionId: string,
    minutes: number,
    reason: string,
  ): Promise<boolean> {
    try {
      await examRoomApi.extendSessionTime(sessionId, minutes, reason)
      toast.success(`Waktu ditambah ${minutes} menit.`)
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal menambah waktu.'))
      return false
    }
  },

  async allowWeb(
    roomId: string,
    studentId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      await examRoomApi.allowWeb(roomId, studentId, reason)
      toast.success('Mode web diizinkan untuk siswa ini.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal mengizinkan mode web.'))
      return false
    }
  },

  async allowLate(
    roomId: string,
    studentId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      await examRoomApi.allowLate(roomId, studentId, reason)
      toast.success('Siswa diizinkan masuk terlambat.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal mengizinkan masuk terlambat.'))
      return false
    }
  },

  async loadReport(
    roomId: string,
    slotId: string,
  ): Promise<Outcome<RoomReport>> {
    try {
      const response = await examRoomApi.getReport(roomId, slotId)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memuat berita acara.')
    }
  },

  async saveReport(
    roomId: string,
    slotId: string,
    payload: RoomReportPayload,
  ): Promise<Outcome<RoomReport>> {
    try {
      const response = await examRoomApi.saveReport(roomId, slotId, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal menyimpan berita acara.')
    }
  },

  async recordAbsence(
    roomId: string,
    slotId: string,
    payload: RoomAbsencePayload,
  ): Promise<Outcome<RoomReport>> {
    try {
      const response = await examRoomApi.recordAbsence(roomId, slotId, payload)
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal mencatat ketidakhadiran.')
    }
  },

  async recordFieldNote(
    roomId: string,
    slotId: string,
    payload: RoomFieldNotePayload,
  ): Promise<Outcome<RoomReport>> {
    try {
      const response = await examRoomApi.recordFieldNote(
        roomId,
        slotId,
        payload,
      )
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal mencatat pelanggaran fisik.')
    }
  },

  async submitReport(
    roomId: string,
    slotId: string,
  ): Promise<Outcome<RoomReport>> {
    try {
      const response = await examRoomApi.submitReport(roomId, slotId)
      toast.success('Berita acara diserahkan dan dikunci.')
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal menyerahkan berita acara.')
    }
  },

  async verifyReport(
    roomId: string,
    slotId: string,
  ): Promise<Outcome<RoomReport>> {
    try {
      const response = await examRoomApi.verifyReport(roomId, slotId)
      toast.success('Berita acara diverifikasi.')
      return { success: true, data: response }
    } catch (err: unknown) {
      return failure(err, 'Gagal memverifikasi berita acara.')
    }
  },

  async loadLetterhead(): Promise<Letterhead> {
    try {
      const response = await examRoomApi.getLetterhead()
      return response ?? { name: '', address: '', nsm: null, npsn: null }
    } catch {
      return { name: '', address: '', nsm: null, npsn: null }
    }
  },
}

export const abilitiesFor = (
  hasPermission: (permission: string) => boolean,
): MonitorAbilities => ({
  supervise:
    hasPermission('exam-rooms.supervise') ||
    hasPermission('exam-rooms.manage-all'),
  recover:
    hasPermission('exam-rooms.technician') ||
    hasPermission('exam-rooms.manage-all'),
})
