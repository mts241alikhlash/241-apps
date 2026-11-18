import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']

export type PrintPack = Schemas['PrintPackDto']
export type PrintPackRoom = Schemas['PrintPackRoomDto']
export type PrintPackStudent = Schemas['PrintPackStudentDto']
export type PrintPackSupervisor = Schemas['PrintPackSupervisorDto']
export type PrintSchedule = Schemas['ExamScheduleDto']

export const PRINT_DOCUMENT_KEYS = [
  'cards',
  'desks',
  'schedule',
  'student-attendance',
  'staff-attendance',
] as const

export type PrintDocumentKey = (typeof PRINT_DOCUMENT_KEYS)[number]
