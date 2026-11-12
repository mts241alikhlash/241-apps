import { unwrapPage } from '@mts241alikhlash/web-shared/utils/service-client'
import { academicClient } from '@/shared/api/clients'
import type { SemesterQueryParams } from '../types'

export const semesterApi = {
  getSemesters: (query?: SemesterQueryParams) =>
    unwrapPage(academicClient.GET('/semesters', { params: { query } })),
}
