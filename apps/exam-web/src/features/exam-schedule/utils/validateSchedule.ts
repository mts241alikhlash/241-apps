import { toInstant } from './instant'

export interface ScheduleDraft {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  durationMinutes: number | null
}

export const MAX_DURATION_MINUTES = 1440
export const MAX_WINDOW_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

export function validateSchedule(draft: ScheduleDraft): string | null {
  if (!draft.startDate || !draft.endDate) return 'Tanggal wajib diisi'
  if (!draft.startTime || !draft.endTime) {
    return 'Jam mulai dan jam selesai wajib diisi'
  }
  const start = new Date(toInstant(draft.startDate, draft.startTime)).getTime()
  const end = new Date(toInstant(draft.endDate, draft.endTime)).getTime()
  if (end <= start) return 'Jam selesai harus setelah jam mulai'
  const minutes = draft.durationMinutes
  if (
    minutes === null ||
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > MAX_DURATION_MINUTES
  ) {
    return `Durasi harus antara 1 dan ${MAX_DURATION_MINUTES} menit`
  }
  if (minutes * 60_000 > end - start) {
    return 'Durasi tidak boleh lebih panjang dari jendela ujian'
  }
  if (end - start > MAX_WINDOW_DAYS * DAY_MS) {
    return `Jendela ujian maksimal ${MAX_WINDOW_DAYS} hari`
  }
  return null
}
