import type { ExamActivityRecord } from '../types'

export interface TimetableSlot {
  startsAt: string
  endsAt: string
  time: string
  entries: { subject: string; grades: string[] }[]
}

export interface TimetableDay {
  key: string
  label: string
  slots: TimetableSlot[]
}

const TZ = 'Asia/Jakarta'
const keyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const labelFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const clock = (iso: string) =>
  timeFormat.format(new Date(iso)).replace(':', '.')

export function buildTimetable(
  activities: ExamActivityRecord[],
): TimetableDay[] {
  const sorted = [...activities].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  )
  const days = new Map<string, TimetableDay>()
  for (const activity of sorted) {
    const date = new Date(activity.startsAt)
    const key = keyFormat.format(date)
    const day = days.get(key) ?? {
      key,
      label: labelFormat.format(date),
      slots: [],
    }
    days.set(key, day)
    let slot = day.slots.find(
      (row) =>
        row.startsAt === activity.startsAt && row.endsAt === activity.endsAt,
    )
    if (slot === undefined) {
      slot = {
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
        time: `${clock(activity.startsAt)} – ${clock(activity.endsAt)}`,
        entries: [],
      }
      day.slots.push(slot)
    }
    const subject = activity.subjectName ?? 'Mata pelajaran tidak dikenal'
    const grade = activity.gradeName ?? '-'
    const entry = slot.entries.find((row) => row.subject === subject)
    if (entry === undefined) slot.entries.push({ subject, grades: [grade] })
    else if (!entry.grades.includes(grade)) entry.grades.push(grade)
  }
  return [...days.values()]
}

export function timetableHtml(days: TimetableDay[], title: string): string {
  const esc = (text: string) =>
    text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
  const rows = days
    .map(
      (day) =>
        `<h3>${esc(day.label)}</h3><table><tbody>${day.slots
          .map(
            (slot) =>
              `<tr><td class="t">${esc(slot.time)}</td><td>${slot.entries
                .map(
                  (entry) =>
                    `${esc(entry.subject)} <small>(${esc(entry.grades.join(', '))})</small>`,
                )
                .join('<br>')}</td></tr>`,
          )
          .join('')}</tbody></table>`,
    )
    .join('')
  return `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:13px Arial;margin:16px}h2{margin:0 0 10px}h3{margin:14px 0 4px}table{border-collapse:collapse;width:100%}td{border:1px solid #999;padding:5px 8px;vertical-align:top}td.t{width:120px;font-weight:700;white-space:nowrap}small{color:#555}</style><h2>${esc(title)}</h2>${rows}`
}
