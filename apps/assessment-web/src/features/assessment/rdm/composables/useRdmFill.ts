import { computed, ref } from 'vue'
import { extractRdmErrorMessage, rdmService } from '../services/rdmService'
import type {
  RdmCandidatesResponse,
  RdmFillResponse,
  RdmWorkbookKind,
} from '../types'

export const RDM_MAX_SUMATIF_ITEMS = 15

export function useRdmFill(teachingAssignmentId: () => string) {
  const candidates = ref<RdmCandidatesResponse>({ sumatif: [], sas: [] })
  const loadingCandidates = ref(false)
  const templateKind = ref<RdmWorkbookKind>('sumatif')
  const selectedIds = ref<string[]>([])
  const selectedFile = ref<File | null>(null)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)
  const selectionError = ref<string | null>(null)
  const result = ref<RdmFillResponse | null>(null)

  const sumatifCandidates = computed(() => candidates.value.sumatif)
  const sasCandidates = computed(() => candidates.value.sas)

  async function loadCandidates(): Promise<void> {
    const assignmentId = teachingAssignmentId()
    if (!assignmentId) return

    loadingCandidates.value = true
    error.value = null
    selectionError.value = null
    try {
      const data = await rdmService.getCandidates(assignmentId)
      candidates.value = data
      selectedIds.value =
        data.sumatif.length <= RDM_MAX_SUMATIF_ITEMS
          ? data.sumatif.map((item) => item.id)
          : []
    } catch (err: unknown) {
      error.value = await extractRdmErrorMessage(
        err,
        'Gagal memuat daftar penilaian RDM.',
      )
    } finally {
      loadingCandidates.value = false
    }
  }

  function setFile(file: File | null): void {
    selectedFile.value = file
    error.value = null
    result.value = null
    if (file) {
      templateKind.value = /\bsas\b/i.test(file.name) ? 'sas' : 'sumatif'
    }
  }

  function setTemplateKind(kind: RdmWorkbookKind): void {
    templateKind.value = kind
    error.value = null
    selectionError.value = null
  }

  function toggleItem(id: string): void {
    selectionError.value = null
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id)
      return
    }
    if (selectedIds.value.length >= RDM_MAX_SUMATIF_ITEMS) {
      selectionError.value = `Maksimal ${RDM_MAX_SUMATIF_ITEMS} penilaian per file RDM`
      return
    }
    selectedIds.value = [...selectedIds.value, id]
  }

  function clearSelection(): void {
    selectionError.value = null
    selectedIds.value = []
  }

  async function submit(): Promise<RdmFillResponse | null> {
    if (!selectedFile.value) return null
    const assignmentId = teachingAssignmentId()
    if (!assignmentId) return null

    isSubmitting.value = true
    error.value = null
    try {
      const itemIds =
        templateKind.value === 'sumatif'
          ? selectedIds.value
          : candidates.value.sas.length === 1
            ? [candidates.value.sas[0].id]
            : []

      const fillResult = await rdmService.fillTemplate({
        teachingAssignmentId: assignmentId,
        file: selectedFile.value,
        itemIds,
      })
      result.value = fillResult
      return fillResult
    } catch (err: unknown) {
      error.value = await extractRdmErrorMessage(
        err,
        'Gagal mengisi template RDM.',
      )
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  function reset(): void {
    selectedFile.value = null
    templateKind.value = 'sumatif'
    selectedIds.value = []
    error.value = null
    selectionError.value = null
    result.value = null
  }

  return {
    candidates,
    sumatifCandidates,
    sasCandidates,
    loadingCandidates,
    templateKind,
    selectedIds,
    selectedFile,
    isSubmitting,
    error,
    selectionError,
    result,
    loadCandidates,
    setFile,
    setTemplateKind,
    toggleItem,
    clearSelection,
    submit,
    reset,
  }
}
