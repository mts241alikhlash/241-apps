import type {
  OfflinePublicationStatus,
  OfflineResult,
} from '../entities/offline-result.entity.js'

export interface OfflineResultWrite {
  scheduleId: string
  studentId: string
  rawScore: number | null
  note: string
  enteredById: string
  enteredAt: Date
  publication?: { status: OfflinePublicationStatus | null }
}

export abstract class IOfflineResultRepository {
  abstract listBySchedules(scheduleIds: string[]): Promise<OfflineResult[]>
  abstract save(input: OfflineResultWrite): Promise<OfflineResult>
  abstract queue(scheduleId: string, studentIds: string[]): Promise<number>
  abstract findCandidates(
    now: Date,
    limit: number,
    excludeIds: string[],
  ): Promise<OfflineResult[]>
  abstract markSent(id: string, at: Date, enteredAt: Date): Promise<void>
  abstract markFailed(
    id: string,
    at: Date,
    reason: string,
    permanent: boolean,
    enteredAt: Date,
  ): Promise<void>
}
