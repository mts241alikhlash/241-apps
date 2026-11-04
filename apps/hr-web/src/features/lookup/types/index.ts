export interface PersonOption {
  userId: string
  name: string
  identifier: string
}

export interface AcademicYearOption {
  id: string
  name: string
  isActive: boolean
}

export interface CalendarTypeOption {
  id: string
  name: string
}

export interface CalendarEntry {
  id: string
  title: string
  startDate: string
  endDate: string
}
