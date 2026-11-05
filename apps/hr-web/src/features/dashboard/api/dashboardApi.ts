import type { components } from '@mts241alikhlash/hr-api'
import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'

export type EmployeeSummary =
  components['schemas']['EmployeeSummaryResponseDto']
export type LatestPayslipPeriod =
  components['schemas']['LatestPayslipPeriodResponseDto']

export interface AttendanceToday {
  present: number
  late: number
  onLeave: number
  notScanned: number
  date: string
}

export interface MyPresenceDashboard {
  today: {
    status: string
    clockIn: string | null
    clockOut: string | null
  } | null
  leaveBalance: { leaveTypeName: string; remainingDays: number }[]
}

async function data<T>(request: Promise<{ data: ApiSingleResponse<T> }>) {
  return (await request).data.data
}

export const dashboardApi = {
  attendanceToday: () =>
    data(
      api.get<ApiSingleResponse<AttendanceToday>>(
        '/presence/dashboard/attendance-today',
      ),
    ),
  pendingLeaves: () =>
    data(
      api.get<ApiSingleResponse<{ total: number }>>(
        '/presence/dashboard/pending-leaves',
      ),
    ),
  mine: () =>
    data(
      api.get<ApiSingleResponse<MyPresenceDashboard>>('/presence/dashboard/me'),
    ),
  employeeSummary: () =>
    data(api.get<ApiSingleResponse<EmployeeSummary>>('/employees/summary')),
  latestPayslipPeriod: () =>
    data(
      api.get<ApiSingleResponse<LatestPayslipPeriod | null>>(
        '/payroll/payslips/me/latest-period',
      ),
    ),
}
