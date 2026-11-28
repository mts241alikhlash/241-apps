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

export interface StaffUserIds {
  technicianUserId: string | null
  currentSupervisorUserId: string | null
  scheduledSupervisorUserId: string | null
}

export async function staffNamesMany(
  authors: IAuthorLookupPort,
  employees: IEmployeeIdentityReadPort,
  inputs: StaffUserIds[],
): Promise<StaffNames[]> {
  const userIds = inputs.flatMap((input) =>
    [
      input.technicianUserId,
      input.currentSupervisorUserId,
      input.scheduledSupervisorUserId,
    ].filter((id): id is string => id !== null),
  )
  const employeeOf = await employeeIdsOf(employees, userIds)
  const names = await authors.namesOf([...new Set(employeeOf.values())])
  const nameOf = (userId: string | null): string | null => {
    if (userId === null) return null
    const employeeId = employeeOf.get(userId)
    return employeeId === undefined ? null : (names.get(employeeId) ?? null)
  }
  return inputs.map((input) => ({
    technicianName: nameOf(input.technicianUserId),
    currentSupervisorName: nameOf(input.currentSupervisorUserId),
    scheduledSupervisorName: nameOf(input.scheduledSupervisorUserId),
  }))
}

export async function staffNames(
  authors: IAuthorLookupPort,
  employees: IEmployeeIdentityReadPort,
  input: StaffUserIds,
): Promise<StaffNames> {
  const [names] = await staffNamesMany(authors, employees, [input])
  return names
}
