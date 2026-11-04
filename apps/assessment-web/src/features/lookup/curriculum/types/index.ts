export interface AcademicYearRef {
  id: string
  name: string
  isActive: boolean
}

export interface Curriculum {
  id: string
  name: string
  academicYearId: string
  isActive: boolean
  academicYear?: AcademicYearRef
}
