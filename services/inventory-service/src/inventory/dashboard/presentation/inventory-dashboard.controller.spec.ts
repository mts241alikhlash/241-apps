import 'reflect-metadata'
import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'
import { InventoryDashboardController } from './inventory-dashboard.controller.js'

const guard = new PermissionGuard(new Reflector())

function contextFor(
  handler: keyof InventoryDashboardController,
  permissions: string[],
): ExecutionContext {
  return {
    getHandler: () => InventoryDashboardController.prototype[handler],
    getClass: () => InventoryDashboardController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u', roles: ['STAFF'], permissions } }),
    }),
  } as unknown as ExecutionContext
}

describe('InventoryDashboardController guards', () => {
  it.each([
    ['assets', 'inventory-assets.read'],
    ['loans', 'inventory-loans.read'],
  ] as const)('%s needs %s', (handler, code) => {
    expect(() => guard.canActivate(contextFor(handler, []))).toThrow(
      ForbiddenException,
    )
    expect(() =>
      guard.canActivate(contextFor(handler, ['inventory-approvals.read'])),
    ).toThrow(ForbiddenException)
    expect(guard.canActivate(contextFor(handler, [code]))).toBe(true)
  })
})
