import { ServiceUnavailableException } from '@nestjs/common'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import { employeeIdsOf, staffNames } from './room-staff-names.js'

const authors = {
  namesOf: (ids: string[]) =>
    Promise.resolve(new Map(ids.map((id) => [id, `Nama ${id}`]))),
}

const employees = (
  lookup: (userId: string) => Promise<string | null>,
): IEmployeeIdentityReadPort => ({
  findEmployeeIdByUserId: lookup,
  employeeExists: () => Promise.resolve(true),
})

describe('employeeIdsOf', () => {
  it('skips a user whose lookup hr-service refuses and keeps the rest', async () => {
    const map = await employeeIdsOf(
      employees((userId) =>
        userId === 'busy'
          ? Promise.reject(new ServiceUnavailableException('429'))
          : Promise.resolve(`emp-${userId}`),
      ),
      ['a', 'busy', 'a', 'b'],
    )

    expect([...map]).toEqual([
      ['a', 'emp-a'],
      ['b', 'emp-b'],
    ])
  })

  it('does not hide an unexpected failure', async () => {
    await expect(
      employeeIdsOf(
        employees(() => Promise.reject(new Error('bug'))),
        ['a'],
      ),
    ).rejects.toThrow('bug')
  })
})

describe('staffNames', () => {
  it('leaves a name empty when hr-service is refusing instead of failing', async () => {
    const names = await staffNames(
      authors,
      employees(() => Promise.reject(new ServiceUnavailableException('429'))),
      {
        technicianUserId: 't',
        currentSupervisorUserId: 's',
        scheduledSupervisorUserId: 's',
      },
    )

    expect(names).toEqual({
      technicianName: null,
      currentSupervisorName: null,
      scheduledSupervisorName: null,
    })
  })

  it('names the staff it can resolve', async () => {
    const names = await staffNames(
      authors,
      employees((userId) => Promise.resolve(`emp-${userId}`)),
      {
        technicianUserId: 't',
        currentSupervisorUserId: 's',
        scheduledSupervisorUserId: null,
      },
    )

    expect(names).toMatchObject({
      technicianName: 'Nama emp-t',
      currentSupervisorName: 'Nama emp-s',
      scheduledSupervisorName: null,
    })
  })
})
