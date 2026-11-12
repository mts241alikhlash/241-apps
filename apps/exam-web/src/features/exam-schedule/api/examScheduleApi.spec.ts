import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, PATCH, DELETE } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
  DELETE: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST, PATCH, DELETE },
}))

import { examScheduleApi } from './examScheduleApi'

const ok = (data: unknown, meta?: unknown) => ({
  data: { data, meta },
  response: new Response(null, { status: 200 }),
})

const path = (id: string) => ({ params: { path: { id } } })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examScheduleApi', () => {
  it('lists schedules with the category query', async () => {
    GET.mockResolvedValue(ok([{ id: 's' }], { total: 1, page: 1, limit: 10 }))
    await expect(
      examScheduleApi.getSchedules({ page: 1, limit: 10, category: 'EXAM' }),
    ).resolves.toEqual({
      data: [{ id: 's' }],
      meta: { total: 1, page: 1, limit: 10 },
    })
    expect(GET).toHaveBeenCalledWith('/exam-schedules', {
      params: { query: { page: 1, limit: 10, category: 'EXAM' } },
    })
  })

  it('gets one schedule', async () => {
    GET.mockResolvedValue(ok({ id: 's/1' }))
    await expect(examScheduleApi.getSchedule('s/1')).resolves.toEqual({
      id: 's/1',
    })
    expect(GET).toHaveBeenCalledWith('/exam-schedules/{id}', path('s/1'))
  })

  it('creates a schedule', async () => {
    POST.mockResolvedValue(ok({ id: 's' }))
    const body = { packageId: 'p' } as never
    await expect(examScheduleApi.createSchedule(body)).resolves.toEqual({
      id: 's',
    })
    expect(POST).toHaveBeenCalledWith('/exam-schedules', { body })
  })

  it('updates a schedule', async () => {
    PATCH.mockResolvedValue(ok({ id: 's' }))
    const body = { durationMinutes: 90 } as never
    await expect(examScheduleApi.updateSchedule('s', body)).resolves.toEqual({
      id: 's',
    })
    expect(PATCH).toHaveBeenCalledWith('/exam-schedules/{id}', {
      ...path('s'),
      body,
    })
  })

  it('cancels a schedule', async () => {
    POST.mockResolvedValue(ok({ id: 's' }))
    await expect(examScheduleApi.cancelSchedule('s')).resolves.toEqual({
      id: 's',
    })
    expect(POST).toHaveBeenCalledWith('/exam-schedules/{id}/cancel', path('s'))
  })

  it('reads the access code', async () => {
    GET.mockResolvedValue(ok({ accessCode: 'K7M2QX' }))
    await expect(examScheduleApi.getAccessCode('s')).resolves.toEqual({
      accessCode: 'K7M2QX',
    })
    expect(GET).toHaveBeenCalledWith(
      '/exam-schedules/{id}/access-code',
      path('s'),
    )
  })

  it('rotates the access code', async () => {
    POST.mockResolvedValue(ok({ rotation: 2 }))
    await expect(examScheduleApi.rotateAccessCode('s')).resolves.toEqual({
      rotation: 2,
    })
    expect(POST).toHaveBeenCalledWith(
      '/exam-schedules/{id}/access-code/rotate',
      path('s'),
    )
  })

  it('lists the sessions of a schedule', async () => {
    GET.mockResolvedValue(ok([{ sessionId: 'x' }], { total: 1 }))
    await expect(
      examScheduleApi.getSessions('s', { page: 1, limit: 100 }),
    ).resolves.toEqual({
      data: [{ sessionId: 'x' }],
      meta: { total: 1, page: 1, limit: 0 },
    })
    expect(GET).toHaveBeenCalledWith('/exam-schedules/{id}/sessions', {
      params: { path: { id: 's' }, query: { page: 1, limit: 100 } },
    })
  })

  it('releases a session', async () => {
    POST.mockResolvedValue(ok({}))
    await examScheduleApi.releaseSession('x', 'Pindah perangkat')
    expect(POST).toHaveBeenCalledWith('/exam-sessions/{id}/release', {
      ...path('x'),
      body: { reason: 'Pindah perangkat' },
    })
  })

  it('resets a session', async () => {
    POST.mockResolvedValue(ok({}))
    await examScheduleApi.resetSession('x', 'Mulai ulang')
    expect(POST).toHaveBeenCalledWith('/exam-sessions/{id}/reset', {
      ...path('x'),
      body: { reason: 'Mulai ulang' },
    })
  })

  it('reads the session audit logs', async () => {
    GET.mockResolvedValue(ok([{ id: 'a' }]))
    await expect(examScheduleApi.getSessionAuditLogs('x')).resolves.toEqual([
      { id: 'a' },
    ])
    expect(GET).toHaveBeenCalledWith(
      '/exam-sessions/{id}/audit-logs',
      path('x'),
    )
  })

  it('lists the absentees', async () => {
    GET.mockResolvedValue(ok([{ studentId: 'st' }]))
    await expect(examScheduleApi.getAbsentees('s')).resolves.toEqual([
      { studentId: 'st' },
    ])
    expect(GET).toHaveBeenCalledWith(
      '/exam-schedules/{id}/absentees',
      path('s'),
    )
  })

  it('creates a makeup', async () => {
    POST.mockResolvedValue(ok({ id: 'm' }))
    const body = { participants: [] } as never
    await expect(examScheduleApi.createMakeup('s', body)).resolves.toEqual({
      id: 'm',
    })
    expect(POST).toHaveBeenCalledWith('/exam-schedules/{id}/makeups', {
      ...path('s'),
      body,
    })
  })

  it('lists the participants', async () => {
    GET.mockResolvedValue(ok([{ studentId: 'st' }]))
    await expect(examScheduleApi.getParticipants('m')).resolves.toEqual([
      { studentId: 'st' },
    ])
    expect(GET).toHaveBeenCalledWith(
      '/exam-schedules/{id}/participants',
      path('m'),
    )
  })

  it('adds participants', async () => {
    POST.mockResolvedValue(ok({}))
    const participants = [{ studentId: 'st', reason: 'SICK' as const }]
    await examScheduleApi.addParticipants('m', participants)
    expect(POST).toHaveBeenCalledWith('/exam-schedules/{id}/participants', {
      ...path('m'),
      body: { participants },
    })
  })

  it('removes a participant', async () => {
    DELETE.mockResolvedValue(ok({}))
    await examScheduleApi.removeParticipant('m', 'st/1')
    expect(DELETE).toHaveBeenCalledWith(
      '/exam-schedules/{id}/participants/{studentId}',
      { params: { path: { id: 'm', studentId: 'st/1' } } },
    )
  })
})
