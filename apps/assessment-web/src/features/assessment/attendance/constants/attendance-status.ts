import type { AttendanceStatus } from '../types'

export const ATTENDANCE_STATUS_OPTIONS: {
  value: AttendanceStatus
  label: string
}[] = [
  { value: 'PRESENT', label: 'Hadir' },
  { value: 'SICK', label: 'Sakit' },
  { value: 'EXCUSED', label: 'Izin' },
  { value: 'ABSENT', label: 'Alpa' },
  { value: 'LATE', label: 'Terlambat' },
]

export function toAttendanceStatus(value: unknown): AttendanceStatus | null {
  const match = ATTENDANCE_STATUS_OPTIONS.find(
    (option) => option.value === value,
  )
  return match?.value ?? null
}
