import { Injectable } from '@nestjs/common'
import type { ExamActivity } from '../../exam-activity/domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../exam-activity/domain/repositories/exam-activity.repository.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { IExamScheduleRepository } from '../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import {
  ApiConflictException,
  ApiForbiddenException,
} from '../../core/filters/api-exception.js'
import { assertOpenable } from '../../exam-schedule/domain/policies/assert-openable.policy.js'
import type { ExamSession } from '../domain/entities/exam-session.entity.js'
import { lifecycleWindow } from '../domain/policies/exam-lifecycle.policy.js'

export interface WindowClosedPlace {
  roomName?: string | null
  participantNumber?: string | null
}

@Injectable()
export class LifecycleGate {
  constructor(
    private readonly schedules: IExamScheduleRepository,
    private readonly activities: ExamActivityRepository,
  ) {}

  async sourceOf(schedule: ExamSchedule): Promise<{
    owner: ExamSchedule
    activity: ExamActivity | null
    eventId: string | null
  }> {
    const original =
      schedule.kind === 'MAKEUP' && schedule.makeupOfId !== null
        ? await this.schedules.findById(schedule.makeupOfId)
        : null
    const owner = original ?? schedule
    const activity =
      owner.activityId === undefined || owner.activityId === null
        ? null
        : await this.activities.findById(owner.activityId)
    return { owner, activity, eventId: activity?.eventId ?? owner.eventId }
  }

  assertSessionOpen(
    session: Pick<ExamSession, 'scheduleId' | 'status' | 'finalizeAt'>,
    now: Date,
    place?: (eventId: string | null) => Promise<WindowClosedPlace>,
  ): Promise<void> {
    return this.assertOpen(
      session.scheduleId,
      now,
      place,
      session.status === 'IN_PROGRESS' ? session.finalizeAt : undefined,
    )
  }

  async assertOpen(
    target: string | ExamSchedule | null,
    now: Date,
    place?: (eventId: string | null) => Promise<WindowClosedPlace>,
    runsUntil?: Date,
  ): Promise<void> {
    const schedule =
      typeof target === 'string'
        ? await this.schedules.findById(target)
        : target
    if (schedule === null) return
    if (schedule.status !== 'SCHEDULED') {
      throw new ApiForbiddenException(
        'SCHEDULE_CANCELLED',
        'Jadwal ujian sudah dibatalkan',
      )
    }
    const { activity, eventId } = await this.sourceOf(schedule)
    const window = lifecycleWindow(schedule, activity)
    const endsAt =
      runsUntil !== undefined && runsUntil > window.endsAt
        ? runsUntil
        : window.endsAt
    try {
      assertOpenable({
        schedule: { ...schedule, startsAt: window.startsAt, endsAt },
        activity,
        now,
      })
    } catch (error) {
      if (
        !(error instanceof ApiConflictException) ||
        error.code !== 'WINDOW_CLOSED'
      ) {
        throw error
      }
      const where = place === undefined ? {} : await place(eventId)
      const room = where.roomName == null ? '' : ` di ${where.roomName}`
      const number =
        where.participantNumber == null
          ? ''
          : `, nomor peserta ${where.participantNumber}`
      throw new ApiConflictException(
        'WINDOW_CLOSED',
        `${error.message}${room}${number}`,
      )
    }
  }
}
