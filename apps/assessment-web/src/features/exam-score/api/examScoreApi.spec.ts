import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examScoreApi } from './examScoreApi'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({ default: { get } }))

describe('examScoreApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the exam scores with the given filters', () => {
    void examScoreApi.getScores({ page: 2, limit: 10, classroomId: 'c1' })

    expect(get).toHaveBeenCalledWith('/exam-scores', {
      params: { page: 2, limit: 10, classroomId: 'c1' },
    })
  })
})
