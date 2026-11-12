import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, PATCH } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST, PATCH },
}))

import { examEventApi } from './examEventApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

const roomPath = { params: { path: { roomId: 'r1' } } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examEventApi', () => {
  it('lists events with the given filters and page', async () => {
    GET.mockResolvedValue(ok([{ id: 'e1' }]))
    const query = {
      page: 2,
      limit: 10,
      semesterId: 'sem-1',
      status: 'ACTIVE' as const,
    }
    const result = await examEventApi.getEvents(query)
    expect(result.data).toEqual([{ id: 'e1' }])
    expect(GET).toHaveBeenCalledWith('/exam-events', { params: { query } })
  })

  it('reads an event', async () => {
    GET.mockResolvedValue(ok({ id: 'e/1' }))
    await expect(examEventApi.getEvent('e/1')).resolves.toEqual({ id: 'e/1' })
    expect(GET).toHaveBeenCalledWith('/exam-events/{id}', {
      params: { path: { id: 'e/1' } },
    })
  })

  it('creates an event', async () => {
    POST.mockResolvedValue(ok({ id: 'e1' }))
    const body = { name: 'UTS' } as never
    await expect(examEventApi.createEvent(body)).resolves.toEqual({ id: 'e1' })
    expect(POST).toHaveBeenCalledWith('/exam-events', { body })
  })

  it('updates an event', async () => {
    PATCH.mockResolvedValue(ok({ id: 'e1' }))
    await expect(
      examEventApi.updateEvent('e1', { status: 'ACTIVE' }),
    ).resolves.toEqual({ id: 'e1' })
    expect(PATCH).toHaveBeenCalledWith('/exam-events/{id}', {
      params: { path: { id: 'e1' } },
      body: { status: 'ACTIVE' },
    })
  })

  it('lists the rooms of an event', async () => {
    GET.mockResolvedValue(ok([{ id: 'r1' }]))
    await expect(examEventApi.getRooms('e1')).resolves.toEqual([{ id: 'r1' }])
    expect(GET).toHaveBeenCalledWith('/exam-events/{id}/rooms', {
      params: { path: { id: 'e1' } },
    })
  })

  it('creates a room', async () => {
    POST.mockResolvedValue(ok({ id: 'r1' }))
    const body = { code: 'R01' } as never
    await expect(examEventApi.createRoom('e1', body)).resolves.toEqual({
      id: 'r1',
    })
    expect(POST).toHaveBeenCalledWith('/exam-events/{id}/rooms', {
      params: { path: { id: 'e1' } },
      body,
    })
  })

  it('updates a room', async () => {
    PATCH.mockResolvedValue(ok({ id: 'r1' }))
    await expect(
      examEventApi.updateRoom('r1', { capacity: 40 }),
    ).resolves.toEqual({ id: 'r1' })
    expect(PATCH).toHaveBeenCalledWith('/exam-rooms/{roomId}', {
      ...roomPath,
      body: { capacity: 40 },
    })
  })

  it('reads the seats', async () => {
    GET.mockResolvedValue(ok([{ studentId: 's1' }]))
    await expect(examEventApi.getSeats('r1')).resolves.toEqual([
      { studentId: 's1' },
    ])
    expect(GET).toHaveBeenCalledWith('/exam-rooms/{roomId}/seats', roomPath)
  })

  it('assigns seats', async () => {
    POST.mockResolvedValue(ok([{ studentId: 's1' }]))
    const students = [{ studentId: 's1', classroomId: 'c1', seatNumber: 1 }]
    await expect(examEventApi.assignSeats('r1', students)).resolves.toEqual([
      { studentId: 's1' },
    ])
    expect(POST).toHaveBeenCalledWith('/exam-rooms/{roomId}/seats', {
      ...roomPath,
      body: { students },
    })
  })

  it('distributes seats', async () => {
    POST.mockResolvedValue(ok([]))
    const body = {
      students: [{ studentId: 's1', classroomId: 'c1' }],
      roomIds: ['r1', 'r2'],
      interleaveByClassroom: true,
    }
    await expect(examEventApi.distributeSeats('r1', body)).resolves.toEqual([])
    expect(POST).toHaveBeenCalledWith('/exam-rooms/{roomId}/seats', {
      ...roomPath,
      body,
    })
  })

  it('lists supervisors', async () => {
    GET.mockResolvedValue(ok([{ slotId: 'x' }]))
    await expect(examEventApi.getSupervisors('r1')).resolves.toEqual([
      { slotId: 'x' },
    ])
    expect(GET).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/supervisors',
      roomPath,
    )
  })

  it('substitutes a supervisor', async () => {
    POST.mockResolvedValue(ok({ slotId: 'slot-1' }))
    const body = { actualUserId: 'u2', reason: 'Pengawas sakit' }
    await expect(
      examEventApi.substituteSupervisor('r1', 'slot-1', body),
    ).resolves.toEqual({ slotId: 'slot-1' })
    expect(POST).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/supervisors/{slotId}/substitute',
      { params: { path: { roomId: 'r1', slotId: 'slot-1' } }, body },
    )
  })

  it('reads the access code', async () => {
    GET.mockResolvedValue(ok({ accessCode: 'K7' }))
    await expect(examEventApi.getAccessCode('r1')).resolves.toEqual({
      accessCode: 'K7',
    })
    expect(GET).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/access-code',
      roomPath,
    )
  })

  it('rotates the token', async () => {
    POST.mockResolvedValue(ok({ accessCode: 'K8' }))
    await expect(
      examEventApi.rotateToken('r1', { reason: 'Token bocor' }),
    ).resolves.toEqual({ accessCode: 'K8' })
    expect(POST).toHaveBeenCalledWith('/exam-rooms/{roomId}/rotate-token', {
      ...roomPath,
      body: { reason: 'Token bocor' },
    })
  })

  it('reads the audit logs', async () => {
    GET.mockResolvedValue(ok([{ id: 'l1' }]))
    await expect(examEventApi.getAuditLogs('r1')).resolves.toEqual([
      { id: 'l1' },
    ])
    expect(GET).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/audit-logs',
      roomPath,
    )
  })

  it('assigns a supervisor', async () => {
    POST.mockResolvedValue(ok({ slotId: 'x' }))
    const body = {
      scheduledUserId: 'u1',
      startsAt: '2026-11-02T01:00:00.000Z',
      endsAt: '2026-11-02T03:00:00.000Z',
      reason: 'Jadwal',
    }
    await expect(examEventApi.assignSupervisor('r1', body)).resolves.toEqual({
      slotId: 'x',
    })
    expect(POST).toHaveBeenCalledWith('/exam-rooms/{roomId}/supervisors', {
      ...roomPath,
      body,
    })
  })

  it('extends the room time', async () => {
    POST.mockResolvedValue(ok({}))
    const body = { minutes: 15, reason: 'Server lambat' }
    await examEventApi.extendRoomTime('r1', body)
    expect(POST).toHaveBeenCalledWith('/exam-rooms/{roomId}/extend-time', {
      ...roomPath,
      body,
    })
  })

  it('allows web for one seat', async () => {
    POST.mockResolvedValue(ok({ studentId: 's1' }))
    await expect(
      examEventApi.allowWeb('r1', 's1', { reason: 'HP rusak' }),
    ).resolves.toEqual({ studentId: 's1' })
    expect(POST).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/seats/{studentId}/allow-web',
      {
        params: { path: { roomId: 'r1', studentId: 's1' } },
        body: { reason: 'HP rusak' },
      },
    )
  })

  it('allows late entry for one seat', async () => {
    POST.mockResolvedValue(ok({ studentId: 's1' }))
    await expect(
      examEventApi.allowLate('r1', 's1', { reason: 'Terlambat' }),
    ).resolves.toEqual({ studentId: 's1' })
    expect(POST).toHaveBeenCalledWith(
      '/exam-rooms/{roomId}/seats/{studentId}/allow-late',
      {
        params: { path: { roomId: 'r1', studentId: 's1' } },
        body: { reason: 'Terlambat' },
      },
    )
  })
})
