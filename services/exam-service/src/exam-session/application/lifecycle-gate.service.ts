import { Injectable } from '@nestjs/common'
import { ExamActivityRepository } from '../../exam-activity/domain/repositories/exam-activity.repository.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { IExamScheduleRepository } from '../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { ApiConflictException } from '../../core/filters/api-exception.js'
import {
  lifecycleWindow,
  scheduleLifecycle,
} from '../domain/policies/exam-lifecycle.policy.js'

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

  async assertOpen(
    target: string | ExamSchedule | null,
    now: Date,
    place?: (eventId: string | null) => Promise<WindowClosedPlace>,
  ): Promise<void> {
    const schedule =
      typeof target === 'string'
        ? await this.schedules.findById(target)
        : target
    if (schedule === null) return
    const original =
      schedule.kind === 'MAKEUP' && schedule.makeupOfId !== null
        ? await this.schedules.findById(schedule.makeupOfId)
        : null
    const owner = original ?? schedule
    const activity =
      owner.activityId === undefined || owner.activityId === null
        ? null
        : await this.activities.findById(owner.activityId)
    if (scheduleLifecycle(schedule, activity, now) === 'OPEN') return
    const eventId = activity?.eventId ?? owner.eventId
    const where = place === undefined ? {} : await place(eventId)
    const room = where.roomName == null ? '' : ` di ${where.roomName}`
    const number =
      where.participantNumber == null
        ? ''
        : `, nomor peserta ${where.participantNumber}`
    const reason =
      now.getTime() < lifecycleWindow(schedule, activity).startsAt.getTime()
        ? 'Ujian belum dibuka'
        : 'Waktu ujian sudah berakhir'
    throw new ApiConflictException('WINDOW_CLOSED', `${reason}${room}${number}`)
  }
}
