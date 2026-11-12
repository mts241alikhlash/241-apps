import { beforeEach, describe, expect, it, vi } from 'vitest'

const { GET } = vi.hoisted(() => ({ GET: vi.fn() }))

vi.mock('@/shared/api/clients', () => ({
  academicClient: { GET },
  studentClient: { GET },
}))

import { classroomApi } from './classroomApi'
import { studentEnrollmentApi } from './studentEnrollmentApi'

const page = (data: unknown, meta?: unknown) => ({
  data: { data, meta },
  response: new Response(null, { status: 200 }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('classroomApi', () => {
  it('lists classrooms', async () => {
    GET.mockResolvedValue(page([{ id: 'c' }], { total: 1, page: 1, limit: 5 }))
    await expect(classroomApi.getClassrooms({ limit: 5 })).resolves.toEqual({
      data: [{ id: 'c' }],
      meta: { total: 1, page: 1, limit: 5 },
    })
    expect(GET).toHaveBeenCalledWith('/classrooms', {
      params: { query: { limit: 5 } },
    })
  })
})

describe('studentEnrollmentApi', () => {
  it('lists enrollments', async () => {
    GET.mockResolvedValue(page([{ id: 'e' }]))
    const result = await studentEnrollmentApi.getEnrollments({
      semesterId: 's',
      status: 'ACTIVE',
    })
    expect(result.data).toEqual([{ id: 'e' }])
    expect(GET).toHaveBeenCalledWith('/student-enrollments', {
      params: { query: { semesterId: 's', status: 'ACTIVE' } },
    })
  })
})
