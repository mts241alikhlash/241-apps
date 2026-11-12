import { unwrapPage } from '@mts241alikhlash/web-shared/utils/service-client'
import { academicClient } from '@/shared/api/clients'
import type { ClassroomQueryParams } from '../types'

export const classroomApi = {
  getClassrooms: (query?: ClassroomQueryParams) =>
    unwrapPage(academicClient.GET('/classrooms', { params: { query } })),
}
