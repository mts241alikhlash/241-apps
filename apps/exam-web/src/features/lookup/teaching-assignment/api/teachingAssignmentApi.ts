import { unwrapPage } from '@mts241alikhlash/web-shared/utils/service-client'
import { academicClient } from '@/shared/api/clients'
import type { TeachingAssignmentQueryParams } from '../types'

export const teachingAssignmentApi = {
  getTeachingAssignments: (query?: TeachingAssignmentQueryParams) =>
    unwrapPage(
      academicClient.GET('/teaching-assignments', { params: { query } }),
    ),

  getMyTeachingAssignments: (query?: TeachingAssignmentQueryParams) =>
    unwrapPage(
      academicClient.GET('/teaching-assignments/me', { params: { query } }),
    ),
}
