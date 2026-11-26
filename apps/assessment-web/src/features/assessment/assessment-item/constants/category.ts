import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import type { BadgeVariants } from '@mts241alikhlash/ui/badge'
import type { AssessmentItem, AssessmentType } from '../types'

export type AssessmentCategory = 'CLASSWORK' | 'EXAM'

export interface ClassroomOption {
  id: string
  name: string | null
  code?: string
  gradeId?: string
  grade?: { level: number; name: string } | null
  classroomLevelId?: string
  classroomLevel?: { level?: number; name: string } | null
}

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  DAILY: 'Harian',
  ASSIGNMENT: 'Tugas',
  PRACTICAL: 'Praktikum',
  MIDTERM: 'UTS',
  FINAL: 'UAS',
}

export const ASSESSMENT_TYPE_ORDER: Record<AssessmentType, number> = {
  DAILY: 0,
  ASSIGNMENT: 1,
  PRACTICAL: 2,
  MIDTERM: 3,
  FINAL: 4,
}

export const CATEGORY_TYPES: Record<AssessmentCategory, AssessmentType[]> = {
  CLASSWORK: ['DAILY', 'ASSIGNMENT', 'PRACTICAL'],
  EXAM: ['MIDTERM', 'FINAL'],
}

export function gradeIdOf(classroom: ClassroomOption | undefined): string {
  return classroom?.gradeId ?? classroom?.classroomLevelId ?? ''
}

export function gradeLabelOf(classroom: ClassroomOption | undefined): string {
  return classroom?.grade?.name ?? classroom?.classroomLevel?.name ?? '-'
}

export function gradeLevelOf(classroom: ClassroomOption | undefined): number {
  return classroom?.grade?.level ?? classroom?.classroomLevel?.level ?? 0
}

export function buildGradeFilterOptions(
  classrooms: ClassroomOption[],
  allowedClassroomIds: Set<string>,
): FilterOption[] {
  const grades = new Map<
    string,
    { value: string; label: string; level: number }
  >()
  for (const classroom of classrooms) {
    if (!allowedClassroomIds.has(classroom.id)) continue
    const id = gradeIdOf(classroom)
    if (!id || grades.has(id)) continue
    grades.set(id, {
      value: id,
      label: gradeLabelOf(classroom),
      level: gradeLevelOf(classroom),
    })
  }
  return [...grades.values()]
    .sort(
      (a, b) =>
        a.level - b.level ||
        a.label.localeCompare(b.label, 'id', { numeric: true }),
    )
    .map(({ value, label }) => ({ value, label }))
}

export function summarizeGradingStatus(items: AssessmentItem[]): {
  doneCount: number
  label: string
  variant: BadgeVariants['variant']
} {
  const withStudents = items.filter((item) => (item.studentCount ?? 0) > 0)
  if (withStudents.length === 0) {
    return { doneCount: 0, label: 'Belum Ada Siswa', variant: 'outline' }
  }
  const doneCount = withStudents.filter(
    (item) => (item.gradedCount ?? 0) >= (item.studentCount ?? 0),
  ).length
  if (doneCount === items.length) {
    return { doneCount, label: 'Selesai', variant: 'success' }
  }
  const hasAnyScore = withStudents.some((item) => (item.gradedCount ?? 0) > 0)
  if (hasAnyScore) {
    return { doneCount, label: 'Belum Selesai', variant: 'warning' }
  }
  return { doneCount: 0, label: 'Belum Dinilai', variant: 'destructive' }
}

export function compareAssessmentItems(
  left: AssessmentItem,
  right: AssessmentItem,
  subjectName: (item: AssessmentItem) => string,
  classroomName: (item: AssessmentItem) => string,
): number {
  return (
    ASSESSMENT_TYPE_ORDER[left.type] - ASSESSMENT_TYPE_ORDER[right.type] ||
    subjectName(left).localeCompare(subjectName(right), 'id', {
      numeric: true,
    }) ||
    classroomName(left).localeCompare(classroomName(right), 'id', {
      numeric: true,
    }) ||
    left.name.localeCompare(right.name, 'id', { numeric: true })
  )
}

export function isTypeInCategory(
  type: AssessmentType,
  category?: AssessmentCategory,
): boolean {
  if (!category) return true
  return CATEGORY_TYPES[category].includes(type)
}

export function categoryFromRoute(
  meta: Record<string, unknown> | undefined,
): AssessmentCategory | undefined {
  if (meta?.category === 'CLASSWORK' || meta?.category === 'EXAM') {
    return meta.category
  }
  return undefined
}
