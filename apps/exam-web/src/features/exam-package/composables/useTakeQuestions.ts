import { ref, watch } from 'vue'
import { examPackageService } from '../services/examPackageService'
import type { ExamPackageItemView, ExamPackageSummary } from '../types'

export const MAX_TAKEN = 200

export interface TakeTarget {
  packageId: string
  subjectId: string
  gradeId: string
}

export function useTakeQuestions(target: TakeTarget) {
  const sources = ref<ExamPackageSummary[]>([])
  const sourceId = ref('')
  const questions = ref<ExamPackageItemView[]>([])
  const selected = ref<Set<string>>(new Set())
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    const rows = await examPackageService.loadApprovedSources(
      target.subjectId,
      target.gradeId,
    )
    sources.value = rows.filter((row) => row.id !== target.packageId)
    loading.value = false
  }

  watch(sourceId, async (id) => {
    selected.value = new Set()
    questions.value = []
    if (id === '') return
    try {
      const source = await examPackageService.loadPackage(id)
      if (sourceId.value === id) questions.value = source?.items ?? []
    } catch {
      if (sourceId.value === id)
        error.value = 'Soal paket ini tidak dapat dimuat.'
    }
  })

  function toggle(questionId: string) {
    const next = new Set(selected.value)
    if (next.has(questionId)) next.delete(questionId)
    else next.add(questionId)
    selected.value = next
  }

  const selectAll = () => {
    selected.value = new Set(questions.value.map((item) => item.questionId))
  }

  const clear = () => {
    selected.value = new Set()
  }

  async function submit(): Promise<boolean> {
    if (selected.value.size === 0 || saving.value) return false
    if (selected.value.size > MAX_TAKEN) {
      error.value = `Paling banyak ${MAX_TAKEN} soal sekali salin`
      return false
    }
    saving.value = true
    error.value = null
    const result = await examPackageService.take(target.packageId, {
      sourcePackageId: sourceId.value,
      questionIds: questions.value
        .filter((item) => selected.value.has(item.questionId))
        .map((item) => item.questionId),
    })
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return false
    }
    return true
  }

  return {
    sources,
    sourceId,
    questions,
    selected,
    loading,
    saving,
    error,
    load,
    toggle,
    selectAll,
    clear,
    submit,
  }
}
