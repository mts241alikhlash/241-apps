import { ForbiddenException } from '@nestjs/common'
import type { IGradingScopeReadPort } from '../../assessment/domain/repositories/grading-scope-read.port.js'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'

export interface AssertTeachesDeps {
  employeeIdentity: IEmployeeIdentityReadPort
  gradingScope: IGradingScopeReadPort
}

export async function assertTeaches(
  userId: string,
  teachingAssignmentId: string,
  deps: AssertTeachesDeps,
): Promise<void> {
  const refused = new ForbiddenException(
    'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM',
  )

  const employeeId = await deps.employeeIdentity.findEmployeeIdByUserId(userId)

  if (!employeeId) throw refused

  const teaches = await deps.gradingScope.teachesTeachingAssignment(
    employeeId,
    teachingAssignmentId,
  )

  if (!teaches) throw refused
}
