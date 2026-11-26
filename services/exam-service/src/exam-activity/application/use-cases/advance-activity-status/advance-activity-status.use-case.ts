import { Injectable, Logger } from '@nestjs/common'
import { CloseActivitySessionsUseCase } from '../../../../exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { SYSTEM_ACTOR_ID } from '../../../domain/system-actor.js'
import { READY_PACKAGE_STATUSES } from '../create-activity/create-activity.use-case.js'

export interface AdvanceActivityStatusResult {
  opened: string[]
  closed: string[]
  blocked: string[]
}

const MINUTE_MS = 60_000

@Injectable()
export class AdvanceActivityStatusUseCase {
  private readonly logger = new Logger(AdvanceActivityStatusUseCase.name)

  constructor(
    private readonly activities: ExamActivityRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly closeSessions: CloseActivitySessionsUseCase,
  ) {}

  async execute(now: Date): Promise<AdvanceActivityStatusResult> {
    const result: AdvanceActivityStatusResult = {
      opened: [],
      closed: [],
      blocked: [],
    }
    for (const activity of await this.activities.findDueForAdvance(now)) {
      try {
        await this.advance(activity, now, result)
      } catch (error) {
        this.logger.error(
          `Gagal memajukan status kegiatan ${activity.id}`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }
    return result
  }

  private async advance(
    activity: ExamActivity,
    now: Date,
    result: AdvanceActivityStatusResult,
  ): Promise<void> {
    if (!activity.autoStatus) return
    const openAt =
      activity.startsAt.getTime() -
      activity.policy.autoOpenLeadMinutes * MINUTE_MS
    const closeAt =
      activity.endsAt.getTime() +
      activity.policy.autoCloseGraceMinutes * MINUTE_MS
    const time = now.getTime()
    const online = activity.deliveryMode === 'ONLINE'

    if (activity.status === 'SCHEDULED') {
      if (time >= closeAt) {
        await this.close(activity, result)
        return
      }
      if (!online) return
      if (time < openAt || time >= activity.endsAt.getTime()) return
      if (!(await this.packageReady(activity))) {
        result.blocked.push(activity.id)
        return
      }
      const changed = await this.activities.updateStatusIf(
        activity.id,
        'SCHEDULED',
        'ACTIVE',
        SYSTEM_ACTOR_ID,
        'AUTO_OPEN',
      )
      if (changed) result.opened.push(activity.id)
      return
    }

    if (activity.status === 'ACTIVE' && time >= closeAt) {
      if (
        online &&
        (await this.sessions.findInProgressIdsByActivity(activity.id)).length >
          0
      ) {
        return
      }
      await this.close(activity, result)
    }
  }

  private async close(
    activity: ExamActivity,
    result: AdvanceActivityStatusResult,
  ): Promise<void> {
    const changed = await this.activities.updateStatusIf(
      activity.id,
      activity.status,
      'CLOSED',
      SYSTEM_ACTOR_ID,
      'AUTO_CLOSE',
    )
    if (!changed) return
    result.closed.push(activity.id)
    if (activity.status === 'ACTIVE' && activity.deliveryMode === 'ONLINE') {
      await this.closeSessions.execute(activity.id, SYSTEM_ACTOR_ID)
    }
  }

  private async packageReady(activity: ExamActivity): Promise<boolean> {
    if (activity.packageId === null) return false
    const status = await this.activities.findPackageStatus(activity.packageId)
    return status !== null && READY_PACKAGE_STATUSES.has(status)
  }
}
