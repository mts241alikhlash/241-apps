import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET, POST, PATCH } = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PATCH: vi.fn(),
}))

vi.mock('@/shared/api/clients', () => ({
  examClient: { GET, POST, PATCH },
}))

import { examActivityApi } from './examActivityApi'

const ok = (data: unknown) => ({
  data: { data },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('examActivityApi', () => {
  it('lists with the category query', async () => {
    GET.mockResolvedValue(ok([{ id: 'a' }]))
    await expect(examActivityApi.list({ category: 'EXAM' })).resolves.toEqual([
      { id: 'a' },
    ])
    expect(GET).toHaveBeenCalledWith('/exam-activities', {
      params: { query: { category: 'EXAM' } },
    })
  })

  it('gets one activity', async () => {
    GET.mockResolvedValue(ok({ id: 'a/b' }))
    await expect(examActivityApi.get('a/b')).resolves.toEqual({ id: 'a/b' })
    expect(GET).toHaveBeenCalledWith('/exam-activities/{id}', {
      params: { path: { id: 'a/b' } },
    })
  })

  it('creates an activity', async () => {
    POST.mockResolvedValue(ok({ id: 'a' }))
    const body = { gradeId: 'g' } as never
    await expect(examActivityApi.create(body)).resolves.toEqual({ id: 'a' })
    expect(POST).toHaveBeenCalledWith('/exam-activities', { body })
  })

  it('updates the status', async () => {
    PATCH.mockResolvedValue(ok({ id: 'a' }))
    await examActivityApi.updateStatus('a', 'ACTIVE')
    expect(PATCH).toHaveBeenCalledWith('/exam-activities/{id}', {
      params: { path: { id: 'a' } },
      body: { status: 'ACTIVE' },
    })
  })

  it('updates the policy', async () => {
    PATCH.mockResolvedValue(ok({ id: 'a' }))
    const body = { violationLimit: 3 } as never
    await examActivityApi.updatePolicy('a', body)
    expect(PATCH).toHaveBeenCalledWith('/exam-activities/{id}/policy', {
      params: { path: { id: 'a' } },
      body,
    })
  })

  it('issues participant numbers', async () => {
    POST.mockResolvedValue(ok({ issued: true }))
    await expect(examActivityApi.issueParticipantNumbers('a')).resolves.toEqual(
      { issued: true },
    )
    expect(POST).toHaveBeenCalledWith(
      '/exam-activities/{id}/participant-numbers/issue',
      { params: { path: { id: 'a' } } },
    )
  })

  it('attaches a package with its classrooms', async () => {
    POST.mockResolvedValue(ok({ id: 'a' }))
    const body = { packageId: 'p', classroomIds: ['c'] }
    await examActivityApi.attachPackage('a', body)
    expect(POST).toHaveBeenCalledWith('/exam-activities/{id}/package', {
      params: { path: { id: 'a' } },
      body,
    })
  })

  it('assigns classrooms', async () => {
    POST.mockResolvedValue(ok({ id: 'a' }))
    const body = { classroomIds: ['c'] }
    await examActivityApi.assignClassrooms('a', body)
    expect(POST).toHaveBeenCalledWith('/exam-activities/{id}/classrooms', {
      params: { path: { id: 'a' } },
      body,
    })
  })

  it('sets the auto status', async () => {
    PATCH.mockResolvedValue(ok({ id: 'a' }))
    await examActivityApi.setAutoStatus('a', false)
    expect(PATCH).toHaveBeenCalledWith('/exam-activities/{id}/auto-status', {
      params: { path: { id: 'a' } },
      body: { autoStatus: false },
    })
  })

  it('reads the readiness of a day', async () => {
    GET.mockResolvedValue(ok([{ activityId: 'a' }]))
    await expect(
      examActivityApi.readiness({ eventId: 'e', date: '2026-11-27' }),
    ).resolves.toEqual([{ activityId: 'a' }])
    expect(GET).toHaveBeenCalledWith('/exam-activities/readiness', {
      params: { query: { eventId: 'e', date: '2026-11-27' } },
    })
  })

  it('rotates the token', async () => {
    POST.mockResolvedValue(ok({ id: 'a', tokenRotation: 2 }))
    await examActivityApi.rotateToken('a')
    expect(POST).toHaveBeenCalledWith('/exam-activities/{id}/token/rotate', {
      params: { path: { id: 'a' } },
    })
  })
})
