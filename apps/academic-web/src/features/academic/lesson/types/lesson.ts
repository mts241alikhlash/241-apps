export interface LessonClassItem {
  id: string
  name: string | null
  code: string
  displayName: string
  isActive: boolean
  classroomLevelId?: string
}

export interface Lesson {
  id?: string
  subjectId: string
  classroomId: string
  name?: string
  employeeId?: string
  timeSlotId: string
  day: string
}

export interface LessonBatchRow {
  timeSlotId: string
  subjectId: string
}

export interface LessonEditorTimeSlot {
  id: string
  name?: string
  type?: string
  isLesson?: boolean
  days?: string[]
  order?: number
  startTime?: string
  endTime?: string
}

export interface LessonEditorSubject {
  id: string
  name?: string
}

export const LESSON_TYPES = ['LESSON'] as const

export function isLessonSlot(slot: LessonEditorTimeSlot): boolean {
  return slot.isLesson ?? slot.type === 'LESSON'
}

export interface LockedScheduleRow {
  kind: 'locked'
  slot: LessonEditorTimeSlot
}

export interface EditableScheduleRow {
  kind: 'editable'
  rowIndex: number
}

export type ScheduleTableRow = LockedScheduleRow | EditableScheduleRow

export interface ScheduleResponse {
  id: string
  day: string
  timeSlotId: string
  timeSlot?: { id: string; name?: string; order?: number }
  teachingAssignment?: {
    subjectId: string
    subject?: { id: string; name?: string }
    classroom?: { id?: string; name?: string; code?: string }
    employee?: { id?: string; user?: { profile?: { name?: string } } }
  }
}
