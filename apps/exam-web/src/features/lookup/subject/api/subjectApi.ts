import { unwrapPage } from '@mts241alikhlash/web-shared/utils/service-client'
import { academicClient } from '@/shared/api/clients'
import type { SubjectQueryParams } from '../types'

export const subjectApi = {
  getSubjects: (query?: SubjectQueryParams) =>
    unwrapPage(academicClient.GET('/subjects', { params: { query } })),
}
