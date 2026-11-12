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

export type MyExamStatus = 'UPCOMING' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED'

export interface MyExam {
  id: string
  title: string
  subjectId: string
  subjectName: string | null
  type: ExamType
  category?: ExamCategory
  startsAt: string
  endsAt: string
  durationMinutes: number
  minSubmitMinutes: number
  status: MyExamStatus
  sessionId: string | null
}

export interface StartedSession {
  sessionId: string
  deadline: number
  serverTime: number
}

export interface Choice {
  key: string
  html: string
}

export interface SessionPaper {
  questions: PaperQuestion[]
  startedAt: string
  minSubmitMinutes: number
  serverTime: string
}

export interface PaperQuestion {
  id: string
  number: number
  type: QuestionType
  bodyHtml: string
  points: number
  choices: Choice[] | null
}

export interface SavedAnswer {
  questionId: string
  answer: AnswerPayload | null
}

export type AnswerPayload =
  { key: string } | { keys: string[] } | { value: boolean } | { text: string }

export interface SaveAnswerItem {
  questionId: string
  clientId: string
  answer: AnswerPayload
}

export interface SaveAnswersBatchRequest {
  answers: SaveAnswerItem[]
  pendingLocalCount?: number
  batteryLevel?: number
  isCharging?: boolean
}

export interface ConfirmedAnswer {
  questionId: string
  clientId: string
  updatedAt: string
  receivedAfterDeadline: boolean
}

export interface SkippedAnswer {
  questionId: string
  clientId: string
}

export interface SaveAnswersBatchResult {
  confirmed: ConfirmedAnswer[]
  skipped: SkippedAnswer[]
  confirmedCount: number
  serverTime: string
}

export interface SubmitRequest {
  violations?: number
  expectedAnswerCount?: number
  pendingAnswers?: SaveAnswerItem[]
}

export interface SubmittedSession {
  status: 'SUBMITTED' | 'EXPIRED' | 'GRADED'
  submittedAt: string | null
  confirmedAnswerCount: number
  answersStored: boolean
  serverTime: string
}

export type AnswerSyncState = 'LOCAL_PENDING' | 'SYNCING' | 'SERVER_CONFIRMED'

export interface AnswerSyncSummary {
  totalAnswered: number
  confirmedCount: number
  pendingCount: number
}
