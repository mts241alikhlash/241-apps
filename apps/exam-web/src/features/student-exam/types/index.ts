import type { components } from '@mts241alikhlash/exam-api'
import {
  EXAM_CATEGORIES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '@/features/exam-shared/examType'

export { EXAM_CATEGORIES, EXAM_TYPES }
export type { ExamCategory, ExamType }

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_RESPONSE',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'ESSAY',
] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

type Schemas = components['schemas']

export type MyExamStatus = Schemas['MyExamDto']['status']

export type MyExam = Schemas['MyExamDto']

export type StartedSession = Schemas['StartedSessionDto']
export type ActiveSebConfig = Schemas['ActiveSebConfigDto']

export type Choice = Schemas['PaperChoiceDto']

export type SessionPaper = Schemas['SessionPaperDto']

export type PaperQuestion = Schemas['PaperQuestionDto']

export type SavedAnswer = Schemas['SavedAnswerDto']

export type AnswerPayload = SaveAnswerItem['answer']

export type SaveAnswerItem = Schemas['SaveAnswerItemDto']

export type SaveAnswersBatchRequest = Schemas['SaveAnswersBatchDto']

export type ConfirmedAnswer = Schemas['ConfirmedAnswerDto']

export type SkippedAnswer = SaveAnswersBatchResult['skipped'][number]

export type SaveAnswersBatchResult = Schemas['SaveAnswersBatchResultDto']

export type SubmitRequest = Schemas['SubmitSessionRequestDto']

export type SubmittedSession = Schemas['SubmitSessionResponseDto']

export type ResumedSession = Schemas['ResumeSessionResponseDto']

export type SessionHeartbeat = Schemas['SessionHeartbeatDto']

export interface StoredExamSession {
  deadline: number
  serverTime: number
  scheduleId?: string | null
  examTitle?: string | null
  durationMinutes?: number | null
  heartbeatIntervalMs?: number | null
}

export type AnswerSyncState = 'LOCAL_PENDING' | 'SYNCING' | 'SERVER_CONFIRMED'

export interface AnswerSyncSummary {
  totalAnswered: number
  confirmedCount: number
  pendingCount: number
}
