import type { PrismaService } from '../../../../core/database/prisma.service.js'
import type { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import { PrismaGradingScopeReadPort } from './prisma-grading-scope.read-port.js'

describe('PrismaGradingScopeReadPort.teachesTeachingAssignment', () => {
  function makePort(belongsTo: boolean) {
    const teachingAssignmentBelongsTo = vi.fn().mockResolvedValue(belongsTo)
    const port = new PrismaGradingScopeReadPort(
      {} as PrismaService,
      { teachingAssignmentBelongsTo } as unknown as IAcademicLookupPort,
      {} as IEnrollmentLookupPort,
    )
    return { port, teachingAssignmentBelongsTo }
  }

  it('returns true when academicLookup confirms the employee owns the teaching assignment', async () => {
    const { port, teachingAssignmentBelongsTo } = makePort(true)

    await expect(port.teachesTeachingAssignment('emp-1', 'ta-1')).resolves.toBe(
      true,
    )
    expect(teachingAssignmentBelongsTo).toHaveBeenCalledWith('ta-1', 'emp-1')
  })

  it('returns false when the teaching assignment belongs to someone else', async () => {
    const { port } = makePort(false)

    await expect(port.teachesTeachingAssignment('emp-1', 'ta-2')).resolves.toBe(
      false,
    )
  })
})
