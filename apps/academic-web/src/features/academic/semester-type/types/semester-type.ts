export interface SemesterType {
  id: string
  name: string
  sequence: number
  isActive: boolean
}

export interface SemesterTypeCreatePayload {
  name: string
  sequence?: number
  isActive: boolean
}

export interface SemesterTypeUpdatePayload {
  name?: string
  sequence?: number
  isActive?: boolean
}

export interface SemesterTypeQuery {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}
