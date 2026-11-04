import 'reflect-metadata'
import { PERMISSIONS_ANY_KEY } from '../../../platform/access-control/permission/decorators/require-any-permission.decorator.js'
import { PERMISSIONS_KEY } from '../../../platform/access-control/permission/decorators/require-permissions.decorator.js'
import { ExamSessionAdminController } from './exam-session-admin.controller.js'

const expected: Record<string, string[]> = {
  findBySchedule: ['exam-sessions.read'],
  release: ['exam-sessions.release'],
}

const anyExpected: Record<string, string[]> = {
  auditLogs: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  sessionTimeline: ['exam-rooms.supervise', 'exam-rooms.manage-all'],
  reopen: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  reset: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  extendTime: ['exam-rooms.technician', 'exam-rooms.manage-all'],
  snapshots: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  latestSnapshot: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
  snapshot: [
    'exam-rooms.supervise',
    'exam-rooms.technician',
    'exam-rooms.manage-all',
  ],
}

describe('ExamSessionAdminController permissions', () => {
  it.each(Object.entries(expected))('%s requires %j', (method, codes) => {
    const handler = ExamSessionAdminController.prototype[
      method as keyof ExamSessionAdminController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it.each(Object.entries(anyExpected))(
    '%s accepts any of %j so manage-all reaches it',
    (method, codes) => {
      const handler = ExamSessionAdminController.prototype[
        method as keyof ExamSessionAdminController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamSessionAdminController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(
      [...Object.keys(expected), ...Object.keys(anyExpected)].sort(),
    )
  })
})
