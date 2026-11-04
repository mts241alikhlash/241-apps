import { toast } from 'vue-sonner'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { subjectApi } from '@/features/lookup/subject'
import { loadAssignments } from '@/features/lookup/teaching-assignment'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examBankApi } from '../api/examBankApi'
import { useExamBankStore } from '../stores/examBankStore'
import type { ImportResult, NamedOption, TemplateFormat } from '../types'

export const examBankService = {
  async loadReferences() {
    const store = useExamBankStore()
    try {
      const response = await examBankApi.getScope()
      store.scope = response.data?.data ?? { all: false, pairs: [] }
      if (store.scope.all) {
        const [subjectRes, gradeRes] = await Promise.all([
          subjectApi.getSubjects({ limit: PAGINATION.REFERENCE_LIMIT }),
          examBankApi.getGrades({ limit: PAGINATION.REFERENCE_LIMIT }),
        ])
        store.subjects = subjectRes.data?.data ?? []
        store.grades = gradeRes.data?.data ?? []
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
        teachers.set(
          row.employeeId,
          row.employee?.user?.profile?.name ?? row.employee?.nip ?? '-',
        )
      }
      return [...teachers]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'))
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal memuat daftar guru.'))
      return []
    }
  },

  async downloadTemplate(format: TemplateFormat): Promise<void> {
    try {
      const response = await examBankApi.downloadTemplate(format)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `template-soal.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal mengunduh template.'))
    }
  },

  async importQuestions(input: {
    file: File
    packageId: string
    authorEmployeeId?: string
  }): Promise<
    { success: true; data: ImportResult } | { success: false; error: string }
  > {
    const form = new FormData()
    form.append('file', input.file)
    form.append('packageId', input.packageId)
    if (input.authorEmployeeId) {
      form.append('authorEmployeeId', input.authorEmployeeId)
    }
    try {
      const response = await examBankApi.importQuestions(form)
      return { success: true, data: response.data.data }
    } catch (err: unknown) {
      return {
        success: false,
        error: messageOf(err, 'Gagal mengimpor soal.'),
      }
    }
  },
}
