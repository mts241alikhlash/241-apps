import { isAxiosError } from 'axios'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import type {
  AdmissionDocumentStatus,
  AdmissionPaymentStatus,
  AdmissionStatus,
} from './types'

export function formatIDR(value: number) {
  const amount = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
  return `Rp. ${amount}`
}

export function formatThousands(value: string | number | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatJakartaDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

export function jakartaDaysUntil(value: string, now: Date = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
  return Math.round(
    (Date.parse(day) - Date.parse(jakartaToday(now))) / 86_400_000,
  )
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
) {
  if (!start || !end) return formatDate(start ?? end)
  const from = new Date(start)
  const to = new Date(end)
  const sameYear = from.getFullYear() === to.getFullYear()
  if (!sameYear) return `${formatDate(start)} – ${formatDate(end)}`
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}–${formatDate(end)}`
  }
  const month = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(from)
  return `${from.getDate()} ${month} – ${formatDate(end)}`
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function presentValue(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value).trim()
  return text === '' || text === '-' ? 'Belum diisi' : text
}

export const STATUS_BADGE_VARIANTS: Record<
  AdmissionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  DRAFT: 'secondary',
  SUBMITTED: 'outline',
  REVISION_NEEDED: 'destructive',
  VERIFIED: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  ENROLLING: 'outline',
  ENROLLED: 'default',
}

export const PAYMENT_STATUS_BADGE_VARIANTS: Record<
  AdmissionPaymentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  UNPAID: 'secondary',
  PENDING: 'secondary',
  VERIFIED: 'default',
  REJECTED: 'destructive',
}

export const DOCUMENT_STATUS_BADGE_VARIANTS: Record<
  AdmissionDocumentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

export function admissionErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const message = (error.response?.data as { message?: unknown } | undefined)
      ?.message
    if (
      (status === 400 || status === 404 || status === 409) &&
      typeof message === 'string'
    ) {
      return message
    }
    if (status === 400 && Array.isArray(message)) return fallback
  }
  return getIndonesianErrorMessage(error, fallback)
}

export async function admissionBlobErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await error.response.data.text())
      error.response.data = parsed
    } catch {
      error.response.data = undefined
    }
  }
  return admissionErrorMessage(error, fallback)
}

export function jakartaToday(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    now,
  )
}

export function isWaveClosed(
  endDate: string | null | undefined,
  now: Date = new Date(),
) {
  if (!endDate) return false
  return endDate.slice(0, 10) < jakartaToday(now)
}

export function documentSummaryText(summary: {
  approved: number
  rejected: number
  pending: number
  missing: number
  total: number
}) {
  if (summary.total === 0) return 'Tidak ada berkas'
  const parts: [number, string][] = [
    [summary.approved, 'disetujui'],
    [summary.rejected, 'ditolak'],
    [summary.pending, 'menunggu'],
    [summary.missing, 'belum diunggah'],
  ]
  const text = parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`)
    .join(' · ')
  return `${text} dari ${summary.total} berkas`
}

export function standardDocumentFileName(
  documentTypeName: string | null | undefined,
  applicantName: string | null | undefined,
  originalFileName: string | null | undefined,
) {
  if (!originalFileName) return '-'
  const ext = originalFileName.includes('.')
    ? originalFileName.slice(originalFileName.lastIndexOf('.'))
    : ''
  const docType = documentTypeName?.trim()
  const name = applicantName?.trim()
  if (docType && name) return `${docType} - ${name}${ext}`
  if (docType) return `${docType}${ext}`
  return originalFileName
}

export const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const format = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })
  if (bytes < 1024 * 1024) return `${format.format(bytes / 1024)} KB`
  return `${format.format(bytes / (1024 * 1024))} MB`
}

export function pdfFileError(file: File) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!isPdf) return 'Berkas harus PDF.'
  if (file.size === 0) return 'Berkas kosong.'
  if (file.size > MAX_DOWNLOAD_BYTES) return 'Ukuran berkas maksimal 5 MB.'
  return null
}

export function imageFileError(file: File) {
  const accepted =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    /\.(jpe?g|png|webp)$/i.test(file.name)
  if (!accepted) return 'Gambar harus JPG, PNG, atau WebP.'
  if (file.size === 0) return 'Berkas kosong.'
  if (file.size > MAX_DOWNLOAD_BYTES) return 'Ukuran gambar maksimal 5 MB.'
  return null
}
