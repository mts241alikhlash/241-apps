import { ServiceUnavailableException } from '@nestjs/common'
import type { IEmployeeIdentityReadPort } from '../../platform/employee-identity/employee-identity.port.js'
import { FakeAcademicLookup } from '../../exam-schedule/application/exam-schedule.test-support.js'
import { GradingScopeService } from './grading-scope.service.js'

const teacher = {
  id: 'u1',
  roles: ['TEACHER'],
  permissions: ['exam-grading.read', 'exam-grading.grade'],
}

const principal = {
  id: 'u2',
  roles: ['PRINCIPAL'],
  permissions: ['exam-grading.read', 'exam-grading.read-all'],
}

const employees = (employeeId: string | null) =>
  ({
    findEmployeeIdByUserId: () => Promise.resolve(employeeId),
    employeeExists: () => Promise.resolve(true),
  }) as IEmployeeIdentityReadPort

describe('GradingScopeService', () => {
  it('allows only the subject and classroom a teacher teaches', async () => {
    const academic = new FakeAcademicLookup({
      assignments: [{ subjectId: 'math', classroomId: '7a' }],
    })
    const scope = await new GradingScopeService(
      employees('e1'),
      academic,
    ).forRead(teacher)

    expect(await scope.allows('math', '7a', 'sem-1')).toBe(true)
    expect(await scope.allows('math', '7b', 'sem-1')).toBe(false)
    expect(await scope.allows('art', '7a', 'sem-1')).toBe(false)
  })

  it('judges each semester by its own assignments', async () => {
    const academic = new FakeAcademicLookup({
      assignmentsBySemester: {
        'sem-old': [{ subjectId: 'math', classroomId: '7a' }],
        'sem-new': [],
      },
    })
    const scope = await new GradingScopeService(
      employees('e1'),
      academic,
    ).forRead(teacher)

    expect(await scope.allows('math', '7a', 'sem-old')).toBe(true)
    expect(await scope.allows('math', '7a', 'sem-new')).toBe(false)
    expect(await scope.pairsFor('sem-old')).toEqual([
      { subjectId: 'math', classroomId: '7a' },
    ])
  })

  it('asks the academic service once per semester', async () => {
    const academic = new FakeAcademicLookup({ assignments: [] })
    const spy = vi.spyOn(academic, 'teachingAssignmentsOf')
    const scope = await new GradingScopeService(
      employees('e1'),
      academic,
    ).forRead(teacher)

    await scope.allows('a', 'b', 'sem-1')
    await scope.allows('c', 'd', 'sem-1')

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('lets manage-all through for both read and write without asking anyone', async () => {
    const academic = new FakeAcademicLookup()
    const spy = vi.spyOn(academic, 'teachingAssignmentsOf')
    const service = new GradingScopeService(employees(null), academic)
    const manager = {
      ...teacher,
      permissions: ['exam-grading.read', 'exam-grading.manage-all'],
    }
    const readScope = await service.forRead(manager)
    const writeScope = await service.forWrite(manager)

    expect(readScope.all).toBe(true)
    expect(await readScope.allows('any', 'any', 'any')).toBe(true)
    expect(writeScope.all).toBe(true)
    expect(await writeScope.allows('any', 'any', 'any')).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })

  it('lets read-all read everything while denying write without grade permission', async () => {
    const academic = new FakeAcademicLookup({
      assignments: [{ subjectId: 'math', classroomId: '7a' }],
    })
    const spy = vi.spyOn(academic, 'teachingAssignmentsOf')
    const service = new GradingScopeService(employees('e1'), academic)

    const readScope = await service.forRead(principal)
    expect(readScope.all).toBe(true)
    expect(await readScope.allows('any', 'any', 'any')).toBe(true)

    const writeScope = await service.forWrite(principal)
    expect(writeScope.all).toBe(false)
    expect(await writeScope.allows('math', '7a', 'sem-1')).toBe(false)
    expect(await writeScope.pairsFor('sem-1')).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('scopes forWrite by teaching assignments when user has exam-grading.grade', async () => {
    const academic = new FakeAcademicLookup({
      assignments: [{ subjectId: 'math', classroomId: '7a' }],
    })
    const writeScope = await new GradingScopeService(
      employees('e1'),
      academic,
    ).forWrite(teacher)

    expect(writeScope.all).toBe(false)
    expect(await writeScope.allows('math', '7a', 'sem-1')).toBe(true)
    expect(await writeScope.allows('math', '7b', 'sem-1')).toBe(false)
  })

  it('allows nothing to an account without an employee record', async () => {
    const scope = await new GradingScopeService(
      employees(null),
      new FakeAcademicLookup(),
    ).forRead(teacher)

    expect(scope.all).toBe(false)
    expect(await scope.allows('math', '7a', 'sem-1')).toBe(false)
    expect(await scope.pairsFor('sem-1')).toEqual([])
  })

  it('fails closed when the academic lookup is down', async () => {
    const academic = new FakeAcademicLookup({
      failWith: new ServiceUnavailableException('down'),
    })
    const scope = await new GradingScopeService(
      employees('e1'),
      academic,
    ).forRead(teacher)

    await expect(scope.allows('math', '7a', 'sem-1')).rejects.toThrow(
      ServiceUnavailableException,
    )
  })
})
