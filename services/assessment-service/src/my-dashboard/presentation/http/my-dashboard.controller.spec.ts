import 'reflect-metadata'
import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'
import { MyDashboardController } from './my-dashboard.controller.js'

const guard = new PermissionGuard(new Reflector())

function contextFor(
  handler: keyof MyDashboardController,
  permissions: string[],
): ExecutionContext {
  return {
    getHandler: () => MyDashboardController.prototype[handler],
    getClass: () => MyDashboardController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u', roles: ['STAFF'], permissions } }),
    }),
  } as unknown as ExecutionContext
}

describe('MyDashboardController guards', () => {
  it('institution is refused with only dashboards.read-own', () => {
    expect(() =>
      guard.canActivate(contextFor('findInstitution', ['dashboards.read-own'])),
    ).toThrow(ForbiddenException)
  })

  it('institution is allowed with dashboards.read', () => {
    expect(
      guard.canActivate(contextFor('findInstitution', ['dashboards.read'])),
    ).toBe(true)
  })

  it('me still needs dashboards.read-own and not dashboards.read', () => {
    expect(() =>
      guard.canActivate(contextFor('findMine', ['dashboards.read'])),
    ).toThrow(ForbiddenException)
    expect(
      guard.canActivate(contextFor('findMine', ['dashboards.read-own'])),
    ).toBe(true)
  })
})
