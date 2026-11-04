export type ScoreStanding = 'unknown' | 'below' | 'at-or-above'

export function scoreStanding(
  averageScore: number | null | undefined,
  passingScore: number | null | undefined,
): ScoreStanding {
  if (averageScore == null) return 'unknown'
  if (passingScore == null) return 'unknown'
  return averageScore >= passingScore ? 'at-or-above' : 'below'
}
