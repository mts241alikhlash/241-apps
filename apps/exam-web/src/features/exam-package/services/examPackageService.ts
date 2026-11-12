import { toast } from 'vue-sonner'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { messageOf, statusOf } from '../utils/messageOf'
import { examBankApi } from '@/features/exam-bank/api/examBankApi'
import { subjectApi } from '@/features/lookup/subject'
import { examPackageApi } from '../api/examPackageApi'
import { useExamPackageStore } from '../stores/examPackageStore'
import type { QuestionDetail } from '@/features/exam-bank/types'
import type {
  AdjustedKey,
  AdjustKeyPayload,
  AddQuestionPayload,
  ExamPackageCreatePayload,
  ExamPackageSummary,
  ExamPackageDetail,
  ExamPackageView,
  ReturnPayload,
  TakePayload,
  UpdateQuestionPayload,
} from '../types'

export type ChangeResult =
  | { success: true; data: ExamPackageDetail }
  | { success: false; error: string; status?: number }

async function change(
  call: () => Promise<ExamPackageDetail>,
  fallback: string,
): Promise<ChangeResult> {
  try {
    return { success: true, data: await call() }
  } catch (err: unknown) {
    return {
      success: false,
      error: messageOf(err, fallback),
      status: statusOf(err),
    }
  }
}

export const examPackageService = {
  async loadReferences(): Promise<void> {
    const store = useExamPackageStore()
    try {
      const [subjectRes, gradeRes] = await Promise.all([
        subjectApi.getSubjects({ limit: PAGINATION.REFERENCE_LIMIT }),
        examBankApi.getGrades({ limit: PAGINATION.REFERENCE_LIMIT }),
      ])
      store.subjects = subjectRes.data?.data ?? []
      store.grades = gradeRes.data?.data ?? []
    } catch (err: unknown) {
      toast.error(
        getIndonesianErrorMessage(err, 'Gagal memuat mapel dan tingkat.'),
      )
    }
  },

  async copyPackage(id: string): Promise<ExamPackageDetail | null> {
    try {
      const copy = await examPackageApi.copyPackage(id)
      toast.success('Paket disalin sebagai draf baru.')
      return copy
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal menyalin paket.'))
      return null
    }
  },

  async deletePackage(id: string): Promise<boolean> {
    try {
      await examPackageApi.deletePackage(id)
      toast.success('Paket dihapus.')
      return true
    } catch (err: unknown) {
      toast.error(messageOf(err, 'Gagal menghapus paket.'))
      return false
    }
  },

  async loadPackage(id: string): Promise<ExamPackageView | null> {
    try {
      return (await examPackageApi.getPackage(id)) ?? null
    } catch (err: unknown) {
      const status = statusOf(err)
      if (status === 404 || status === 400) return null
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat paket.'))
      throw err
    }
  },

  create: (payload: ExamPackageCreatePayload) =>
    change(() => examPackageApi.createPackage(payload), 'Gagal membuat paket.'),

  rename: (id: string, title: string) =>
    change(
      () => examPackageApi.renamePackage(id, title),
      'Gagal mengganti judul paket.',
    ),

  addQuestion: (id: string, payload: AddQuestionPayload) =>
    change(
      () => examPackageApi.addQuestion(id, payload),
      'Gagal menyimpan soal.',
    ),

  updateQuestion: (
    id: string,
    questionId: string,
    payload: UpdateQuestionPayload,
  ) =>
    change(
      () => examPackageApi.updateQuestion(id, questionId, payload),
      'Gagal menyimpan soal.',
    ),

  removeQuestion: (id: string, questionId: string) =>
    change(
      () => examPackageApi.removeQuestion(id, questionId),
      'Gagal menghapus soal.',
    ),

  reorder: (id: string, questionIds: string[]) =>
    change(
      () => examPackageApi.reorderQuestions(id, questionIds),
      'Gagal mengubah urutan soal.',
    ),

  take: (id: string, payload: TakePayload) =>
    change(
      () => examPackageApi.takeQuestions(id, payload),
      'Gagal menyalin soal.',
    ),

  submit: (id: string) =>
    change(() => examPackageApi.submitPackage(id), 'Gagal mengajukan paket.'),

  approve: (id: string, note?: string) =>
    change(
      () => examPackageApi.approvePackage(id, note),
      'Gagal menyetujui paket.',
    ),

  returnPackage: (id: string, payload: ReturnPayload) =>
    change(
      () => examPackageApi.returnPackage(id, payload),
      'Gagal mengembalikan paket.',
    ),

  async adjustItemKey(
    id: string,
    itemId: string,
    payload: AdjustKeyPayload,
  ): Promise<
    { success: true; data: AdjustedKey } | { success: false; error: string }
  > {
    try {
      const adjusted = await examPackageApi.adjustItemKey(id, itemId, payload)
      toast.success(
        `Ralat disimpan. ${adjusted.rescoredSessions} sesi dihitung ulang.`,
      )
      return { success: true, data: adjusted }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal menyimpan ralat kunci.'),
      }
    }
  },

  async loadQuestion(
    id: string,
    questionId: string,
  ): Promise<QuestionDetail | null> {
    try {
      const question = await examPackageApi.getPackageQuestion(id, questionId)
      return (question as unknown as QuestionDetail | undefined) ?? null
    } catch (err: unknown) {
      if (statusOf(err) === 404) return null
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat soal.'))
      throw err
    }
  },

  async loadApprovedSources(
    subjectId: string,
    gradeId: string,
  ): Promise<ExamPackageSummary[]> {
    try {
      const [approved, locked] = await Promise.all(
        (['APPROVED', 'LOCKED'] as const).map((status) =>
          examPackageApi.getPackages({
            subjectId,
            gradeId,
            status,
            limit: PAGINATION.REFERENCE_LIMIT,
          }),
        ),
      )
      return [...approved.data, ...locked.data].sort((a, b) =>
        a.title.localeCompare(b.title),
      )
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar paket.'))
      return []
    }
  },
}
