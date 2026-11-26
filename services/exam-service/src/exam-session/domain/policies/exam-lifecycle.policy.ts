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
  schedule: LifecycleWindow & {
    kind: 'REGULAR' | 'MAKEUP'
    deliveryMode: 'ONLINE' | 'OFFLINE'
  },
  activity: (LifecycleWindow & { status: ExamActivityStatus }) | null,
  now: Date,
): ExamLifecycle {
  const status =
    schedule.kind === 'MAKEUP' ? 'ACTIVE' : (activity?.status ?? 'ACTIVE')
  const window = lifecycleWindow(schedule, activity)
  if (schedule.deliveryMode === 'OFFLINE') {
    return status !== 'CLOSED' && now.getTime() < window.startsAt.getTime()
      ? 'UPCOMING'
      : 'FINISHED'
  }
  return examLifecycle(status, window, now)
}
