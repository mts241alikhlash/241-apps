import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']

export type PrintPackStudent = Schemas['PrintPackStudentDto'] & {
  credential?: PrintCredential | null
}
export type PrintPackRoom = Omit<Schemas['PrintPackRoomDto'], 'students'> & {
  students: PrintPackStudent[]
}
export type PrintPack = Omit<Schemas['PrintPackDto'], 'rooms'> & {
  rooms: PrintPackRoom[]
}
export type PrintPackSupervisor = Schemas['PrintPackSupervisorDto']
export type PrintSchedule = Schemas['ExamScheduleDto']
export type ResetCredentials = Schemas['ResetCredentialsDto']

export const PRINT_DOCUMENT_KEYS = ['cards', 'desks', 'schedule'] as const

export type PrintDocumentKey = (typeof PRINT_DOCUMENT_KEYS)[number]

export interface PrintCredential {
  identifier: string
  password: string
}
