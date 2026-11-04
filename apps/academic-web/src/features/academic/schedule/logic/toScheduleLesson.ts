import type { ScheduleLesson } from '../types'

export interface ScheduleApiRow {
  day: string
  timeSlotId?: string
  teachingAssignment?: {
    subject?: { name?: string }
    classroom?: { name?: string; code?: string; displayName?: string }
    employee?: { user?: { profile?: { name?: string } } }
  }
}

export function toScheduleLesson(row: ScheduleApiRow): ScheduleLesson {
  return {
    timeSlotId: row.timeSlotId,
    day: row.day,
    subject: row.teachingAssignment?.subject,
    employee: row.teachingAssignment?.employee,
    classroom: row.teachingAssignment?.classroom,
  }
}
