import {
  unwrap,
  unwrapBlob,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { academicClient, examClient } from '@/shared/api/clients'
import type { TemplateFormat } from '../types'

const passThrough = (body: unknown) => body as never

export const examBankApi = {
  getScope: () => unwrap(examClient.GET('/exam-questions/scope')),

  getGrades: (query?: { limit?: number }) =>
    unwrapPage(academicClient.GET('/grades', { params: { query } })),

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
