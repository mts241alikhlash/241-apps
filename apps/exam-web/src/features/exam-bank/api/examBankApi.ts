import type { ApiPaginatedResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import {
  unwrap,
  unwrapBlob,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type { GradeRecord, TemplateFormat } from '../types'

const passThrough = (body: unknown) => body as never

export const examBankApi = {
  getScope: () => unwrap(examClient.GET('/exam-questions/scope')),

  getGrades: (params?: { limit?: number }) =>
    api.get<ApiPaginatedResponse<GradeRecord>>('/grades', { params }),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return unwrap(
      examClient.POST('/exam-files', {
        body: form as never,
        bodySerializer: passThrough,
      }),
    )
  },

  getImage: (id: string) =>
    unwrapBlob(
      examClient.GET('/exam-files/{id}', {
        params: { path: { id } },
        parseAs: 'blob',
      }),
    ),

  downloadTemplate: (format: TemplateFormat) =>
    unwrapBlob(
      examClient.GET('/exam-imports/template', {
        params: { query: { format } },
        parseAs: 'blob',
      }),
    ),

  importQuestions: (form: FormData) =>
    unwrap(
      examClient.POST('/exam-imports', {
        body: form as never,
        bodySerializer: passThrough,
      }),
    ),
}
