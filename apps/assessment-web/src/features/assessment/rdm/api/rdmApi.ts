import type { ApiSingleResponse } from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type {
  RdmCandidatesResponse,
  RdmFillResponse,
  RdmImportPreview,
  RdmImportResponse,
  RdmWorkbookKind,
} from '../types'

export const rdmApi = {
  getCandidates: (teachingAssignmentId: string) =>
    api.get<ApiSingleResponse<RdmCandidatesResponse>>(
      '/assessment-items/rdm/candidates',
      { params: { teachingAssignmentId } },
    ),

  downloadWorkbook: (teachingAssignmentId: string, kind: RdmWorkbookKind) =>
    api.get<Blob>('/assessment-items/rdm/workbook', {
      params: { teachingAssignmentId, kind },
      responseType: 'blob',
    }),

  fillTemplate: (formData: FormData) =>
    api.post<ApiSingleResponse<RdmFillResponse>>(
      '/assessment-items/rdm/fill',
      formData,
    ),

  previewImport: (formData: FormData) =>
    api.post<ApiSingleResponse<RdmImportPreview>>(
      '/assessment-items/rdm/import/preview',
      formData,
    ),

  confirmImport: (formData: FormData) =>
    api.post<ApiSingleResponse<RdmImportResponse>>(
      '/assessment-items/rdm/import',
      formData,
    ),
}
