import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import type {
  CalendarEventData,
  CalendarQueryParams,
  CalendarCreatePayload,
  CalendarUpdatePayload,
} from '../types'

export const academicCalendarApi = {
  getCalendars: (params?: CalendarQueryParams) => {
    return api.get<ApiPaginatedResponse<CalendarEventData>>(
      '/academic-calendars',
      {
        params,
      },
    )
  },

  getCalendarById: (id: string) => {
    return api.get<ApiSingleResponse<CalendarEventData>>(
      `/academic-calendars/${id}`,
    )
  },

  createCalendar: (payload: CalendarCreatePayload) => {
    return api.post<ApiSingleResponse<CalendarEventData>>(
      '/academic-calendars',
      payload,
    )
  },

  updateCalendar: (id: string, payload: CalendarUpdatePayload) => {
    return api.patch<ApiSingleResponse<CalendarEventData>>(
      `/academic-calendars/${id}`,
      payload,
    )
  },

  deleteCalendar: (id: string) => {
    return api.delete(`/academic-calendars/${id}`)
  },

  deleteBulkCalendars: (ids: string[]) => {
    return api.delete('/academic-calendars/bulk', { data: { ids } })
  },
}
