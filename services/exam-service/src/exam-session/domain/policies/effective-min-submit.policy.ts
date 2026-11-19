import type { ExamPolicy } from '../../../exam-activity/domain/policies/exam-policy.policy.js'

export function effectiveMinSubmit(
  policy: Pick<ExamPolicy, 'minSubmitMinutes'> | null | undefined,
  scheduleMinSubmitMinutes: number,
): number {
  const fromPolicy = policy?.minSubmitMinutes ?? 0
  return fromPolicy > 0 ? fromPolicy : scheduleMinSubmitMinutes
}
