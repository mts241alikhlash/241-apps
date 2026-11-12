import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST },
}))

import { studentExamApi } from './studentExamApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

const headers = { 'X-Device-Id': 'dev', 'X-Client-Platform': 'web' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('studentExamApi', () => {
  it('lists my exams', async () => {
    GET.mockResolvedValue(ok([{ id: 'e' }]))
    await expect(studentExamApi.listExams()).resolves.toEqual([{ id: 'e' }])
    expect(GET).toHaveBeenCalledWith('/me/exams')
  })

  it('starts a session with the access code', async () => {
    POST.mockResolvedValue(ok({ sessionId: 's' }))
    await expect(
      studentExamApi.startSession('a/b', 'CODE', 'dev'),
    ).resolves.toEqual({ sessionId: 's' })
    expect(POST).toHaveBeenCalledWith('/me/exams/{scheduleId}/sessions', {
      params: { path: { scheduleId: 'a/b' } },
      body: { accessCode: 'CODE', deviceId: 'dev' },
      headers: { 'X-Client-Platform': 'web' },
    })
  })

  it('gets the questions', async () => {
    GET.mockResolvedValue(ok({ questions: [] }))
    await expect(studentExamApi.getQuestions('s', 'dev')).resolves.toEqual({
      questions: [],
    })
    expect(GET).toHaveBeenCalledWith('/student-exams/{sessionId}/questions', {
      params: { path: { sessionId: 's' }, header: headers },
    })
  })

  it('gets the saved answers', async () => {
    GET.mockResolvedValue(ok([]))
    await expect(studentExamApi.getAnswers('s', 'dev')).resolves.toEqual([])
    expect(GET).toHaveBeenCalledWith('/student-exams/{sessionId}/answers', {
      params: { path: { sessionId: 's' }, header: headers },
    })
  })

  it('saves an answers batch', async () => {
    POST.mockResolvedValue(ok({ confirmedCount: 1 }))
    const body = { answers: [], pendingLocalCount: 0 }
    await expect(
      studentExamApi.saveAnswersBatch('s', 'dev', body),
    ).resolves.toEqual({ confirmedCount: 1 })
    expect(POST).toHaveBeenCalledWith(
      '/student-exams/{sessionId}/answers/batch',
      { params: { path: { sessionId: 's' }, header: headers }, body },
    )
  })

  it('submits with an empty body by default', async () => {
    POST.mockResolvedValue(ok({ status: 'SUBMITTED' }))
    await expect(studentExamApi.submit('s', 'dev')).resolves.toEqual({
      status: 'SUBMITTED',
    })
    expect(POST).toHaveBeenCalledWith('/student-exams/{sessionId}/submit', {
      params: { path: { sessionId: 's' }, header: headers },
      body: {},
    })
  })
})
