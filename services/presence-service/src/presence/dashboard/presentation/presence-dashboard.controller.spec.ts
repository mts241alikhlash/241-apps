import 'reflect-metadata'
import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionGuard } from '@mts241alikhlash/nest-core/access-control'
import { PresenceDashboardController } from './presence-dashboard.controller.js'

const guard = new PermissionGuard(new Reflector())

function contextFor(
  handler: keyof PresenceDashboardController,
  permissions: string[],
): ExecutionContext {
  return {
    getHandler: () => PresenceDashboardController.prototype[handler],
    getClass: () => PresenceDashboardController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u', roles: ['STAFF'], permissions } }),
    }),
  } as unknown as ExecutionContext
}

const guarded = [
  ['attendance', 'presence-records.read'],
  ['leaves', 'leave-requests.read'],
  ['me', 'presence-records.read-own'],
] as const

describe('PresenceDashboardController guards', () => {
  it.each(guarded)('%s is refused without %s', (handler, code) => {
    expect(() => guard.canActivate(contextFor(handler, []))).toThrow(
      ForbiddenException,
    )
    expect(() =>
      guard.canActivate(
        contextFor(
          handler,
          ['presence-records.read-own'].filter((c) => c !== code),
        ),
      ),
    ).toThrow(ForbiddenException)
  })

  it.each(guarded)('%s is allowed with %s', (handler, code) => {
    expect(guard.canActivate(contextFor(handler, [code]))).toBe(true)
  })

  it('a caller with only read-own codes cannot reach the management endpoints', () => {
    const own = ['presence-records.read-own', 'leave-requests.read-own']
    expect(() => guard.canActivate(contextFor('attendance', own))).toThrow(
      ForbiddenException,
    )
    expect(() => guard.canActivate(contextFor('leaves', own))).toThrow(
      ForbiddenException,
    )
  })
})
