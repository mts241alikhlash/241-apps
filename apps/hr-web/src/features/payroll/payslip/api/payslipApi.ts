import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { Payslip } from '../types'

export const payslipApi = {
  getMyPayslip: (params?: { year?: number; month?: number }) =>
    api.get<ApiSingleResponse<Payslip>>('/payroll/payslips/me', { params }),

  getPayslip: (id: string) =>
    api.get<ApiSingleResponse<Payslip>>(`/payroll/payslips/${id}`),
}
