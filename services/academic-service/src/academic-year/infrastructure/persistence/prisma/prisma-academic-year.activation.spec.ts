import { PrismaService } from '../../../../core/database/prisma.service.js'
import { PrismaAcademicYearRepository } from './prisma-academic-year.repository.js'
import type { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'

describe('academic year activation', () => {
  const semester = {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  }
  const academicYear = {
    updateMany: vi.fn(),
    update: vi.fn(),
  }

  const tx = { semester, academicYear }
  const prisma = {
    $transaction: vi.fn((cb: (client: typeof tx) => unknown) => cb(tx)),
  }

  const enrollmentLookup = {
    countBySemesters: vi.fn().mockResolvedValue(new Map()),
  } as unknown as IEnrollmentLookupPort

  const repository = new PrismaAcademicYearRepository(
    prisma as unknown as PrismaService,
    enrollmentLookup,
  )

  beforeEach(() => {
    vi.clearAllMocks()
    academicYear.update.mockResolvedValue({ id: 'ay-new', isActive: true })
  })

  it('activates the first term of the year it activates', async () => {
    semester.findFirst.mockResolvedValue({ id: 'ganjil-new' })

    await repository.activateById('ay-new')

    expect(semester.update).toHaveBeenCalledWith({
      where: { id: 'ganjil-new' },
      data: { isActive: true },
    })
  })

  it('picks that term by sequence rather than by name', async () => {
    semester.findFirst.mockResolvedValue({ id: 'ganjil-new' })

    await repository.activateById('ay-new')

    expect(semester.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { academicYearId: 'ay-new', deletedAt: null },
        orderBy: [{ type: { sequence: 'asc' } }, { id: 'asc' }],
      }),
    )
  })

  it('stands down whatever term was active before, and only that', async () => {
    semester.findFirst.mockResolvedValue({ id: 'ganjil-new' })

    await repository.activateById('ay-new')

    expect(semester.updateMany).toHaveBeenCalledWith({
      where: { isActive: true, NOT: { id: 'ganjil-new' } },
      data: { isActive: false },
    })
  })

  it('leaves no term active when the incoming year has none', async () => {
    semester.findFirst.mockResolvedValue(null)

    await repository.activateById('ay-empty')

    expect(semester.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    })
    expect(semester.update).not.toHaveBeenCalled()
  })

  it('still deactivates the year that was active', async () => {
    semester.findFirst.mockResolvedValue(null)

    await repository.activateById('ay-new')

    expect(academicYear.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    })
    expect(academicYear.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ay-new' } }),
    )
  })

  it('does all of it in one transaction', async () => {
    semester.findFirst.mockResolvedValue({ id: 'ganjil-new' })

    await repository.activateById('ay-new')

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
