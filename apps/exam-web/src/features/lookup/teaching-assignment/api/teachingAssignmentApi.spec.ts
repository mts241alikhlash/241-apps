import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ academicClient: { GET } }))

import { teachingAssignmentApi } from './teachingAssignmentApi'

const page = {
  data: { data: [{ id: 't' }], meta: { total: 1, page: 1, limit: 2 } },
  response: new Response(null, { status: 200 }),
}

beforeEach(() => {
  vi.clearAllMocks()
  GET.mockResolvedValue(page)
})

describe('teachingAssignmentApi', () => {
  it('lists all assignments', async () => {
    const result = await teachingAssignmentApi.getTeachingAssignments({
      subjectId: 's',
    })
    expect(result.data).toEqual([{ id: 't' }])
    expect(GET).toHaveBeenCalledWith('/teaching-assignments', {
      params: { query: { subjectId: 's' } },
    })
  })

  it('lists own assignments', async () => {
    const result = await teachingAssignmentApi.getMyTeachingAssignments({
      limit: 2,
    })
    expect(result.meta.total).toBe(1)
    expect(GET).toHaveBeenCalledWith('/teaching-assignments/me', {
      params: { query: { limit: 2 } },
    })
  })
})
