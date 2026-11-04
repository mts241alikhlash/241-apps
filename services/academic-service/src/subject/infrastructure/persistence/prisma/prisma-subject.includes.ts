import { Prisma } from '../../../../generated/prisma/client.js'

const TEACHING_ASSIGNMENT_SELECT = {
  id: true,
  employeeId: true,
  classroom: { select: { id: true, name: true } },
} satisfies Prisma.TeachingAssignmentSelect

export type SubjectRow = Prisma.SubjectGetPayload<{
  include: {
    _count: { select: { teachingAssignments: true } }
    teachingAssignments: { select: typeof TEACHING_ASSIGNMENT_SELECT }
  }
}>

export function buildSubjectInclude(activeSemesterId: string | null) {
  const assignmentWhere: Prisma.TeachingAssignmentWhereInput = {
    deletedAt: null,
    semesterId: activeSemesterId ? { equals: activeSemesterId } : { in: [] },
  }

  return {
    _count: { select: { teachingAssignments: { where: assignmentWhere } } },
    teachingAssignments: {
      where: assignmentWhere,
      select: TEACHING_ASSIGNMENT_SELECT,
      orderBy: { classroom: { name: 'asc' } },
    },
  } satisfies Prisma.SubjectInclude
}
