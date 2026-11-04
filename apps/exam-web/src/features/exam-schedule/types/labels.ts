import type {
  ExamScheduleStatus,
  MakeupReason,
  MakeupRefusal,
  ParticipantStatus,
  ExamType,
  ExamSessionStatus,
  SchedulePhase,
} from './schedule'

export type PhaseTone = 'neutral' | 'info' | 'success' | 'warning'

const STATUS_LABELS: Record<ExamScheduleStatus, string> = {
  SCHEDULED: 'Terjadwal',
  CANCELLED: 'Dibatalkan',
}

const PHASE_LABELS: Record<SchedulePhase, string> = {
  CANCELLED: 'Dibatalkan',
  UPCOMING: 'Belum mulai',
  RUNNING: 'Berlangsung',
  ENDED: 'Selesai',
}

const PHASE_TONES: Record<SchedulePhase, PhaseTone> = {
  CANCELLED: 'warning',
  UPCOMING: 'info',
  RUNNING: 'success',
  ENDED: 'neutral',
}

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  UH: 'Ulangan Harian',
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Tugas',
  UTS: 'UTS',
  UAS: 'UAS',
}

export const examTypeLabel = (type: ExamType): string => EXAM_TYPE_LABELS[type]

export const scheduleStatusLabel = (status: ExamScheduleStatus): string =>
  STATUS_LABELS[status]

export const phaseLabel = (phase: SchedulePhase): string => PHASE_LABELS[phase]

export const phaseTone = (phase: SchedulePhase): PhaseTone => PHASE_TONES[phase]

const SESSION_LABELS: Record<ExamSessionStatus, string> = {
  IN_PROGRESS: 'Mengerjakan',
  SUBMITTED: 'Menunggu penilaian',
  EXPIRED: 'Waktu habis',
  GRADED: 'Selesai dinilai',
}

export const sessionStatusLabel = (status: ExamSessionStatus): string =>
  SESSION_LABELS[status]

const REASON_LABELS: Record<MakeupReason, string> = {
  SICK: 'Sakit',
  PERMITTED: 'Izin',
  ABSENT: 'Tanpa keterangan',
  OTHER: 'Lainnya',
}

const REFUSAL_LABELS: Record<MakeupRefusal, string> = {
  ALREADY_SAT: 'Sudah mengikuti ujian',
  IN_PROGRESS: 'Sedang mengerjakan',
  ON_LIVE_MAKEUP: 'Sudah di susulan lain',
}

const PARTICIPANT_LABELS: Record<ParticipantStatus, string> = {
  WAITING: 'Menunggu',
  SAT_REGULAR: 'Sudah ikut ujian utama',
  IN_PROGRESS: 'Mengerjakan',
  DONE: 'Selesai',
}

export const reasonLabel = (reason: MakeupReason): string =>
  REASON_LABELS[reason]

export const refusalLabel = (refusal: MakeupRefusal): string =>
  REFUSAL_LABELS[refusal]

export const participantStatusLabel = (status: ParticipantStatus): string =>
  PARTICIPANT_LABELS[status]
