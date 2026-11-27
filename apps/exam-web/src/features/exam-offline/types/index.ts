import type { components } from '@mts241alikhlash/exam-api'
import { OFFLINE_KIND_LABELS } from '@/features/exam-activity/types'

type Schemas = components['schemas']

export type OfflineSchedule = Schemas['OfflineScheduleRowDto']

export type OfflineRosterRow = Schemas['OfflineRosterRowDto']

export type OfflineScoreState = OfflineRosterRow['state']

export type OfflinePublication = OfflineRosterRow['publication']

export type SaveOfflineScorePayload = Schemas['SaveOfflineScoreDto']

export type OfflineImportResult = Schemas['OfflineImportResultDto']

export type OfflineImportSkip = Schemas['OfflineImportSkipDto']

export type OfflinePublicationCounts = Schemas['OfflinePublicationCountsDto']

export const offlineKindLabel = (kind: OfflineSchedule['offlineKind']) =>
  OFFLINE_KIND_LABELS[kind]

export const SCORE_STATE_LABELS: Record<OfflineScoreState, string> = {
  SCORED: 'Dinilai',
  ABSENT: 'Tidak hadir',
  MISSING: 'Belum dinilai',
}

export const PUBLICATION_LABELS: Record<
  NonNullable<OfflinePublication>,
  string
> = {
  SENT: 'Terkirim',
  PENDING: 'Menunggu',
  FAILED: 'Gagal',
}

export const SKIP_LABELS: Record<OfflineImportSkip['reason'], string> = {
  KOSONG: 'Dilewati (kosong)',
  TIDAK_HADIR: 'Dilewati (tidak hadir)',
}

export const SCORE_PUBLISHED_CODE = 'OFFLINE_SCORE_PUBLISHED'

export const SCORES_MISSING_CODE = 'OFFLINE_SCORES_MISSING'

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024

export const IMPORT_ACCEPT = '.xlsx,.csv'

export const OFFLINE_SCORES_PATH = '/exam/offline-scores'

export const SENT_BEFORE_ABSENT_WARNING =
  'Nilai sudah terkirim ke penilaian sebelum siswa ditandai tidak hadir; perbaiki di penilaian'
