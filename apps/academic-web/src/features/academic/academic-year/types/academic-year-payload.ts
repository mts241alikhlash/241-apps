export interface AcademicYearEditData {
  name?: string
  startYear?: number
  isActive?: boolean
}

export interface AcademicYearSavePayload {
  name: string
  startYear: number
  isActive?: boolean
}
