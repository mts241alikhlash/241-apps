import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'

export interface StudentRosterRef {
  id: string
  nis: string
  nisn: string
  gradeId: string | null
  enrollments?: { semesterId: string }[]
  user: {
    profile: {
      name: string
      gender: string | null
    }
  }
}

export interface EmployeeRosterRef {
  id: string
  nip?: string | null
  user?: {
    profile?: {
      name: string
    } | null
  } | null
}

export const studentRosterApi = {
  getStudents: (params?: { limit?: number; isActive?: boolean }) => {
    return api.get<ApiPaginatedResponse<StudentRosterRef>>('/students', {
      params,
    })
  },
}

export const employeeRosterApi = {
  getEmployees: (params?: { limit?: number }) => {
    return api.get<ApiPaginatedResponse<EmployeeRosterRef>>('/employees', {
      params,
    })
  },
}
