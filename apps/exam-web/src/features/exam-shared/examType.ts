import type { components } from '@mts241alikhlash/exam-api'

type Schemas = components['schemas']

export type ExamType = Schemas['ExamActivityDto']['type']
export type ExamCategory = Schemas['ExamActivityDto']['category']

export const EXAM_TYPES = [
  'DAILY',
  'ASSIGNMENT',
  'MIDTERM',
  'FINAL',
] as const satisfies readonly ExamType[]

export const EXAM_CATEGORIES = [
  'EXAM',
  'NON_EXAM',
] as const satisfies readonly ExamCategory[]

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  DAILY: 'Ulangan Harian',
  ASSIGNMENT: 'Tugas',
  MIDTERM: 'UTS',
  FINAL: 'UAS',
}

export const EXAM_CATEGORY_LABEL: Record<ExamCategory, string> = {
  EXAM: 'Ujian',
  NON_EXAM: 'Non-ujian',
}

export const examTypeLabel = (type: ExamType): string => EXAM_TYPE_LABEL[type]

export const examCategoryLabel = (category: ExamCategory): string =>
  EXAM_CATEGORY_LABEL[category]

export const categoryOf = (type: ExamType): ExamCategory =>
  type === 'MIDTERM' || type === 'FINAL' ? 'EXAM' : 'NON_EXAM'

export function typesFor(
  category: ExamCategory,
  manageAll: boolean,
  midtermEventActive: boolean,
): ExamType[] {
  if (category === 'NON_EXAM') return ['DAILY', 'ASSIGNMENT']
  if (manageAll) return ['MIDTERM', 'FINAL']
  return midtermEventActive ? ['MIDTERM'] : []
}

export const sectionPrefixOf = (category: ExamCategory | undefined): string =>
  category === 'NON_EXAM' ? '/classwork' : '/exam'
