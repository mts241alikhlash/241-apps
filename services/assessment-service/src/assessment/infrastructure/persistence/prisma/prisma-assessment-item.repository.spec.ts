import { PrismaAssessmentItemRepository } from './prisma-assessment-item.repository.js'
import type { PrismaService } from '../../../../core/database/prisma.service.js'
import type { IProfileLookupPort } from '../../../../platform/profile-lookup/profile-lookup.port.js'
import type { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'

describe('PrismaAssessmentItemRepository.findNameClash', () => {
  function repositoryWithSpy(found: { id: string } | null) {
    const findFirst = vi.fn().mockResolvedValue(found)
    const prisma = {
      assessmentItem: { findFirst },
    } as unknown as PrismaService

    const repository = new PrismaAssessmentItemRepository(
      prisma,
      {} as IProfileLookupPort,
      {} as IAcademicLookupPort,
      {} as IEnrollmentLookupPort,
    )

    return { repository, findFirst }
  }

  it('queries trimmed case-insensitive name among non-deleted items in the teaching assignment', async () => {
    const { repository, findFirst } = repositoryWithSpy({ id: 'item-1' })

    const result = await repository.findNameClash('ta-1', '  Tugas 1  ')

    expect(result).toBe(true)
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        teachingAssignmentId: 'ta-1',
        deletedAt: null,
        name: { equals: 'Tugas 1', mode: 'insensitive' },
      },
      select: { id: true },
    })
  })

  it('excludes exceptId when provided', async () => {
    const { repository, findFirst } = repositoryWithSpy(null)

    const result = await repository.findNameClash('ta-1', 'Tugas 1', 'item-1')

    expect(result).toBe(false)
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        teachingAssignmentId: 'ta-1',
        deletedAt: null,
        name: { equals: 'Tugas 1', mode: 'insensitive' },
        NOT: { id: 'item-1' },
      },
      select: { id: true },
    })
  })
})
