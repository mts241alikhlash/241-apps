import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { toast } from 'vue-sonner'
import { rdmApi } from '../api/rdmApi'
import type {
  RdmCandidatesResponse,
  RdmDownloadResult,
  RdmFillResponse,
  RdmImportPreview,
  RdmImportResponse,
  RdmWorkbookKind,
} from '../types'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function saveBase64Xlsx(base64: string, fileName: string): void {
  const decoded = atob(base64)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i)
  }
  triggerBrowserDownload(new Blob([bytes], { type: XLSX_MIME }), fileName)
}

function parseFileNameFromContentDisposition(
  headerValue: unknown,
  fallback: string,
): string {
  if (typeof headerValue !== 'string' || !headerValue) return fallback

  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(headerValue)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {
      return utf8Match[1].trim()
    }
  }

  const quotedMatch = /filename\s*=\s*"([^"]+)"/i.exec(headerValue)
  if (quotedMatch?.[1]) return quotedMatch[1].trim()

  const bareMatch = /filename\s*=\s*([^;\s]+)/i.exec(headerValue)
  if (bareMatch?.[1]) return bareMatch[1].trim()

  return fallback
}

function readHeader(
  headers: Record<string, unknown> | undefined,
  name: string,
): unknown {
  if (!headers) return undefined
  const lower = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value
  }
  return undefined
}

function formatApiMessage(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (Array.isArray(raw)) {
    const joined = raw
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ')
    return joined.length > 0 ? joined : null
  }
  return null
}

export async function extractRdmErrorMessage(
  err: unknown,
  fallback: string,
): Promise<string> {
  const response = (
    err as {
      response?: { status?: number; data?: unknown }
    }
  )?.response

  if (response?.data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await response.data.text())
      response.data = parsed
    } catch {
      response.data = undefined
    }
  }

  const status = response?.status
  const rawMessage = (response?.data as { message?: unknown } | undefined)
    ?.message

  if (status === 400 || status === 403) {
    const message = formatApiMessage(rawMessage)
    if (message) return message
  }

  if (!response && err instanceof Error) {
    const trimmed = err.message.trim()
    if (trimmed && trimmed !== 'Network Error') {
      return trimmed
    }
  }

  return getIndonesianErrorMessage(err, fallback)
}

export const rdmService = {
  getCandidates: async (
    teachingAssignmentId: string,
  ): Promise<RdmCandidatesResponse> => {
    try {
      const res = await rdmApi.getCandidates(teachingAssignmentId)
      return res.data.data
    } catch (err: unknown) {
      throw new Error(
        await extractRdmErrorMessage(err, 'Gagal memuat daftar penilaian RDM.'),
        { cause: err },
      )
    }
  },

  downloadWorkbook: async (
    teachingAssignmentId: string,
    kind: RdmWorkbookKind,
  ): Promise<RdmDownloadResult> => {
    const toastId = toast.loading('Sedang mengunduh template RDM...')
    try {
      const res = await rdmApi.downloadWorkbook(teachingAssignmentId, kind)
      const headers = res.headers as Record<string, unknown> | undefined
      const fallbackName =
        kind === 'sas' ? 'Nilai SAS.xlsx' : 'Nilai Sumatif.xlsx'
      const fileName = parseFileNameFromContentDisposition(
        readHeader(headers, 'content-disposition'),
        fallbackName,
      )
      const notIncludedRaw = readHeader(headers, 'x-rdm-items-not-included')
      const parsedCount =
        typeof notIncludedRaw === 'string' || typeof notIncludedRaw === 'number'
          ? Number(notIncludedRaw)
          : 0
      const itemsNotIncluded =
        Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 0

      triggerBrowserDownload(res.data, fileName)

      if (itemsNotIncluded > 0) {
        toast.success('Template berhasil diunduh.', { id: toastId })
        toast.warning(
          `${itemsNotIncluded} penilaian tidak disertakan karena batas 15 penilaian per file RDM.`,
        )
      } else {
        toast.success('Template berhasil diunduh.', { id: toastId })
      }

      return { fileName, itemsNotIncluded }
    } catch (err: unknown) {
      const message = await extractRdmErrorMessage(
        err,
        'Gagal mengunduh template RDM.',
      )
      toast.error(message, { id: toastId })
      throw new Error(message, { cause: err })
    }
  },

  fillTemplate: async (payload: {
    teachingAssignmentId: string
    file: File
    itemIds?: string[]
  }): Promise<RdmFillResponse> => {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('teachingAssignmentId', payload.teachingAssignmentId)
    for (const itemId of payload.itemIds ?? []) {
      formData.append('itemIds', itemId)
    }

    try {
      const res = await rdmApi.fillTemplate(formData)
      const result = res.data.data
      saveBase64Xlsx(result.fileBase64, result.fileName)
      return result
    } catch (err: unknown) {
      throw new Error(
        await extractRdmErrorMessage(err, 'Gagal mengisi template RDM.'),
        { cause: err },
      )
    }
  },

  previewImport: async (payload: {
    teachingAssignmentId: string
    file: File
  }): Promise<RdmImportPreview> => {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('teachingAssignmentId', payload.teachingAssignmentId)

    try {
      const res = await rdmApi.previewImport(formData)
      return res.data.data
    } catch (err: unknown) {
      throw new Error(
        await extractRdmErrorMessage(err, 'Gagal mempratinjau file impor RDM.'),
        { cause: err },
      )
    }
  },

  confirmImport: async (payload: {
    teachingAssignmentId: string
    file: File
  }): Promise<RdmImportResponse> => {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('teachingAssignmentId', payload.teachingAssignmentId)

    try {
      const res = await rdmApi.confirmImport(formData)
      return res.data.data
    } catch (err: unknown) {
      throw new Error(
        await extractRdmErrorMessage(err, 'Gagal mengimpor nilai RDM.'),
        { cause: err },
      )
    }
  },
}
