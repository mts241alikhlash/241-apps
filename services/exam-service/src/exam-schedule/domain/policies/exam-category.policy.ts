import {
  EXAM_CATEGORIES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '../entities/exam-schedule.entity.js'

export { EXAM_CATEGORIES, type ExamCategory }

export function categoryOf(type: ExamType): ExamCategory {
  return type === 'MIDTERM' || type === 'FINAL' ? 'EXAM' : 'NON_EXAM'
}

export function typesInCategory(category: ExamCategory): ExamType[] {
  return EXAM_TYPES.filter((type) => categoryOf(type) === category)
}
