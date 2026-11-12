import { unwrapPage } from '@mts241alikhlash/web-shared/utils/service-client'
import { studentClient } from '@/shared/api/clients'
import type { EnrollmentQueryParams } from '../types'

export const studentEnrollmentApi = {
  getEnrollments: (query?: EnrollmentQueryParams) =>
    unwrapPage(
      studentClient.GET('/student-enrollments', { params: { query } }),
    ),
}
