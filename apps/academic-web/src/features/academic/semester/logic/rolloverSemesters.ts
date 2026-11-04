import type { Semester } from '../types'

export function getRolloverSourceSemesters(semesters: Semester[]): Semester[] {
  return semesters.filter((s) => s.type?.name?.toUpperCase() === 'ODD')
}

export function getRolloverTargetSemesters(
  semesters: Semester[],
  sourceSemesterId: string | null | undefined,
): Semester[] {
  if (!sourceSemesterId) return []

  const source = semesters.find((s) => s.id === sourceSemesterId)
  if (!source) return []

  return semesters.filter(
    (s) =>
      s.type?.name?.toUpperCase() === 'EVEN' &&
      s.academicYearId === source.academicYearId,
  )
}

export function resolveDefaultRolloverPair(semesters: Semester[]): {
  sourceSemesterId: string
  targetSemesterId: string
} {
  const sourceOptions = getRolloverSourceSemesters(semesters)
  if (sourceOptions.length === 0) {
    return { sourceSemesterId: '', targetSemesterId: '' }
  }

  const activeOdd = semesters.find(
    (s) => s.isActive && s.type?.name?.toUpperCase() === 'ODD',
  )

  const activeSemester = semesters.find((s) => s.isActive)
  const sameYearOdd = activeSemester
    ? semesters.find(
        (s) =>
          s.academicYearId === activeSemester.academicYearId &&
          s.type?.name?.toUpperCase() === 'ODD',
      )
    : null

  const defaultSource = activeOdd ?? sameYearOdd ?? sourceOptions[0]
  const sourceSemesterId = defaultSource?.id ?? ''

  const targetOptions = getRolloverTargetSemesters(semesters, sourceSemesterId)
  const targetSemesterId = targetOptions[0]?.id ?? ''

  return { sourceSemesterId, targetSemesterId }
}
