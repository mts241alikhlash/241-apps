import type { AcademicYearRef } from '../types'

export function selectableTargetYears(
  years: AcademicYearRef[],
  sourceAcademicYearId: string | null | undefined,
): AcademicYearRef[] {
  if (!sourceAcademicYearId) return []

  const source = years.find((year) => year.id === sourceAcademicYearId)
  if (source?.startYear === undefined) return []

  return years
    .filter((year) => year.startYear !== undefined)
    .filter((year) => year.startYear! > source.startYear!)
    .sort((a, b) => a.startYear! - b.startYear!)
}
