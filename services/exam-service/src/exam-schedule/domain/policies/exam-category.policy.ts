import {
  EXAM_CATEGORIES,
  type ExamCategory,
  type ExamType,
} from '../entities/exam-schedule.entity'

export { EXAM_CATEGORIES, type ExamCategory }

export function categoryOf(type: ExamType): ExamCategory {
  return type === 'MIDTERM' || type === 'FINAL' ? 'EXAM' : 'NON_EXAM'
}
