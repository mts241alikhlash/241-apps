import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, PATCH } = vi.hoisted(() => ({
  GET: vi.fn(),
  PATCH: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, PATCH },
}))

import { examPresetApi } from './examPresetApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examPresetApi', () => {
  it('lists the presets', async () => {
    GET.mockResolvedValue(ok([{ type: 'DAILY' }]))
    await expect(examPresetApi.list()).resolves.toEqual([{ type: 'DAILY' }])
    expect(GET).toHaveBeenCalledWith('/exam-policy-presets')
  })

  it('updates one preset', async () => {
    PATCH.mockResolvedValue(ok({ type: 'MIDTERM' }))
    const body = { violationLimit: 3 }
    await expect(examPresetApi.update('MIDTERM', body)).resolves.toEqual({
      type: 'MIDTERM',
    })
    expect(PATCH).toHaveBeenCalledWith('/exam-policy-presets/{type}', {
      params: { path: { type: 'MIDTERM' } },
      body,
    })
  })
})
