import 'reflect-metadata'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { ExamScheduleController } from './exam-schedule.controller.js'

const expected: Record<string, string[]> = {
  findAll: ['exam-schedules.read'],
  findOne: ['exam-schedules.read'],
  create: ['exam-schedules.create'],
  update: ['exam-schedules.update'],
  cancel: ['exam-schedules.cancel'],
  accessCode: ['exam-schedules.access-code'],
  rotateAccessCode: ['exam-schedules.access-code'],
}

describe('ExamScheduleController permissions', () => {
  it.each(Object.entries(expected))('%s requires %j', (method, codes) => {
    const handler = ExamScheduleController.prototype[
      method as keyof ExamScheduleController
    ] as unknown as object

    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(codes)
  })

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamScheduleController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(Object.keys(expected).sort())
  })
})
