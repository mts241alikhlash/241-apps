import type { OfflineResult } from '../domain/entities/offline-result.entity.js'
import { publicationAfterEdit } from '../domain/policies/offline-score.policy.js'
import type { IOfflineResultRepository } from '../domain/repositories/offline-result.repository.js'

export function writeOfflineScore(
  results: IOfflineResultRepository,
  input: {
    scheduleId: string
    studentId: string
    rawScore: number | null
    note: string
    existing: OfflineResult | undefined
    actorId: string
    at: Date
  },
): Promise<OfflineResult> {
  return results.save({
    scheduleId: input.scheduleId,
    studentId: input.studentId,
    rawScore: input.rawScore,
    note: input.note,
    enteredById: input.actorId,
    enteredAt: input.at,
    publication: publicationAfterEdit(input.existing, input.rawScore),
  })
}
