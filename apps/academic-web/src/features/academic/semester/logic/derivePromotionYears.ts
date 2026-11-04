import type { AcademicYearRef } from '../types'

export interface DerivedPromotionYears {
  source: AcademicYearRef | null
  target: AcademicYearRef | null
}

export function derivePromotionYears(
  years: AcademicYearRef[],
): DerivedPromotionYears {
  const source = years.find((year) => year.isActive) ?? null
  if (source?.startYear === undefined) {
    return { source, target: null }
  }

  const nextStart = source.startYear + 1
  const target = years.find((year) => year.startYear === nextStart) ?? null

  return { source, target }
}
