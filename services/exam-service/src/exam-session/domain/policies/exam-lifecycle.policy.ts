export type ExamActivityStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED'

export type ExamLifecycle = 'UPCOMING' | 'OPEN' | 'FINISHED'

export interface LifecycleWindow {
  startsAt: Date
  endsAt: Date
}

export function examLifecycle(
  activityStatus: ExamActivityStatus,
  window: LifecycleWindow,
  now: Date,
): ExamLifecycle {
  if (activityStatus !== 'ACTIVE') return 'FINISHED'
  const time = now.getTime()
  if (time < window.startsAt.getTime()) return 'UPCOMING'
  if (time < window.endsAt.getTime()) return 'OPEN'
  return 'FINISHED'
}

export function lifecycleWindow(
  schedule: LifecycleWindow & { kind: 'REGULAR' | 'MAKEUP' },
  activity: LifecycleWindow | null,
): LifecycleWindow {
  return schedule.kind === 'MAKEUP' ? schedule : (activity ?? schedule)
}

export function scheduleLifecycle(
  schedule: LifecycleWindow & { kind: 'REGULAR' | 'MAKEUP' },
  activity: (LifecycleWindow & { status: ExamActivityStatus }) | null,
  now: Date,
): ExamLifecycle {
  return examLifecycle(
    activity?.status ?? 'ACTIVE',
    lifecycleWindow(schedule, activity),
    now,
  )
}
