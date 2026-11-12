import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'
import { studentExamApi } from '../api/studentExamApi'
import { deviceId } from './deviceId'
import type {
  MyExam,
  SaveAnswerItem,
  SaveAnswersBatchResult,
  SavedAnswer,
  SessionPaper,
  StartedSession,
  SubmitRequest,
  SubmittedSession,
} from '../types'

function bodyOf(error: unknown): { message?: unknown; code?: unknown } | null {
  if (!(error instanceof ServiceRequestError)) return null
  return error.response.data
}

export function examErrorMessage(error: unknown, fallback: string): string {
  const message = bodyOf(error)?.message
  if (typeof message === 'string' && message.trim()) return message
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0]
  }
  return fallback
}

export class ExamApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'ExamApiError'
  }
}

export const API_ERROR_CODES = {
  MIN_SUBMIT: 'MIN_SUBMIT',
  WINDOW_CLOSED: 'WINDOW_CLOSED',
  SESSION_LOST: 'SESSION_LOST',
} as const

function codeOf(error: unknown): string | null {
  const code = bodyOf(error)?.code
  return typeof code === 'string' && code.trim() ? code : null
}

export const studentExamService = {
  async listExams(): Promise<MyExam[]> {
    try {
      return await studentExamApi.listExams()
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Daftar ujian gagal dimuat.'), {
        cause: error,
      })
    }
  },

  async startSession(
    scheduleId: string,
    accessCode: string,
  ): Promise<StartedSession> {
    try {
      return await studentExamApi.startSession(
        scheduleId,
        accessCode.trim(),
        deviceId(),
      )
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Ujian gagal dimulai.'), {
        cause: error,
      })
    }
  },

  async getQuestions(sessionId: string): Promise<SessionPaper> {
    try {
      return await studentExamApi.getQuestions(sessionId, deviceId())
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Soal gagal dimuat.'), {
        cause: error,
      })
    }
  },

  async getAnswers(sessionId: string): Promise<SavedAnswer[]> {
    try {
      return await studentExamApi.getAnswers(sessionId, deviceId())
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Jawaban gagal dimuat.'), {
        cause: error,
      })
    }
  },

  async saveAnswersBatch(
    sessionId: string,
    answers: SaveAnswerItem[],
    pendingLocalCount?: number,
  ): Promise<SaveAnswersBatchResult> {
    try {
      return await studentExamApi.saveAnswersBatch(sessionId, deviceId(), {
        answers,
        pendingLocalCount,
      })
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Jawaban gagal disimpan.'), {
        cause: error,
      })
    }
  },

  async submit(
    sessionId: string,
    payload: SubmitRequest = {},
  ): Promise<SubmittedSession> {
    try {
      return await studentExamApi.submit(sessionId, deviceId(), payload)
    } catch (error) {
      throw new ExamApiError(
        examErrorMessage(error, 'Ujian gagal dikumpulkan.'),
        codeOf(error),
        { cause: error },
      )
    }
  },
}
