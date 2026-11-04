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

export interface RoomOverview {
  id: string
  eventId: string
  code: string
  name: string
  building: string | null
  capacity: number
  registeredCount: number
  technicianName: string | null
  currentSupervisorName: string | null
  isSubstituted: boolean
  isActiveNow: boolean
}

export interface RoomMonitorSession {
  sessionId: string
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED'
  startedAt: string
  deadline: string
  submittedAt: string | null
  extraMinutes: number
  answeredCount: number
  syncedAnswerCount: number
  unsyncedCount: number
  lastSeenAt: string | null
  batteryLevel: number | null
  isCharging: boolean | null
  kioskMode: string
  allowWebClient: boolean
  violationCount: number
  lockedByViolation: boolean
  requiresTokenReentry: boolean
  lastEvent: { type: string; occurredAt: string; detail: string | null } | null
  latestSnapshotUrl: string | null
  lastSnapshotAt: string | null
  cameraBlocked: string | null
}

export const CAMERA_BLOCKED_REASONS = [
  'network',
  'permission',
  'battery',
  'stopped',
  'hardware',
  'cameraBusy',
] as const

export type CameraBlockedReason = (typeof CAMERA_BLOCKED_REASONS)[number]

const CAMERA_BLOCKED_LABELS: Record<CameraBlockedReason, string> = {
  network: 'Jaringan bermasalah',
  permission: 'Izin kamera ditolak',
  battery: 'Baterai lemah',
  stopped: 'Dihentikan siswa',
  hardware: 'Kamera bermasalah',
  cameraBusy: 'Kamera dipakai aplikasi lain',
}

export const cameraBlockedLabel = (reason: string): string =>
  CAMERA_BLOCKED_LABELS[reason as CameraBlockedReason] ?? reason

export interface RoomCameraSeat {
  sessionId: string
  studentName: string | null
  nis: string | null
  lastSnapshotAt: string | null
  cameraBlocked: string | null
  latestSnapshotUrl: string | null
}

export interface ProctorSnapshotEvidence {
  id: string
  sessionId: string
  kind: 'SESSION_START' | 'VIOLATION_RETURN' | 'PERIODIC_EVIDENCE'
  sizeBytes: number
  capturedAt: string
  expiresAt: string
  createdAt: string
}

export interface RoomMonitorAbsence {
  reason: string
  note: string | null
}

export interface RoomMonitorParticipant {
  seatNumber: number
  studentId: string
  studentName: string | null
  nis: string | null
  classroomName: string | null
  subjectName: string | null
  packageTitle: string
  scheduleId: string
  totalQuestions: number
  session: RoomMonitorSession | null
  absence: RoomMonitorAbsence | null
}

export interface RoomMonitorSummary {
  totalRegistered: number
  notStartedCount: number
  inProgressCount: number
  offlineOrUnsyncedCount: number
  lockedOrViolationCount: number
  finishedCount: number
  absentMarkedCount: number
}

export interface RoomMonitorRoom {
  id: string
  code: string
  name: string
  capacity: number
  technicianName: string | null
  currentSupervisorName: string | null
  scheduledSupervisorName: string | null
  isSubstituted: boolean
}

export interface RoomMonitorToken {
  accessCode: string
  expiresAt: string
  rotation: number
}

export interface RoomMonitorMeta {
  page: number
  limit: number
  total: number
  serverTime: string
  room: RoomMonitorRoom
  token: RoomMonitorToken | null
  summary: RoomMonitorSummary
}

export interface RoomMonitorQuery {
  page?: number
  limit?: number
  search?: string
  status?: MonitorStatus
  classroomId?: string
  slotId?: string
}

export interface SessionTimelineEntry {
  id: string
  kind: 'EVENT' | 'AUDIT'
  occurredAt: string
  type: string | null
  action: string | null
  isViolation: boolean
  detail: string | null
  actorId: string | null
  reason: string | null
  metadata: Record<string, unknown>
}

export interface RoomReportSchedule {
  scheduleId: string
  packageTitle: string
  subjectName: string | null
  classroomName: string | null
  startsAt: string
  endsAt: string
  registeredCount: number
  startedCount: number
  submittedCount: number
  absentCount: number
}

export interface RoomReportAbsence {
  id: string
  studentId: string
  studentName: string | null
  nis: string | null
  scheduleId: string
  reason: string
  note: string | null
  updatedAt: string
}

export interface RoomReportFieldNote {
  id: string
  studentId: string
  studentName: string | null
  sessionId: string | null
  category: string
  note: string
  recordedAt: string
}

export interface RoomReportAudit {
  id: string
  sessionId: string | null
  action: string
  actorId: string
  reason: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface RoomReport {
  reportId: string
  roomId: string
  slotId: string
  status: RoomReportStatus
  condition: RoomExecutionCondition
  incidentNotes: string | null
  submittedAt: string | null
  verifiedAt: string | null
  slot: { startsAt: string; endsAt: string }
  schedules: RoomReportSchedule[]
  absences: RoomReportAbsence[]
  fieldNotes: RoomReportFieldNote[]
  auditLogs: RoomReportAudit[]
}

export interface RoomReportPayload {
  condition?: RoomExecutionCondition
  incidentNotes?: string
  reopen?: boolean
}

export interface RoomAbsencePayload {
  studentId: string
  scheduleId: string
  reason: string
  note?: string
}

export interface RoomFieldNotePayload {
  studentId: string
  sessionId?: string
  category: string
  note: string
}

export interface Letterhead {
  name: string | null
  address: string
  nsm: string | null
  npsn: string | null
}

export interface SupervisorSlotRow {
  slotId: string
  roomId: string
  scheduledUserId: string
  actualUserId: string
  startsAt: string
  endsAt: string
}

export type RecoveryAction =
  'release' | 'reopen' | 'reset' | 'extend-time' | 'allow-web' | 'allow-late'

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
