import type { ReferenceListKey } from '../types'

const MINUTE = 60_000

export const REFERENCE_EXPIRY_MS: Record<ReferenceListKey, number> = {
  religions: Infinity,
  bloodTypes: Infinity,
  occupations: Infinity,
  educationLevels: Infinity,

  positions: 60 * MINUTE,
  positionCategories: 60 * MINUTE,
  employmentTypes: 60 * MINUTE,

  academicYears: 30 * MINUTE,
  semesters: 30 * MINUTE,

  subjects: 10 * MINUTE,
  grades: 10 * MINUTE,

  classrooms: 5 * MINUTE,
  teachers: 5 * MINUTE,

  employees: 5 * MINUTE,
  students: 5 * MINUTE,
  calendarTypes: 60 * MINUTE,

  inventoryMetadata: 10 * MINUTE,

  admissionWaves: 30 * MINUTE,
  admissionFormOptions: 10 * MINUTE,

  portalCategories: 10 * MINUTE,
  portalPublicCategories: 10 * MINUTE,
}
