import type { ExamSession } from '../entities/exam-session.entity.js'

export const GRACE_MINUTES = 10

export const TIME_UP_MESSAGE =
  'Waktu mengerjakan sudah habis. Kumpulkan jawaban.'

const MS_PER_MINUTE = 60_000

export function computeTimes(input: {
  startedAt: Date
  durationMinutes: number
  scheduleEndsAt: Date
}): { deadline: Date; finalizeAt: Date } {
  const byDuration =
    input.startedAt.getTime() + input.durationMinutes * MS_PER_MINUTE
  const deadline = new Date(
    Math.min(byDuration, input.scheduleEndsAt.getTime()),
  )
  return {
    deadline,
    finalizeAt: new Date(deadline.getTime() + GRACE_MINUTES * MS_PER_MINUTE),
  }
}

export function isWorkingTimeOver(
  session: Pick<ExamSession, 'client' | 'deadline'>,
  now: Date,
): boolean {
  return session.client === 'SEB' && now.getTime() >= session.deadline.getTime()
}
