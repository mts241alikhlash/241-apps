import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'

const { getQuestions, getAnswers, submit } = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  getAnswers: vi.fn(),
  submit: vi.fn(),
}))

vi.mock('../api/studentExamApi', () => ({
  studentExamApi: { getQuestions, getAnswers, submit },
}))
vi.mock('./deviceId', () => ({ deviceId: () => 'dev' }))

import { ExamApiError, studentExamService } from './studentExamService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('studentExamService errors', () => {
  it('uses the fallback on a network failure', async () => {
    getQuestions.mockRejectedValue(
      new ServiceRequestError(0, { message: 'Failed to fetch' }, 'ERR_NETWORK'),
    )
    await expect(studentExamService.getQuestions('s')).rejects.toThrow(
      'Soal gagal dimuat.',
    )
  })

  it('uses the fallback on an HTML error body', async () => {
    getQuestions.mockRejectedValue(
      new ServiceRequestError(502, { message: '<html>Bad Gateway</html>' }),
    )
    await expect(studentExamService.getQuestions('s')).rejects.toThrow(
      'Soal gagal dimuat.',
    )
  })

  it('shows the message of a JSON error body', async () => {
    getQuestions.mockRejectedValue(
      new ServiceRequestError(403, { message: 'Perangkat berbeda' }),
    )
    await expect(studentExamService.getQuestions('s')).rejects.toThrow(
      'Perangkat berbeda',
    )
  })

  it('keeps the code of a submit failure', async () => {
    submit.mockRejectedValue(
      new ServiceRequestError(409, {
        message: 'Belum waktunya',
        code: 'MIN_SUBMIT',
      }),
    )
    const error = await studentExamService.submit('s').catch((e) => e)
    expect(error).toBeInstanceOf(ExamApiError)
    expect(error.code).toBe('MIN_SUBMIT')
    expect(error.message).toBe('Belum waktunya')
  })

  it('keeps the code when the paper or the answers fail to load', async () => {
    const lost = new ServiceRequestError(409, {
      message: 'Waktu ujian sudah berakhir',
      code: 'SESSION_LOST',
    })
    getQuestions.mockRejectedValue(lost)
    getAnswers.mockRejectedValue(lost)

    for (const load of [
      studentExamService.getQuestions,
      studentExamService.getAnswers,
    ]) {
      const error = await load('s').catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ExamApiError)
      expect(error).toMatchObject({
        code: 'SESSION_LOST',
        message: 'Waktu ujian sudah berakhir',
      })
    }
  })
})
