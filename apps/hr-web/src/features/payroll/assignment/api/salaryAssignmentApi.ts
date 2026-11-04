import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { SalaryAssignment, SalaryAssignmentSavePayload } from '../types'

export const salaryAssignmentApi = {
  getAssignments: (userId?: string) =>
    api.get<ApiSingleResponse<SalaryAssignment[]>>('/payroll/assignments', {
      params: userId ? { userId } : undefined,
    }),

  createAssignment: (payload: SalaryAssignmentSavePayload) =>
    api.post<ApiSingleResponse<SalaryAssignment>>(
      '/payroll/assignments',
      payload,
    ),

  deleteAssignment: (id: string) => api.delete(`/payroll/assignments/${id}`),
}
