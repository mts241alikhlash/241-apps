import type { components } from '@mts241alikhlash/exam-api'

export type AttendanceFile = components['schemas']['AttendanceFileDto']
export type AttendanceKind = AttendanceFile['kind']

export interface AttendanceTarget {
  key: string
  label: string
  roomId?: string
  slotId?: string
  day: string
}

export interface AttendanceFailure {
  key: string
  label: string
  error: string
}
