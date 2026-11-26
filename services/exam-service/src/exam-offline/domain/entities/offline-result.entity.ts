export const OFFLINE_PUBLICATION_STATUSES = [
  'PENDING',
  'SENT',
  'FAILED',
] as const
export type OfflinePublicationStatus =
  (typeof OFFLINE_PUBLICATION_STATUSES)[number]

export const OFFLINE_STUDENT_STATES = ['SCORED', 'ABSENT', 'MISSING'] as const
export type OfflineStudentState = (typeof OFFLINE_STUDENT_STATES)[number]

export interface OfflineResult {
  id: string
  scheduleId: string
  studentId: string
  rawScore: number | null
  note: string
  enteredById: string
  enteredAt: Date
  updatedAt: Date
  publicationStatus: OfflinePublicationStatus | null
  publicationAttempts: number
  publicationError: string | null
  lastAttemptAt: Date | null
  sentAt: Date | null
}

export interface OfflineRosterRow {
  studentId: string
  participantNumber: string | null
  name: string | null
  state: OfflineStudentState
  rawScore: number | null
  note: string | null
  publication: OfflinePublicationStatus | null
}

export interface OfflineScheduleRow {
  scheduleId: string
  activityId: string
  subjectName: string | null
  classroomName: string | null
  offlineKind: 'WRITTEN' | 'PRACTICAL'
  maxScore: number
  startsAt: Date
  endsAt: Date
  registered: number
  scored: number
  absent: number
  missing: number
  published: number
}
