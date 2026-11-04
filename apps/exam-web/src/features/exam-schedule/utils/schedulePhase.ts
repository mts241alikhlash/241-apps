import type { ExamSchedule, SchedulePhase } from '../types'

export function schedulePhase(
  schedule: Pick<ExamSchedule, 'startsAt' | 'endsAt' | 'status'>,
  now: Date,
): SchedulePhase {
  if (schedule.status === 'CANCELLED') return 'CANCELLED'
  const time = now.getTime()
  if (time < new Date(schedule.startsAt).getTime()) return 'UPCOMING'
  if (time < new Date(schedule.endsAt).getTime()) return 'RUNNING'
  return 'ENDED'
}
