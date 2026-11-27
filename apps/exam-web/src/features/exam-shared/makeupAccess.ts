import type { ExamCategory } from './examType'

type HasPermission = (code: string) => boolean

const COMMITTEE = [
  'exam-schedules.manage-all',
  'exam-events.manage',
  'exam-grading.manage-all',
]

const READERS = [
  ...COMMITTEE,
  'exam-events.read',
  'exam-grading.read',
  'exam-grading.read-all',
]

export const canManageMakeup = (
  category: ExamCategory,
  has: HasPermission,
): boolean =>
  COMMITTEE.some((code) => has(code)) ||
  (category === 'NON_EXAM' && has('exam-grading.grade'))

export const canReadMakeup = (has: HasPermission): boolean =>
  READERS.some((code) => has(code))
