import type { components } from '@mts241alikhlash/hr-api'
export type SalaryComponent =
  components['schemas']['SalaryComponentResponseDto']
export type SalaryComponentType = SalaryComponent['type']
export type AttendanceDriver = NonNullable<SalaryComponent['driver']>

export interface CreateSalaryComponentPayload {
  code: string
  name: string
  type: SalaryComponentType
  driver?: AttendanceDriver | null
}

export interface UpdateSalaryComponentPayload {
  code?: string
  name?: string
  type?: SalaryComponentType
  driver?: AttendanceDriver | null
  isActive?: boolean
}

export type SalaryComponentSavePayload = CreateSalaryComponentPayload & {
  isActive?: boolean
}

export const COMPONENT_TYPE_LABEL: Record<SalaryComponentType, string> = {
  BASE: 'Gaji Pokok',
  ALLOWANCE: 'Tunjangan',
  ATTENDANCE_DRIVEN: 'Berbasis Kehadiran',
  DEDUCTION: 'Potongan',
}

export const DRIVER_LABEL: Record<AttendanceDriver, string> = {
  PRESENT_DAYS: 'Jumlah hari hadir',
  ABSENT_DAYS: 'Jumlah hari alpa',
  LATE_COUNT: 'Jumlah keterlambatan',
  LATE_MINUTES: 'Total menit terlambat',
  EARLY_LEAVE_COUNT: 'Jumlah pulang cepat',
  LEAVE_DAYS: 'Jumlah hari izin',
  OFFICIAL_DUTY_DAYS: 'Jumlah hari dinas luar',
}

export const DEDUCTION_TYPES: SalaryComponentType[] = ['DEDUCTION']
export const DRIVABLE_TYPES: SalaryComponentType[] = [
  'ATTENDANCE_DRIVEN',
  'DEDUCTION',
]
