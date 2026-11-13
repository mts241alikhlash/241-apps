import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceRequestError } from '@mts241alikhlash/web-shared/utils/service-client'

const { startSession, activeSebConfigs, readSebProof, resume } = vi.hoisted(
  () => ({
    startSession: vi.fn(),
    activeSebConfigs: vi.fn(),
    readSebProof: vi.fn(),
    resume: vi.fn(),
  }),
)

vi.mock('../api/studentExamApi', () => ({
  studentExamApi: { startSession, activeSebConfigs, resume },
}))
vi.mock('./deviceId', () => ({ deviceId: () => 'dev' }))
vi.mock('@/shared/seb', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  readSebProof,
}))

import { SebOutdatedError } from '@/shared/seb'
import { ExamApiError, studentExamService } from './studentExamService'

const proof = {
  configKeyHash: 'a'.repeat(64),
  pageUrl: 'https://exam.example/my-exams/s1/token',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('studentExamService Safe Exam Browser', () => {
  it('resumes with the token and the seb proof', async () => {
    readSebProof.mockResolvedValue(proof)
    resume.mockResolvedValue({ requiresTokenReentry: false })

    await studentExamService.resume('s1', ' ABC123 ')

    expect(resume).toHaveBeenCalledWith('s1', 'dev', 'ABC123', proof)
  })

  it('posts the seb proof when started inside SEB', async () => {
    readSebProof.mockResolvedValue(proof)
    startSession.mockResolvedValue({ sessionId: 'x' })

    await studentExamService.startSession('s1', ' ABC123 ')

    expect(startSession).toHaveBeenCalledWith('s1', 'ABC123', 'dev', proof)
  })

  it('posts no seb proof outside SEB', async () => {
    readSebProof.mockResolvedValue(null)
    startSession.mockResolvedValue({ sessionId: 'x' })

    await studentExamService.startSession('s1', 'ABC123')

    expect(startSession).toHaveBeenCalledWith('s1', 'ABC123', 'dev', undefined)
  })

  it('keeps the server message and the SEB_REQUIRED code', async () => {
    readSebProof.mockResolvedValue(null)
    startSession.mockRejectedValue(
      new ServiceRequestError(403, {
        message: 'Ujian hanya bisa dibuka dengan Safe Exam Browser.',
        code: 'SEB_REQUIRED',
      }),
    )

    const error = await studentExamService
      .startSession('s1', 'ABC123')
      .catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ExamApiError)
    expect(error).toMatchObject({
      message: 'Ujian hanya bisa dibuka dengan Safe Exam Browser.',
      code: 'SEB_REQUIRED',
    })
  })

  it('lets SebOutdatedError through without calling the API', async () => {
    readSebProof.mockRejectedValue(new SebOutdatedError())

    await expect(
      studentExamService.startSession('s1', 'ABC123'),
    ).rejects.toBeInstanceOf(SebOutdatedError)
    expect(startSession).not.toHaveBeenCalled()
  })

  it('loads the active configurations', async () => {
    activeSebConfigs.mockResolvedValue([{ id: 'c1', name: 'Ujian Semester' }])

    await expect(studentExamService.activeSebConfigs()).resolves.toEqual([
      { id: 'c1', name: 'Ujian Semester' },
    ])
  })
})
