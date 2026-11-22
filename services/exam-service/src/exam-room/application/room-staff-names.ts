import { ServiceUnavailableException } from '@nestjs/common'
import { IAuthorLookupPort } from '../../platform/author-lookup/author-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'

export interface StaffNames {
  technicianName: string | null
  currentSupervisorName: string | null
  scheduledSupervisorName: string | null
}

export async function employeeIdsOf(
  employees: IEmployeeIdentityReadPort,
  userIds: Iterable<string>,
): Promise<Map<string, string>> {
  const employeeOf = new Map<string, string>()
  for (const userId of new Set(userIds)) {
    try {
      const employeeId = await employees.findEmployeeIdByUserId(userId)
      if (employeeId !== null) employeeOf.set(userId, employeeId)
    } catch (error) {
      if (!(error instanceof ServiceUnavailableException)) throw error
    }
  }
  return employeeOf
}

export async function staffNames(
  authors: IAuthorLookupPort,
  employees: IEmployeeIdentityReadPort,
  input: {
    technicianUserId: string | null
    currentSupervisorUserId: string | null
    scheduledSupervisorUserId: string | null
  },
): Promise<StaffNames> {
  const userIds = [
    input.technicianUserId,
    input.currentSupervisorUserId,
    input.scheduledSupervisorUserId,
  ].filter((id): id is string => id !== null)
  if (userIds.length === 0) {
    return {
      technicianName: null,
      currentSupervisorName: null,
      scheduledSupervisorName: null,
    }
  }
  const employeeOf = await employeeIdsOf(employees, userIds)
  const names = await authors.namesOf([...employeeOf.values()])
  const nameOf = (userId: string | null): string | null => {
    if (userId === null) return null
    const employeeId = employeeOf.get(userId)
    return employeeId === undefined ? null : (names.get(employeeId) ?? null)
  }
  return {
    technicianName: nameOf(input.technicianUserId),
    currentSupervisorName: nameOf(input.currentSupervisorUserId),
    scheduledSupervisorName: nameOf(input.scheduledSupervisorUserId),
  }
}
