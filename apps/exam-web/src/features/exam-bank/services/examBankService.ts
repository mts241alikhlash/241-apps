import { toast } from 'vue-sonner'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { subjectApi } from '@/features/lookup/subject'
import { loadAssignments } from '@/features/lookup/teaching-assignment'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examBankApi } from '../api/examBankApi'
import { useExamBankStore } from '../stores/examBankStore'
import type {
  ImportPreview,
  ImportResult,
  NamedOption,
  TemplateFormat,
  TemplateOptions,
} from '../types'

export const examBankService = {
  async loadReferences() {
    const store = useExamBankStore()
    try {
      const response = await examBankApi.getScope()
      store.scope = response ?? { all: false, pairs: [] }
      if (store.scope.all) {
        const [subjectRes, gradeRes] = await Promise.all([
          subjectApi.getSubjects({ limit: PAGINATION.REFERENCE_LIMIT }),
          examBankApi.getGrades({ limit: PAGINATION.REFERENCE_LIMIT }),
        ])
        store.subjects = subjectRes.data
        store.grades = gradeRes.data
      }
    } catch (err: unknown) {
      toast.error(
        getIndonesianErrorMessage(err, 'Gagal memuat mapel dan tingkat.'),
      )
    }
  },

  async loadTeachers(subjectId: string): Promise<NamedOption[]> {
    try {
      const { rows } = await loadAssignments({
        subjectId,
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      const teachers = new Map<string, string>()
      for (const row of rows) {
        teachers.set(row.employeeId, row.employee?.user?.profile?.name ?? '-')
      }
      return [...teachers]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar guru.'))
      return []
    }
  },

  async downloadTemplate(
    format: TemplateFormat,
    options?: TemplateOptions,
  ): Promise<void> {
    try {
      const response = await examBankApi.downloadTemplate(format, options)
      const url = URL.createObjectURL(response)
      const link = document.createElement('a')
      link.href = url
      link.download =
        options?.layout === 'vertical'
          ? 'template-soal-vertikal.docx'
          : `template-soal.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal mengunduh template.'))
    }
  },

  async previewImport(input: {
    file: File
    packageId: string
  }): Promise<
    { success: true; data: ImportPreview } | { success: false; error: string }
  > {
    const form = new FormData()
    form.append('file', input.file)
    form.append('packageId', input.packageId)
    try {
      const response = await examBankApi.previewImport(form)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal membaca berkas soal.'),
      }
    }
  },

  async importQuestions(input: {
    file: File
    packageId: string
    confirmDuplicates?: boolean
  }): Promise<
    { success: true; data: ImportResult } | { success: false; error: string }
  > {
    const form = new FormData()
    form.append('file', input.file)
    form.append('packageId', input.packageId)
    if (input.confirmDuplicates) {
      form.append('confirmDuplicates', 'true')
    }
    try {
      const response = await examBankApi.importQuestions(form)
      return { success: true, data: response }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal mengimpor soal.'),
      }
    }
  },
}
