import type {
  OfflinePublicationStatus,
  OfflineResult,
  OfflineStudentState,
} from '../entities/offline-result.entity.js'

export const OFFLINE_NOTE_MAX = 300

export function offlineScoreProblem(
  value: number,
  maxScore: number,
): string | null {
  if (!Number.isFinite(value) || value < 0 || value > maxScore) {
    return `Nilai harus antara 0 dan ${maxScore}`
  }
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-9) {
    return 'Nilai paling banyak dua angka di belakang koma'
  }
  return null
}

export function offlineStateOf(
  absent: boolean,
  result: Pick<OfflineResult, 'rawScore'> | undefined,
): OfflineStudentState {
  if (absent) return 'ABSENT'
  return result?.rawScore == null ? 'MISSING' : 'SCORED'
}

export function publicationAfterEdit(
  existing: Pick<OfflineResult, 'rawScore' | 'publicationStatus'> | undefined,
  rawScore: number | null,
): { status: OfflinePublicationStatus | null } | undefined {
  if (existing === undefined || existing.publicationStatus === null) {
    return undefined
  }
  if (rawScore === null) return { status: null }
  if (existing.rawScore === rawScore) return undefined
  return { status: 'PENDING' }
}
