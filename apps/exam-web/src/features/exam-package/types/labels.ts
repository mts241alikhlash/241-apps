import type {
  ExamPackageStatus,
  ItemResolution,
  QuestionMarker,
} from './package'

export type PackageTone = 'neutral' | 'info' | 'success' | 'warning'

const STATUS_LABELS: Record<ExamPackageStatus, string> = {
  DRAFT: 'Draf',
  SUBMITTED: 'Menunggu tinjauan',
  RETURNED: 'Dikembalikan',
  APPROVED: 'Disetujui',
  LOCKED: 'Terjadwal',
}

const STATUS_TONES: Record<ExamPackageStatus, PackageTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  RETURNED: 'warning',
  APPROVED: 'success',
  LOCKED: 'neutral',
}

const MARKER_LABELS: Record<QuestionMarker, string> = {
  NEW: 'Baru',
  CHANGED: 'Diubah',
  COPIED: 'Salinan',
}

const RESOLUTION_LABELS: Record<ItemResolution, string> = {
  NORMAL: 'Penilaian normal',
  BONUS_ALL: 'Bonus untuk semua',
  KEY_OVERRIDE: 'Ganti kunci jawaban',
}

export const resolutionLabel = (resolution: ItemResolution): string =>
  RESOLUTION_LABELS[resolution]

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const TONE_VARIANT = {
  neutral: 'outline',
  info: 'secondary',
  success: 'default',
  warning: 'destructive',
} as const satisfies Record<PackageTone, BadgeVariant>

export const statusVariant = (status: ExamPackageStatus): BadgeVariant =>
  TONE_VARIANT[STATUS_TONES[status]]

export const markerVariant = (marker: QuestionMarker): BadgeVariant =>
  marker === 'COPIED' ? 'outline' : 'default'

export const packageStatusLabel = (status: ExamPackageStatus): string =>
  STATUS_LABELS[status]

export const packageStatusTone = (status: ExamPackageStatus): PackageTone =>
  STATUS_TONES[status]

export const markerLabel = (marker: QuestionMarker): string =>
  MARKER_LABELS[marker]
