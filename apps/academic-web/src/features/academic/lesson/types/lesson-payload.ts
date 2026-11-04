import type { ScheduleResponse } from './lesson'

export interface LessonQueryParams {
  employeeId?: string
  classroomId?: string
  limit?: number
}

export interface LessonServiceResult {
  success: boolean
  data?: ScheduleResponse[]
  error?: unknown
}
