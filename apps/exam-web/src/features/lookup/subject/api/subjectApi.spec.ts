import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ academicClient: { GET } }))

import { subjectApi } from './subjectApi'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('subjectApi', () => {
  it('lists subjects', async () => {
    GET.mockResolvedValue({
      data: { data: [{ id: 'm' }] },
      response: new Response(null, { status: 200 }),
    })
    const result = await subjectApi.getSubjects({ limit: 9 })
    expect(result.data).toEqual([{ id: 'm' }])
    expect(GET).toHaveBeenCalledWith('/subjects', {
      params: { query: { limit: 9 } },
    })
  })
})
