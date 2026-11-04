import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type {
  LateDocumentList,
  LateDocumentQuery,
  LateDocumentRow,
} from '../types'
import { admissionErrorMessage } from '../utils'

interface LateDocumentPage {
  rows: LateDocumentRow[]
  total: number
  year: LateDocumentList['meta']['year']
  datesMissing: LateDocumentList['meta']['datesMissing']
  counts: LateDocumentList['meta']['counts']
}

async function run(
  action: () => Promise<unknown>,
  done: string,
  fallback: string,
) {
  try {
    await action()
    toast.success(done)
    return { success: true }
  } catch (error: unknown) {
    toast.error(admissionErrorMessage(error, fallback))
    return { success: false }
  }
}

export const lateDocumentService = {
  fetchList: async (
    query: LateDocumentQuery,
  ): Promise<LateDocumentPage | { error: string }> => {
    try {
      const body = (await admissionApi.getLateDocuments(query)).data
      return {
        rows: body.data ?? [],
        total: body.meta.total,
        year: body.meta.year,
        datesMissing: body.meta.datesMissing,
        counts: body.meta.counts,
      }
    } catch (error: unknown) {
      return {
        error: admissionErrorMessage(error, 'Gagal memuat berkas susulan.'),
      }
    }
  },

  upload: (applicationId: string, documentTypeId: string, file: File) =>
    run(
      () =>
        admissionApi.uploadLateDocument(applicationId, documentTypeId, file),
      'Berkas susulan diunggah.',
      'Gagal mengunggah berkas susulan.',
    ),

  decide: (
    applicationId: string,
    documentId: string,
    status: 'APPROVED' | 'REJECTED',
    note?: string,
  ) =>
    run(
      () =>
        admissionApi.decideLateDocument(applicationId, documentId, {
          status,
          ...(status === 'REJECTED' && note ? { note } : {}),
        }),
      status === 'APPROVED' ? 'Berkas disetujui.' : 'Berkas ditolak.',
      'Gagal menyimpan keputusan berkas.',
    ),
}
