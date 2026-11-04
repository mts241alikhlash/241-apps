export interface ScheduleLesson {
  timeSlotId?: string
  day: string
  subject?: { name?: string }
  employee?: { user?: { profile?: { name?: string } } }
  classroom?: { name?: string; code?: string; displayName?: string }
}

export type ScheduleLessonMap = Record<string, Record<string, ScheduleLesson>>
