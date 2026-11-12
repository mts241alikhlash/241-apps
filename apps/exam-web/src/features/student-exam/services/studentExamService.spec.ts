import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'

const { getQuestions, submit } = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  submit: vi.fn(),
}))

vi.mock('../api/studentExamApi', () => ({
  studentExamApi: { getQuestions, submit },
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
})
