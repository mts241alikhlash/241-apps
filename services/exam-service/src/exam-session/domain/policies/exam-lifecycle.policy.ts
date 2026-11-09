export type ExamActivityStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED'

export type ExamLifecycle = 'UPCOMING' | 'OPEN' | 'FINISHED'

export function examLifecycle(
  activityStatus: ExamActivityStatus,
  window: { startsAt: Date; endsAt: Date },
  now: Date,
): ExamLifecycle {
  if (activityStatus !== 'ACTIVE') return 'FINISHED'
  const time = now.getTime()
  if (time < window.startsAt.getTime()) return 'UPCOMING'
  if (time < window.endsAt.getTime()) return 'OPEN'
  return 'FINISHED'
}
