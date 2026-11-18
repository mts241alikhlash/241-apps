import type { RoomReportSummary } from '../types'

export const NO_SUBJECT = 'Tanpa mapel'

export interface SubjectGroup {
  id: string
  dayKey: string
  subjectName: string
  startsAt: string
  endsAt: string
  rooms: RoomReportSummary[]
  roomCount: number
  participantCount: number
  submittedCount: number
  summary: string
}

export interface DayGroup {
  id: string
  startsAt: string
  subjects: SubjectGroup[]
  subjectCount: number
  roomCount: number
  slotCount: number
  submittedCount: number
  summary: string
}

const localTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone

export const statusSummary = (submitted: number, total: number): string =>
  `${submitted} dari ${total} diserahkan`

const isSubmitted = (row: RoomReportSummary): boolean => row.status !== 'DRAFT'

export function groupReports(
  rows: RoomReportSummary[],
  timeZone: string = localTimeZone(),
): DayGroup[] {
  const dayFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const subjects = new Map<string, SubjectGroup>()
  const slotsByDay = new Map<string, Map<string, RoomReportSummary>>()
  for (const row of rows) {
    const dayKey = dayFormat.format(new Date(row.startsAt))
    const slots = slotsByDay.get(dayKey) ?? new Map<string, RoomReportSummary>()
    slots.set(row.slotId, row)
    slotsByDay.set(dayKey, slots)
    const names = row.subjectNames.length > 0 ? row.subjectNames : [NO_SUBJECT]
    for (const subjectName of names) {
      const id = `${dayKey}|${row.startsAt}|${subjectName}`
      const group = subjects.get(id) ?? {
        id,
        dayKey,
        subjectName,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        rooms: [],
        roomCount: 0,
        participantCount: 0,
        submittedCount: 0,
        summary: '',
      }
      group.rooms.push(row)
      if (row.endsAt > group.endsAt) group.endsAt = row.endsAt
      subjects.set(id, group)
    }
  }
  const byDay = new Map<string, SubjectGroup[]>()
  for (const group of subjects.values()) {
    group.rooms.sort((a, b) =>
      a.roomName.localeCompare(b.roomName, 'id', { numeric: true }),
    )
    group.roomCount = new Set(group.rooms.map((row) => row.roomId)).size
    group.participantCount = group.rooms.reduce(
      (sum, row) => sum + row.registeredCount,
      0,
    )
    group.submittedCount = group.rooms.filter(isSubmitted).length
    group.summary = statusSummary(group.submittedCount, group.rooms.length)
    byDay.set(group.dayKey, [...(byDay.get(group.dayKey) ?? []), group])
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, list]) => {
      list.sort(
        (a, b) =>
          a.startsAt.localeCompare(b.startsAt) ||
          a.subjectName.localeCompare(b.subjectName, 'id'),
      )
      const slots = [...(slotsByDay.get(id) ?? []).values()]
      const submittedCount = slots.filter(isSubmitted).length
      return {
        id,
        startsAt: list[0].startsAt,
        subjects: list,
        subjectCount: list.length,
        roomCount: new Set(slots.map((row) => row.roomId)).size,
        slotCount: slots.length,
        submittedCount,
        summary: statusSummary(submittedCount, slots.length),
      }
    })
}
