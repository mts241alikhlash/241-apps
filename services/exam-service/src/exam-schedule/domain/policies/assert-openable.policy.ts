import { ApiConflictException } from '../../../core/filters/api-exception.js'
import type { ActivityStatus } from '../../../exam-activity/domain/entities/exam-activity.entity.js'
import { examLifecycle } from '../../../exam-session/domain/policies/exam-lifecycle.policy.js'
import type { ExamSchedule } from '../entities/exam-schedule.entity.js'

export function assertOpenable(input: {
  schedule: Pick<
    ExamSchedule,
    'deliveryMode' | 'packageId' | 'kind' | 'startsAt' | 'endsAt'
  >
  activity: { status: ActivityStatus } | null
  now: Date
}): void {
  const { schedule, activity, now } = input
  if (schedule.deliveryMode === 'OFFLINE') {
    throw new ApiConflictException(
      'OFFLINE_NOT_STARTABLE',
      'Ujian offline tidak dikerjakan di aplikasi',
    )
  }
  if (schedule.packageId === null) {
    throw new ApiConflictException(
      'PACKAGE_MISSING',
      'Paket soal belum dipasang',
    )
  }
  const status =
    schedule.kind === 'MAKEUP' ? 'ACTIVE' : (activity?.status ?? 'ACTIVE')
  if (examLifecycle(status, schedule, now) === 'OPEN') return
  const ended =
    status === 'CLOSED' || now.getTime() >= schedule.endsAt.getTime()
  throw new ApiConflictException(
    'WINDOW_CLOSED',
    ended ? 'Waktu ujian sudah berakhir' : 'Ujian belum dibuka',
  )
}
