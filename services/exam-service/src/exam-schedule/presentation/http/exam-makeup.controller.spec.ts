import 'reflect-metadata'
import {
  PERMISSIONS_ANY_KEY,
  PERMISSIONS_KEY,
} from '@mts241alikhlash/nest-core/access-control'
import { ExamMakeupController } from './exam-makeup.controller.js'

const anyExpected: Record<string, string[]> = {
  absentees: [
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  makeup: ['exam-grading.grade', 'exam-grading.manage-all'],
  participants: [
    'exam-grading.read',
    'exam-grading.read-all',
    'exam-grading.manage-all',
  ],
  addToMakeup: ['exam-grading.grade', 'exam-grading.manage-all'],
  removeFromMakeup: ['exam-grading.grade', 'exam-grading.manage-all'],
}

describe('ExamMakeupController permissions', () => {
  it.each(Object.entries(anyExpected))(
    '%s accepts any of %j',
    (method, codes) => {
      const handler = ExamMakeupController.prototype[
        method as keyof ExamMakeupController
      ] as unknown as object

      expect(Reflect.getMetadata(PERMISSIONS_ANY_KEY, handler)).toEqual(codes)
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toBeUndefined()
    },
  )

  it('leaves no route without a permission', () => {
    const routes = Object.getOwnPropertyNames(
      ExamMakeupController.prototype,
    ).filter((name) => name !== 'constructor')

    expect(routes.sort()).toEqual(Object.keys(anyExpected).sort())
  })
})
