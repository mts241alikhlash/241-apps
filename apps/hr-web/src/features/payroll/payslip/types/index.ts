import type { components } from '@mts241alikhlash/hr-api'

type Schemas = components['schemas']

export type PayslipLine = Schemas['PayslipLineResponseDto']
export type PayslipAttendance = Schemas['PayslipAttendanceResponseDto']
export type Payslip = Schemas['PayslipResponseDto']

export const ATTENDANCE_LABEL: Record<keyof PayslipAttendance, string> = {
  presentDays: 'Hari hadir',
  absentDays: 'Hari alpa',
  lateCount: 'Keterlambatan',
  lateMinutes: 'Menit terlambat',
  earlyLeaveCount: 'Pulang cepat',
  leaveDays: 'Hari izin',
  officialDutyDays: 'Hari dinas luar',
}
