import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  Attendance,
  AttendanceQueryParams,
  AttendanceSavePayload,
  BulkUpsertAttendancePayload,
  BulkUpsertAttendanceResult,
  AttendanceRecapItem,
  AttendanceRecapQueryParams,
  AttendanceTrendPoint,
  AttendanceTrendQueryParams,
  AttendanceSuggestionResult,
} from '../types'

export const attendanceApi = {
  getAttendances: (params?: AttendanceQueryParams) => {
    return api.get<ApiPaginatedResponse<Attendance>>('/attendances', {
      params,
    })
  },

  getMyAttendances: (params?: AttendanceQueryParams) => {
    return api.get<ApiPaginatedResponse<Attendance>>('/attendances/me', {
      params,
    })
  },

  createAttendance: (payload: AttendanceSavePayload) => {
    return api.post<ApiSingleResponse<Attendance>>('/attendances', payload)
  },

  updateAttendance: (id: string, payload: Partial<AttendanceSavePayload>) => {
    return api.patch<ApiSingleResponse<Attendance>>(
      `/attendances/${id}`,
      payload,
    )
  },

  deleteAttendance: (id: string) => {
    return api.delete(`/attendances/${id}`)
  },

  bulkUpsertAttendances: (payload: BulkUpsertAttendancePayload) => {
    return api.post<ApiSingleResponse<BulkUpsertAttendanceResult>>(
      '/attendances/bulk',
      payload,
    )
  },

  getRecap: (params: AttendanceRecapQueryParams) => {
    return api.get<ApiSingleResponse<AttendanceRecapItem[]>>(
      '/attendances/recap',
      { params },
    )
  },

  getMonthlyTrend: (params: AttendanceTrendQueryParams) => {
    return api.get<ApiSingleResponse<AttendanceTrendPoint[]>>(
      '/attendances/recap/trend',
      { params },
    )
  },

  getGateSuggestions: (params: {
    classroomId: string
    semesterId: string
    date: string
  }) => {
    return api.get<ApiSingleResponse<AttendanceSuggestionResult>>(
      '/attendances/suggestions',
      { params },
    )
  },
}
