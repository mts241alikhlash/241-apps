import type { ExamType } from '../../../exam-schedule/domain/entities/exam-schedule.entity.js'

export const EXAM_EVENT_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED'] as const

export type ExamEventStatus = (typeof EXAM_EVENT_STATUSES)[number]

export interface ExamEvent {
  id: string
  semesterId: string
  name: string
  type: ExamType
  startsAt: Date
  endsAt: Date
  lateToleranceMinutes: number
  minSubmitMinutes: number
  status: ExamEventStatus
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface NewExamEvent {
  semesterId: string
  name: string
  type: ExamType
  startsAt: Date
  endsAt: Date
  lateToleranceMinutes?: number
  minSubmitMinutes?: number
  createdById: string
}

export interface ExamEventEdit {
  name?: string
  type?: ExamType
  startsAt?: Date
  endsAt?: Date
  lateToleranceMinutes?: number
  minSubmitMinutes?: number
  status?: ExamEventStatus
}
