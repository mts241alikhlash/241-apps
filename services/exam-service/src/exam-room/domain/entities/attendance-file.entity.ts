export const ATTENDANCE_KINDS = ['STUDENT', 'SUPERVISOR', 'TECHNICIAN'] as const

export type AttendanceKind = (typeof ATTENDANCE_KINDS)[number]

export interface AttendanceFile {
  id: string
  eventId: string
  kind: AttendanceKind
  roomId: string | null
  slotId: string | null
  day: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  originalName: string
  uploadedById: string
  uploadedAt: Date
}

export type NewAttendanceFile = Omit<AttendanceFile, 'id'>
