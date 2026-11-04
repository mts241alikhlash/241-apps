import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examGradingApi } from './examGradingApi'

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get, patch },
}))

describe('examGradingApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists what the caller may grade', () => {
    void examGradingApi.getSchedules({ page: 1, limit: 10, semesterId: 'sem' })
    void examGradingApi.getSessions('s 1', {
      page: 2,
      limit: 10,
      status: 'SUBMITTED',
    })
    void examGradingApi.getSession('x1')

    expect(get).toHaveBeenCalledWith('/exam-grading/schedules', {
      params: { page: 1, limit: 10, semesterId: 'sem' },
    })
    expect(get).toHaveBeenCalledWith('/exam-grading/schedules/s%201/sessions', {
      params: { page: 2, limit: 10, status: 'SUBMITTED' },
    })
    expect(get).toHaveBeenCalledWith('/exam-grading/sessions/x1')
  })

  it('grades one answer', () => {
    void examGradingApi.grade('x1', 'q1', { score: 7.5, note: 'cukup' })

    expect(patch).toHaveBeenCalledWith('/exam-grading/sessions/x1/answers/q1', {
      score: 7.5,
      note: 'cukup',
    })
  })
})
