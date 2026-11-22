import type { ExamSchedule } from '../types'

export const NO_PERIOD = 'none'

const TZ = 'Asia/Jakarta'

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const dayKeyOf = (iso: string): string =>
  dayKeyFormat.format(new Date(iso))

export const periodKeyOf = (schedule: ExamSchedule): string =>
  schedule.eventId ?? NO_PERIOD

export interface PeriodGroup {
  id: string
  dayCount: number
  scheduleCount: number
}

export interface DayGroup {
  id: string
  startsAt: string
  endsAt: string
  schedules: ExamSchedule[]
  subjectCount: number
  scheduleCount: number
}

export function groupPeriods(schedules: ExamSchedule[]): PeriodGroup[] {
  const byPeriod = new Map<string, ExamSchedule[]>()
  for (const item of schedules) {
    const key = periodKeyOf(item)
    byPeriod.set(key, [...(byPeriod.get(key) ?? []), item])
  }
  return [...byPeriod].map(([id, rows]) => ({
    id,
    dayCount: new Set(rows.map((row) => dayKeyOf(row.startsAt))).size,
    scheduleCount: rows.length,
  }))
}

export function groupDays(schedules: ExamSchedule[]): DayGroup[] {
  const byDay = new Map<string, ExamSchedule[]>()
  for (const item of schedules) {
    const key = dayKeyOf(item.startsAt)
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  return [...byDay]
    .map(([id, rows]) => ({
      id,
      startsAt: rows.reduce(
        (first, row) => (row.startsAt < first ? row.startsAt : first),
        rows[0].startsAt,
      ),
      endsAt: rows.reduce(
        (last, row) => (row.endsAt > last ? row.endsAt : last),
        rows[0].endsAt,
      ),
      schedules: rows,
      subjectCount: new Set(rows.map((row) => row.packageId)).size,
      scheduleCount: rows.length,
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}
