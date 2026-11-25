import { ForbiddenException } from '@nestjs/common'
import type { IGradingScopeReadPort } from '../../assessment/domain/repositories/grading-scope-read.port.js'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import { assertTeaches } from './assert-teaches.js'

describe('assertTeaches', () => {
  const USER = 'user-1'
  const EMPLOYEE = 'employee-1'
  const TEACHING_ASSIGNMENT = 'ta-1'
  const MESSAGE =
    'Hanya guru pengampu kelas dan mapel ini yang dapat memakai fitur RDM'

  function makeDeps(options: {
    employeeId?: string | null
    teaches?: boolean
  }) {
    const findEmployeeIdByUserId = vi
      .fn()
      .mockResolvedValue(
        options.employeeId === undefined ? EMPLOYEE : options.employeeId,
      )
    const teachesTeachingAssignment = vi
      .fn()
      .mockResolvedValue(options.teaches ?? false)

    const employeeIdentity: IEmployeeIdentityReadPort = {
      findEmployeeIdByUserId,
      employeeExists: vi.fn().mockResolvedValue(true),
    }

    const gradingScope: IGradingScopeReadPort = {
      teachesAssessmentItem: vi.fn().mockResolvedValue(false),
      supervisesEnrollment: vi.fn().mockResolvedValue(false),
      teachesTeachingAssignment,
    }

    return {
      deps: { employeeIdentity, gradingScope },
      findEmployeeIdByUserId,
      teachesTeachingAssignment,
    }
  }

  it('passes for the employee assigned to the teaching assignment', async () => {
    const { deps, findEmployeeIdByUserId, teachesTeachingAssignment } =
      makeDeps({ teaches: true })

    await expect(
      assertTeaches(USER, TEACHING_ASSIGNMENT, deps),
    ).resolves.toBeUndefined()

    expect(findEmployeeIdByUserId).toHaveBeenCalledWith(USER)
    expect(teachesTeachingAssignment).toHaveBeenCalledWith(
      EMPLOYEE,
      TEACHING_ASSIGNMENT,
    )
  })

  it('refuses another employee with the Indonesian ForbiddenException message', async () => {
    const { deps } = makeDeps({ teaches: false })

    const err = await assertTeaches(USER, TEACHING_ASSIGNMENT, deps).catch(
      (e: unknown) => e,
    )

    expect(err).toBeInstanceOf(ForbiddenException)
    expect((err as ForbiddenException).message).toBe(MESSAGE)
  })

  it('refuses a user without an employee record and skips scope lookup', async () => {
    const { deps, teachesTeachingAssignment } = makeDeps({
      employeeId: null,
      teaches: true,
    })

    const err = await assertTeaches(USER, TEACHING_ASSIGNMENT, deps).catch(
      (e: unknown) => e,
    )

    expect(err).toBeInstanceOf(ForbiddenException)
    expect((err as ForbiddenException).message).toBe(MESSAGE)
    expect(teachesTeachingAssignment).not.toHaveBeenCalled()
  })
})
