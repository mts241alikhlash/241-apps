import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examGradingService } from './examGradingService'

const { getSession, grade, error, success } = vi.hoisted(() => ({
  getSession: vi.fn(),
  grade: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}))
vi.mock('../api/examGradingApi', () => ({
  examGradingApi: { getSession, grade },
}))
vi.mock('vue-sonner', () => ({ toast: { success, error } }))

const refused = (status: number, message: string) => ({
  isAxiosError: true,
  response: { status, data: { statusCode: status, message, data: null } },
})

describe('examGradingService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the answers of a session', async () => {
    getSession.mockResolvedValue({ data: { data: { items: [] } } })

    expect(await examGradingService.loadSession('x1')).toEqual({
      success: true,
      data: { items: [] },
    })
  })

  it('shows the server message when the session cannot be loaded', async () => {
    getSession.mockRejectedValue(refused(404, 'Sesi ujian tidak ditemukan'))

    expect(await examGradingService.loadSession('x1')).toEqual({
      success: false,
      error: 'Sesi ujian tidak ditemukan',
    })
  })

  it('returns the graded item and tells the teacher it was saved', async () => {
    grade.mockResolvedValue({ data: { data: { questionId: 'q1', score: 7 } } })

    expect(await examGradingService.grade('x1', 'q1', { score: 7 })).toEqual({
      questionId: 'q1',
      score: 7,
    })
    expect(success).toHaveBeenCalledWith('Nilai disimpan.')
  })

  it('reports a refused grade with the server message and returns null', async () => {
    grade.mockRejectedValue(refused(400, 'Nilai harus antara 0 dan 10'))

    expect(await examGradingService.grade('x1', 'q1', { score: 11 })).toBeNull()
    expect(error).toHaveBeenCalledWith('Nilai harus antara 0 dan 10')
  })
})
