import type { AttendanceKind } from '../entities/attendance-file.entity.js'

export interface AttendanceScope {
  eventId: string
  kind: AttendanceKind
  roomId: string | null
  slotId: string | null
  day: string
}

export function attendanceScopeKey(scope: AttendanceScope): string {
  return [
    scope.eventId,
    scope.kind,
    scope.roomId ?? '-',
    scope.slotId ?? '-',
    scope.day,
  ].join(':')
}

export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export function wibDay(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

const FILE_LABELS: Record<AttendanceKind, string> = {
  STUDENT: 'peserta',
  SUPERVISOR: 'pengawas',
  TECHNICIAN: 'teknisi',
}

export function attendanceFileName(
  kind: AttendanceKind,
  roomCode: string | null,
  uploadedAt: Date,
  extension: string,
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(uploadedAt)
      .map((part) => [part.type, part.value]),
  )
  const stamp = `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`
  const code = roomCode?.replace(/[^A-Za-z0-9_-]/g, '') ?? ''
  const middle = code === '' ? '' : `${code}-`
  return `daftar-hadir-${FILE_LABELS[kind]}-${middle}${stamp}.${extension}`
}
