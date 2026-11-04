import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  ExamFile,
  GradeRecord,
  ImportResult,
  QuestionScope,
  TemplateFormat,
} from '../types'

const seg = encodeURIComponent

export const examBankApi = {
  getScope: () =>
    api.get<ApiSingleResponse<QuestionScope>>('/exam-questions/scope'),

  getGrades: (params?: { limit?: number }) =>
    api.get<ApiPaginatedResponse<GradeRecord>>('/grades', { params }),

  uploadImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<ApiSingleResponse<ExamFile>>('/exam-files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getImage: (id: string) =>
    api.get<Blob>(`/exam-files/${seg(id)}`, { responseType: 'blob' }),

  downloadTemplate: (format: TemplateFormat) =>
    api.get<Blob>('/exam-imports/template', {
      params: { format },
      responseType: 'blob',
    }),

  importQuestions: (form: FormData) =>
    api.post<ApiSingleResponse<ImportResult>>('/exam-imports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
