import type { Semester } from '../types'

export interface RolloverSuggestion {
  source: Semester
  target: Semester
}

export function suggestRollover(
  activated: Semester | null | undefined,
  semesters: Semester[],
): RolloverSuggestion | null {
  if (!activated) return null

  const enrollments = activated._count?.enrollments
  if (enrollments === undefined || enrollments > 0) return null

  const populatedSiblings = semesters.filter(
    (candidate) =>
      candidate.id !== activated.id &&
      candidate.academicYearId === activated.academicYearId &&
      (candidate._count?.enrollments ?? 0) > 0,
  )

  if (populatedSiblings.length !== 1) return null

  return { source: populatedSiblings[0], target: activated }
}
