import type {
  ApiPaginatedResponse,
  ApiSingleResponse,
} from '@mts241alikhlash/web-shared/types/api'
import api from '@mts241alikhlash/web-shared/utils/api'
import type { QuestionDetail } from '@/features/exam-bank/types'
import type {
  AdjustedKey,
  AdjustKeyPayload,
  AddQuestionPayload,
  ExamPackageCreatePayload,
  ExamPackageQueryParams,
  ExamPackageSummary,
  ExamPackageView,
  ReturnPayload,
  TakePayload,
  UpdateQuestionPayload,
} from '../types'

const seg = encodeURIComponent

const base = (id: string) => `/exam-packages/${seg(id)}`

export const examPackageApi = {
  getPackages: (params?: ExamPackageQueryParams) =>
    api.get<ApiPaginatedResponse<ExamPackageSummary>>('/exam-packages', {
      params,
    }),

  getPackage: (id: string) =>
    api.get<ApiSingleResponse<ExamPackageView>>(base(id)),

  getPackageQuestion: (id: string, questionId: string) =>
    api.get<ApiSingleResponse<QuestionDetail>>(
      `${base(id)}/questions/${seg(questionId)}`,
    ),

  createPackage: (payload: ExamPackageCreatePayload) =>
    api.post<ApiSingleResponse<ExamPackageView>>('/exam-packages', payload),

  renamePackage: (id: string, title: string) =>
    api.patch<ApiSingleResponse<ExamPackageView>>(base(id), { title }),

  deletePackage: (id: string) => api.delete(base(id)),

  copyPackage: (id: string) =>
    api.post<ApiSingleResponse<ExamPackageView>>(`${base(id)}/copy`),

  addQuestion: (id: string, payload: AddQuestionPayload) =>
    api.post<ApiSingleResponse<ExamPackageView>>(
      `${base(id)}/questions`,
      payload,
    ),

  updateQuestion: (
    id: string,
    questionId: string,
    payload: UpdateQuestionPayload,
  ) =>
    api.patch<ApiSingleResponse<ExamPackageView>>(
      `${base(id)}/questions/${seg(questionId)}`,
      payload,
    ),

  removeQuestion: (id: string, questionId: string) =>
    api.delete<ApiSingleResponse<ExamPackageView>>(
      `${base(id)}/questions/${seg(questionId)}`,
    ),

  reorderQuestions: (id: string, questionIds: string[]) =>
    api.put<ApiSingleResponse<ExamPackageView>>(`${base(id)}/questions/order`, {
      questionIds,
    }),

  takeQuestions: (id: string, payload: TakePayload) =>
    api.post<ApiSingleResponse<ExamPackageView>>(
      `${base(id)}/questions/take`,
      payload,
    ),

  submitPackage: (id: string) =>
    api.post<ApiSingleResponse<ExamPackageView>>(`${base(id)}/submit`),

  approvePackage: (id: string, note?: string) =>
    api.post<ApiSingleResponse<ExamPackageView>>(
      `${base(id)}/approve`,
      note === undefined ? {} : { note },
    ),

  returnPackage: (id: string, payload: ReturnPayload) =>
    api.post<ApiSingleResponse<ExamPackageView>>(`${base(id)}/return`, payload),

  adjustItemKey: (id: string, itemId: string, payload: AdjustKeyPayload) =>
    api.post<ApiSingleResponse<AdjustedKey>>(
      `${base(id)}/items/${seg(itemId)}/adjust-key`,
      payload,
    ),
}
