import { computed, ref, watch } from 'vue'
import { useExamBankStore } from '@/features/exam-bank/stores/examBankStore'
import { examPackageService } from '../services/examPackageService'

export function usePackageCreate() {
  const store = useExamBankStore()
  const title = ref('')
  const subjectId = ref('')
  const gradeId = ref('')
  const saving = ref(false)
  const error = ref<string | null>(null)

  const subjectOptions = computed(() => store.subjectOptions)
  const gradeOptions = computed(() =>
    store.gradeOptionsFor(subjectId.value === '' ? null : subjectId.value),
  )

  watch(
    subjectOptions,
    (options) => {
      if (subjectId.value === '' && options.length === 1) {
        subjectId.value = options[0].id
      }
    },
    { immediate: true, flush: 'sync' },
  )

  watch(
    gradeOptions,
    (options) => {
      if (!options.some((option) => option.id === gradeId.value)) {
        gradeId.value = options.length === 1 ? options[0].id : ''
      }
    },
    { immediate: true, flush: 'sync' },
  )

  const problem = computed<string | null>(() => {
    if (title.value.trim() === '') return 'Judul wajib diisi'
    if (subjectId.value === '') return 'Pilih mapel'
    if (gradeId.value === '') return 'Pilih tingkat'
    return null
  })

  async function submit(): Promise<string | null> {
    if (problem.value !== null || saving.value) return null
    saving.value = true
    error.value = null
    const result = await examPackageService.create({
      title: title.value.trim(),
      subjectId: subjectId.value,
      gradeId: gradeId.value,
    })
    saving.value = false
    if (!result.success) {
      error.value = result.error
      return null
    }
    return result.data.id
  }

  return {
    title,
    subjectId,
    gradeId,
    subjectOptions,
    gradeOptions,
    saving,
    error,
    problem,
    submit,
  }
}
