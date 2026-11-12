import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, PUT } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
}))
const get = vi.hoisted(() => vi.fn())

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST, PUT },
}))
vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({
  default: { get },
}))

import { examRoomApi } from './examRoomApi'

const ok = (data: unknown, meta?: unknown) => ({
  data: { data, meta },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examRoomApi', () => {
  it('gets the overview with the event filter', async () => {
    GET.mockResolvedValue(ok([{ id: 'r' }]))
    await expect(examRoomApi.getOverview({ eventId: 'e' })).resolves.toEqual([
      { id: 'r' },
    ])
    expect(GET).toHaveBeenCalledWith('/exam-rooms/overview', {
      params: { query: { eventId: 'e' } },
    })
  })

  it('gets the monitor page with its meta', async () => {
    GET.mockResolvedValue(ok([{ studentId: 's' }], { total: 4, page: 2 }))
    const page = await examRoomApi.getMonitor('r/1', { page: 2 })
    expect(page.data).toEqual([{ studentId: 's' }])
    expect(page.meta).toMatchObject({ total: 4, page: 2 })
    expect(GET).toHaveBeenCalledWith('/exam-rooms/{roomId}/monitor', {
      params: { path: { roomId: 'r/1' }, query: { page: 2 } },
    })
  })

  it('gets the supervisors', async () => {
    GET.mockResolvedValue(ok([{ slotId: 'x' }]))
    await expect(examRoomApi.getSupervisors('r')).resolves.toEqual([
      { slotId: 'x' },
    ])
    expect(GET).toHaveBeenCalledWith('/exam-rooms/{roomId}/supervisors', {
      params: { path: { roomId: 'r' } },
    })
  })

  it('gets a session timeline', async () => {
    GET.mockResolvedValue(ok([{ id: 't' }]))
    await expect(examRoomApi.getTimeline('s')).resolves.toEqual([{ id: 't' }])
    expect(GET).toHaveBeenCalledWith('/exam-sessions/{id}/timeline', {
      params: { path: { id: 's' } },
    })
  })

  it.each([
    ['releaseSession', 'release'],
    ['reopenSession', 'reopen'],
    ['resetSession', 'reset'],
  ] as const)('%s posts the reason', async (method, action) => {
    POST.mockResolvedValue(ok({ id: 's' }))
    await expect(examRoomApi[method]('s/1', 'why')).resolves.toEqual({
      id: 's',
    })
    expect(POST).toHaveBeenCalledWith(`/exam-sessions/{id}/${action}`, {
      params: { path: { id: 's/1' } },
      body: { reason: 'why' },
    })
  })

  it('extends session time', async () => {
    POST.mockResolvedValue(ok({ id: 's' }))
    await examRoomApi.extendSessionTime('s', 10, 'why')
    expect(POST).toHaveBeenCalledWith('/exam-sessions/{id}/extend-time', {
      params: { path: { id: 's' } },
      body: { minutes: 10, reason: 'why' },
    })
  })

  it.each([
    ['allowWeb', 'allow-web'],
    ['allowLate', 'allow-late'],
  ] as const)('%s posts the reason', async (method, action) => {
    POST.mockResolvedValue(ok({ id: 's' }))
    await examRoomApi[method]('r', 'st', 'why')
    expect(POST).toHaveBeenCalledWith(
      `/exam-rooms/{roomId}/seats/{studentId}/${action}`,
      {
        params: { path: { roomId: 'r', studentId: 'st' } },
        body: { reason: 'why' },
      },
    )
  })

  const path = { params: { path: { roomId: 'r', slotId: 'sl' } } }

  it('gets a report', async () => {
    GET.mockResolvedValue(ok({ reportId: 'p' }))
    await expect(examRoomApi.getReport('r', 'sl')).resolves.toEqual({
      reportId: 'p',
    })
    expect(GET).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/reports/{slotId}',
      path,
    )
  })

  it('saves a report', async () => {
    PUT.mockResolvedValue(ok({ reportId: 'p' }))
    await examRoomApi.saveReport('r', 'sl', { condition: 'SMOOTH' })
    expect(PUT).toHaveBeenCalledWith('/exam-rooms/{roomId}/reports/{slotId}', {
      ...path,
      body: { condition: 'SMOOTH' },
    })
  })

  it('records an absence', async () => {
    POST.mockResolvedValue(ok({ reportId: 'p' }))
    const body = { studentId: 'a', scheduleId: 'b', reason: 'SICK' as const }
    await examRoomApi.recordAbsence('r', 'sl', body)
    expect(POST).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/reports/{slotId}/absences',
      { ...path, body },
    )
  })

  it('records a field note', async () => {
    POST.mockResolvedValue(ok({ reportId: 'p' }))
    const body = { studentId: 'a', category: 'c', note: 'n' }
    await examRoomApi.recordFieldNote('r', 'sl', body)
    expect(POST).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/reports/{slotId}/field-notes',
      { ...path, body },
    )
  })

  it.each([
    ['submitReport', 'submit'],
    ['verifyReport', 'verify'],
  ] as const)('%s posts without a body', async (method, action) => {
    POST.mockResolvedValue(ok({ reportId: 'p' }))
    await expect(examRoomApi[method]('r', 'sl')).resolves.toEqual({
      reportId: 'p',
    })
    expect(POST).toHaveBeenCalledWith(
      `/exam-rooms/{roomId}/reports/{slotId}/${action}`,
      path,
    )
  })

  it('gets the letterhead over axios', async () => {
    get.mockResolvedValue({ data: { data: { name: 'n' } } })
    const response = await examRoomApi.getLetterhead()
    expect(response.data.data).toEqual({ name: 'n' })
    expect(get).toHaveBeenCalledWith('/school-units/letterhead')
  })
})
