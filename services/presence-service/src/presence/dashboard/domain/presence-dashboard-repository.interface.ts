import { PresenceSubjectTypeEnum } from '../../credential/domain/entities/credential.entity.js'
import { PresenceDayStatusEnum } from '../../daily-record/domain/entities/daily-presence.entity.js'

export type StatusCounts = Partial<Record<PresenceDayStatusEnum, number>>

export abstract class IPresenceDashboardRepository {
  abstract countStatusesOn(
    date: Date,
    subjectType: PresenceSubjectTypeEnum,
  ): Promise<StatusCounts>
  abstract countActiveCredentialHolders(
    subjectType: PresenceSubjectTypeEnum,
  ): Promise<number>
  abstract countPendingLeaveRequests(): Promise<number>
}
