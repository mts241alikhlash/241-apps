import type { ApiEnvelope } from '@mts241alikhlash/web-shared/types/api'
import { isAxiosError } from 'axios'
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

export function examErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | null)
      ?.message
    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0]
    }
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
  if (!isAxiosError(error)) return null
  const body = error.response?.data as { code?: unknown } | null
  return typeof body?.code === 'string' && body.code.trim() ? body.code : null
}

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const payload = response.data?.data
  if (payload === null || payload === undefined) {
    throw new Error('Respons server kosong.')
  }
  return payload
}

export const studentExamService = {
  async listExams(): Promise<MyExam[]> {
    try {
      return unwrap(await studentExamApi.listExams())
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
      return unwrap(
        await studentExamApi.startSession(
          scheduleId,
          accessCode.trim(),
          deviceId(),
        ),
      )
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Ujian gagal dimulai.'), {
        cause: error,
      })
    }
  },

  async getQuestions(sessionId: string): Promise<SessionPaper> {
    try {
      return unwrap(await studentExamApi.getQuestions(sessionId, deviceId()))
    } catch (error) {
      throw new Error(examErrorMessage(error, 'Soal gagal dimuat.'), {
        cause: error,
      })
    }
  },

  async getAnswers(sessionId: string): Promise<SavedAnswer[]> {
    try {
      return unwrap(await studentExamApi.getAnswers(sessionId, deviceId()))
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
      return unwrap(
        await studentExamApi.saveAnswersBatch(sessionId, deviceId(), {
          answers,
          pendingLocalCount,
        }),
      )
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
      return unwrap(await studentExamApi.submit(sessionId, deviceId(), payload))
    } catch (error) {
      throw new ExamApiError(
        examErrorMessage(error, 'Ujian gagal dikumpulkan.'),
        codeOf(error),
        { cause: error },
      )
    }
  },
}
