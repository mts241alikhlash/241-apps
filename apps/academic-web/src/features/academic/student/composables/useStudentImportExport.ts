import { studentService } from '../services/studentService'
import type {
  Student,
  BulkImportRowResult,
  ResolveBulkImportError,
} from '../types'
import type { Classroom } from '@/features/academic/classroom'
import { markFailedRows } from '@/features/academic/shared/import-preview'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { ref, type Ref } from 'vue'
import { toast } from 'vue-sonner'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const BATCH_SIZE = 25

function downloadArrayBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: XLSX_MIME })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export function useStudentImportExport(options: {
  students: Ref<Student[]>
  classes: Ref<Classroom[]>
  onImportSuccess: () => void
}) {
  const isImportExportOpen = ref(false)
  const isImporting = ref(false)
  const isConflictDialogOpen = ref(false)
  const isResolvingConflicts = ref(false)
  const conflictRows = ref<BulkImportRowResult[]>([])
  const resolveProgress = ref(0)

  async function downloadTemplate() {
    try {
      const response = await studentService.getImportTemplate()
      downloadArrayBuffer(response.data, 'template_import_siswa.xlsx')
    } catch (err) {
      toast.error(
        getIndonesianErrorMessage(err, 'Gagal mengunduh template import siswa'),
      )
    }
  }

  async function exportData() {
    try {
      const response = await studentService.exportStudents()
      const dateStr = new Date().toISOString().split('T')[0]
      downloadArrayBuffer(response.data, `Data_Siswa_${dateStr}.xlsx`)
    } catch (err) {
      toast.error(getIndonesianErrorMessage(err, 'Gagal mengekspor data siswa'))
    }
  }

  async function handleFileUpload(file: File) {
    isImporting.value = true
    try {
      const response = await studentService.bulkImport(file)

      const result = response.data.data

      if (typeof result?.total === 'undefined') {
        toast.error('Berkas tidak dapat dibaca. Periksa formatnya.')
        return
      }

      conflictRows.value = result.results
      isImportExportOpen.value = false
      isConflictDialogOpen.value = true
    } catch (err) {
      const errorMessage = getIndonesianErrorMessage(
        err,
        'Terjadi kesalahan saat mengunggah file import.',
      )
      toast.error(errorMessage)
    } finally {
      isImporting.value = false
    }
  }

  async function handleResolveConflicts(
    decisions: {
      existingId?: string
      action: 'update' | 'skip'
      data: NonNullable<BulkImportRowResult['data']>
    }[],
  ) {
    isResolvingConflicts.value = true
    resolveProgress.value = 0

    let updated = 0
    let skipped = 0
    let failed = 0
    const errors: ResolveBulkImportError[] = []
    let sent = 0

    try {
      for (let offset = 0; offset < decisions.length; offset += BATCH_SIZE) {
        const batch = decisions.slice(offset, offset + BATCH_SIZE)
        const response = await studentService.resolveBulkImportConflicts(batch)
        const result = response.data.data

        updated += result.updated
        skipped += result.skipped
        failed += result.failed
        for (const error of result.errors) {
          errors.push({ ...error, index: offset + error.index })
        }

        sent += batch.length
        resolveProgress.value = Math.round((sent / decisions.length) * 100)
      }
    } catch (err) {
      isResolvingConflicts.value = false
      toast.error(
        getIndonesianErrorMessage(
          err,
          'Terjadi kesalahan saat memperbarui data.',
        ),
        {
          description:
            sent > 0
              ? `${sent} dari ${decisions.length} baris sudah terkirim sebelum ini berhenti. Tutup dan impor ulang sisanya.`
              : undefined,
          duration: 10000,
        },
      )
      options.onImportSuccess()
      return
    }

    isResolvingConflicts.value = false

    const parts: string[] = []
    if (updated > 0) parts.push(`${updated} diproses`)
    if (skipped > 0) parts.push(`${skipped} dilewati`)
    if (failed > 0) parts.push(`${failed} gagal`)
    const summary = `Selesai: ${parts.join(', ') || 'tidak ada perubahan'}.`

    options.onImportSuccess()

    if (failed > 0) {
      conflictRows.value = markFailedRows(conflictRows.value, decisions, errors)
      toast.warning(summary, {
        description: `${failed} baris ditandai merah di tabel. Perbaiki datanya, lalu impor ulang baris itu saja.`,
        duration: 10000,
      })
      return
    }

    toast.success(summary)
    isConflictDialogOpen.value = false
    isImportExportOpen.value = false
  }

  return {
    isImportExportOpen,
    isImporting,
    isConflictDialogOpen,
    isResolvingConflicts,
    resolveProgress,
    conflictRows,
    downloadTemplate,
    exportData,
    handleFileUpload,
    handleResolveConflicts,
  }
}
