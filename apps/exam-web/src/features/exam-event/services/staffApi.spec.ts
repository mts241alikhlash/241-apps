import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ identityClient: { GET } }))

import { staffApi } from './staffApi'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('staffApi', () => {
  it('lists users from the identity contract', async () => {
    GET.mockResolvedValue({
      data: { data: [{ id: 'u', identifier: 'x' }] },
      response: new Response(null, { status: 200 }),
    })
    const result = await staffApi.getUsers({ roleCode: 'TEACHER', limit: 9 })
    expect(result.data).toEqual([{ id: 'u', identifier: 'x' }])
    expect(GET).toHaveBeenCalledWith('/users', {
      params: { query: { roleCode: 'TEACHER', limit: 9 } },
    })
  })
})
