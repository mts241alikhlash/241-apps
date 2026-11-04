import { Injectable, Logger } from '@nestjs/common'
import { CreateAuditLogUseCase } from '@mts241alikhlash/nest-core/audit-log'

export const PRESENCE_AUDIT_RESOURCE = 'presence-record'

export type PresenceAuditAction =
  'presence-record.create' | 'presence-record.correct'

@Injectable()
export class PresenceAuditService {
  private readonly logger = new Logger(PresenceAuditService.name)

  constructor(private readonly createAuditLog: CreateAuditLogUseCase) {}

  async record(
    action: PresenceAuditAction,
    dailyPresenceId: string,
    actorId: string,
    metadata: { subjectUserId: string; date: string; reason: string },
  ): Promise<void> {
    try {
      await this.createAuditLog.execute({
        userId: actorId,
        action,
        resource: PRESENCE_AUDIT_RESOURCE,
        resourceId: dailyPresenceId,
        metadata,
      })
    } catch (error) {
      this.logger.error(
        `Audit write failed for ${action} on presence ${dailyPresenceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }
}
