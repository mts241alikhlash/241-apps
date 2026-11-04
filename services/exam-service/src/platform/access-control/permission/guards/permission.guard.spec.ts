import 'reflect-metadata'
import { ForbiddenException, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionGuard } from './permission.guard.js'
import { RequirePermissions } from '../decorators/require-permissions.decorator.js'
import { RequireAnyPermission } from '../decorators/require-any-permission.decorator.js'

class AllRoutes {
  @RequirePermissions('exam-events.read', 'exam-events.manage')
  all(): string {
    return 'all'
  }

  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  any(): string {
    return 'any'
  }

  @RequirePermissions('exam-events.read')
  @RequireAnyPermission('exam-rooms.technician', 'exam-rooms.manage-all')
  both(): string {
    return 'both'
  }

  open(): string {
    return 'open'
  }
}

function contextFor(
  handler: keyof AllRoutes,
  user?: { id: string; roles: string[]; permissions: string[] },
): ExecutionContext {
  return {
    getHandler: () => AllRoutes.prototype[handler],
    getClass: () => AllRoutes,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext
}

const guard = new PermissionGuard(new Reflector())

const staff = (...permissions: string[]) => ({
  id: 'u1',
  roles: ['ACADEMIC_ADMIN'],
  permissions,
})

describe('PermissionGuard', () => {
  it('lets an undecorated handler through without a user', () => {
    expect(guard.canActivate(contextFor('open'))).toBe(true)
  })

  it('keeps the all-of path: every listed code is required', () => {
    expect(() =>
      guard.canActivate(contextFor('all', staff('exam-events.read'))),
    ).toThrow(ForbiddenException)
  })

  it('lets the all-of path through when every code is held', () => {
    expect(
      guard.canActivate(
        contextFor('all', staff('exam-events.read', 'exam-events.manage')),
      ),
    ).toBe(true)
  })

  it('lets the any-of path through when one code is held', () => {
    expect(
      guard.canActivate(contextFor('any', staff('exam-rooms.manage-all'))),
    ).toBe(true)
  })

  it('lets the any-of path through for the other code alone', () => {
    expect(
      guard.canActivate(contextFor('any', staff('exam-rooms.technician'))),
    ).toBe(true)
  })

  it('still refuses the any-of path when no code is held', () => {
    expect(() =>
      guard.canActivate(contextFor('any', staff('exam-events.read'))),
    ).toThrow(ForbiddenException)
  })

  it('still enforces the all-of set when a handler carries both', () => {
    expect(() =>
      guard.canActivate(contextFor('both', staff('exam-rooms.manage-all'))),
    ).toThrow(ForbiddenException)
  })

  it('passes a both-decorated handler only when both variants hold', () => {
    expect(
      guard.canActivate(
        contextFor('both', staff('exam-events.read', 'exam-rooms.manage-all')),
      ),
    ).toBe(true)
  })

  it('keeps the super admin bypass on the any-of path', () => {
    expect(
      guard.canActivate(
        contextFor('any', {
          id: 'u0',
          roles: ['SUPER_ADMIN'],
          permissions: [],
        }),
      ),
    ).toBe(true)
  })

  it('refuses an any-of handler for an unauthenticated caller', () => {
    expect(() => guard.canActivate(contextFor('any'))).toThrow(
      ForbiddenException,
    )
  })
})
