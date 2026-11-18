import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({ examClient: { GET } }))

import { examPrintApi } from './examPrintApi'

const ok = (data: unknown, meta?: unknown) => ({
  data: { data, meta },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examPrintApi', () => {
  it('fetches the print pack of an event', async () => {
    GET.mockResolvedValue(ok({ event: { id: 'e1' }, rooms: [], warnings: [] }))
    await expect(examPrintApi.getPrintPack('e1')).resolves.toEqual({
      event: { id: 'e1' },
      rooms: [],
      warnings: [],
    })
    expect(GET).toHaveBeenCalledWith('/exam-events/{id}/print-pack', {
      params: { path: { id: 'e1' }, query: { roomId: undefined } },
    })
  })

  it('lists the schedules of an event', async () => {
    GET.mockResolvedValue(ok([{ id: 's' }], { total: 1, page: 1, limit: 200 }))
    await examPrintApi.getSchedules('e1')
    expect(GET).toHaveBeenCalledWith('/exam-schedules', {
      params: { query: { eventId: 'e1', limit: 200 } },
    })
  })
})
