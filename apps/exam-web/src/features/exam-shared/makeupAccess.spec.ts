import { describe, expect, it } from 'vitest'
import { canManageMakeup, canReadMakeup } from './makeupAccess'

const holder =
  (...codes: string[]) =>
  (code: string) =>
    codes.includes(code)

const ADMIN_ISTIQRA = holder('exam-events.manage', 'exam-grading.read')
const CURRICULUM = holder('exam-schedules.manage-all', 'exam-grading.read-all')
const SUPER_ADMIN = holder('exam-grading.manage-all')
const GURU = holder(
  'exam-grading.grade',
  'exam-grading.read',
  'exam-schedules.manage',
)
const VIEWER = holder('exam-events.read')

describe('canManageMakeup', () => {
  it('lets the exam committee and manage-all manage makeups of exams and non-exam work', () => {
    for (const has of [ADMIN_ISTIQRA, CURRICULUM, SUPER_ADMIN]) {
      expect(canManageMakeup('EXAM', has)).toBe(true)
      expect(canManageMakeup('NON_EXAM', has)).toBe(true)
    }
  })

  it('lets a teacher manage makeups of non-exam work only', () => {
    expect(canManageMakeup('NON_EXAM', GURU)).toBe(true)
    expect(canManageMakeup('EXAM', GURU)).toBe(false)
  })

  it('refuses readers', () => {
    expect(canManageMakeup('EXAM', VIEWER)).toBe(false)
    expect(canManageMakeup('NON_EXAM', holder('exam-grading.read'))).toBe(false)
  })
})

describe('canReadMakeup', () => {
  it('accepts grading readers and the exam committee', () => {
    for (const has of [ADMIN_ISTIQRA, CURRICULUM, SUPER_ADMIN, GURU, VIEWER]) {
      expect(canReadMakeup(has)).toBe(true)
    }
  })

  it('refuses a user with none of them', () => {
    expect(canReadMakeup(holder('exam-schedules.read'))).toBe(false)
  })
})
