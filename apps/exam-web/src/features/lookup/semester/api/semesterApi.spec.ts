import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ academicClient: { GET } }))

import { semesterApi } from './semesterApi'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('semesterApi', () => {
  it('lists semesters', async () => {
    GET.mockResolvedValue({
      data: { data: [{ id: 's' }], meta: { total: 1, page: 1, limit: 1 } },
      response: new Response(null, { status: 200 }),
    })
    await expect(
      semesterApi.getSemesters({ isActive: true, limit: 1 }),
    ).resolves.toEqual({
      data: [{ id: 's' }],
      meta: { total: 1, page: 1, limit: 1 },
    })
    expect(GET).toHaveBeenCalledWith('/semesters', {
      params: { query: { isActive: true, limit: 1 } },
    })
  })
})
