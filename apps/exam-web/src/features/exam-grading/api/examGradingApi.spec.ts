import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, PATCH } = vi.hoisted(() => ({ GET: vi.fn(), PATCH: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ examClient: { GET, PATCH } }))

import { examGradingApi } from './examGradingApi'

const ok = (body: unknown) => ({
  data: body,
  response: new Response(null, { status: 200 }),
})

beforeEach(() => vi.clearAllMocks())

describe('examGradingApi', () => {
  it('lists the schedules the caller may grade', async () => {
    GET.mockResolvedValue(ok({ data: [{ id: 's' }], meta: { total: 1 } }))
    const query = { page: 1, limit: 10, semesterId: 'sem' }
    await expect(examGradingApi.getSchedules(query)).resolves.toEqual({
      data: [{ id: 's' }],
      meta: { total: 1, page: 1, limit: 0 },
    })
    expect(GET).toHaveBeenCalledWith('/exam-grading/schedules', {
      params: { query },
    })
  })

  it('lists the sessions of a schedule', async () => {
    GET.mockResolvedValue(ok({ data: [{ sessionId: 'x' }] }))
    const query = { page: 2, limit: 10, status: 'SUBMITTED' as const }
    const page = await examGradingApi.getSessions('s 1', query)
    expect(page.data).toEqual([{ sessionId: 'x' }])
    expect(GET).toHaveBeenCalledWith(
      '/exam-grading/schedules/{scheduleId}/sessions',
      { params: { path: { scheduleId: 's 1' }, query } },
    )
  })

  it('gets one session', async () => {
    GET.mockResolvedValue(ok({ data: { items: [] } }))
    await expect(examGradingApi.getSession('x1')).resolves.toEqual({
      items: [],
    })
    expect(GET).toHaveBeenCalledWith('/exam-grading/sessions/{sessionId}', {
      params: { path: { sessionId: 'x1' } },
    })
  })

  it('grades one answer', async () => {
    PATCH.mockResolvedValue(ok({ data: { questionId: 'q1' } }))
    const body = { score: 7.5, note: 'cukup' }
    await expect(examGradingApi.grade('x1', 'q1', body)).resolves.toEqual({
      questionId: 'q1',
    })
    expect(PATCH).toHaveBeenCalledWith(
      '/exam-grading/sessions/{sessionId}/answers/{questionId}',
      { params: { path: { sessionId: 'x1', questionId: 'q1' } }, body },
    )
  })
})
