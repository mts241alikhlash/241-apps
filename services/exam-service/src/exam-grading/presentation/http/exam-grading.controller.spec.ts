import 'reflect-metadata'
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { ExamGradingController } from './exam-grading.controller.js'

const anyExpected: Record<string, string[]> = {
  schedules: [
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  sessions: [
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  session: [
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  grade: ['exam-grading.grade', 'exam-grading.manage-all'],
}

describe('ExamGradingController permissions', () => {
  it.each(Object.entries(anyExpected))(
    '%s accepts any of %j',
    (method, codes) => {
      const handler = ExamGradingController.prototype[
        method as keyof ExamGradingController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamGradingController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(Object.keys(anyExpected).sort())
  })
})
