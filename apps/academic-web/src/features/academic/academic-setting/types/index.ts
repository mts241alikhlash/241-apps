export interface AcademicSetting {
  id: string
  weeklyHolidays: number[]
  defaultPassingScore: number
}

export interface AcademicSettingSavePayload {
  weeklyHolidays: number[]
  defaultPassingScore: number
}
