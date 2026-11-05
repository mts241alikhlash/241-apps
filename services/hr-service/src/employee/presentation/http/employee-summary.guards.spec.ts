import 'reflect-metadata'
import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'
import { PayslipController } from '../../../payroll/payslip/presentation/payslip.controller.js'
import { EmployeeController } from './employee.controller.js'

const guard = new PermissionGuard(new Reflector())

function contextFor(
  controller: new (...args: never[]) => object,
  handler: string,
  permissions: string[],
): ExecutionContext {
  return {
    getHandler: () =>
      (controller.prototype as Record<string, () => void>)[handler],
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u', roles: ['STAFF'], permissions } }),
    }),
  } as unknown as ExecutionContext
}

describe('hr dashboard endpoint guards', () => {
  it('summary needs employees.read', () => {
    expect(() =>
      guard.canActivate(
        contextFor(EmployeeController, 'summary', ['employees.read-own']),
      ),
    ).toThrow(ForbiddenException)
    expect(
      guard.canActivate(
        contextFor(EmployeeController, 'summary', ['employees.read']),
      ),
    ).toBe(true)
  })

  it('latest payslip period needs payroll-payslips.read-own', () => {
    expect(() =>
      guard.canActivate(
        contextFor(PayslipController, 'latestPeriod', [
          'payroll-payslips.read',
        ]),
      ),
    ).toThrow(ForbiddenException)
    expect(
      guard.canActivate(
        contextFor(PayslipController, 'latestPeriod', [
          'payroll-payslips.read-own',
        ]),
      ),
    ).toBe(true)
  })
})
