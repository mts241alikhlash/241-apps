import { Injectable } from '@nestjs/common'
import { ExamActivityRepository } from '../../exam-activity/domain/repositories/exam-activity.repository.js'
import { IExamScheduleRepository } from '../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { ApiConflictException } from '../../core/filters/api-exception.js'
import { scheduleLifecycle } from '../domain/policies/exam-lifecycle.policy.js'

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
    scheduleId: string,
    now: Date,
    place?: () => Promise<WindowClosedPlace>,
  ): Promise<void> {
    const schedule = await this.schedules.findById(scheduleId)
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
    const lifecycle = scheduleLifecycle(schedule, activity, now)
    if (lifecycle === 'OPEN') return
    const where = place === undefined ? {} : await place()
    const room = where.roomName == null ? '' : ` di ${where.roomName}`
    const number =
      where.participantNumber == null
        ? ''
        : `, nomor peserta ${where.participantNumber}`
    const reason =
      lifecycle === 'UPCOMING'
        ? 'Ujian belum dibuka'
        : 'Waktu ujian sudah berakhir'
    throw new ApiConflictException('WINDOW_CLOSED', `${reason}${room}${number}`)
  }
}
