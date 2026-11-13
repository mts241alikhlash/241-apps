import type { components as IdentityComponents } from '@mts241alikhlash/identity-api'
import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']
type IdentitySchemas = IdentityComponents['schemas']

export const MONITOR_STATUSES = [
  'ALL',
  'NOT_STARTED',
  'IN_PROGRESS',
  'LOCKED',
  'SUBMITTED',
  'ABSENT',
] as const

export type MonitorStatus = (typeof MONITOR_STATUSES)[number]

export const ROOM_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'VERIFIED'] as const

export type RoomReportStatus = (typeof ROOM_REPORT_STATUSES)[number]

export const ROOM_EXECUTION_CONDITIONS = [
  'SMOOTH',
  'TECHNICAL_ISSUE',
  'DISCIPLINARY_NOTE',
] as const

export type RoomExecutionCondition = (typeof ROOM_EXECUTION_CONDITIONS)[number]

export type RoomOverview = Schemas['RoomOverviewDto']

export type RoomMonitorSession = Schemas['RoomMonitorSessionDto']

export type RoomMonitorAbsence = Schemas['RoomMonitorAbsenceDto']

export type RoomMonitorParticipant = Schemas['RoomMonitorParticipantDto']

export type RoomMonitorSummary = Schemas['RoomMonitorSummaryDto']

export type RoomMonitorRoom = Schemas['RoomMonitorRoomDto']

export type RoomMonitorToken = Schemas['RoomMonitorTokenDto']

export type RoomMonitorMeta = Schemas['RoomMonitorMetaDto']

export interface RoomMonitorQuery {
  page?: number
  limit?: number
  search?: string
  status?: MonitorStatus
  classroomId?: string
  slotId?: string
}

export type SessionTimelineEntry = Schemas['SessionTimelineEntryDto']

export type RoomReportSchedule = Schemas['ReportScheduleDto']

export type RoomReportAbsence = Schemas['ReportAbsenceDto']

export type RoomReportFieldNote = Schemas['ReportFieldNoteDto']

export type RoomReportAudit = Schemas['ReportAuditDto']

export type RoomReport = Schemas['RoomReportDto']

export type RoomReportPayload = Schemas['UpdateRoomReportDto']

export type RoomAbsencePayload = Schemas['RecordRoomAbsenceDto']

export type RoomFieldNotePayload = Schemas['RecordRoomFieldNoteDto']

export type Letterhead = IdentitySchemas['SchoolUnitLetterheadResponseDto']

export type SupervisorSlotRow = Schemas['SupervisorSlotDto']

export type RecoveryAction =
  'release' | 'reopen' | 'reset' | 'extend-time' | 'allow-late'

export interface MonitorAbilities {
  supervise: boolean
  recover: boolean
}

const MONITOR_STATUS_LABELS: Record<MonitorStatus, string> = {
  ALL: 'Semua',
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Mengerjakan',
  LOCKED: 'Terkunci Pelanggaran',
  SUBMITTED: 'Terkumpul',
  ABSENT: 'Tidak Hadir',
}

const REPORT_STATUS_LABELS: Record<RoomReportStatus, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Diserahkan',
  VERIFIED: 'Terverifikasi',
}

const CONDITION_LABELS: Record<RoomExecutionCondition, string> = {
  SMOOTH: 'Berjalan lancar',
  TECHNICAL_ISSUE: 'Ada kendala teknis',
  DISCIPLINARY_NOTE: 'Ada catatan kedisiplinan',
}

const REASON_LABELS: Record<string, string> = {
  SICK: 'Sakit',
  PERMITTED: 'Izin',
  ABSENT: 'Tanpa keterangan',
  OTHER: 'Lainnya',
}

const EVENT_LABELS: Record<string, string> = {
  APP_EXIT: 'Keluar aplikasi',
  APP_BACKGROUND: 'Aplikasi ke latar',
  INCOMING_CALL: 'Panggilan masuk',
  SCREEN_OFF: 'Layar mati',
  CAMERA_PERMISSION: 'Izin kamera ditolak',
  OVERLAY_DETECTED: 'Overlay terdeteksi',
  RELEASE_DEVICE: 'Lepas perangkat',
  REOPEN_SESSION: 'Buka kembali sesi',
  RESET_SESSION: 'Reset sesi',
  EXTEND_SESSION_TIME: 'Tambah waktu',
  ALLOW_WEB_CLIENT: 'Izinkan mode web',
  ALLOW_LATE_ENTRY: 'Izinkan masuk terlambat',
  SUBMIT_ROOM_REPORT: 'Serahkan berita acara',
  VERIFY_ROOM_REPORT: 'Verifikasi berita acara',
  REOPEN_ROOM_REPORT: 'Buka berita acara',
  CLOSED_BY_ADMIN: 'Ditutup admin',
  CALL_SUSPENDED: 'Ujian dijeda karena panggilan',
  ABSENCE_GAP: 'Hilang sementara',
}

export const monitorStatusLabel = (status: MonitorStatus): string =>
  MONITOR_STATUS_LABELS[status]

export const reportStatusLabel = (status: RoomReportStatus): string =>
  REPORT_STATUS_LABELS[status]

export const conditionLabel = (condition: RoomExecutionCondition): string =>
  CONDITION_LABELS[condition]

export const reasonLabel = (reason: string): string =>
  REASON_LABELS[reason] ?? reason

export const eventLabel = (type: string | null): string =>
  type === null ? 'Kejadian' : (EVENT_LABELS[type] ?? type)
