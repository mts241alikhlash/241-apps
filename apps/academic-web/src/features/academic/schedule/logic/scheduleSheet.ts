import type { ScheduleDay, ScheduleLessonMap, ScheduleTimeSlot } from '../types'

export function appliesOn(slot: ScheduleTimeSlot, day: string): boolean {
  const days = slot.days ?? []
  return days.length === 0 || days.includes(day)
}

export const FREE_PERIOD = '–'

function minutesOf(value: string): number {
  if (!value) return 0

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getUTCHours() * 60 + parsed.getUTCMinutes()
  }

  const [hours, mins] = value.slice(0, 5).split(':')
  return (Number(hours) || 0) * 60 + (Number(mins) || 0)
}

function overlaps(a: ScheduleTimeSlot, b: ScheduleTimeSlot): boolean {
  return (
    minutesOf(a.startTime) < minutesOf(b.endTime) &&
    minutesOf(b.startTime) < minutesOf(a.endTime)
  )
}

export interface SheetCell {
  title: string
  subtitle?: string
  isInterruption?: boolean
}

export interface SheetRow {
  period: string
  time: string
  isInterruption: boolean
  spansAllDays: boolean
  cells: SheetCell[]
}

export interface ScheduleSheet {
  title: string
  subtitle: string
  dayLabels: string[]
  rows: SheetRow[]
}

export interface BuildSheetInput {
  title: string
  subtitle: string
  days: ScheduleDay[]
  timeSlots: ScheduleTimeSlot[]
  lessonMap: ScheduleLessonMap
  isPersonal: boolean
}

function clock(value: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    const h = String(parsed.getUTCHours()).padStart(2, '0')
    const m = String(parsed.getUTCMinutes()).padStart(2, '0')
    return `${h}.${m}`
  }
  return String(value).slice(0, 5).replace(':', '.')
}

export function buildScheduleSheet({
  title,
  subtitle,
  days,
  timeSlots,
  lessonMap,
  isPersonal,
}: BuildSheetInput): ScheduleSheet {
  const lessonSlots = timeSlots.filter((slot) => slot.isLesson !== false)
  const interruptions = timeSlots.filter((slot) => slot.isLesson === false)

  const overlay: Record<string, Record<string, ScheduleTimeSlot>> = {}
  const absorbed = new Set<string>()

  for (const interruption of interruptions) {
    for (const lesson of lessonSlots) {
      if (!overlaps(interruption, lesson)) continue
      absorbed.add(interruption.id)

      for (const day of days) {
        if (!appliesOn(interruption, day.value)) continue
        overlay[lesson.id] ??= {}
        overlay[lesson.id][day.value] = interruption
      }
    }
  }

  const rows: SheetRow[] = timeSlots
    .filter((slot) => !absorbed.has(slot.id))
    .map((slot) => {
      const time = `${clock(slot.startTime)} - ${clock(slot.endTime)}`
      const label = slot.name

      if (slot.isLesson === false) {
        const everyDay = (slot.days ?? []).length === 0

        return {
          period: slot.name,
          time,
          isInterruption: true,
          spansAllDays: everyDay,
          cells: everyDay
            ? [{ title: label }]
            : days.map((day) => ({
                title: appliesOn(slot, day.value) ? label : '',
              })),
        }
      }

      return {
        period: slot.name,
        time,
        isInterruption: false,
        spansAllDays: false,
        cells: days.map((day) => {
          const taken = overlay[slot.id]?.[day.value]
          if (taken) {
            return { title: taken.name, isInterruption: true }
          }

          const lesson = lessonMap[slot.id]?.[day.value]
          if (!lesson) return { title: FREE_PERIOD }

          return {
            title: lesson.subject?.name ?? '',
            subtitle: isPersonal
              ? (lesson.classroom?.code ?? lesson.classroom?.name ?? undefined)
              : (lesson.employee?.user?.profile?.name ?? undefined),
          }
        }),
      }
    })

  return {
    title,
    subtitle,
    dayLabels: days.map((day) => day.label),
    rows,
  }
}
