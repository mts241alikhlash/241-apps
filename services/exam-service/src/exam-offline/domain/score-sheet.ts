import type { ExamOfflineKind } from '../../exam-activity/domain/entities/exam-activity.entity.js'

export const SCORE_SHEET_NAME = 'Score Sheet'
export const SCORE_SHEET_HEADERS = ['No. Peserta', 'Nama', 'Score', 'Note']
export const SCORE_SHEET_ABSENT = 'TIDAK HADIR'
export const SCORE_SHEET_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const OFFLINE_IMPORT_MAX_BYTES = 5 * 1024 * 1024
export const OFFLINE_IMPORT_MAX_ROWS = 500

export const OFFLINE_KIND_LABELS: Record<ExamOfflineKind, string> = {
  WRITTEN: 'Written',
  PRACTICAL: 'Practical',
}

const FORMULA_START = /^[=+\-@\t\r]/u

export function asSheetText(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value
}

export function fromSheetText(value: string): string {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1))
    ? value.slice(1)
    : value
}
