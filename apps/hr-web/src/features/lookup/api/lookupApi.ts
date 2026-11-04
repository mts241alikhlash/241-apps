import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import type {
  AcademicYearOption,
  CalendarEntry,
  CalendarTypeOption,
} from '../types'

interface PersonResponse {
  nip?: string | null
  user: {
    id: string
    identifier: string
    profile: { name: string }
  }
}

export const lookupApi = {
  getEmployees: () => {
    return api.get<ApiPaginatedResponse<PersonResponse>>('/employees', {
      params: { isActive: true, limit: PAGINATION.REFERENCE_LIMIT },
    })
  },

  getStudents: () => {
    return api.get<ApiPaginatedResponse<PersonResponse>>('/students', {
      params: { isActive: true, limit: PAGINATION.REFERENCE_LIMIT },
    })
  },

  getAcademicYears: () => {
    return api.get<ApiPaginatedResponse<AcademicYearOption>>(
      '/academic-years',
      { params: { limit: PAGINATION.REFERENCE_LIMIT } },
    )
  },

  getCalendarTypes: () => {
    return api.get<ApiPaginatedResponse<CalendarTypeOption>>(
      '/academic-calendar-types',
      { params: { isActive: true, limit: PAGINATION.REFERENCE_LIMIT } },
    )
  },

  getCalendarEntries: (academicYearId: string, typeId: string) => {
    return api.get<ApiPaginatedResponse<CalendarEntry>>('/academic-calendars', {
      params: {
        academicYearId,
        typeId,
        limit: PAGINATION.CHILD_ENTITY_LIMIT,
      },
    })
  },
}
