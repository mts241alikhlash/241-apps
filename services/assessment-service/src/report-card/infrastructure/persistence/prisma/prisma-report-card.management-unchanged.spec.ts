import { PrismaReportCardRepository } from './prisma-report-card.repository.js'
import type { PrismaService } from '../../../../core/database/prisma.service.js'
import type { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'

describe('report card management read is unchanged', () => {
  function repositoryWithSpy() {
    const findMany = vi.fn().mockResolvedValue([])
    const count = vi.fn().mockResolvedValue(0)
    const aggregate = vi.fn().mockResolvedValue({ _avg: { totalAverage: 81 } })

    const prisma = {
      reportCard: { findMany, count, aggregate },
    } as unknown as PrismaService
    const findActiveSemester = vi.fn().mockResolvedValue({ id: 'sem-active' })
    const academicLookup = {
      findActiveSemester,
      listClassrooms: vi.fn().mockResolvedValue([]),
      listSemesters: vi.fn().mockResolvedValue([]),
    } as unknown as IAcademicLookupPort
    const search = vi.fn().mockResolvedValue([{ id: 'enr-1' }])
    const enrollmentLookup = {
      search,
      listByIds: vi.fn().mockResolvedValue([]),
    } as unknown as IEnrollmentLookupPort

    return {
      repository: new PrismaReportCardRepository(
        prisma,
        academicLookup,
        enrollmentLookup,
      ),
      findMany,
      count,
      search,
    }
  }

  it('carries no student condition when none was asked for', async () => {
    const { repository, findMany, search } = repositoryWithSpy()

    await repository.findAll({ page: 1, limit: 10, classroomId: 'cls-1' })

    expect(search).toHaveBeenCalledWith({
      studentId: undefined,
      classroomId: 'cls-1',
      semesterId: 'sem-active',
    })
    expect(findMany.mock.calls[0][0].where.enrollmentId).toEqual({
      in: ['enr-1'],
    })
  })

  it('returns drafts to a management caller, which the student read never does', async () => {
    const { repository, findMany } = repositoryWithSpy()

    await repository.findAll({ page: 1, limit: 10 })

    expect(findMany.mock.calls[0][0].where.isPublished).toBeUndefined()
  })

  it('still pages, and still summarizes the whole filtered set', async () => {
    const { repository, findMany, count } = repositoryWithSpy()

    const result = await repository.findAll({ page: 3, limit: 20 })

    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 40, take: 20 })
    for (const call of count.mock.calls) {
      expect(call[0]).not.toHaveProperty('skip')
    }
    expect(result.summary).toBeDefined()
  })
})
