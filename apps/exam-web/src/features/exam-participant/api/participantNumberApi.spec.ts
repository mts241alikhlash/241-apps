import { beforeEach, describe, expect, it, vi } from 'vitest'

const { POST } = vi.hoisted(() => ({ POST: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({
  examClient: { POST },
}))

import { participantNumberApi } from './participantNumberApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('participantNumberApi', () => {
  it('issues the missing numbers of a semester', async () => {
    POST.mockResolvedValue(ok({ issued: 2, skipped: ['s9'] }))
    await expect(participantNumberApi.issue('sem1')).resolves.toEqual({
      issued: 2,
      skipped: ['s9'],
    })
    expect(POST).toHaveBeenCalledWith('/exam-participant-numbers/issue', {
      body: { semesterId: 'sem1' },
    })
  })

  it('looks up the numbers of many students', async () => {
    POST.mockResolvedValue(ok({ items: [{ studentId: 's1', number: '001' }] }))
    await expect(participantNumberApi.lookup('sem1', ['s1'])).resolves.toEqual([
      { studentId: 's1', number: '001' },
    ])
    expect(POST).toHaveBeenCalledWith('/exam-participant-numbers/lookup', {
      body: { semesterId: 'sem1', studentIds: ['s1'] },
    })
  })
})
