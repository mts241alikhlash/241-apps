import type { ExamPolicy } from '../../../exam-activity/domain/policies/exam-policy.policy.js'

export interface AbsenceGapEvaluation {
  record: boolean
  seconds: number
  requireToken: boolean
  countsAsViolation: boolean
}

export interface AbsenceGapInput {
  lastSeenAt: Date | null
  now: Date
  policy: ExamPolicy
  priorGaps: number
}

export function evaluateAbsenceGap(
  input: AbsenceGapInput,
): AbsenceGapEvaluation {
  const none: AbsenceGapEvaluation = {
    record: false,
    seconds: 0,
    requireToken: false,
    countsAsViolation: false,
  }
  if (input.lastSeenAt === null) return none
  const gapMs = input.now.getTime() - input.lastSeenAt.getTime()
  if (gapMs < input.policy.gapRecordedMs) return none
  const seconds = Math.round(gapMs / 1000)
  return {
    record: true,
    seconds,
    requireToken: gapMs >= input.policy.gapTokenMs,
    countsAsViolation: input.priorGaps + 1 >= input.policy.gapViolationFrom,
  }
}
