import type {
  ExamSessionStatus,
  ExamType,
} from '@/features/exam-schedule/types'

export interface GradingSchedule {
  id: string
  title: string
  packageId: string
  durationMinutes: number
  kind: 'REGULAR' | 'MAKEUP'
  subjectId: string
  classroomId: string
  classroomName: string | null
  semesterId: string
  type: ExamType
  startsAt: string
  endsAt: string
  sessions: number
  awaitingGrading: number
  graded: number
}

export type PublicationState = 'PENDING' | 'SENT' | null

export interface GradingSessionRow {
  sessionId: string
  studentId: string
  studentName: string | null
  studentNis: string | null
  status: ExamSessionStatus
  submittedAt: string | null
  rawScore: number | null
  maxScore: number | null
  awaitingGrading: boolean
  violationCount: number
  publication: PublicationState
}

export type AnswerPayload =
  { key: string } | { keys: string[] } | { value: boolean } | { text: string }

export interface GradingItem {
  questionId: string
  number: number
  type: 'SHORT_ANSWER' | 'ESSAY'
  bodyHtml: string
  points: number
  guideHtml: string | null
  acceptedAnswers: string[] | null
  answer: AnswerPayload | null
  score: number | null
  note: string | null
  gradedAt: string | null
  needsGrading: boolean
}

export interface GradingDetail {
  session: {
    sessionId: string
    scheduleId: string
    studentId: string
    studentName: string | null
    studentNis: string | null
    status: ExamSessionStatus
    rawScore: number | null
    maxScore: number | null
  }
  items: GradingItem[]
}

export interface GradePayload {
  score: number
  note?: string
}

export interface GradingScheduleQuery {
  page?: number
  limit?: number
  semesterId?: string
}

export interface GradingSessionQuery {
  page?: number
  limit?: number
  status?: ExamSessionStatus
}
