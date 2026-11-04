import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  EmployeeQueryParams,
  EmployeeExportParams,
  EmployeeSavePayload,
  EmployeeUpdatePayload,
  EmployeePositionSavePayload,
  EmployeePositionUpdatePayload,
  Employee,
  BulkImportResult,
  ResolveBulkImportConflict,
  ResolveBulkImportResult,
  PositionListItem,
} from '../types'

export const employeeApi = {
  getEmployees: (params?: EmployeeQueryParams) => {
    return api.get<ApiPaginatedResponse<Employee>>('/employees', { params })
  },

  getEmployee: (id: string) => {
    return api.get<ApiSingleResponse<Employee>>(`/employees/${id}`)
  },

  getEmployeesByUserId: (userId: string) => {
    return api.get<ApiPaginatedResponse<Employee>>('/employees', {
      params: { userId, limit: 1 },
    })
  },

  createEmployee: (payload: EmployeeSavePayload) => {
    return api.post<ApiSingleResponse<Employee>>('/employees', payload)
  },

  updateEmployee: (id: string, payload: EmployeeUpdatePayload) => {
    return api.patch<ApiSingleResponse<Employee>>(`/employees/${id}`, payload)
  },

  deleteEmployee: (id: string) => {
    return api.delete(`/employees/${id}`)
  },

  toggleActive: (id: string, isActive: boolean) => {
    return api.patch<ApiSingleResponse<Employee>>(
      `/employees/${id}/toggle-active`,
      {},
      {
        params: { isActive },
      },
    )
  },

  exportEmployees: (params?: EmployeeExportParams) => {
    return api.get<ArrayBuffer>('/employees/export', {
      params,
      responseType: 'arraybuffer',
    })
  },

  getImportTemplate: () => {
    return api.get<ArrayBuffer>('/employees/import-template', {
      responseType: 'arraybuffer',
    })
  },

  bulkImport: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ApiSingleResponse<BulkImportResult>>(
      '/employees/bulk-import',
      formData,
    )
  },

  resolveBulkImportConflicts: (conflicts: ResolveBulkImportConflict[]) => {
    return api.post<ApiSingleResponse<ResolveBulkImportResult>>(
      '/employees/bulk-import/resolve',
      { conflicts },
    )
  },

  getPositions: (params?: { limit?: number; isActive?: boolean }) => {
    return api.get<ApiPaginatedResponse<PositionListItem>>('/positions', {
      params,
    })
  },

  createPosition: (
    employeeId: string,
    payload: EmployeePositionSavePayload,
  ) => {
    return api.post<ApiSingleResponse<Employee>>(
      `/employee-positions`,
      payload,
      {
        params: { employeeId },
      },
    )
  },

  updatePosition: (
    employeeId: string,
    positionId: string,
    payload: EmployeePositionUpdatePayload,
  ) => {
    return api.patch<ApiSingleResponse<Employee>>(
      `/employee-positions/${positionId}`,
      payload,
      { params: { employeeId } },
    )
  },

  deletePosition: (employeeId: string, positionId: string) => {
    return api.delete(`/employee-positions/${positionId}`, {
      params: { employeeId },
    })
  },
}
