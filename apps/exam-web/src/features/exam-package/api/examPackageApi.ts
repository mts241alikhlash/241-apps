import {
  unwrap,
  unwrapPage,
} from '@mts241alikhlash/web-shared/utils/service-client'
import { examClient } from '@/shared/api/clients'
import type {
  AdjustKeyPayload,
  AddQuestionPayload,
  ExamPackageCreatePayload,
  ExamPackageQueryParams,
  ReturnPayload,
  TakePayload,
  UpdateQuestionPayload,
} from '../types'

export const examPackageApi = {
  getPackages: (query?: ExamPackageQueryParams) =>
    unwrapPage(examClient.GET('/exam-packages', { params: { query } })),

  getPackage: (id: string) =>
    unwrap(examClient.GET('/exam-packages/{id}', { params: { path: { id } } })),

  getPackageQuestion: (id: string, questionId: string) =>
    unwrap(
      examClient.GET('/exam-packages/{id}/questions/{questionId}', {
        params: { path: { id, questionId } },
      }),
    ),

  createPackage: (body: ExamPackageCreatePayload) =>
    unwrap(examClient.POST('/exam-packages', { body })),

  renamePackage: (id: string, title: string) =>
    unwrap(
      examClient.PATCH('/exam-packages/{id}', {
        params: { path: { id } },
        body: { title },
      }),
    ),

  deletePackage: (id: string) =>
    unwrap(
      examClient.DELETE('/exam-packages/{id}', { params: { path: { id } } }),
    ),

  copyPackage: (id: string) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/copy', {
        params: { path: { id } },
      }),
    ),

  addQuestion: (id: string, body: AddQuestionPayload) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/questions', {
        params: { path: { id } },
        body: { ...body, content: { ...body.content } },
      }),
    ),

  updateQuestion: (
    id: string,
    questionId: string,
    body: UpdateQuestionPayload,
  ) =>
    unwrap(
      examClient.PATCH('/exam-packages/{id}/questions/{questionId}', {
        params: { path: { id, questionId } },
        body: {
          ...body,
          content: body.content && { ...body.content },
        },
      }),
    ),

  removeQuestion: (id: string, questionId: string) =>
    unwrap(
      examClient.DELETE('/exam-packages/{id}/questions/{questionId}', {
        params: { path: { id, questionId } },
      }),
    ),

  reorderQuestions: (id: string, questionIds: string[]) =>
    unwrap(
      examClient.PUT('/exam-packages/{id}/questions/order', {
        params: { path: { id } },
        body: { questionIds },
      }),
    ),

  takeQuestions: (id: string, body: TakePayload) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/questions/take', {
        params: { path: { id } },
        body,
      }),
    ),

  submitPackage: (id: string) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/submit', {
        params: { path: { id } },
      }),
    ),

  approvePackage: (id: string, note?: string) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/approve', {
        params: { path: { id } },
        body: note === undefined ? {} : { note },
      }),
    ),

  returnPackage: (id: string, body: ReturnPayload) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/return', {
        params: { path: { id } },
        body,
      }),
    ),

  adjustItemKey: (id: string, itemId: string, body: AdjustKeyPayload) =>
    unwrap(
      examClient.POST('/exam-packages/{id}/items/{itemId}/adjust-key', {
        params: { path: { id, itemId } },
        body,
      }),
    ),
}
