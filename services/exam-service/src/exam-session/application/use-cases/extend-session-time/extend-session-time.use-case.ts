import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { RoomStaffUser } from '../../../../exam-room/application/room-access.service.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { SessionRecoveryService } from '../../session-recovery.service.js'

const MS_PER_MINUTE = 60_000

export const MIN_EXTRA_MINUTES = 1
export const MAX_EXTRA_MINUTES = 120
export const MAX_TOTAL_EXTRA_MINUTES = 180

export function assertExtraMinutes(minutes: number): number {
  if (
    !Number.isInteger(minutes) ||
    minutes < MIN_EXTRA_MINUTES ||
    minutes > MAX_EXTRA_MINUTES
  ) {
    throw new BadRequestException(
      `Tambahan waktu harus ${MIN_EXTRA_MINUTES} sampai ${MAX_EXTRA_MINUTES} menit`,
    )
  }
  return minutes
}

export function assertTotalExtraMinutes(total: number): number {
  if (total > MAX_TOTAL_EXTRA_MINUTES) {
    throw new BadRequestException(
      `Total tambahan waktu tidak boleh melebihi ${MAX_TOTAL_EXTRA_MINUTES} menit`,
    )
  }
  return total
}

export function shiftBy(session: ExamSession, minutes: number) {
  return {
    extraMinutes: session.extraMinutes + minutes,
    deadline: new Date(session.deadline.getTime() + minutes * MS_PER_MINUTE),
    finalizeAt: new Date(
      session.finalizeAt.getTime() + minutes * MS_PER_MINUTE,
    ),
  }
}

@Injectable()
export class ExtendSessionTimeUseCase {
  constructor(
    private readonly recovery: SessionRecoveryService,
    private readonly schedules: IExamScheduleRepository,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
    minutes: number,
    reason: string,
  ): Promise<ExamSession> {
    const added = assertExtraMinutes(minutes)
    const session = await this.recovery.load(sessionId)
    await this.recovery.authorize(user, session)
    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'Hanya sesi yang sedang berjalan yang bisa ditambah waktunya',
      )
    }
    assertTotalExtraMinutes(session.extraMinutes + added)
    const schedule = await this.schedules.findById(session.scheduleId)
    if (schedule === null) {
      throw new ConflictException('Jadwal ujian tidak ditemukan')
    }
    if (shiftBy(session, added).deadline > schedule.endsAt) {
      throw new ConflictException('Tambahan waktu melewati jendela ujian')
    }
    return this.recovery.apply(
      user,
      sessionId,
      'EXTEND_TIME',
      reason,
      (current) => shiftBy(current, added),
      undefined,
      { minutes: added, extraMinutes: session.extraMinutes + added },
    )
  }
}
