import type { MyExamStatus } from '../entities/exam-session.entity.js'
import type { ExamLifecycle } from './exam-lifecycle.policy.js'

export function myExamStatus(
  window: { startsAt: Date; endsAt: Date },
  session: { status: string } | null,
  now: Date,
  lifecycle: ExamLifecycle,
): MyExamStatus {
  if (session !== null) {
    return session.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'FINISHED'
  }
  if (now.getTime() < window.startsAt.getTime()) return 'UPCOMING'
  if (lifecycle === 'OPEN') return 'OPEN'
  return 'FINISHED'
}
