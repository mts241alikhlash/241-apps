import { ref } from 'vue'
import { extractRdmErrorMessage, rdmService } from '../services/rdmService'
import type { RdmImportPreview, RdmImportResponse } from '../types'

export function useRdmImport(teachingAssignmentId: () => string) {
  const selectedFile = ref<File | null>(null)
  const preview = ref<RdmImportPreview | null>(null)
  const importResult = ref<RdmImportResponse | null>(null)
  const isPreviewing = ref(false)
  const isImporting = ref(false)
  const error = ref<string | null>(null)

  async function setFile(file: File | null): Promise<void> {
    selectedFile.value = file
    preview.value = null
    importResult.value = null
    error.value = null
    if (!file) return

    const assignmentId = teachingAssignmentId()
    if (!assignmentId) return

    isPreviewing.value = true
    try {
      preview.value = await rdmService.previewImport({
        teachingAssignmentId: assignmentId,
        file,
      })
    } catch (err: unknown) {
      error.value = await extractRdmErrorMessage(
        err,
        'Gagal mempratinjau file impor RDM.',
      )
    } finally {
      isPreviewing.value = false
    }
  }

  async function confirm(): Promise<RdmImportResponse | null> {
    if (!selectedFile.value || !preview.value) return null
    const assignmentId = teachingAssignmentId()
    if (!assignmentId) return null

    isImporting.value = true
    error.value = null
    try {
      const res = await rdmService.confirmImport({
        teachingAssignmentId: assignmentId,
        file: selectedFile.value,
      })
      importResult.value = res
      return res
    } catch (err: unknown) {
      error.value = await extractRdmErrorMessage(
        err,
        'Gagal mengimpor nilai RDM.',
      )
      return null
    } finally {
      isImporting.value = false
    }
  }

  function reset(): void {
    selectedFile.value = null
    preview.value = null
    importResult.value = null
    isPreviewing.value = false
    isImporting.value = false
    error.value = null
  }

  return {
    selectedFile,
    preview,
    importResult,
    isPreviewing,
    isImporting,
    error,
    setFile,
    confirm,
    reset,
  }
}
